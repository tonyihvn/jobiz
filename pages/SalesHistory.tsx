import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { authFetch } from '../services/auth';
import { SaleRecord, Product, CompanySettings } from '../types';
import { fmt } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';
import { useBusinessContext } from '../services/BusinessContext';
import { Printer, RotateCcw, X, Save, FileText, ShoppingBag, List, Download, Trash2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';

function appendBusinessIdToUrl(url: string, businessId?: string): string {
  if (!businessId) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}businessId=${encodeURIComponent(businessId)}`;
}

const SalesHistory = () => {
    const { symbol } = useCurrency();
    const { selectedBusinessId } = useBusinessContext();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'items' | 'stock'>('sales');
  
  // Return State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<SaleRecord | null>(null);
  const [returnReason, setReturnReason] = useState('');
  
  // Data
  const [products, setProducts] = useState<Product[]>([]);
    const emptySettings = { businessId: '', name: '', motto: '', address: '', phone: '', email: '', logoUrl: '', headerImageUrl: '', footerImageUrl: '', vatRate: 0, currency: '$' } as CompanySettings;
    const [settings, setSettings] = useState<CompanySettings>(emptySettings);
    const [customers, setCustomers] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                console.log('[SalesHistory] Loading data, selectedBusinessId:', selectedBusinessId);
                let s = db.sales && db.sales.getAll ? await db.sales.getAll(selectedBusinessId) : [];
                let p = db.products && db.products.getAll ? await db.products.getAll(selectedBusinessId) : [];
                const sv = db.services && db.services.getAll ? await db.services.getAll(selectedBusinessId) : [];
                const sett = db.settings && db.settings.get ? await db.settings.get() : emptySettings;
                let c = db.customers && db.customers.getAll ? await db.customers.getAll(selectedBusinessId) : [];
                const u = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
                
                console.log('[SalesHistory] Raw API response:', {
                  salesCount: (Array.isArray(s) ? s : []).length,
                  productsCount: (Array.isArray(p) ? p : []).length,
                  servicesCount: (Array.isArray(sv) ? sv : []).length,
                  customersCount: (Array.isArray(c) ? c : []).length,
                  firstSaleHasBizId: s && s[0] ? !!s[0].business_id : 'no sales',
                  userIsSuperAdmin: u && (u.is_super_admin || u.isSuperAdmin),
                });
                
                // For super admin: show filtered data when businessId is passed
                // For regular user: always filtered to their business
                const isSuperAdmin = u && (u.is_super_admin || u.isSuperAdmin);
                if (isSuperAdmin && selectedBusinessId) {
                    console.log('[SalesHistory] Super admin with business selection:', selectedBusinessId);
                    // Backend should already filter with businessId query param
                } else if (isSuperAdmin) {
                    console.log('[SalesHistory] Super admin: showing ALL data from all companies');
                } else if (selectedBusinessId) {
                    console.log('[SalesHistory] Filtering by business (non-super-admin):', selectedBusinessId);
                    // Backend already filters for regular users
                }
                
                console.log('[SalesHistory] After API call:', {
                  salesCount: (Array.isArray(s) ? s : []).length,
                  productsCount: (Array.isArray(p) ? p : []).length,
                  customersCount: (Array.isArray(c) ? c : []).length,
                });
                
                // Load stock history from endpoint
                let sh: any[] = [];
                try {
                    console.log('[SalesHistory] Fetching stock history from /api/stock/history...');
                    const res = await authFetch(appendBusinessIdToUrl('/api/stock/history', selectedBusinessId));
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
                setCurrentUser(u);
            } catch (e) {
                console.error('[SalesHistory] Failed to load sales history data:', e);
            }
        })();
        return () => { mounted = false; };
    }, [selectedBusinessId]);

  const handleViewDocument = (sale: SaleRecord, type?: 'thermal' | 'a4') => {
      // If is_proforma is 1, force A4 template (not thermal)
      const useA4 = sale.isProforma || (sale as any).is_proforma === 1;
      const docType = useA4 ? 'a4' : type || 'thermal';
      
      const receiptWindow = window.open('', 'Receipt', `width=${docType === 'a4' ? 1000 : 800},height=${docType === 'a4' ? 900 : 700},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no`);
      if (!receiptWindow) {
        alert('Please allow pop-ups to view receipts');
        return;
      }
      
      const fmtCurrency = (val: number, decimals = 2) => `${symbol}${val.toFixed(decimals)}`;
      
      // Get customer info - ensure we're looking it up correctly
      const customer = sale.customerId ? customers.find((c: any) => c.id === sale.customerId) : null;
      
      let htmlContent = '';
      
      if (docType === 'thermal') {
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Thermal Receipt</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: monospace; background: white; padding: 20px; }
              .receipt { width: 300px; margin: 0 auto; padding: 16px; border: 1px solid #ccc; }
              .header { text-align: center; margin-bottom: 24px; }
              .header h1 { font-size: 14px; font-weight: bold; letter-spacing: 2px; margin-bottom: 4px; }
              .header p { font-size: 10px; color: #666; }
              .divider { border-bottom: 1px dashed #999; margin: 16px 0; }
              .info { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px; }
              table { width: 100%; font-size: 10px; margin-bottom: 16px; }
              th { border-bottom: 1px solid #ccc; padding: 4px; text-align: left; font-weight: bold; }
              td { padding: 4px; }
              .text-right { text-align: right; }
              .footer { text-align: center; font-size: 10px; color: #999; margin-top: 32px; }
              @media print { body { padding: 0; } .receipt { border: none; } }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="header">
                <h1>${settings.name}</h1>
                <p>${settings.address || ''}</p>
                <p>${settings.phone || ''}</p>
              </div>
              <div class="divider"></div>
              <div class="info">
                <span>Date: ${new Date(sale.date).toLocaleDateString()}</span>
                <span>Time: ${new Date(sale.date).toLocaleTimeString()}</span>
              </div>
              <div class="info">
                <span>Receipt #: ${sale.id.slice(-8)}</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th class="text-right">Qty</th>
                    <th class="text-right">Amt</th>
                  </tr>
                </thead>
                <tbody>
                  ${(sale.items || []).map((item: any) => `
                    <tr>
                      <td>${item.name}<br><span style="font-size: 9px; color: #999;">${item.unit || 'pcs'}</span></td>
                      <td class="text-right">${item.quantity}</td>
                      <td class="text-right">${fmtCurrency(Number(item.price) * Number(item.quantity), 2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="divider"></div>
              <div class="info"><span>Subtotal</span><span class="text-right">${fmtCurrency(sale.subtotal, 2)}</span></div>
              <div class="info"><span>VAT</span><span class="text-right">${fmtCurrency(sale.vat, 2)}</span></div>
              <div class="info" style="font-weight: bold; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ccc;">
                <span>TOTAL</span><span class="text-right">${fmtCurrency(Number(sale.total), 2)}</span>
              </div>
              <div class="footer">
                <p>Thank you!</p>
              </div>
            </div>
            <script>
              window.onload = () => { window.print(); };
              window.onafterprint = () => { window.close(); };
            </script>
          </body>
          </html>
        `;
      } else {
        // A4 Invoice (including Proforma)
        const hasHeaderFooter = settings.headerImageUrl && settings.footerImageUrl;
        const invoiceTitle = useA4 && sale.isProforma ? 'PROFORMA INVOICE' : 'INVOICE';
        
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${invoiceTitle}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: white; padding: 40px; }
              .wrapper { display: flex; flex-direction: column; min-height: 297mm; }
              .container { max-width: 210mm; margin: 0 auto; flex: 1; background: white; color: #1e293b; padding: ${hasHeaderFooter ? '0' : '40px'}; }
              .content { padding: 40px; }
              .header-img { width: 100%; height: auto; display: block; }
              .footer-img { width: 100%; height: auto; display: block; margin-top: auto; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
              .title h1 { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
              .title p { color: #64748b; font-size: 13px; }
              .company { text-align: right; }
              .company h2 { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
              .company p { font-size: 11px; color: #64748b; margin-bottom: 2px; }
              .bill-to { margin-bottom: 24px; }
              .bill-to h3 { font-size: 11px; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; }
              .bill-to p { font-size: 13px; color: #1e293b; margin-bottom: 2px; line-height: 1.4; }
              .bill-to strong { font-weight: 600; }
              .invoice-details { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 12px; }
              .detail-item { }
              .detail-label { font-weight: bold; color: #64748b; }
              table { width: 100%; margin-bottom: 24px; border-collapse: collapse; }
              thead { border-bottom: 2px solid #1e293b; }
              th { text-align: left; padding: 10px 0; font-weight: bold; font-size: 12px; color: #1e293b; }
              td { padding: 12px 0; font-size: 13px; color: #475569; border-bottom: 1px solid #e2e8f0; }
              th.right, td.right { text-align: right; }
              .totals { display: flex; justify-content: flex-end; margin-top: 24px; }
              .totals-table { width: 280px; }
              .totals-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #475569; }
              .totals-row.final { border-top: 2px solid #1e293b; padding-top: 8px; font-size: 15px; font-weight: bold; color: #1e293b; }
              .notes { margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569; }
              @media print { body { padding: 0; margin: 0; } .wrapper { min-height: auto; } .container { padding: 0; } .content { padding: 40px; } @page { size: A4; margin: 0; } }
            </style>
          </head>
          <body>
            <div class="wrapper">
              ${hasHeaderFooter ? `<img src="${settings.headerImageUrl}" class="header-img" />` : ''}
              <div class="container">
                <div class="content">
                  <div class="header">
                    <div class="title">
                      <h1>${invoiceTitle}</h1>
                      <p>#${sale.id.slice(-8)}</p>
                    </div>
                    ${!hasHeaderFooter ? `<div class="company">
                      <h2>${settings.name}</h2>
                      <p>${settings.address || ''}</p>
                      <p>${settings.phone || ''}</p>
                      <p>${settings.email || ''}</p>
                    </div>` : ''}
                  </div>

                  <div class="bill-to">
                    <h3>BILL TO</h3>
                    ${customer ? `
                      <p><strong>${customer.name || 'N/A'}</strong></p>
                      ${customer.company ? `<p>${customer.company}</p>` : ''}
                      ${customer.address ? `<p>${customer.address}</p>` : ''}
                      ${customer.phone ? `<p>Phone: ${customer.phone}</p>` : ''}
                      ${customer.email ? `<p>Email: ${customer.email}</p>` : ''}
                    ` : '<p><em>Walk-in Customer</em></p>'}
                  </div>

                  <div class="invoice-details">
                    <div class="detail-item">
                      <span class="detail-label">Invoice Date:</span> ${new Date(sale.date).toLocaleDateString()}
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Invoice ID:</span> ${sale.id.slice(-8)}
                    </div>
                    ${sale.particulars ? `<div class="detail-item"><span class="detail-label">Particulars:</span> ${sale.particulars}</div>` : ''}
                  </div>

                  <table>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th class="right">Qty</th>
                        <th class="right">Rate</th>
                        <th class="right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(sale.items || []).map((item: any) => `
                        <tr>
                          <td>${item.name || ''}</td>
                          <td class="right">${item.quantity || 0}</td>
                          <td class="right">${symbol}${(Number(item.price)).toFixed(2)}</td>
                          <td class="right"><strong>${symbol}${(Number(item.price) * Number(item.quantity)).toFixed(2)}</strong></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>

                  <div class="totals">
                    <div class="totals-table">
                      <div class="totals-row">
                        <span>Subtotal</span>
                        <span>${symbol}${Number(sale.subtotal).toFixed(2)}</span>
                      </div>
                      ${Number(sale.vat) > 0 ? `
                      <div class="totals-row">
                        <span>VAT (${settings.vatRate || 7.5}%)</span>
                        <span>${symbol}${Number(sale.vat).toFixed(2)}</span>
                      </div>
                      ` : ''}
                      <div class="totals-row final">
                        <span>TOTAL</span>
                        <span>${symbol}${Number(sale.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  ${sale.particulars ? `<div class="notes"><strong>Notes:</strong> ${sale.particulars}</div>` : ''}
                  ${settings.invoiceNotes ? `<div class="notes"><strong>Invoice Notes:</strong> ${settings.invoiceNotes}</div>` : ''}
                </div>
              </div>
              ${hasHeaderFooter ? `<img src="${settings.footerImageUrl}" class="footer-img" />` : ''}
            </div>
            <script>
              window.onload = () => { window.print(); };
            </script>
          </body>
          </html>
        `;
      }
      
      receiptWindow.document.write(htmlContent);
      receiptWindow.document.close();
  };

  const handleReturn = (sale: SaleRecord) => {
      setSelectedSaleForReturn(sale);
      setShowReturnModal(true);
  };

  const handleDeleteSale = async (saleId: string) => {
      if (!window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
          return;
      }
      try {
          const response = await db.sales.delete(saleId);
          if (response && !response.error) {
              alert('Sale deleted successfully');
              setSales(sales.filter(s => s.id !== saleId));
          } else {
              alert('Failed to delete: ' + (response?.error || 'Unknown error'));
          }
      } catch (e) {
          console.error('Delete failed:', e);
          alert('Failed to delete sale');
      }
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
                <button 
                  onClick={() => {
                    // Enrich sale data with item names and customer info before sending to POS
                    const enrichedSale = {
                      ...s,
                      customer: s.customerId ? customers.find(c => c.id === s.customerId) : null,
                    };
                    window.history.pushState({ usr: enrichedSale }, '', '/#/pos');
                    window.location.href = '/#/pos';
                  }} 
                  title="Edit Sale"
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs font-bold border border-blue-200 px-2 py-1 rounded bg-blue-50"
                >
                  Edit
                </button>
                {!s.isReturn && !s.isProforma && (
                    <button onClick={() => handleReturn(s)} className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-xs font-bold border border-orange-200 px-2 py-1 rounded bg-orange-50">
                        <RotateCcw size={14} /> Return
                    </button>
                )}
                {currentUser && (currentUser.is_super_admin || currentUser.roleId) && (
                    <button onClick={() => handleDeleteSale(s.id)} className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs font-bold border border-red-200 px-2 py-1 rounded bg-red-50">
                        <Trash2 size={14} /> Delete
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
    </div>
  );
};

export default SalesHistory;

    
