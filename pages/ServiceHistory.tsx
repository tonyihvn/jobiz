import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { authFetch } from '../services/auth';
import { SaleRecord, Product, CompanySettings } from '../types';
import { fmt } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';
import { Printer, X, FileText } from 'lucide-react';

const ServiceHistory = () => {
    const { symbol } = useCurrency();
  const [services, setServices] = useState<SaleRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'services' | 'items'>('services');
  
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
                // Filter sales to only include those with service items
                const salesWithServices = (Array.isArray(s) ? s : []).filter(sale => {
                    const items = sale.items || [];
                    const products_list = Array.isArray(p) ? p : [];
                    return items.some((item: any) => {
                        const prod = products_list.find(pr => pr.id === (item.id || item.product_id));
                        return prod && prod.is_service;
                    });
                });
                
                setServices(salesWithServices);
                setProducts(Array.isArray(p) ? p : []);
                setSettings(sett as CompanySettings);
                setCustomers(Array.isArray(c) ? c : []);
            } catch (e) {
                console.error('[ServiceHistory] Failed to load service history data:', e);
            }
        })();
        return () => { mounted = false; };
    }, []);

  const handleViewDocument = (sale: SaleRecord, type: 'thermal' | 'a4') => {
      setViewingSale(sale);
      setDocType(type);
      setShowDocModal(true);
  };

  const enrichItems = (sale: SaleRecord) => {
      return (sale.items || []).map((it: any) => {
          const prod = products.find(p => p.id === (it.id || it.product_id));
          return {
              ...it,
              id: it.id || it.product_id,
              name: it.name || (prod ? prod.name : '') || '',
              description: it.description || prod?.details || prod?.description || prod?.image_url || '',
              unit: it.unit || prod?.unit || ''
          };
      });
  };

  const buildReceiptText = (sale: SaleRecord) => {
      const lines: string[] = [];
      lines.push(`${settings.name}`);
      lines.push(settings.address || '');
      lines.push('');
      lines.push(`Invoice: ${sale.id}`);
      lines.push(`Date: ${new Date(sale.date).toLocaleString()}`);
      lines.push('');
      lines.push('Services Provided:');
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
          const subject = `Invoice ${sale.id.slice(-8)} from ${settings.name}`;
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
          const url = phone ? `https://wa.me/${phone.replace(/[^0-9]/g,'')}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
          window.open(url, '_blank');
      } catch (e) { console.warn('WhatsApp send failed', e); alert('Failed to open WhatsApp'); }
  };

  const downloadReceipt = (sale: SaleRecord) => {
      try {
          const text = buildReceiptText(sale);
          const blob = new Blob([text], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Invoice_${sale.id.slice(-8)}.txt`;
          a.click();
          window.URL.revokeObjectURL(url);
      } catch (e) { console.warn('Download failed', e); alert('Failed to download receipt'); }
  };

  const serviceColumns: Column<SaleRecord>[] = [
    { header: 'Date', accessor: (s: SaleRecord) => new Date(s.date).toLocaleDateString(), key: 'date', sortable: true, filterable: true },
    { header: 'Invoice No.', accessor: (s: SaleRecord) => <span className="font-mono text-sm">{s.id.slice(-8)}</span>, key: 'id', filterable: true },
    { header: 'Customer', accessor: (s: SaleRecord) => customers.find(c => c.id === s.customerId)?.name || s.customerId || 'N/A', key: 'customerId', filterable: true },
    { header: 'Total', accessor: (s: SaleRecord) => <span className="font-bold">{symbol}{fmt(s.total || 0,2)}</span>, key: 'total', sortable: true, filterable: true },
    { header: 'Status', accessor: (s: SaleRecord) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.isReturn ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{s.isReturn ? 'Returned' : 'Completed'}</span>, key: 'isReturn', filterable: true },
    {
        header: 'Actions',
        accessor: (sale: SaleRecord) => (
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleViewDocument(sale, 'a4')} title="View Invoice" className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                    <FileText size={16} />
                </button>
                <button onClick={() => downloadReceipt(sale)} title="Download" className="text-green-600 hover:bg-green-50 p-1 rounded">
                    <Printer size={16} />
                </button>
            </div>
        ),
        key: 'actions'
    }
  ];

  const itemColumns: Column<any>[] = [
      { header: 'Date', accessor: (i) => new Date(i.saleDate).toLocaleDateString(), key: 'saleDate', sortable: true, filterable: true },
      { header: 'Service Name', accessor: 'name', key: 'name', sortable: true, filterable: true },
      { header: 'Qty', accessor: 'quantity', key: 'quantity', filterable: true },
    { header: 'Rate', accessor: (i) => `${symbol}${fmt(i.price,2)}`, key: 'price', filterable: true },
    { header: 'Total', accessor: (i) => `${symbol}${fmt(Number(i.price) * Number(i.quantity),2)}`, key: 'itemTotal', filterable: true },
      { header: 'Invoice Ref', accessor: (i) => <span className="font-mono text-xs">{i.saleId.slice(-8)}</span>, key: 'saleId', filterable: true },
  ];

  // Compute item history
  const itemHistory = (() => {
    const items: any[] = [];
    for (const s of services) {
        for (const it of enrichItems(s)) {
            const prod = products.find(p => p.id === (it.id || it.product_id));
            if (prod && prod.is_service) {
                items.push({
                    saleDate: s.date,
                    ...it,
                    saleId: s.id,
                    name: it.name
                });
            }
        }
    }
    return items;
  })();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Service History</h1>
            <p className="text-slate-500">View past service transactions and download invoices.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 px-1 flex items-center gap-2 font-medium text-sm transition-colors ${activeTab === 'services' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <FileText size={18} /> Service Records ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 px-1 flex items-center gap-2 font-medium text-sm transition-colors ${activeTab === 'items' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <FileText size={18} /> Item History ({itemHistory.length})
        </button>
      </div>

      {activeTab === 'services' && <DataTable data={services} columns={serviceColumns} title="Service Invoices" />}
      {activeTab === 'items' && <DataTable data={itemHistory} columns={itemColumns} title="Service Item History" />}

      {/* Document Modal */}
      {showDocModal && viewingSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Service Invoice #{viewingSale.id.slice(-8)}</h3>
              <button onClick={() => setShowDocModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
            </div>

            {/* Document Content */}
            <div className="border border-slate-200 p-8 bg-white">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold">{settings.name}</h1>
                <p className="text-sm text-slate-600">{settings.address}</p>
                <p className="text-sm text-slate-600">{settings.phone} | {settings.email}</p>
              </div>

              <div className="flex justify-between mb-8 pb-8 border-b border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-700">Invoice #</p>
                  <p className="font-mono text-lg font-bold">{viewingSale.id.slice(-8)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-700">Date</p>
                  <p className="font-mono">{new Date(viewingSale.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-sm font-medium text-slate-700 mb-2">Bill To:</p>
                <p className="font-medium">{customers.find(c => c.id === viewingSale.customerId)?.name || viewingSale.customerId || 'N/A'}</p>
              </div>

              <table className="w-full mb-8">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="text-left p-2 font-medium text-sm">Service</th>
                    <th className="text-right p-2 font-medium text-sm">Rate</th>
                    <th className="text-right p-2 font-medium text-sm">Qty</th>
                    <th className="text-right p-2 font-medium text-sm">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichItems(viewingSale).map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="p-2 text-sm">{item.name}</td>
                      <td className="text-right p-2 text-sm">{symbol}{fmt(item.price,2)}</td>
                      <td className="text-right p-2 text-sm">{item.quantity}</td>
                      <td className="text-right p-2 text-sm font-medium">{symbol}{fmt(Number(item.price) * Number(item.quantity),2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end mb-8 space-y-2">
                <div className="w-48">
                  <div className="flex justify-between border-t border-slate-300 pt-2 mb-2">
                    <span className="text-sm">Subtotal:</span>
                    <span className="text-sm font-mono">{symbol}{fmt(viewingSale.subtotal || 0,2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">VAT ({settings.vatRate}%):</span>
                    <span className="text-sm font-mono">{symbol}{fmt(viewingSale.vat || 0,2)}</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-slate-800 pt-2">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-lg font-mono">{symbol}{fmt(viewingSale.total || 0,2)}</span>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-slate-500 border-t border-slate-200 pt-4">
                <p>Thank you for your business!</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-6 justify-end">
              <button onClick={() => downloadReceipt(viewingSale)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Download</button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Print</button>
              <button onClick={() => sendEmailReceipt(viewingSale)} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">Email</button>
              <button onClick={() => setShowDocModal(false)} className="px-4 py-2 bg-slate-300 text-slate-800 rounded-lg hover:bg-slate-400 text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceHistory;
