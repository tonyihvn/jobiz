import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { authFetch } from '../services/auth';
import { SaleRecord, Product, CompanySettings } from '../types';
import { fmt } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';
import { useBusinessContext } from '../services/BusinessContext';
import { Printer, RotateCcw, X, Save, FileText, ShoppingBag, List, Download, Trash2, Mail, MessageCircle } from 'lucide-react';
import html2pdf from 'html2pdf.js';

function appendBusinessIdToUrl(url: string, businessId?: string): string {
  if (!businessId) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}businessId=${encodeURIComponent(businessId)}`;
}

const SalesHistory = () => {
    const { symbol, setSymbol } = useCurrency();
    const { selectedBusinessId } = useBusinessContext();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'items' | 'stock'>('sales');
  
  // Return State
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<SaleRecord | null>(null);
  const [returnReason, setReturnReason] = useState('');
  
  // Item-level Return State
  const [showItemReturnModal, setShowItemReturnModal] = useState(false);
  const [selectedItemForReturn, setSelectedItemForReturn] = useState<any>(null);
  const [itemReturnQuantity, setItemReturnQuantity] = useState<number>(1);
  const [itemReturnReason, setItemReturnReason] = useState('');
  
  // Document menu state
  const [showDocMenu, setShowDocMenu] = useState(false);
  const [selectedSaleForDoc, setSelectedSaleForDoc] = useState<SaleRecord | null>(null);
  
  // Data
  const [products, setProducts] = useState<Product[]>([]);
    const emptySettings = { businessId: '', name: '', motto: '', address: '', phone: '', email: '', logoUrl: '', logoAlign: 'left', logoHeight: 80, headerImageUrl: '', headerImageHeight: 100, footerImageUrl: '', footerImageHeight: 60, footerImageTopMargin: 0, watermarkImageUrl: '', watermarkAlign: 'center', signatureUrl: '', vatRate: 0, currency: '$' } as CompanySettings;
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
                const sett = db.settings && db.settings.get ? await db.settings.get(selectedBusinessId) : emptySettings;
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
                // Update currency context if settings have a currency symbol
                if (sett && sett.currency) {
                    setSymbol(sett.currency);
                }
                setCustomers(Array.isArray(c) ? c : []);
                setCurrentUser(u);
            } catch (e) {
                console.error('[SalesHistory] Failed to load sales history data:', e);
            }
        })();
        return () => { mounted = false; };
    }, [selectedBusinessId]);

  const handleViewDocument = (sale: SaleRecord, type?: 'thermal' | 'a4') => {
      // Store sale data in sessionStorage and open in new tab
      sessionStorage.setItem('invoiceData', JSON.stringify(sale));
      if (type) {
        sessionStorage.setItem('receiptType', type);
      }
      
      // Open in new tab - HashRouter compatible
      const newTab = window.open('/#/print-receipt', '_blank');
      if (!newTab) {
        alert('Please allow pop-ups to view receipts');
        sessionStorage.removeItem('invoiceData');
        sessionStorage.removeItem('receiptType');
        return;
      }
      return;
      
      // Get customer info - ensure we're looking it up correctly
      const customer = sale.customerId ? customers.find((c: any) => c.id === sale.customerId) : null;
  };

  const handleReturn = (sale: SaleRecord) => {
      setSelectedSaleForReturn(sale);
      setShowReturnModal(true);
  };

  const handleReturnItem = (item: any) => {
      setSelectedItemForReturn(item);
      setItemReturnQuantity(1);
      setItemReturnReason('');
      setShowItemReturnModal(true);
  };

  const handleDeleteSale = async (saleId: string) => {
      if (!window.confirm('Are you sure you want to delete this sale? This action cannot be undone.')) {
          return;
      }
      try {
          const response = await db.sales.delete(saleId);
          if (response && response.id) {
              alert('Sale deleted successfully');
              setSales(sales.filter(s => s.id !== saleId));
          } else if (response && response.error) {
              alert('Failed to delete: ' + response.error);
          } else {
              alert('Failed to delete: Unknown error (server returned no response)');
          }
      } catch (e) {
          console.error('Delete failed:', e);
          alert('Failed to delete sale: ' + (e instanceof Error ? e.message : String(e)));
      }
  };

  const enrichItems = (sale: SaleRecord) => {
      return (sale.items || []).map((it: any) => {
          const prod = products.find(p => p.id === (it.product_id || it.id));
          return {
              ...it,
              product_id: it.product_id || it.id,  // Ensure product_id is always set
              id: it.id || it.product_id,
              name: it.name || (prod ? prod.name : '') || '',
              description: it.description || prod?.details || prod?.description || '',
              unit: it.unit || prod?.unit || 'N/A'
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
          const custId = (sale as any).customerId || (sale as any).customer_id;
          const customer = custId ? customers.find(c => c.id === custId || String(c.id) === String(custId)) : null;
          console.log('[SalesHistory] sendEmailReceipt - Customer lookup:', { custId, found: !!customer, customerName: customer?.name });
          const defaultTo = customer?.email || '';
          
          // If customer has no email, prompt user to enter one
          let to = defaultTo;
          if (!to) {
              to = window.prompt('Customer has no email on file. Enter email address to send invoice:');
              if (!to) return; // User cancelled
          }
          
          const subject = `Receipt ${sale.id.slice(-8)} from ${settings.name}`;
          
          // Generate HTML content for PDF (A4 invoice format) with logo and proper items
          const useA4 = sale.isProforma || (sale as any).is_proforma === 1;
          const invoiceTitle = useA4 && sale.isProforma ? 'PROFORMA INVOICE' : 'INVOICE';
          const footerHeightMm = settings.footerImageUrl ? (settings.footerImageHeight || 60) * 0.26458333 : 0;
          const maxHeightMm = 297 - footerHeightMm;
          
          let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>${invoiceTitle}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: white; padding: 0; }
                @page { size: A4; margin: 0; padding: 0; page-break-after: avoid; }
                .wrapper { display: flex; flex-direction: column; min-height: 100vh; }
                .container { width: 210mm; margin: 0 auto; background: white; color: #1e293b; display: flex; flex-direction: column; box-sizing: border-box; flex: 1; }
                .footer-spacer { flex: 1; }
                .header-img { width: 100%; height: auto; display: block; }
                .footer-img { width: 100%; height: auto; display: block; }
                .logo-section { width: 100%; padding: 15px 0; display: flex; align-items: center; justify-content: ${settings.logoAlign === 'center' ? 'center' : settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'}; }
                .logo-section img { max-height: ${settings.logoHeight || 100}px; max-width: 200px; width: auto; }
                .content { padding: 20px; display: flex; flex-direction: column; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
                .title h1 { font-size: 20px; font-weight: bold; margin-bottom: 3px; }
                .title p { color: #64748b; font-size: 11px; }
                .company { text-align: right; }
                .company h2 { font-weight: bold; font-size: 11px; margin-bottom: 3px; }
                .company p { font-size: 9px; color: #64748b; margin-bottom: 1px; }
                .bill-to { margin-bottom: 15px; }
                .bill-to h3 { font-size: 10px; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-bottom: 5px; }
                .bill-to p { font-size: 11px; color: #1e293b; margin-bottom: 2px; line-height: 1.3; }
                .bill-to strong { font-weight: 600; }
                .invoice-details { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; }
                .detail-label { font-weight: bold; color: #64748b; }
                table { width: 100%; margin-bottom: 5px; border-collapse: collapse; }
                thead { background: #f1f5f9; }
                th { text-align: left; padding: 7px; font-weight: bold; font-size: 10px; color: #1e293b; background: #f1f5f9; border: 1px solid #cbd5e1; }
                td { padding: 7px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; background: #fafbfc; }
                th.right, td.right { text-align: right; }
                .totals { display: flex; justify-content: flex-end; margin-top: 15px; }
                .totals-table { width: 250px; }
                .totals-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; color: #475569; }
                .totals-row.final { border-top: 1px solid #1e293b; padding-top: 5px; font-size: 12px; font-weight: bold; color: #1e293b; }
                .notes { margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #475569; }
                .totals-table { min-width: 35%; max-width: 45%; }
              </style>
            </head>
            <body>
              <div class="wrapper">
                ${settings.logoUrl ? `<div class="logo-section"><img src="${settings.logoUrl}" alt="Company Logo" style="max-height: ${settings.logoHeight || 100}px;" /></div>` : ''}
                ${settings.headerImageUrl ? `<img src="${settings.headerImageUrl}" class="header-img" alt="Header" style="width: 100%; height: ${settings.headerImageHeight || 100}px; display: block; object-fit: cover;" />` : ''}
                <div class="container">
                  <div class="content">
                  <div class="header">
                    <div class="title">
                      <h1>${invoiceTitle}</h1>
                      <p>#${sale.id.slice(-8)}</p>
                    </div>
                      <div class="company">
                        <h2>${settings.name}</h2>
                        <p>${settings.address || ''}</p>
                        <p>${settings.phone || ''}</p>
                        <p>${settings.email || ''}</p>
                      </div>
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
                      <div><span class="detail-label">Invoice Date:</span> ${new Date(sale.date).toLocaleDateString()}</div>
                      <div><span class="detail-label">Invoice ID:</span> ${sale.id.slice(-8)}</div>
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
                        ${enrichItems(sale).map((item: any) => `
                          <tr>
                            <td>${item.name || item.description || 'Item'}</td>
                            <td class="right">${Number(item.quantity || 0).toFixed(0)}</td>
                            <td class="right">${symbol}${Number(item.price || 0).toFixed(2)}</td>
                            <td class="right"><strong>${symbol}${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</strong></td>
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
                      ${Number(sale.deliveryFee) > 0 ? `
                      <div class="totals-row">
                        <span>Delivery</span>
                        <span>${symbol}${Number(sale.deliveryFee).toFixed(2)}</span>
                      </div>
                      ` : ''}
                      <div class="totals-row final">
                        <span>TOTAL</span>
                        <span>${symbol}${Number(sale.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                    ${sale.particulars ? `<div class="notes"><strong>Notes:</strong> ${sale.particulars}</div>` : ''}
                    ${settings.invoiceNotes ? `<div class="notes"><strong>Invoice Notes:</strong><br/>${settings.invoiceNotes}</div>` : ''}
                    <div style="position: relative; margin-bottom: 0; min-height: 200px; background-image: ${settings.watermarkImageUrl ? `url('${settings.watermarkImageUrl}')` : 'none'}; background-position: center; background-repeat: no-repeat; background-size: cover; background-attachment: scroll; opacity: 0.15;"></div>
                    <div style="position: relative; margin-bottom: 0; background-image: ${settings.signatureUrl ? `url('${settings.signatureUrl}')` : 'none'}; background-position: right center; background-repeat: no-repeat; background-size: contain; min-height: 0;"></div>
                  </div>
                </div>
                ${settings.footerImageUrl ? `<div class="footer-spacer" style="margin-top: ${settings.footerImageTopMargin || 0}px;"></div><img src="${settings.footerImageUrl}" class="footer-img" style="width: 100%; height: ${settings.footerImageHeight || 60}px; display: block; object-fit: contain; margin: 0; padding: 0;" />` : ''}
              </div>
            </body>
            </html>
          `;
          
          // Convert HTML to PDF and send
          try {
              const element = document.createElement('div');
              element.innerHTML = htmlContent;
              const pdfOptions = {
                  margin: 0,
                  filename: `Receipt_${sale.id.slice(-8)}.pdf`,
                  image: { type: 'jpeg' as const, quality: 0.98 },
                  html2canvas: { scale: 2 },
                  jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
              };
              
              const pdfBlob = await new Promise<Blob>((resolve, reject) => {
                  html2pdf().set(pdfOptions).from(element).output('blob').then(resolve).catch(reject);
              });
              
              const formData = new FormData();
              formData.append('to', to);
              formData.append('subject', subject);
              formData.append('file', pdfBlob, `Receipt_${sale.id.slice(-8)}.pdf`);
              
              const res = await authFetch('/api/send-email-pdf', { method: 'POST', body: formData });
              const j = await res.json();
              if (res.ok) alert('Invoice sent to ' + to); else alert('Email failed: ' + (j && j.error ? j.error : res.statusText));
          } catch (e) {
              console.warn('PDF generation failed', e);
              alert('Failed to generate PDF for email');
          }
      } catch (e) { console.warn('Email send failed', e); alert('Failed to send email'); }
  };

  const sendWhatsAppReceipt = async (sale: SaleRecord) => {
      try {
          const custId = (sale as any).customerId || (sale as any).customer_id;
          const customer = custId ? customers.find(c => c.id === custId || String(c.id) === String(custId)) : null;
          console.log('[SalesHistory] sendWhatsAppReceipt - Customer lookup:', { custId, found: !!customer, customerName: customer?.name });
          let phone = customer?.phone || '';
          
          // If customer has no phone, prompt user to enter one
          if (!phone) {
              phone = window.prompt('Customer has no phone on file. Enter phone number (with country code) to share invoice via WhatsApp:');
              if (!phone) return; // User cancelled
          }
          
          // Generate A4 invoice HTML for PDF
          const invoiceTitle = sale.isProforma ? 'PROFORMA INVOICE' : 'INVOICE';
          const footerHeightMm2 = settings.footerImageUrl ? (settings.footerImageHeight || 60) * 0.26458333 : 0;
          const maxHeightMm2 = 297 - footerHeightMm2;
          
          let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>${invoiceTitle}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: white; }
                @page { size: A4; margin: 0; }
                .page-wrapper { width: 210mm; margin: 0 auto; background: white; display: flex; flex-direction: column; min-height: 100vh; }
                .header-image { width: 100%; height: ${settings.headerImageHeight || 100}px; overflow: hidden; display: block; margin: 0; padding: 0; }
                .header-image img { width: 100%; height: 100%; display: block; object-fit: cover; margin: 0; padding: 0; }
                .logo-section { width: 100%; padding: 8px 12px; display: flex; align-items: flex-start; justify-content: ${settings.logoAlign === 'center' ? 'center' : settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'}; min-height: 60px; margin: 0; }
                .logo-section img { width: auto; height: ${settings.logoHeight || 100}px; max-width: 200px; display: block; }
                .container { width: 100%; margin: 0; background: white; color: #1e293b; padding: 20px; flex: 1; box-sizing: border-box; ${settings.footerImageUrl ? 'overflow: auto;' : ''} }
                .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; }
                .title h1 { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
                .title p { color: #64748b; font-size: 12px; }
                .company { text-align: right; }
                .company h2 { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
                .company p { font-size: 10px; color: #64748b; margin-bottom: 2px; }
                .bill-to { margin-bottom: 20px; }
                .bill-to h3 { font-size: 10px; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; }
                .bill-to p { font-size: 11px; color: #1e293b; margin-bottom: 2px; }
                .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 11px; }
                table { width: 100%; margin-bottom: 5px; border-collapse: collapse; }
                th { text-align: left; padding: 8px; font-weight: bold; font-size: 11px; color: #1e293b; background: #f1f5f9; border: 1px solid #cbd5e1; }
                td { padding: 8px; font-size: 11px; color: #475569; border: 1px solid #cbd5e1; background: #fafbfc; }
                th.right, td.right { text-align: right; }
                .totals { display: flex; justify-content: flex-end; margin-top: 20px; }
                .totals-table { min-width: 35%; max-width: 45%; }
                .totals-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
                .totals-row.final { border-top: 1px solid #1e293b; padding-top: 6px; font-size: 13px; font-weight: bold; }
                .footer-image { width: 100%; height: ${settings.footerImageHeight || 60}px; overflow: hidden; display: block; margin: 0; padding: 0; }
                .footer-image img { width: 100%; height: 100%; display: block; object-fit: cover; margin: 0; padding: 0; }
              </style>
            </head>
            <body>
              <div class="page-wrapper">
                ${settings.headerImageUrl ? `<div class="header-image"><img src="${settings.headerImageUrl}" /></div>` : (settings.logoUrl ? `<div class="logo-section"><img src="${settings.logoUrl}" /></div>` : '')}
                <div class="container">
                  <div class="header">
                    <div class="title">
                      <h1>${invoiceTitle}</h1>
                      <p>#${sale.id.slice(-8)}</p>
                    </div>
                    <div class="company">
                      <h2>${settings.name}</h2>
                      <p>${settings.address || ''}</p>
                    <p>${settings.phone || ''}</p>
                  </div>
                </div>

                <div class="bill-to">
                  <h3>BILL TO</h3>
                  ${customer ? `
                    <p><strong>${customer.name || 'N/A'}</strong></p>
                    ${customer.company ? `<p>${customer.company}</p>` : ''}
                    ${customer.address ? `<p>${customer.address}</p>` : ''}
                    ${customer.phone ? `<p>Phone: ${customer.phone}</p>` : ''}
                  ` : '<p>Walk-in Customer</p>'}
                </div>

                <div class="invoice-details">
                  <div>Date: ${new Date(sale.date).toLocaleDateString()}</div>
                  <div>Invoice ID: ${sale.id.slice(-8)}</div>
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
                    ${enrichItems(sale).map((item: any) => `
                      <tr>
                        <td>${item.name || ''}</td>
                        <td class="right">${item.quantity || 0}</td>
                        <td class="right">${symbol}${Number(item.price).toFixed(2)}</td>
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
                ${settings.footerImageUrl ? `<div class="footer-spacer" style="margin-top: ${settings.footerImageTopMargin || 0}px;"></div><img src="${settings.footerImageUrl}" class="footer-img" style="width: 100%; height: ${settings.footerImageHeight || 60}px; display: block; object-fit: contain; margin: 0; padding: 0;" />` : ''}
              </div>
            </body>
            </html>
          `;
          
          // Convert HTML to PDF and download
          try {
              const element = document.createElement('div');
              element.innerHTML = htmlContent;
              
              const pdfBlob = await new Promise<Blob>((resolve, reject) => {
                  html2pdf().set({
                      margin: 0,
                      filename: `Invoice_${sale.id.slice(-8)}.pdf`,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2 },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                  }).from(element).output('blob').then(resolve).catch(reject);
              });
              
              // Download PDF to user's device
              const url = URL.createObjectURL(pdfBlob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `Invoice_${sale.id.slice(-8)}.pdf`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);

              // Open WhatsApp with message
              const invoiceAmount = symbol + fmt(sale.total, 2);
              const message = encodeURIComponent(
                  `Hello,\n\nPlease find the attached invoice.\n\n` +
                  `Invoice #: ${sale.id.slice(-8)}\n` +
                  `Amount: ${invoiceAmount}\n\n` +
                  `PDF has been downloaded to your device. Please check your downloads folder.\n\n` +
                  `Thank you!`
              );
              const cleanPhone = phone.replace(/[^0-9+]/g, '');
              const whatsappLink = `https://wa.me/${cleanPhone}?text=${message}`;
              
              window.open(whatsappLink, '_blank');
              alert('PDF downloaded! WhatsApp will open on your device. Send the invoice to the customer.');
          } catch (e) {
              console.warn('PDF generation failed', e);
              alert('Failed to generate PDF for WhatsApp');
          }
      } catch (e) { console.warn('WhatsApp send failed', e); alert('Failed to send via WhatsApp'); }
  };

    const processReturn = async () => {
            if (!selectedSaleForReturn || !returnReason) return;
            try {
                if (db.sales && db.sales.processReturn) await db.sales.processReturn(selectedSaleForReturn.id, returnReason, products);
                const s = db.sales && db.sales.getAll ? await db.sales.getAll() : [];
                const p = db.products && db.products.getAll ? await db.products.getAll(selectedBusinessId) : [];
                setSales(Array.isArray(s) ? s : []);
                setProducts(Array.isArray(p) ? p : []);
                setShowReturnModal(false);
                setReturnReason('');
                setSelectedSaleForReturn(null);
            } catch (e) {
                console.warn('Failed to process return', e);
            }
    };

    const processItemReturn = async () => {
        if (!selectedItemForReturn || !itemReturnReason || itemReturnQuantity <= 0) {
            alert('Please fill in all fields and ensure quantity is greater than 0');
            return;
        }
        if (itemReturnQuantity > Number(selectedItemForReturn.quantity)) {
            alert(`Cannot return more than ${selectedItemForReturn.quantity} items`);
            return;
        }
        try {
            const returnData = {
                saleId: selectedItemForReturn.saleId,
                productId: selectedItemForReturn.id || selectedItemForReturn.product_id,
                quantity: itemReturnQuantity,
                reason: itemReturnReason,
                originalQuantity: selectedItemForReturn.quantity
            };
            
            const response = await authFetch('/api/sales/return-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(returnData)
            });
            
            const result = await response.json().catch(() => ({}));
            if (response.ok && (result.success || result.id)) {
                alert('Item return processed successfully');
                // Refresh sales and products data
                const s = db.sales && db.sales.getAll ? await db.sales.getAll(selectedBusinessId) : [];
                const p = db.products && db.products.getAll ? await db.products.getAll(selectedBusinessId) : [];
                setSales(Array.isArray(s) ? s : []);
                setProducts(Array.isArray(p) ? p : []);
                setShowItemReturnModal(false);
                setItemReturnQuantity(1);
                setItemReturnReason('');
                setSelectedItemForReturn(null);
            } else {
                alert(`Failed to process return: ${result.error || 'Unknown error'}`);
            }
        } catch (e) {
            console.error('Item return error:', e);
            alert(`Error processing return: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

  const salesColumns: Column<SaleRecord>[] = [
    { header: 'Receipt #', accessor: (s) => s.id.slice(-8), key: 'id' },
    { header: 'Date', accessor: (s) => new Date(s.date).toLocaleString(), key: 'date', sortable: true },
    { header: 'Type', accessor: (s) => s.isReturn ? 'Return' : s.isProforma ? 'Proforma' : 'Sale', key: 'isReturn' },
    { 
      header: 'Customer', 
      accessor: (s) => {
        // Support both customerId (camelCase) and customer_id (snake_case from DB)
        const custId = (s as any).customerId || (s as any).customer_id;
        const customer = custId ? customers.find(c => c.id === custId || String(c.id) === String(custId)) : null;
        if (!customer) return <span className="text-slate-500">Walk-in</span>;
        return (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-slate-800">{customer.name || 'N/A'}</span>
            {customer.company && <span className="text-xs text-slate-600">{customer.company}</span>}
          </div>
        );
      }, 
      key: 'customerId' 
    },
    { header: 'Total', accessor: (s) => <span className={s.isReturn ? 'text-rose-600' : ''}>{symbol}{fmt(s.total,2)}</span>, key: 'total', sortable: true },
    { 
        header: 'Documents', 
        accessor: (s) => (
            <div className="relative">
                 <button 
                   onClick={() => { setSelectedSaleForDoc(s); setShowDocMenu(true); }} 
                   title="View Invoice Options" 
                   className="p-1 hover:bg-slate-100 rounded border border-slate-200 text-slate-600"
                 >
                    <FileText size={14}  className="inline-block align-middle mr-1" />View Options
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
                    // Enrich sale data with full customer and product info before sending to POS
                    const enrichedSale = {
                      ...s,
                      items: enrichItems(s),
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
      { header: 'Action', accessor: (i) => (
          <button onClick={() => handleReturnItem(i)} className="text-orange-600 hover:text-orange-800 flex items-center gap-1 text-xs font-bold border border-orange-200 px-2 py-1 rounded bg-orange-50">
              <RotateCcw size={14} /> Return
          </button>
      ), key: 'action' }
  ];

  const stockHistoryColumns: Column<any>[] = [
    { header: 'Date', accessor: (h) => new Date(h.timestamp).toLocaleString(), key: 'timestamp', sortable: true, filterable: true },
    { header: 'Product', accessor: (h) => products.find(p => p.id === h.product_id)?.name || h.product_id, key: 'product_id', sortable: true, filterable: true },
    { header: 'Type', accessor: 'type', key: 'type', filterable: true },
    { header: 'Change', accessor: (h) => h.change_amount, key: 'change_amount', filterable: true },
    { header: 'Reference', accessor: 'reference_id', key: 'reference_id', filterable: true },
    { header: 'Notes', accessor: 'notes', key: 'notes', filterable: true },
  ];

  const downloadReceipt = (sale: SaleRecord) => {
    try {
      const useA4 = sale.isProforma || (sale as any).is_proforma === 1;
      const invoiceTitle = useA4 && sale.isProforma ? 'PROFORMA INVOICE' : 'INVOICE';
      
      // Generate the same HTML content as handleViewDocument
      const hasHeaderFooter = settings.headerImageUrl && settings.footerImageUrl;
      const custId = (sale as any).customerId || (sale as any).customer_id;
      const customer = custId ? customers.find((c: any) => c.id === custId || String(c.id) === String(custId)) : null;
      console.log('[SalesHistory] downloadReceipt - Customer lookup:', { custId, found: !!customer, customerName: customer?.name });
      
      let htmlContent = '';
      
      if (useA4) {
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>${invoiceTitle}</title>
            <style>
              @page { margin: 0; padding: 0; page-break-after: avoid; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html { margin: 0; padding: 0; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: white; margin: 0; padding: 0; width: 100%; overflow-x: hidden; }
              .wrapper { display: flex; flex-direction: column; max-width: 210mm; margin: 0 auto; padding: 0; }
              .container { width: 100%; margin: 0; background: white; color: #1e293b; display: flex; flex-direction: column; box-sizing: border-box; flex: 1; }
              .content { padding: 40px; display: flex; flex-direction: column; max-width: 100%; box-sizing: border-box; }
              .header-img { width: 100%; height: auto; display: block; min-height: 100px; }
              .logo-container { width: 100%; padding: 20px 0; display: flex; align-items: center; justify-content: ${settings.logoAlign === 'center' ? 'center' : settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'}; padding-left: ${settings.logoAlign === 'left' ? '20px' : '0'}; padding-right: ${settings.logoAlign === 'right' ? '20px' : '0'}; min-height: ${settings.logoHeight || 100}px; }
              .logo-img { width: auto; height: ${settings.logoHeight || 100}px; max-width: 200px; display: block; }
              .footer-img { width: 100%; height: auto; display: block; }
              .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 8px; max-width: 100%; box-sizing: border-box; }
              .title { flex-shrink: 0; }
              .title h1 { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
              .title p { color: #64748b; font-size: 13px; }
              .company { text-align: right; position: relative; flex: 0 0 auto; max-width: 50%; min-width: 0; word-wrap: break-word; overflow-wrap: break-word; }
              .company h2 { font-weight: bold; font-size: 12px; margin-bottom: 4px; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.2; }
              .company p { font-size: 11px; color: #64748b; margin-bottom: 2px; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.15; }
              .bill-to { margin-bottom: 24px; max-width: 100%; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word; }
              .bill-to h3 { font-size: 11px; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; }
              .bill-to p { font-size: 13px; color: #1e293b; margin-bottom: 2px; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; }
              .bill-to strong { font-weight: 600; }
              .invoice-details { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 12px; }
              .detail-label { font-weight: bold; color: #64748b; }
              table { width: 100%; margin-bottom: 5px; border-collapse: collapse; table-layout: fixed; box-sizing: border-box; }
              thead { border-bottom: 2px solid #1e293b; }
              th { text-align: left; padding: 10px; font-weight: bold; font-size: 12px; color: #1e293b; background: #f1f5f9; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word; }
              td { padding: 10px; font-size: 13px; color: #475569; border: 1px solid #cbd5e1; background: #fafbfc; word-break: break-word; overflow-wrap: break-word; }
              th.right, td.right { text-align: right; }
              .totals { display: flex; justify-content: flex-end; margin-top: 24px; max-width: 100%; box-sizing: border-box; }
              .totals-table { min-width: 35%; max-width: 50%; }
              .totals-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: #475569; }
              .totals-row.final { border-top: 1px solid #1e293b; padding-top: 8px; font-size: 15px; font-weight: bold; color: #1e293b; }
              .notes { margin-top: 24px; padding-top: 24px; 12px; color: #475569; word-break: break-word; overflow-wrap: break-word; }
              .signature-section { margin-top: 40px; width: 100%}
              .signature-line { border-top: 1px solid #1e293b; width: 30%; margin-top: 40px; padding-top: 8px; font-size: 12px; color: #1e293b; font-weight: 500;  }
            </style>
          </head>
          <body>
            <div class="wrapper">
              ${hasHeaderFooter ? `<img src="${settings.headerImageUrl}" class="header-img" style="width: 100%; height: ${settings.headerImageHeight || 100}px; display: block; object-fit: cover;" />` : (settings.logoUrl ? `<div class="logo-container"><img src="${settings.logoUrl}" class="logo-img" style="height: ${settings.logoHeight || 100}px; width: auto; max-width: 200px;" /></div>` : '')}
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
                      ${enrichItems(sale).map((item: any) => `
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
                        <span>Subtotal: </span>
                        <span>${symbol}${Number(sale.subtotal).toFixed(2)}</span>
                      </div>
                      ${Number(sale.vat) > 0 ? `
                      <div class="totals-row">
                        <span>VAT: (${settings.vatRate || 7.5}%)</span>
                        <span>${symbol}${Number(sale.vat).toFixed(2)}</span>
                      </div>
                      ` : ''}
                      <div class="totals-row final">
                        <span>TOTAL: </span>
                        <span>${symbol}${Number(sale.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  ${sale.particulars ? `<div class="notes"><strong>Notes:</strong> ${sale.particulars}</div>` : ''}
                  ${settings.invoiceNotes ? `<div class="notes"><strong>Invoice Notes:</strong><br/>${settings.invoiceNotes}</div>` : ''}
                  
                  <div style="position: relative; margin-bottom: 0; min-height: 200px; background-image: ${settings.watermarkImageUrl ? `url('${settings.watermarkImageUrl}')` : 'none'}; background-position: center; background-repeat: no-repeat; background-size: cover; background-attachment: scroll; opacity: 0.15;"></div>
                  
                  <div class="signature-section" style="position: relative; min-height: 80px; background-image: ${settings.signatureUrl ? `url('${settings.signatureUrl}')` : 'none'}; background-position: right center; background-repeat: no-repeat; background-size: contain;">
                    <div class="signature-line" style="float: left;">Client</div>
                    <div class="signature-line" style="float: right;">Manager</div>
                  </div>
                </div>
              </div>
              ${hasHeaderFooter ? `<div class="footer-spacer" style="margin-top: ${settings.footerImageTopMargin || 0}px;"></div><img src="${settings.footerImageUrl}" class="footer-img" style="width: 100%; height: ${settings.footerImageHeight || 60}px; display: block; object-fit: contain;" />` : ''}
            </div>
          </body>
          </html>
        `;
      } else {
        // PDF FILE: Thermal A4 Receipt - Same as handleViewDocument thermal template
        const invoiceTitle = 'RECEIPT';
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${invoiceTitle}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html { margin: 0; padding: 0; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: white; margin: 0; padding: 0; overflow-x: hidden; }
              @page { size: A4; margin: 0; padding: 0; page-break-after: avoid; }
              .wrapper { display: flex; flex-direction: column; max-width: 210mm; margin: 0 auto; padding: 0; min-height: 100vh; }
              .container { width: 100%; background: white; color: #1e293b; padding: ${hasHeaderFooter ? '0' : '5px'}; box-sizing: border-box; display: flex; flex-direction: column; flex: 1; }
              .content { padding-left:0px; display: flex; flex-direction: column; max-width: 100%; box-sizing: border-box; }
              .header-img { width: 100%; height: auto; display: block; min-height: 100px; }
              .header-image { width: 100%; overflow: hidden; }
              .header-image img { width: 100%; height: auto; display: block; object-fit: cover; }
              .logo-section { width: 100%; padding: 10px 0; display: flex; align-items: center; justify-content: ${settings.logoAlign === 'center' ? 'center' : settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'}; padding-left: ${settings.logoAlign === 'left' ? '20px' : '0'}; padding-right: ${settings.logoAlign === 'right' ? '20px' : '0'}; min-height: ${settings.logoHeight || 100}px; }
              .logo-section img { width: auto; height: ${settings.logoHeight || 100}px; max-width: 200px; display: block; }
              .footer-img { width: 100%; height: auto; display: block; }
              .header { text-align: right; margin-bottom: 10px; max-width: 100%; box-sizing: border-box; }
              .company-header { margin-bottom: 4px; word-wrap: break-word; overflow-wrap: break-word; }
              .company-header h2 { font-weight: bold; font-size: 18px; margin-bottom: 4px; word-wrap: break-word; overflow-wrap: break-word; }
              .company-header p { font-size: 11px; color: #64748b; margin-bottom: 2px; word-wrap: break-word; overflow-wrap: break-word; }
              .title { margin-top: 8px; word-wrap: break-word; overflow-wrap: break-word; }
              .title h1 { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
              .title p { color: #64748b; font-size: 13px; }
              .bill-to { margin-bottom: 8px; max-width: 100%; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word; }
              .bill-to h3 { font-size: 11px; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; text-align: left; }
              .bill-to p { font-size: 13px; color: #1e293b; margin-bottom: 2px; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; }
              .bill-to strong { font-weight: 600; }
              .invoice-details { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 12px; max-width: 100%; box-sizing: border-box; }
              .detail-label { font-weight: bold; color: #64748b; }
              table { width: 100%; margin-bottom: 14px; border-collapse: collapse; table-layout: fixed; box-sizing: border-box; }
              thead { border-bottom: 2px solid #1e293b; }
              th { text-align: left; padding: 10px; font-weight: bold; font-size: 12px; color: #1e293b; background: #f1f5f9; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word; }
              td { padding: 10px; font-size: 13px; color: #475569; border: 1px solid #cbd5e1; background: #fafbfc; word-break: break-word; overflow-wrap: break-word; }
              th.right, td.right { text-align: right; }
              .totals { display: flex; justify-content: flex-end; margin-top: 24px; max-width: 100%; box-sizing: border-box; }
              .totals-table { width: 280px; max-width: 100%; }
              .totals-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; color: #475569; }
              .totals-row.final { border-top: 2px solid #1e293b; padding-top: 8px; font-size: 15px; font-weight: bold; color: #1e293b; }
              .notes { margin-top: 8px; padding-top: 8px; font-size: 12px; color: #475569; word-break: break-word; overflow-wrap: break-word; }
              .signature-section { margin-top: auto; width: 100%; display: flex; justify-content: space-between; }
              .signature-line { border-top: 1px solid #1e293b; width: 200px; margin-top: 40px; padding-top: 8px; font-size: 12px; color: #1e293b; font-weight: 500; }
            </style>
          </head>
          <body>
            <div class="wrapper">
                ${settings.headerImageUrl ? `<div class="header-image"><img src="${settings.headerImageUrl}" /></div>` : (settings.logoUrl ? `<div class="logo-section"><img src="${settings.logoUrl}" /></div>` : '')}
                <div class="container">
                <div class="content">
                  <div class="header">
                    <div class="company-header">
                      <h2>${settings.name}</h2>
                      ${settings.address ? `<p>${settings.address}</p>` : ''}
                      ${settings.phone ? `<p>${settings.phone}</p>` : ''}
                      ${settings.email ? `<p>${settings.email}</p>` : ''}
                    </div>
                    <div class="title" style="text-align: center;">
                      <h1>${invoiceTitle}</h1>
                    </div>
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
                      <span class="detail-label">Date:</span> ${new Date(sale.date).toLocaleDateString()}
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">Receipt ID:</span> ${sale.id.slice(-8)}
                    </div>
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
                      ${enrichItems(sale).map((item: any) => `
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
                        <span>Subtotal: </span>
                        <span>${symbol}${Number(sale.subtotal).toFixed(2)}</span>
                      </div>
                      ${Number(sale.vat) > 0 ? `
                      <div class="totals-row">
                        <span>VAT: (${settings.vatRate || 7.5}%)</span>
                        <span>${symbol}${Number(sale.vat).toFixed(2)}</span>
                      </div>
                      ` : ''}
                      <div class="totals-row final">
                        <span>TOTAL: </span>
                        <span>${symbol}${Number(sale.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  ${sale.particulars ? `<div class="notes"><strong>Notes:</strong> ${sale.particulars}</div>` : ''}
                  ${settings.invoiceNotes ? `<div class="notes"><strong>Invoice Notes:</strong><br/>${settings.invoiceNotes}</div>` : ''}
                  
                  <div class="signature-section">
                    <div class="signature-line" style="float: left;">Client</div>
                    <div class="signature-line" style="float: right;">Manager</div>
                  </div>
                </div>
              </div>
              ${settings.footerImageUrl ? `<div class="footer-spacer" style="margin-top: ${settings.footerImageTopMargin || 0}px;"></div><img src="${settings.footerImageUrl}" class="footer-img" style="width: 100%; height: ${settings.footerImageHeight || 60}px; display: block; object-fit: contain; margin: 0; padding: 0;" />` : ''}
            </div>
          </body>
          </html>
        `;
      }

      // Use html2pdf to generate and download PDF
      const opt = {
        margin: 10,
        filename: `${invoiceTitle}-${sale.id.slice(-8)}.pdf`,
        image: { type: 'png' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait' as const, unit: 'mm', format: 'a4' }
      };

      html2pdf().set(opt).from(htmlContent).save();
    } catch (e) {
      console.error('PDF download failed:', e);
      alert('Failed to download PDF: ' + (e instanceof Error ? e.message : String(e)));
    }
  };
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

      {/* Item Return Modal */}
      {showItemReturnModal && selectedItemForReturn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Return Item</h3>
                    <button onClick={() => setShowItemReturnModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="bg-slate-50 p-4 rounded mb-4 text-sm space-y-2">
                    <p><strong>Item:</strong> {selectedItemForReturn.name}</p>
                    <p><strong>Original Quantity:</strong> {selectedItemForReturn.quantity}</p>
                    <p><strong>Price per Unit:</strong> {symbol}{fmt(selectedItemForReturn.price, 2)}</p>
                    <p><strong>Receipt:</strong> {selectedItemForReturn.saleId.slice(-8)}</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Quantity to Return</label>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setItemReturnQuantity(Math.max(1, itemReturnQuantity - 1))}
                                className="px-3 py-2 border rounded-lg hover:bg-slate-100"
                            >
                                −
                            </button>
                            <input 
                                type="number" 
                                value={itemReturnQuantity}
                                onChange={(e) => setItemReturnQuantity(Math.min(Number(selectedItemForReturn.quantity), Math.max(1, parseInt(e.target.value) || 1)))}
                                min="1"
                                max={selectedItemForReturn.quantity}
                                className="flex-1 border rounded-lg p-2 text-center outline-none focus:ring-2 focus:ring-brand-500"
                            />
                            <button 
                                onClick={() => setItemReturnQuantity(Math.min(Number(selectedItemForReturn.quantity), itemReturnQuantity + 1))}
                                className="px-3 py-2 border rounded-lg hover:bg-slate-100"
                            >
                                +
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Refund: {symbol}{fmt(Number(selectedItemForReturn.price) * itemReturnQuantity, 2)}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Return</label>
                        <textarea 
                            className="w-full border rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-brand-500" 
                            rows={3}
                            value={itemReturnReason} 
                            onChange={e => setItemReturnReason(e.target.value)} 
                            placeholder="e.g. Defective item, wrong item, customer changed mind..."
                        />
                    </div>

                    <button onClick={processItemReturn} className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 flex justify-center items-center gap-2 mt-4">
                        <RotateCcw size={18} /> Confirm Return
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Document Action Menu */}
      {showDocMenu && selectedSaleForDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Invoice Options</h3>
              <button 
                onClick={() => { setShowDocMenu(false); setSelectedSaleForDoc(null); }}
                className="text-slate-500 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => {
                  handleViewDocument(selectedSaleForDoc, 'thermal');
                  setShowDocMenu(false);
                  setSelectedSaleForDoc(null);
                }}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                <ShoppingBag size={18} className="text-slate-600" />
                <div>
                  <div className="font-medium text-slate-800">Thermal Receipt</div>
                  <div className="text-xs text-slate-500">Print thermal receipt</div>
                </div>
              </button>

              <button
                onClick={() => {
                  handleViewDocument(selectedSaleForDoc, 'a4');
                  setShowDocMenu(false);
                  setSelectedSaleForDoc(null);
                }}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                <FileText size={18} className="text-slate-600" />
                <div>
                  <div className="font-medium text-slate-800">A4 Invoice</div>
                  <div className="text-xs text-slate-500">Print professional invoice</div>
                </div>
              </button>

              <button
                onClick={() => {
                  downloadReceipt(selectedSaleForDoc);
                  setShowDocMenu(false);
                  setSelectedSaleForDoc(null);
                }}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                <Download size={18} className="text-slate-600" />
                <div>
                  <div className="font-medium text-slate-800">Download PDF</div>
                  <div className="text-xs text-slate-500">Save as PDF file</div>
                </div>
              </button>

              <button
                onClick={() => {
                  sendEmailReceipt(selectedSaleForDoc);
                  setShowDocMenu(false);
                  setSelectedSaleForDoc(null);
                }}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                <Mail size={18} className="text-slate-600" />
                <div>
                  <div className="font-medium text-slate-800">Send Email</div>
                  <div className="text-xs text-slate-500">Email to customer</div>
                </div>
              </button>

              <button
                onClick={() => {
                  sendWhatsAppReceipt(selectedSaleForDoc);
                  setShowDocMenu(false);
                  setSelectedSaleForDoc(null);
                }}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-100 rounded-lg border border-slate-200 transition"
              >
                <MessageCircle size={18} className="text-slate-600" />
                <div>
                  <div className="font-medium text-slate-800">Send WhatsApp</div>
                  <div className="text-xs text-slate-500">Share via WhatsApp</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;

    
