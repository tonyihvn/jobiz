import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { SaleRecord, Product, CompanySettings } from '../types';
import { fmt } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';
import { Printer, RotateCcw, X, Save, FileText, ShoppingBag, List } from 'lucide-react';

const SalesHistory = () => {
    const { symbol } = useCurrency();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'items'>('sales');
  
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
                const sett = db.settings && db.settings.get ? await db.settings.get() : emptySettings;
                const c = db.customers && db.customers.getAll ? await db.customers.getAll() : [];
                if (!mounted) return;
                setSales(Array.isArray(s) ? s : []);
                setProducts(Array.isArray(p) ? p : []);
                setSettings(sett as CompanySettings);
                setCustomers(Array.isArray(c) ? c : []);
            } catch (e) {
                console.warn('Failed to load sales history data', e);
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

  // Flatten sales into items
  const itemHistory = sales.flatMap(sale => 
      sale.items.map(item => ({
          ...item,
          saleId: sale.id,
          saleDate: sale.date,
          saleIsReturn: sale.isReturn
      }))
  );

  const itemColumns: Column<any>[] = [
      { header: 'Date', accessor: (i) => new Date(i.saleDate).toLocaleDateString(), key: 'saleDate', sortable: true },
      { header: 'Item Name', accessor: 'name', key: 'name', sortable: true, filterable: true },
      { header: 'Category', accessor: 'categoryGroup', key: 'categoryGroup', filterable: true },
      { header: 'Qty', accessor: 'quantity', key: 'quantity' },
    { header: 'Price', accessor: (i) => `${symbol}${fmt(i.price,2)}`, key: 'price' },
    { header: 'Total', accessor: (i) => `${symbol}${fmt(Number(i.price) * Number(i.quantity),2)}`, key: 'itemTotal' },
      { header: 'Ref Receipt', accessor: (i) => <span className="font-mono text-xs">{i.saleId.slice(-8)}</span>, key: 'saleId' },
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
      </div>

      {activeTab === 'sales' ? (
        <DataTable data={sales} columns={salesColumns} title="Completed Transactions" />
      ) : (
        <DataTable data={itemHistory} columns={itemColumns} title="Itemized Sales Record" />
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
            <div className="bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto w-full max-w-4xl flex flex-col">
                <div className="p-4 border-b flex justify-between items-center no-print">
                    <h3 className="font-bold text-lg">Document Viewer</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setDocType('thermal')} className={`px-3 py-1 rounded border ${docType === 'thermal' ? 'bg-brand-50 border-brand-500 text-brand-700' : ''}`}>Thermal</button>
                        <button onClick={() => setDocType('a4')} className={`px-3 py-1 rounded border ${docType === 'a4' ? 'bg-brand-50 border-brand-500 text-brand-700' : ''}`}>A4 Invoice</button>
                        <button onClick={() => window.print()} className="px-3 py-1 bg-slate-800 text-white rounded flex items-center gap-1"><Printer size={16}/> Print</button>
                        <button onClick={() => setShowDocModal(false)} className="px-3 py-1 hover:bg-slate-100 rounded"><X size={20}/></button>
                    </div>
                </div>
                
                <div className="p-8 bg-gray-100 overflow-auto flex justify-center">
                   {/* Reuse Layout Logic from POS */}
                   {docType === 'thermal' && (
                       <div className="bg-white p-4 shadow-sm w-[300px]">
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
                                    {viewingSale.items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="py-1">{item.name}</td>
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
                       <div className="bg-white shadow-sm w-[210mm] min-h-[297mm] flex flex-col p-12">
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
                            <table className="w-full text-left mb-8">
                                <thead>
                                    <tr className="border-b-2 border-slate-800">
                                        <th className="py-3 font-bold">Description</th>
                                        <th className="py-3 font-bold text-right">Qty</th>
                                        <th className="py-3 font-bold text-right">Price</th>
                                        <th className="py-3 font-bold text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewingSale.items.map((item, i) => (
                                        <tr key={i} className="border-b border-slate-100">
                                            <td className="py-4">{item.name}</td>
                                            <td className="py-4 text-right">{item.quantity}</td>
                                            <td className="py-4 text-right">{symbol}{fmt(item.price,2)}</td>
                                            <td className="py-4 text-right font-bold">{symbol}{fmt(Number(item.price) * Number(item.quantity),2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="flex justify-end mt-4">
                                <div className="text-2xl font-bold text-slate-900">Total: {symbol}{fmt(viewingSale.total,2)}</div>
                            </div>
                       </div>
                   )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;

    
