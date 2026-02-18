import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { authFetch } from '../services/auth';
import { SaleRecord, Product, CompanySettings } from '../types';
import { fmt } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';
import { useBusinessContext } from '../services/BusinessContext';
import { Printer, X, FileText, Download, Trash2, Mail, MessageCircle, ShoppingBag } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const ServiceHistory = () => {
    const { symbol, setSymbol } = useCurrency();
    const { selectedBusinessId } = useBusinessContext();
  const [services, setServices] = useState<SaleRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'services' | 'items'>('services');
  
  // Document menu state
  const [showDocMenu, setShowDocMenu] = useState(false);
  const [selectedSaleForDoc, setSelectedSaleForDoc] = useState<SaleRecord | null>(null);
  
  // Data
  const [products, setProducts] = useState<Product[]>([]);
    const emptySettings = { businessId: '', name: '', motto: '', address: '', phone: '', email: '', logoUrl: '', logoAlign: 'left', logoHeight: 80, headerImageUrl: '', headerImageHeight: 100, footerImageUrl: '', footerImageHeight: 60, watermarkImageUrl: '', watermarkAlign: 'center', signatureUrl: '', vatRate: 0, currency: '$' } as CompanySettings;
    const [settings, setSettings] = useState<CompanySettings>(emptySettings);
    const [customers, setCustomers] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                console.log('[ServiceHistory] Loading data, selectedBusinessId:', selectedBusinessId);
                let s = db.sales && db.sales.getAll ? await db.sales.getAll(selectedBusinessId) : [];
                let p = db.products && db.products.getAll ? await db.products.getAll(selectedBusinessId) : [];
                const sett = db.settings && db.settings.get ? await db.settings.get(selectedBusinessId) : emptySettings;
                let c = db.customers && db.customers.getAll ? await db.customers.getAll(selectedBusinessId) : [];
                const u = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
                
                console.log('[ServiceHistory] Raw API response:', {
                  salesCount: (Array.isArray(s) ? s : []).length,
                  productsCount: (Array.isArray(p) ? p : []).length,
                  customersCount: (Array.isArray(c) ? c : []).length,
                  firstSaleHasBizId: s && s[0] ? !!s[0].business_id : 'no sales',
                  userIsSuperAdmin: u && (u.is_super_admin || u.isSuperAdmin),
                });
                
                // For super admin: show filtered data when businessId is passed
                // For regular user: always filtered to their business
                const isSuperAdmin = u && (u.is_super_admin || u.isSuperAdmin);
                if (isSuperAdmin && selectedBusinessId) {
                    console.log('[ServiceHistory] Super admin with business selection:', selectedBusinessId);
                    // Backend should already filter with businessId query param
                } else if (isSuperAdmin) {
                    console.log('[ServiceHistory] Super admin: showing ALL data from all companies');
                } else if (selectedBusinessId) {
                    console.log('[ServiceHistory] Filtering by business (non-super-admin):', selectedBusinessId);
                    // Backend already filters for regular users
                }
                
                console.log('[ServiceHistory] After API call:', {
                  salesCount: (Array.isArray(s) ? s : []).length,
                  productsCount: (Array.isArray(p) ? p : []).length,
                  customersCount: (Array.isArray(c) ? c : []).length,
                });
                
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
                // Update currency context if settings have a currency symbol
                if (sett && sett.currency) {
                    setSymbol(sett.currency);
                }
                setCustomers(Array.isArray(c) ? c : []);
                setCurrentUser(u);
            } catch (e) {
                console.error('[ServiceHistory] Failed to load service history data:', e);
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
        alert('Please allow pop-ups to view invoices');
        sessionStorage.removeItem('invoiceData');
        sessionStorage.removeItem('receiptType');
        return;
      }
      return;
  };

  const enrichItems = (sale: SaleRecord) => {
      return (sale.items || []).map((it: any) => {
          const prod = products.find(p => p.id === (it.product_id || it.id));
          return {
              ...it,
              id: it.id || it.product_id,
              name: it.name || (prod ? prod.name : '') || '',
              description: it.description || prod?.details || prod?.description || prod?.image_url || '',
              unit: it.unit || prod?.unit || 'N/A'
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
          const custId = (sale as any).customerId || (sale as any).customer_id;
          const defaultTo = (customers.find(c => c.id === custId)?.email) || '';
          const to = window.prompt('Recipient email', defaultTo || '');
          if (!to) return;

          // Generate PDF with logo/header and proper item display
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Invoice ${sale.id.slice(-8)}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: white; }
                @page { size: A4; margin: 0; }
                .wrapper { display: flex; flex-direction: column; }
                .container { width: 210mm; margin: 0 auto; background: white; color: #1e293b; padding: 20px; }
                .logo-section { width: 100%; margin-bottom: 20px; display: flex; align-items: center; justify-content: ${settings.logoAlign === 'center' ? 'center' : settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'}; }
                .logo-section img { max-height: ${settings.logoHeight || 100}px; max-width: 200px; width: auto; }
                .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; }
                .title h1 { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
                .title p { color: #64748b; font-size: 12px; }
                .company { text-align: right; }
                .company h2 { font-weight: bold; font-size: 11px; margin-bottom: 4px; }
                .company p { font-size: 9px; color: #64748b; margin-bottom: 2px; }
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
                .notes { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #475569; }
              </style>
            </head>
            <body>
              <div class="wrapper">
                ${settings.logoUrl ? `<div class="logo-section"><img src="${settings.logoUrl}" alt="Company Logo" /></div>` : ''}
                <div class="container">
                  <div class="header">
                    <div class="title">
                      <h1>SERVICE INVOICE</h1>
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
                    ${(() => {
                      const customer = customers.find(c => c.id === custId);
                      if (customer) {
                        return `
                          <p><strong>${customer.name || ''}</strong></p>
                          ${customer.company ? `<p>${customer.company}</p>` : ''}
                          <p>${customer.address || ''}</p>
                          <p>Phone: ${customer.phone || ''}</p>
                        `;
                      }
                      return '<p>Walk-in Customer</p>';
                    })()}
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
                      ${(sale.items && sale.items.length > 0 ? sale.items : []).map((item: any) => `
                        <tr>
                          <td>${item.name || item.description || 'Item'}</td>
                          <td class="right">${Number(item.quantity || 0).toFixed(0)}</td>
                          <td class="right">${symbol}${Number(item.price || 0).toFixed(2)}</td>
                          <td class="right"><strong>${symbol}${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</strong></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>

                  <div class="totals">
                    <div class="totals-table">
                      <div class="totals-row">
                        <span>Subtotal</span>
                        <span>${symbol}${Number(sale.subtotal || 0).toFixed(2)}</span>
                      </div>
                      ${Number(sale.vat || 0) > 0 ? `
                      <div class="totals-row">
                        <span>VAT (${settings.vatRate || 7.5}%)</span>
                        <span>${symbol}${Number(sale.vat || 0).toFixed(2)}</span>
                      </div>
                      ` : ''}
                      <div class="totals-row final">
                        <span>TOTAL</span>
                        <span>${symbol}${Number(sale.total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  ${sale.particulars ? `<div class="notes"><strong>Notes:</strong> ${sale.particulars}</div>` : ''}
                </div>
              </div>
            </body>
            </html>
          `;

          const element = document.createElement('div');
          element.innerHTML = htmlContent;
          
          const pdfBlob = await new Promise<Blob>((resolve, reject) => {
              html2pdf()
                  .set({
                      margin: 0,
                      filename: `Invoice_${sale.id.slice(-8)}.pdf`,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2 },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                  })
                  .from(element)
                  .output('blob')
                  .then(resolve)
                  .catch(reject);
          });

          const formData = new FormData();
          formData.append('to', to);
          formData.append('subject', `Invoice ${sale.id.slice(-8)} from ${settings.name}`);
          formData.append('file', pdfBlob, `Invoice_${sale.id.slice(-8)}.pdf`);

          const res = await authFetch('/api/send-email-pdf', { method: 'POST', body: formData });
          const j = await res.json();
          if (res.ok) alert('Invoice sent to ' + to); else alert('Email failed: ' + (j && j.error ? j.error : res.statusText));
      } catch (e) { 
          console.warn('Email send failed', e); 
          alert('Failed to send email: ' + (e instanceof Error ? e.message : String(e)));
      }
  };

  const sendWhatsAppReceipt = async (sale: SaleRecord) => {
      try {
          const custId = (sale as any).customerId || (sale as any).customer_id;
          const defaultPhone = (customers.find(c => c.id === custId)?.phone) || '';
          const phone = window.prompt('Enter phone number with country code (e.g., +234XXXXXXXXXX)', defaultPhone || '');
          if (!phone) return;

          // Generate PDF and download it
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Invoice ${sale.id.slice(-8)}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: white; }
                @page { size: A4; margin: 0; }
                .container { width: 210mm; margin: 0 auto; background: white; color: #1e293b; padding: 20px; }
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
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="title">
                    <h1>SERVICE INVOICE</h1>
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
                  ${(() => {
                    const customer = customers.find(c => c.id === custId);
                    if (customer) {
                      return `
                        <p><strong>${customer.name || ''}</strong></p>
                        ${customer.company ? `<p>${customer.company}</p>` : ''}
                        <p>${customer.address || ''}</p>
                        <p>Phone: ${customer.phone || ''}</p>
                      `;
                    }
                    return '<p>Walk-in Customer</p>';
                  })()}
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
              </div>
            </body>
            </html>
          `;

          const element = document.createElement('div');
          element.innerHTML = htmlContent;
          
          const pdfBlob = await new Promise<Blob>((resolve, reject) => {
              html2pdf()
                  .set({
                      margin: 0,
                      filename: `Invoice_${sale.id.slice(-8)}.pdf`,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2 },
                      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                  })
                  .from(element)
                  .output('blob')
                  .then(resolve)
                  .catch(reject);
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
              `Hello,\n\nPlease find the attached invoice for your service.\n\n` +
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
          console.warn('WhatsApp send failed', e); 
          alert('Failed to send via WhatsApp: ' + (e instanceof Error ? e.message : String(e)));
      }
  };

  const handleDeleteSale = async (saleId: string) => {
      if (!window.confirm('Are you sure you want to delete this service invoice? This action cannot be undone.')) {
          return;
      }
      try {
          const response = await db.sales.delete(saleId);
          if (response && response.id) {
              alert('Service invoice deleted successfully');
              setServices(services.filter(s => s.id !== saleId));
          } else if (response && response.error) {
              alert('Failed to delete: ' + response.error);
          } else {
              alert('Failed to delete: Unknown error (server returned no response)');
          }
      } catch (e) {
          console.error('Delete failed:', e);
          alert('Failed to delete service invoice: ' + (e instanceof Error ? e.message : String(e)));
      }
  };

  const printReceipt = (sale: SaleRecord) => {
      try {
          const custId = (sale as any).customerId || (sale as any).customer_id;
          const customer = custId ? customers.find(c => c.id === custId) : null;
          const hasHeaderFooter = settings.headerImageUrl && settings.footerImageUrl;
          
          const printWindow = window.open('', 'ServiceInvoicePrint', 'width=900,height=800,resizable=yes,scrollbars=no');
          if (!printWindow) {
              alert('Please allow pop-ups to print invoices');
              return;
          }
          
          const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Service Invoice</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; background: white; }
                .wrapper { display: flex; flex-direction: column; }
                .container { max-width: 210mm; margin: 0 auto; background: white; color: #1e293b; display: flex; flex-direction: column; }
                .content { padding: 40px; }
                .header-img { width: 100%; height: auto; display: block; }
                .footer-img { width: 100%; height: auto; display: block; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
                .title h1 { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
                .title p { color: #64748b; font-size: 13px; }
                .company { text-align: right; }
                .company h2 { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
                .company p { font-size: 11px; color: #64748b; margin-bottom: 2px; }
                .bill-to { margin-bottom: 24px; }
                .bill-to h3 { font-size: 11px; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; }
                .bill-to p { font-size: 13px; color: #1e293b; margin-bottom: 2px; line-height: 1.4; }
                table { width: 100%; margin-bottom: 5px; border-collapse: collapse; }
                thead { border-bottom: 2px solid #1e293b; }
                th { text-align: left; padding: 10px 0; font-weight: bold; font-size: 12px; color: #1e293b; }
                td { padding: 12px 0; font-size: 13px; color: #475569; border-bottom: 1px solid #e2e8f0; }
                .totals { display: flex; justify-content: flex-end; margin-top: 24px; }
                .totals-table { min-width: 35%; max-width: 50%; }
                .totals-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
                .totals-row.final { border-top: 1px solid #1e293b; padding-top: 8px; font-size: 15px; font-weight: bold; }
                @media print { body { padding: 0; margin: 0; } .wrapper { min-height: auto; } .container { padding: 0; } .content { padding: 40px; } }
              </style>
            </head>
            <body>
              <div class="wrapper">
                ${hasHeaderFooter ? `<img src="${settings.headerImageUrl}" class="header-img" style="width: 100%; height: ${settings.headerImageHeight || 100}px; display: block; object-fit: cover;" />` : (settings.logoUrl ? `<div style="width: auto; padding: 20px 0; display: flex; align-items: center; justify-content: ${settings.logoAlign === 'center' ? 'center' : settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'}; padding-left: ${settings.logoAlign === 'left' ? '20px' : '0'}; padding-right: ${settings.logoAlign === 'right' ? '20px' : '0'}; min-height: ${settings.logoHeight || 100}px;"><img src="${settings.logoUrl}" style="width: auto; height: ${settings.logoHeight || 100}px; max-width: 200px; display: block;" /></div>` : '')}
                <div class="container">
                  <div class="content">
                    <div class="header">
                      <div class="title">
                        <h1>SERVICE INVOICE</h1>
                        <p>#${sale.id.slice(-8)}</p>
                      </div>
                      ${!hasHeaderFooter ? `<div class="company">
                        <h2>${settings.name}</h2>
                        <p>${settings.address}</p>
                        <p>${settings.phone}</p>
                        <p>${settings.email}</p>
                      </div>` : ''}
                    </div>

                    <div class="bill-to">
                      <h3>BILL TO</h3>
                      ${customer ? `
                        <p><strong>${customer.name}</strong></p>
                        ${customer.company ? `<p>${customer.company}</p>` : ''}
                        <p>${customer.address || 'N/A'}</p>
                        <p>${customer.phone || 'N/A'}</p>
                      ` : '<p>Walk-in Customer</p>'}
                    </div>

                    <table>
                      <thead>
                        <tr>
                          <th>SERVICE DESCRIPTION</th>
                          <th style="text-align: right;">RATE</th>
                          <th style="text-align: right;">QTY</th>
                          <th style="text-align: right;">AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${enrichItems(sale).map((item: any) => `
                          <tr>
                            <td>${item.description ? `${item.name} — ${item.description}` : item.name || ''}</td>
                            <td style="text-align: right;">${symbol}${(Number(item.price)).toFixed(2)}</td>
                            <td style="text-align: right;">${item.quantity || 0}</td>
                            <td style="text-align: right; font-weight: bold;">${symbol}${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
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
                        <div class="totals-row">
                          <span>VAT (${settings.vatRate || 7.5}%)</span>
                          <span>${symbol}${Number(sale.vat).toFixed(2)}</span>
                        </div>
                        ${sale.deliveryFee ? `
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
                    <div style="position: relative; margin-bottom: 0; min-height: 200px; background-image: ${settings.watermarkImageUrl ? `url('${settings.watermarkImageUrl}')` : 'none'}; background-position: center; background-repeat: no-repeat; background-size: cover; background-attachment: scroll; opacity: 0.15;"></div>
                    <div style="position: relative; margin-bottom: 0; background-image: ${settings.signatureUrl ? `url('${settings.signatureUrl}')` : 'none'}; background-position: right center; background-repeat: no-repeat; background-size: contain; min-height: 0;"></div>
                  </div>
                </div>
                ${settings.footerImageUrl ? `<img src="${settings.footerImageUrl}" class="footer-img" style="width: 100%; height: ${settings.footerImageHeight || 60}px; display: block; object-fit: cover; margin: 0; padding: 0; position: absolute; bottom: 0; left: 0; right: 0;" />` : ''}
              </div>
              <script>
                window.onload = () => { window.print(); };
              </script>
            </body>
            </html>
          `;
          
          printWindow.document.write(htmlContent);
          printWindow.document.close();
      } catch (e) {
          console.error('Print failed:', e);
          alert('Failed to print invoice');
      }
  };

  const downloadReceipt = (sale: SaleRecord) => {
      try {
          const custId = (sale as any).customerId || (sale as any).customer_id;
          const customer = custId ? customers.find(c => c.id === custId) : null;
          const enrichedItems = enrichItems(sale);
          
          const hasHeaderFooter = settings.headerImageUrl && settings.footerImageUrl;
          
          const invoiceHTML = `
            <!DOCTYPE html>
            <html style="margin: 0; padding: 0;">
            <head>
              <meta charset="UTF-8">
              <style>
                @page { size: A4; margin: 0; padding: 0; page-break-after: avoid; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html { margin: 0; padding: 0; }
                body { margin: 0; padding: 0; width: 100%; font-family: Arial, sans-serif; overflow-x: hidden; }                
              </style>
            </head>
            <body style="margin: 0; padding: 0;">
            <div style="font-family: Arial, sans-serif; max-width: 210mm; margin: 0 auto; padding: 0; color: #1e293b; position: relative; display: flex; flex-direction: column; box-sizing: border-box;\">\n ${hasHeaderFooter ? `<div style="margin: 0; padding: 0; width: 100%; height: ${settings.headerImageHeight || 100}px; overflow: hidden;"><img src="${settings.headerImageUrl}" style="width: 100%; height: 100%; display: block; object-fit: cover;" /></div>` : (settings.logoUrl ? `<div style="width: 100%; padding: 8px 12px; display: flex; align-items: flex-start; justify-content: ${settings.logoAlign === 'center' ? 'center' : settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'}; min-height: 60px; margin: 0; /* logoAlign: left (default), center, or right */"><img src="${settings.logoUrl}" style="width: auto; height: ${settings.logoHeight || 80}px; max-width: 200px; display: block;" /></div>` : '')}
              <div style="padding: 10px 12px; display: flex; flex-direction: column; margin: 0; max-width: 100%; box-sizing: border-box; flex: 1; page-break-inside: avoid;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 8px; max-width: 100%; box-sizing: border-box;">
                  <div style="flex-shrink: 0;">
                    <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px 0;">INVOICE</h1>
                    <p style="color: #64748b; font-size: 13px; margin: 0;">#${sale.id.slice(-8)}</p>
                  </div>
                  ${!hasHeaderFooter ? `<div style="text-align: right; position: relative; flex: 0 0 auto; max-width: 50%; min-width: 0; word-wrap: break-word; overflow-wrap: break-word;">
                    <h2 style="font-weight: bold; font-size: 12px; margin: 0 0 4px 0; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.2;">${settings.name ? settings.name : ''}</h2>
                    <p style="font-size: 10px; color: #64748b; margin: 0 0 2px 0; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.15;">${settings.address ? settings.address : ''}</p>
                    <p style="font-size: 10px; color: #64748b; margin: 0 0 2px 0; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.15;">${settings.phone ? settings.phone : ''}</p>
                    <p style="font-size: 10px; color: #64748b; margin: 0; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.15;">${settings.email ? settings.email : ''}</p>
                  </div>` : ''}
                </div>
              
              <div style="margin-bottom: 20px; max-width: 100%; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word;">
                <h3 style="font-size: 11px; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; text-transform: uppercase;">BILL TO</h3>
                ${customer ? `
                  <p style="font-size: 13px; color: #1e293b; margin: 0 0 2px 0; word-wrap: break-word; overflow-wrap: break-word;"><strong>${customer.name}</strong></p>
                  ${customer.company ? `<p style="font-size: 13px; color: #1e293b; margin: 0 0 2px 0; word-wrap: break-word; overflow-wrap: break-word;">${customer.company}</p>` : ''}
                  <p style="font-size: 13px; color: #1e293b; margin: 0 0 2px 0; word-wrap: break-word; overflow-wrap: break-word;">${customer.address || 'N/A'}</p>
                  <p style="font-size: 13px; color: #1e293b; margin: 0; word-wrap: break-word; overflow-wrap: break-word;">${customer.phone || 'N/A'}</p>
                ` : '<p style="font-size: 13px; color: #1e293b; margin: 0;">Walk-in Customer</p>'}
              </div>
              
              <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse; font-size: 10px; table-layout: fixed; box-sizing: border-box;">
                <thead>
                  <tr style="border-bottom: 2px solid #1e293b; background-color: #f1f5f9;">
                    <th style="text-align: left; padding: 4px 6px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;">Description</th>
                    <th style="text-align: right; padding: 4px 6px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1; width: 12%; word-break: break-word; overflow-wrap: break-word;">Qty</th>
                    <th style="text-align: right; padding: 4px 6px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1; width: 12%; word-break: break-word; overflow-wrap: break-word;">Unit</th>
                    <th style="text-align: right; padding: 4px 6px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1; width: 18%; word-break: break-word; overflow-wrap: break-word;">Price</th>
                    <th style="text-align: right; padding: 4px 6px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1; width: 18%; word-break: break-word; overflow-wrap: break-word;">Amount(${symbol})</th>
                  </tr>
                </thead>
                <tbody>
                  ${enrichedItems.map((item: any) => `
                    <tr style="border-bottom: 1px solid #e2e8f0; background-color: #fafbfc;">
                      <td style="padding: 4px 6px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;">${item.description ? `${item.name} — ${item.description}` : item.name || ''}</td>
                      <td style="text-align: right; padding: 4px 6px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;">${item.quantity || 0}</td>
                      <td style="text-align: right; padding: 4px 6px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;">${item.unit || 'N/A'}</td>
                      <td style="text-align: right; padding: 4px 6px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;">${symbol}${(Number(item.price)).toFixed(2)}</td>
                      <td style="text-align: right; padding: 4px 6px; font-size: 10px; color: #1e293b; font-weight: bold; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;"><strong>${symbol}${(Number(item.price) * Number(item.quantity)).toFixed(2)}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div style="display: flex; justify-content: flex-end; margin-bottom: 15px; max-width: 100%; box-sizing: border-box;">
                <div style="width: 160px; max-width: 100%;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 10px; color: #475569;">
                    <span>Subtotal</span>
                    <span>${symbol}${Number(sale.subtotal).toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 10px; color: #475569;">
                    <span>VAT (${settings.vatRate || 7.5}%)</span>
                    <span>${symbol}${Number(sale.vat).toFixed(2)}</span>
                  </div>
                  ${sale.deliveryFee ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 10px; color: #475569;">
                      <span>Delivery</span>
                      <span>${symbol}${Number(sale.deliveryFee).toFixed(2)}</span>
                    </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; border-top: 2px solid #1e293b; padding-top: 6px; font-size: 12px; font-weight: bold; color: #1e293b;">
                    <span>Total</span>
                    <span>${symbol}${Number(sale.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              ${sale.particulars ? `<div style="margin-bottom: 8px; font-size: 10px; color: #475569; word-break: break-word; overflow-wrap: break-word;"><strong>Notes:</strong> ${sale.particulars}</div>` : ''}
              ${settings.invoiceNotes ? `<div style="margin-bottom: 8px; font-size: 10px; color: #475569; word-break: break-word; overflow-wrap: break-word;"><strong>Invoice Notes:</strong><br/>${settings.invoiceNotes}</div>` : ''}
              
              
              <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; max-width: 100%; box-sizing: border-box;">
                <div style="display: flex; flex-direction: column; min-width: 0;">
                  <p style="margin: 0 0 30px 0; font-size: 12px; font-weight: bold; word-break: break-word; overflow-wrap: break-word;">Customer</p>
                  <div style="border-top: 1px solid #000; width: 50%; float: left;"></div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; min-width: 0; position: relative; background-image: ${settings.signatureUrl ? `url('${settings.signatureUrl}')` : 'none'}; background-position: right center; background-repeat: no-repeat; background-size: contain;">
                  <p style="margin: 0 0 30px 0; font-size: 12px; font-weight: bold; text-align: right; word-break: break-word; overflow-wrap: break-word; position: relative; z-index: 1;">Signed Manager</p>
                  <div style="border-top: 1px solid #000; width: 50%; position: relative; z-index: 1; float: right;"></div>
                </div>
              </div>
              </div>
            </div>
            ${settings.footerImageUrl ? `<img src="${settings.footerImageUrl}" class="footer-img" style="width: 100%; height: ${settings.footerImageHeight || 60}px; display: block; object-fit: cover; margin: 0; padding: 0;" />` : ''}
            
            </body>
            </html>
          `;
          
          const element = document.createElement('div');
          element.innerHTML = invoiceHTML;
          
          const opt = {
              margin: [10, 10, 10, 10] as [number, number, number, number],
              filename: `Invoice_${sale.id.slice(-8)}.pdf`,
              image: { type: 'jpeg' as const, quality: 0.98 },
              html2canvas: { scale: 2 },
              jsPDF: { orientation: 'portrait' as const, unit: 'mm', format: 'a4' }
          };
          
          html2pdf().set(opt).from(element).save();
      } catch (e) { 
          console.warn('PDF download failed', e); 
          alert('Failed to download invoice as PDF'); 
      }
  };

  const serviceColumns: Column<SaleRecord>[] = [
    { header: 'Date', accessor: (s: SaleRecord) => new Date(s.date).toLocaleDateString(), key: 'date', sortable: true, filterable: true },
    { header: 'Invoice No.', accessor: (s: SaleRecord) => <span className="font-mono text-sm">{s.id.slice(-8)}</span>, key: 'id', filterable: true },
    { 
      header: 'Customer', 
      accessor: (s: SaleRecord) => {
        // Support both customerId (camelCase) and customer_id (snake_case from DB)
        const custId = (s as any).customerId || (s as any).customer_id;
        const customer = custId ? customers.find(c => c.id === custId) : null;
        if (!customer) return <span className="text-slate-500">Walk-in Customer</span>;
        return (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-slate-800">{customer.name || 'N/A'}</span>
            {customer.company && <span className="text-xs text-slate-600">{customer.company}</span>}
          </div>
        );
      }, 
      key: 'customerId', 
      filterable: true 
    },
    { header: 'Total', accessor: (s: SaleRecord) => <span className="font-bold">{symbol}{fmt(s.total || 0,2)}</span>, key: 'total', sortable: true, filterable: true },
    { header: 'Status', accessor: (s: SaleRecord) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.isReturn ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{s.isReturn ? 'Returned' : 'Completed'}</span>, key: 'isReturn', filterable: true },
    {
        header: 'Actions',
        accessor: (sale: SaleRecord) => (
            <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => {
                    // Enrich sale data with item names and customer info before sending to POS
                    const custId = (sale as any).customerId || (sale as any).customer_id;
                    const enrichedSale = {
                      ...sale,
                      items: enrichItems(sale),
                      customer: custId ? customers.find(c => c.id === custId) : null,
                    };
                    window.history.pushState({ usr: enrichedSale }, '', '/#/pos');
                    window.location.href = '/#/pos';
                  }} 
                  title="Edit Service"
                  className="text-blue-600 hover:bg-blue-50 p-1 rounded font-medium text-xs"
                >
                  Edit
                </button>
                <button 
                  onClick={() => { setSelectedSaleForDoc(sale); setShowDocMenu(true); }} 
                  title="View Invoice Options" 
                  className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                >
                    <FileText size={16} />
                </button>
                {currentUser && (currentUser.is_super_admin || currentUser.roleId) && (
                    <button onClick={() => handleDeleteSale(sale.id)} title="Delete Service" className="text-red-600 hover:bg-red-50 p-1 rounded">
                        <Trash2 size={16} />
                    </button>
                )}
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
            const prod = products.find(p => p.id === (it.product_id || it.id));
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

export default ServiceHistory;
