import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { authFetch } from '../services/auth';
import { SaleRecord, Product, CompanySettings } from '../types';
import { fmt } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';
import { Printer, RotateCcw, X, Save, FileText, ShoppingBag, List, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const SalesHistory = () => {
    const { symbol } = useCurrency();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'items' | 'stock'>('sales');
  
  // Return State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<SaleRecord | null>(null);
  const [returnReason, setReturnReason] = useState('');
  
  // Document Viewing State
  const [showDocModal, setShowDocModal] = useState(false);
  const [docType, setDocType] = useState<'thermal' | 'a4'>('a4');
  const [viewingSale, setViewingSale] = useState<SaleRecord | null>(null);
  
  // Data
  const [products, setProducts] = useState<Product[]>([]);
    const emptySettings = { businessId: '', name: '', motto: '', address: '', phone: '', email: '', logoUrl: '', headerImageUrl: '', footerImageUrl: '', vatRate: 0, currency: '$' } as CompanySettings;
    const [settings, setSettings] = useState<CompanySettings>(emptySettings);
    const [customers, setCustomers] = useState<any[]>([]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const s = db.sales && db.sales.getAll ? await db.sales.getAll() : [];
                const p = db.products && db.products.getAll ? await db.products.getAll() : [];
                const sv = db.services && db.services.getAll ? await db.services.getAll() : [];
                const sett = db.settings && db.settings.get ? await db.settings.get() : emptySettings;
                const c = db.customers && db.customers.getAll ? await db.customers.getAll() : [];
                // Load stock history from endpoint
                let sh: any[] = [];
                try {
                    console.log('[SalesHistory] Fetching stock history from /api/stock/history...');
                    const res = await authFetch('/api/stock/history');
                    console.log('[SalesHistory] Stock history response status:', res.status);
                    if (res.ok) {
                        sh = await res.json();
                        console.log('[SalesHistory] Successfully loaded stock history:', sh?.length || 0, 'records');
                    } else {
                        console.warn('[SalesHistory] Stock history API returned status:', res.status);
                    }
                } catch (e) {
                    console.error('[SalesHistory] Failed to load stock history:', e);
                }
                if (!mounted) return;
                // DEBUG: Log loaded data
                console.log('[SalesHistory] Loaded sales:', s);
                console.log('[SalesHistory] Loaded products:', p);
                console.log('[SalesHistory] Loaded services:', sv);
                console.log('[SalesHistory] Loaded stock history:', sh);
                
                // Ensure stock history has all required fields for display
                const processedStockHistory = (sh || []).map((record: any) => ({
                    id: record.id,
                    timestamp: record.timestamp || new Date().toISOString(),
                    product_id: record.product_id,
                    type: record.type || 'IN',
                    change_amount: record.change_amount || 0,
                    reference_id: record.reference_id || '',
                    notes: record.notes || '',
                    ...record
                }));
                
                setSales(Array.isArray(s) ? s : []);
                setStockHistory(Array.isArray(processedStockHistory) ? processedStockHistory : []);
                // combine products and services for lookup when resolving sale item metadata
                const prods = Array.isArray(p) ? p : [];
                const svcs = Array.isArray(sv) ? sv.map((x: any) => ({ ...x, isService: true })) : [];
                const combined = [...prods, ...svcs];
                console.log('[SalesHistory] Combined products+services:', combined);
                setProducts(combined);
                setSettings(sett as CompanySettings);
                setCustomers(Array.isArray(c) ? c : []);
            } catch (e) {
                console.error('[SalesHistory] Failed to load sales history data:', e);
            }
        })();
        return () => { mounted = false; };
    }, []);

  const handleViewDocument = (sale: SaleRecord, type: 'thermal' | 'a4') => {
      setViewingSale(sale);
      setDocType(type);
      setShowDocModal(true);
  };

  const handleReturn = (sale: SaleRecord) => {
      setSelectedSaleForReturn(sale);
      setShowReturnModal(true);
  };

  const handleDownloadPDF = () => {
    if (!viewingSale) return;
    const element = document.getElementById('a4-invoice-content');
    if (!element) return;
    
    const opt = {
      margin: 0,
      filename: `Invoice-${viewingSale.id.slice(-8)}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { format: 'a4', orientation: 'portrait' as const }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const enrichItems = (sale: SaleRecord) => {
      return (sale.items || []).map((it: any) => {
          const prod = products.find(p => p.id === (it.id || it.product_id));
          return {
              ...it,
              id: it.id || it.product_id,
              name: it.name || (prod ? prod.name : '') || '',
              description: it.description || prod?.details || prod?.description || '',
              unit: it.unit || prod?.unit || ''
          };
      });
  };

  const buildReceiptText = (sale: SaleRecord) => {
      const lines: string[] = [];
      lines.push(`${settings.name}`);
      lines.push(settings.address || '');
      lines.push('');
      lines.push(`Receipt: ${sale.id}`);
      lines.push(`Date: ${new Date(sale.date).toLocaleString()}`);
      lines.push('');
      lines.push('Items:');
      for (const it of enrichItems(sale)) {
          lines.push(`- ${it.name}${it.description ? ' — ' + String(it.description) : ''}`);
          lines.push(`  ${it.unit || ''} x ${it.quantity} @ ${symbol}${fmt(it.price,2)} = ${symbol}${fmt(Number(it.price) * Number(it.quantity),2)}`);
      }
      lines.push('');
      lines.push(`Subtotal: ${symbol}${fmt(sale.subtotal || 0,2)}`);
      lines.push(`VAT: ${symbol}${fmt(sale.vat || 0,2)}`);
      lines.push(`Total: ${symbol}${fmt(sale.total || 0,2)}`);
      return lines.join('\n');
  };

  const sendEmailReceipt = async (sale: SaleRecord) => {
      try {
          const defaultTo = (customers.find(c => c.id === sale.customerId)?.email) || '';
          const to = window.prompt('Recipient email', defaultTo || '');
          if (!to) return;
          const subject = `Receipt ${sale.id.slice(-8)} from ${settings.name}`;
          const text = buildReceiptText(sale);
          const res = await authFetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, text }) });
          const j = await res.json();
          if (res.ok) alert('Email sent'); else alert('Email failed: ' + (j && j.error ? j.error : res.statusText));
      } catch (e) { console.warn('Email send failed', e); alert('Failed to send email'); }
  };

  const sendWhatsAppReceipt = (sale: SaleRecord) => {
      try {
          const phone = (customers.find(c => c.id === sale.customerId)?.phone) || '';
          const text = buildReceiptText(sale);
          const encoded = encodeURIComponent(text);
          // If phone is present, open wa.me with phone, otherwise open generic share
          const url = phone ? `https://wa.me/${phone.replace(/[^0-9]/g,'')}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
          window.open(url, '_blank');
      } catch (e) { console.warn('WhatsApp send failed', e); alert('Failed to open WhatsApp'); }
  };

    const processReturn = async () => {
            if (!selectedSaleForReturn || !returnReason) return;
            try {
                if (db.sales && db.sales.processReturn) await db.sales.processReturn(selectedSaleForReturn.id, returnReason, products);
                const s = db.sales && db.sales.getAll ? await db.sales.getAll() : [];
                const p = db.products && db.products.getAll ? await db.products.getAll() : [];
                setSales(Array.isArray(s) ? s : []);
                setProducts(Array.isArray(p) ? p : []);
                setShowReturnModal(false);
                setReturnReason('');
                setSelectedSaleForReturn(null);
            } catch (e) {
                console.warn('Failed to process return', e);
            }
    };

  const salesColumns: Column<SaleRecord>[] = [
    { header: 'Receipt #', accessor: (s) => s.id.slice(-8), key: 'id' },
    { header: 'Date', accessor: (s) => new Date(s.date).toLocaleString(), key: 'date', sortable: true },
    { header: 'Type', accessor: (s) => s.isReturn ? 'Return' : s.isProforma ? 'Proforma' : 'Sale', key: 'isReturn' },
    { header: 'Customer', accessor: (s) => s.customerId ? customers.find(c => c.id === s.customerId)?.name : 'Walk-in', key: 'customerId' },
    { header: 'Total', accessor: (s) => <span className={s.isReturn ? 'text-rose-600' : ''}>{symbol}{fmt(s.total,2)}</span>, key: 'total', sortable: true },
    { 
        header: 'Documents', 
        accessor: (s) => (
            <div className="flex gap-1">
                 <button onClick={() => handleViewDocument(s, 'thermal')} title="Thermal Receipt" className="p-1 hover:bg-slate-100 rounded border border-slate-200 text-slate-600">
                    <ShoppingBag size={14} />
                 </button>
                 <button onClick={() => handleViewDocument(s, 'a4')} title="A4 Invoice" className="p-1 hover:bg-slate-100 rounded border border-slate-200 text-slate-600">
                    <FileText size={14} />
                 </button>
            </div>
        ), 
        key: 'docs' 
    },
    { 
        header: 'Actions', 
        accessor: (s) => (
            <div className="flex gap-2">
                {!s.isReturn && !s.isProforma && (
                    <button onClick={() => handleReturn(s)} className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-xs font-bold border border-orange-200 px-2 py-1 rounded bg-orange-50">
                        <RotateCcw size={14} /> Return
                    </button>
                )}
            </div>
        ), 
        key: 'actions' 
    }
  ];

  // Flatten sales into enriched items (resolve name/category from products OR services)
  // FILTER: Exclude service items (where is_service=1)
  const itemHistory = (() => {
    const items = sales.flatMap(sale =>
        (sale.items || []).filter(item => !item.is_service).map(item => {
            const id = item.id || item.product_id;
            const prod = products.find(p => p.id === id);
            return {
                ...item,
                saleId: sale.id,
                saleDate: sale.date,
                saleIsReturn: sale.isReturn,
                name: item.name || prod?.name || '',
                categoryGroup: item.categoryGroup || prod?.categoryGroup || prod?.category_group || prod?.group || '',
                price: item.price || prod?.price || 0
            };
        })
    );
    if (items.length > 0 || sales.length === 0) {
        console.log('[SalesHistory] itemHistory computed:', items, 'from', sales.length, 'sales');
    }
    return items;
  })();

  // Filter sales to only show those with product items (not services)
  const salesWithProducts = (() => {
    return sales.filter(sale => {
      const hasProductItems = (sale.items || []).some(item => !item.is_service);
      return hasProductItems;
    });
  })();

  const itemColumns: Column<any>[] = [
      { header: 'Date', accessor: (i) => new Date(i.saleDate).toLocaleDateString(), key: 'saleDate', sortable: true, filterable: true },
      { header: 'Item Name', accessor: 'name', key: 'name', sortable: true, filterable: true },
      { header: 'Category', accessor: 'categoryGroup', key: 'categoryGroup', filterable: true },
      { header: 'Qty', accessor: 'quantity', key: 'quantity', filterable: true },
    { header: 'Price', accessor: (i) => `${symbol}${fmt(i.price,2)}`, key: 'price', filterable: true },
    { header: 'Total', accessor: (i) => `${symbol}${fmt(Number(i.price) * Number(i.quantity),2)}`, key: 'itemTotal', filterable: true },
      { header: 'Ref Receipt', accessor: (i) => <span className="font-mono text-xs">{i.saleId.slice(-8)}</span>, key: 'saleId', filterable: true },
  ];

  const stockHistoryColumns: Column<any>[] = [
    { header: 'Date', accessor: (h) => new Date(h.timestamp).toLocaleString(), key: 'timestamp', sortable: true, filterable: true },
    { header: 'Product', accessor: (h) => products.find(p => p.id === h.product_id)?.name || h.product_id, key: 'product_id', sortable: true, filterable: true },
    { header: 'Type', accessor: 'type', key: 'type', filterable: true },
    { header: 'Change', accessor: (h) => h.change_amount, key: 'change_amount', filterable: true },
    { header: 'Reference', accessor: 'reference_id', key: 'reference_id', filterable: true },
    { header: 'Notes', accessor: 'notes', key: 'notes', filterable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Sales History</h1>
            <p className="text-slate-500">View past transactions, process returns, and reprint receipts.</p>
        </div>
      </div>
      
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('sales')}
          className={`pb-3 px-1 flex items-center gap-2 font-medium text-sm transition-colors ${activeTab === 'sales' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <List size={18} /> Transaction List
        </button>
        <button 
          onClick={() => setActiveTab('items')}
          className={`pb-3 px-1 flex items-center gap-2 font-medium text-sm transition-colors ${activeTab === 'items' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ShoppingBag size={18} /> Product Sales History
        </button>
        <button 
          onClick={() => setActiveTab('stock')}
          className={`pb-3 px-1 flex items-center gap-2 font-medium text-sm transition-colors ${activeTab === 'stock' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ShoppingBag size={18} /> Supply History
        </button>
      </div>

      {activeTab === 'sales' ? (
        <DataTable data={salesWithProducts} columns={salesColumns} title="Completed Transactions" />
      ) : activeTab === 'items' ? (
        <DataTable data={itemHistory} columns={itemColumns} title="Itemized Sales Record" />
      ) : (
        <>
          <DataTable data={stockHistory} columns={stockHistoryColumns} title="Stock Movement History" />
          {stockHistory.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-slate-600">No supply history yet. Supply history will appear as stock is received through inventory management.</p>
            </div>
          )}
        </>
      )}

       {/* Return Modal */}
       {showReturnModal && selectedSaleForReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Process Return</h3>
                    <button onClick={() => setShowReturnModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="bg-slate-50 p-4 rounded mb-4 text-sm">
                    <p><strong>Receipt:</strong> {selectedSaleForReturn.id.slice(-8)}</p>
                    <p><strong>Items:</strong> {selectedSaleForReturn.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</p>
                    <p className="text-rose-600 mt-2 text-xs">This action will refund the total amount and restock items.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Return</label>
                        <textarea 
                            className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500" 
                            rows={3}
                            value={returnReason} 
                            onChange={e => setReturnReason(e.target.value)} 
                            placeholder="e.g. Defective item, customer changed mind..."
                        />
                    </div>
                    <button onClick={processReturn} className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 flex justify-center items-center gap-2 mt-4">
                        <Save size={18} /> Confirm Return
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Document View Modal */}
      {showDocModal && viewingSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg max-h-[90vh] w-full max-w-4xl flex flex-col doc-modal-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', overflowY: 'auto' }}>
                <div className="p-4 border-b flex justify-between items-center no-print sticky top-0 bg-white z-10">
                    <h3 className="font-bold text-lg">Document Viewer</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setDocType('thermal')} className={`px-3 py-1 rounded border ${docType === 'thermal' ? 'bg-brand-50 border-brand-500 text-brand-700' : ''}`}>Thermal</button>
                        <button onClick={() => setDocType('a4')} className={`px-3 py-1 rounded border ${docType === 'a4' ? 'bg-brand-50 border-brand-500 text-brand-700' : ''}`}>A4 Invoice</button>
                        {docType === 'a4' && <button onClick={handleDownloadPDF} title="Download as PDF" className="px-3 py-1 bg-red-600 text-white rounded flex items-center gap-1"><Download size={16}/> PDF</button>}
                        <button onClick={() => window.print()} className="px-3 py-1 bg-slate-800 text-white rounded flex items-center gap-1"><Printer size={16}/> Print</button>
                        <button onClick={() => sendEmailReceipt(viewingSale)} title="Email receipt" className="px-3 py-1 bg-emerald-600 text-white rounded flex items-center gap-1">Email</button>
                        <button onClick={() => sendWhatsAppReceipt(viewingSale)} title="Send via WhatsApp" className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-1">WhatsApp</button>
                        <button onClick={() => setShowDocModal(false)} className="px-3 py-1 hover:bg-slate-100 rounded"><X size={20}/></button>
                    </div>
                </div>
                
                <div className="p-8 bg-gray-100 overflow-auto flex justify-center flex-1">
                   {/* Reuse Layout Logic from POS */}
                   {docType === 'thermal' && (
                       <div className="bg-white p-4 w-[300px] shadow-none">
                            <div className="text-center mb-6">
                                {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="w-16 mx-auto mb-2" />}
                                <h1 className="font-bold text-lg uppercase tracking-wider">{settings.name}</h1>
                                <p className="text-xs text-gray-500">{settings.address}</p>
                                <p className="text-xs text-gray-500">{settings.phone}</p>
                            </div>
                            <div className="border-b border-dashed border-gray-300 my-4"></div>
                            <div className="flex justify-between text-xs mb-4">
                                <span>Date: {new Date(viewingSale.date).toLocaleDateString()}</span>
                                <span>Rect #: {viewingSale.id.slice(-8)}</span>
                            </div>
                            <table className="w-full text-xs text-left mb-4">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="py-1">Item</th>
                                        <th className="py-1 text-right">Qty</th>
                                        <th className="py-1 text-right">Amt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {enrichItems(viewingSale).map((item, i) => (
                                        <tr key={i}>
                                            <td className="py-1">
                                                <div className="font-medium">{item.name}</div>
                                                {item.description ? <div className="text-[9px] text-gray-400">{item.description}</div> : null}
                                            </td>
                                            <td className="py-1 text-right">{item.quantity}</td>
                                            <td className="py-1 text-right">{ symbol }{ fmt(Number(item.price) * Number(item.quantity),2) }</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="border-t border-dashed border-gray-300 my-2 pt-2 space-y-1 text-right">
                                <div className="text-xs font-bold">TOTAL: {symbol}{fmt(viewingSale.total,2)}</div>
                            </div>
                       </div>
                   )}

                   {docType === 'a4' && (
                       <div id="a4-invoice-content" className="bg-white w-[210mm] h-[297mm] flex flex-col px-12 py-8 shadow-none overflow-hidden print:overflow-visible">
                           {/* Simplified Header for brevity in preview, functionally similar to POS */}
                            <div className="flex justify-between items-start mb-12">
                                <div>
                                    <h1 className="text-4xl font-bold text-slate-800">INVOICE</h1>
                                    <p className="text-slate-500 mt-2">#{viewingSale.id}</p>
                                </div>
                                <div className="text-right">
                                    <h2 className="font-bold text-lg">{settings.name}</h2>
                                    <p className="text-sm text-slate-500">{settings.address}</p>
                                    <p className="text-sm text-slate-500">{settings.phone}</p>
                                </div>
                            </div>
                            <table className="w-full text-left mb-8 flex-1">
                                <thead>
                                    <tr className="border-b-2 border-slate-800">
                                        <th className="py-3 font-bold">Description</th>
                                        <th className="py-3 font-bold text-right">Qty</th>
                                        <th className="py-3 font-bold text-right">Price</th>
                                        <th className="py-3 font-bold text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {enrichItems(viewingSale).map((item, i) => (
                                        <tr key={i} className="border-b border-slate-100">
                                            <td className="py-4">
                                                <div className="font-medium">{item.name}</div>
                                            </td>
                                            <td className="py-4 text-right">{item.quantity}</td>
                                            <td className="py-4 text-right">{symbol}{fmt(item.price,2)}</td>
                                            <td className="py-4 text-right font-bold">{symbol}{fmt(Number(item.price) * Number(item.quantity),2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="flex justify-end mt-4 border-t-2 border-slate-800 pt-4">
                                <div className="text-2xl font-bold text-slate-900">Total: {symbol}{fmt(viewingSale.total,2)}</div>
                            </div>
                       </div>
                   )}
                </div>
            </div>
        </div>
      )}

      <style>{`
        /* Hide scrollbar on document viewer modal */
        .doc-modal-scroll::-webkit-scrollbar {
          display: none;
        }
        
        /* Ensure no shadows on PDF content */
        #a4-invoice-content * {
          box-shadow: none !important;
          -webkit-box-shadow: none !important;
        }
        
        /* Print styles to ensure clean PDF output */
        @media print {
          #a4-invoice-content {
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
          }
          
          #a4-invoice-content * {
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
          }
          
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SalesHistory;

    
