# Implementation Guide: Step-by-Step Code Examples

## Phase 1: sendEmailReceipt() CSS Conversion

### Step 1A: Before State (Current SalesHistory)
```tsx
// Lines 241-380 in SalesHistory.tsx
const sendEmailReceipt = async (sale: SaleRecord) => {
  try {
    const custId = (sale as any).customerId || (sale as any).customer_id;
    const customer = custId ? customers.find(c => c.id === custId || String(c.id) === String(custId)) : null;
    const defaultTo = customer?.email || '';
    
    let to = defaultTo;
    if (!to) {
      to = window.prompt('Customer has no email on file. Enter email address to send invoice:');
      if (!to) return;
    }
    
    const subject = `Receipt ${sale.id.slice(-8)} from ${settings.name}`;
    
    const useA4 = sale.isProforma || (sale as any).is_proforma === 1;
    const invoiceTitle = useA4 && sale.isProforma ? 'PROFORMA INVOICE' : 'INVOICE';
    
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
          .wrapper { display: flex; flex-direction: column; min-height: 297mm; }
          .container { width: 210mm; margin: 0 auto; background: white; color: #1e293b; display: flex; flex-direction: column; box-sizing: border-box; flex: 1; }
          .header-img { width: 100%; height: auto; display: block; }
          .footer-img { width: 100%; height: auto; display: block; }
          .logo-section { width: 100%; padding: 15px 0; display: flex; align-items: center; justify-content: ${settings.logoAlign === 'center' ? 'center' : settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'}; }
          .logo-section img { max-height: ${settings.logoHeight || 100}px; max-width: 200px; width: auto; }
          .content { padding: 20px; display: flex; flex-direction: column; }
          /* ... 50+ more CSS rules ... */
        </style>
      </head>
      <body>
        <div class="wrapper">
          ${settings.logoUrl ? `<div class="logo-section"><img src="${settings.logoUrl}" alt="Company Logo" style="max-height: ${settings.logoHeight || 100}px;" /></div>` : ''}
          <div class="container">
            <div class="content">
              <!-- nested content -->
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
```

### Step 1B: After State (Target ServiceHistory Pattern)

```tsx
const sendEmailReceipt = async (sale: SaleRecord) => {
  try {
    const custId = (sale as any).customerId || (sale as any).customer_id;
    const customer = custId ? customers.find(c => c.id === custId || String(c.id) === String(custId)) : null;
    const defaultTo = customer?.email || '';
    const to = window.prompt('Recipient email', defaultTo || '');
    if (!to) return;

    const useA4 = sale.isProforma || (sale as any).is_proforma === 1;
    const invoiceTitle = useA4 && sale.isProforma ? 'PROFORMA INVOICE' : 'INVOICE';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${invoiceTitle}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: white; }
          @page { size: A4; margin: 0; }
        </style>
      </head>
      <body>
        <div style="display: flex; flex-direction: column;">
          ${settings.logoUrl ? `<div style="width: 100%; margin-bottom: 20px; display: flex; align-items: center; justify-content: ${settings.logoAlign === 'center' ? 'center' : settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'};"><img src="${settings.logoUrl}" alt="Company Logo" style="max-height: ${settings.logoHeight || 100}px; max-width: 200px; width: auto;" /></div>` : ''}
          <div style="width: 210mm; margin: 0 auto; background: white; color: #1e293b; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
              <div>
                <h1 style="font-size: 22px; font-weight: bold; margin-bottom: 4px;">${invoiceTitle}</h1>
                <p style="color: #64748b; font-size: 12px;">#${sale.id.slice(-8)}</p>
              </div>
              <div style="text-align: right;">
                <h2 style="font-weight: bold; font-size: 11px; margin-bottom: 4px;">${settings.name}</h2>
                <p style="font-size: 9px; color: #64748b; margin-bottom: 2px;">${settings.address || ''}</p>
                <p style="font-size: 9px; color: #64748b; margin-bottom: 2px;">${settings.phone || ''}</p>
                <p style="font-size: 9px; color: #64748b;">${settings.email || ''}</p>
              </div>
            </div>

            <div style="margin-bottom: 20px;">
              <h3 style="font-size: 10px; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px;">BILL TO</h3>
              ${customer ? `
                <p style="font-size: 11px; color: #1e293b; margin-bottom: 2px;"><strong>${customer.name || 'N/A'}</strong></p>
                ${customer.company ? `<p style="font-size: 11px; color: #1e293b; margin-bottom: 2px;">${customer.company}</p>` : ''}
                ${customer.address ? `<p style="font-size: 11px; color: #1e293b; margin-bottom: 2px;">${customer.address}</p>` : ''}
                ${customer.phone ? `<p style="font-size: 11px; color: #1e293b; margin-bottom: 2px;">Phone: ${customer.phone}</p>` : ''}
                ${customer.email ? `<p style="font-size: 11px; color: #1e293b;">Email: ${customer.email}</p>` : ''}
              ` : '<p style="font-size: 11px; color: #1e293b;">Walk-in Customer</p>'}
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 11px;">
              <div><span style="font-weight: bold; color: #64748b;">Invoice Date:</span> ${new Date(sale.date).toLocaleDateString()}</div>
              <div><span style="font-weight: bold; color: #64748b;">Invoice ID:</span> ${sale.id.slice(-8)}</div>
            </div>

            <table style="width: 100%; margin-bottom: 5px; border-collapse: collapse;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="text-align: left; padding: 7px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1;">Description</th>
                  <th style="text-align: right; padding: 7px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1;">Qty</th>
                  <th style="text-align: right; padding: 7px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1;">Rate</th>
                  <th style="text-align: right; padding: 7px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${(sale.items && sale.items.length > 0 ? sale.items : []).map((item: any) => `
                  <tr>
                    <td style="padding: 7px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; background: #fafbfc;">${item.name || item.description || 'Item'}</td>
                    <td style="text-align: right; padding: 7px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; background: #fafbfc;">${Number(item.quantity || 0).toFixed(0)}</td>
                    <td style="text-align: right; padding: 7px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; background: #fafbfc;">${symbol}${Number(item.price || 0).toFixed(2)}</td>
                    <td style="text-align: right; padding: 7px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; background: #fafbfc;"><strong>${symbol}${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
              <div style="width: 250px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; color: #475569;">
                  <span>Subtotal</span>
                  <span>${symbol}${Number(sale.subtotal).toFixed(2)}</span>
                </div>
                ${Number(sale.vat) > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; color: #475569;">
                  <span>VAT (${settings.vatRate || 7.5}%)</span>
                  <span>${symbol}${Number(sale.vat).toFixed(2)}</span>
                </div>
                ` : ''}
                ${Number(sale.deliveryFee) > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 10px; color: #475569;">
                  <span>Delivery</span>
                  <span>${symbol}${Number(sale.deliveryFee).toFixed(2)}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; border-top: 1px solid #1e293b; padding-top: 5px; font-size: 12px; font-weight: bold; color: #1e293b;">
                  <span>TOTAL</span>
                  <span>${symbol}${Number(sale.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            ${sale.particulars ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #475569;"><strong>Notes:</strong> ${sale.particulars}</div>` : ''}
            ${settings.invoiceNotes ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #475569;"><strong>Invoice Notes:</strong><br/>${settings.invoiceNotes}</div>` : ''}
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
          filename: `Receipt_${sale.id.slice(-8)}.pdf`,
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
    if (res.ok) alert('Invoice sent to ' + to); 
    else alert('Email failed: ' + (j && j.error ? j.error : res.statusText));
  } catch (e) { 
    console.warn('Email send failed', e); 
    alert('Failed to send email: ' + (e instanceof Error ? e.message : String(e)));
  }
};
```

### Key Changes in Step 1B:
1. ✅ **Removed all CSS classes** - converted to inline styles
2. ✅ **Removed `.header-img` wrapper** - not needed for email
3. ✅ **Removed `.footer-img`** - footer only for downloads
4. ✅ **Flattened structure** - outer wrapper div instead of multiple nested containers
5. ✅ **Kept `invoiceTitle` dynamic** - proforma logic preserved
6. ✅ **Kept customer lookup robust** - both camelCase/snake_case handled
7. ✅ **Kept delivery fee logic** - conditional display intact
8. ❌ **Removed watermark section** - not appropriate for email
9. ❌ **Removed signature section** - email-safe version

---

## Phase 2: downloadReceipt() Template Consolidation

### Step 2A: Before State (Current - Complex Dual Template)

```tsx
// Lines 781-1050 in SalesHistory.tsx
const downloadReceipt = (sale: SaleRecord) => {
  try {
    const useA4 = sale.isProforma || (sale as any).is_proforma === 1;
    const invoiceTitle = useA4 && sale.isProforma ? 'PROFORMA INVOICE' : 'INVOICE';
    
    const hasHeaderFooter = settings.headerImageUrl && settings.footerImageUrl;
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
            .wrapper { display: flex; flex-direction: column; max-width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; }
            .container { width: 100%; ... flex: 1; }
            .content { padding: 40px; ... }
            .logo-container { ... }
            /* ... 60+ CSS rules ... */
          </style>
        </head>
        <body>
          <!-- A4 template content -->
        </body>
        </html>
      `;
    } else {
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <!-- thermal template -->
        </head>
        <body>
          <!-- Thermal template content -->
        </body>
        </html>
      `;
    }
    
    // PDF generation code...
  }
};
```

### Step 2B: After State (Target - Single Clean Template)

```tsx
const downloadReceipt = (sale: SaleRecord) => {
  try {
    const useA4 = sale.isProforma || (sale as any).is_proforma === 1;
    const invoiceTitle = useA4 && sale.isProforma ? 'PROFORMA INVOICE' : 'INVOICE';
    
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
        <div style="font-family: Arial, sans-serif; max-width: 210mm; margin: 0 auto; padding: 0; color: #1e293b; position: relative; display: flex; flex-direction: column; box-sizing: border-box;">
          ${hasHeaderFooter ? `<div style="margin: 0; padding: 0; width: 100%; height: ${settings.headerImageHeight || 100}px; overflow: hidden;"><img src="${settings.headerImageUrl}" style="width: 100%; height: 100%; display: block; object-fit: cover;" /></div>` : (settings.logoUrl ? `<div style="width: 100%; padding: 8px 12px; display: flex; align-items: flex-start; justify-content: ${settings.logoAlign === 'center' ? 'center' : settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'}; min-height: 60px; margin: 0;"><img src="${settings.logoUrl}" style="width: auto; height: ${settings.logoHeight || 80}px; max-width: 200px; display: block;" /></div>` : '')}
          
          <div style="padding: 20px; display: flex; flex-direction: column; margin: 0; max-width: 100%; box-sizing: border-box; flex: 1; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 8px; max-width: 100%; box-sizing: border-box;">
              <div style="flex-shrink: 0;">
                <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px 0;">${invoiceTitle}</h1>
                <p style="color: #64748b; font-size: 13px; margin: 0;">#${sale.id.slice(-8)}</p>
              </div>
              ${!hasHeaderFooter ? `<div style="text-align: right; position: relative; flex: 0 0 auto; max-width: 50%; min-width: 0; word-wrap: break-word; overflow-wrap: break-word;">
                <h2 style="font-weight: bold; font-size: 12px; margin: 0 0 4px 0; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.2;">${settings.name}</h2>
                <p style="font-size: 10px; color: #64748b; margin: 0 0 2px 0; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.15;">${settings.address || ''}</p>
                <p style="font-size: 10px; color: #64748b; margin: 0 0 2px 0; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.15;">${settings.phone || ''}</p>
                <p style="font-size: 10px; color: #64748b; margin: 0; word-wrap: break-word; overflow-wrap: break-word; line-height: 1.15;">${settings.email || ''}</p>
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
                    <td style="padding: 4px 6px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;">${item.description ? \`\${item.name} — \${item.description}\` : item.name || ''}</td>
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
            
            <!-- Watermark -->
            <div style="position: relative; margin-bottom: 0; min-height: 200px; background-image: ${settings.watermarkImageUrl ? \`url('\${settings.watermarkImageUrl}')\` : 'none'}; background-position: center; background-repeat: no-repeat; background-size: cover; background-attachment: scroll; opacity: 0.15;"></div>
            
            <!-- Signature Section with Grid -->
            <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; max-width: 100%; box-sizing: border-box;">
              <div style="display: flex; flex-direction: column; min-width: 0;">
                <p style="margin: 0 0 30px 0; font-size: 12px; font-weight: bold; word-break: break-word; overflow-wrap: break-word;">Customer</p>
                <div style="border-top: 1px solid #000; width: 50%; float: left;"></div>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end; min-width: 0; position: relative; background-image: ${settings.signatureUrl ? \`url('\${settings.signatureUrl}')\` : 'none'}; background-position: right center; background-repeat: no-repeat; background-size: contain;">
                <p style="margin: 0 0 30px 0; font-size: 12px; font-weight: bold; text-align: right; word-break: break-word; overflow-wrap: break-word; position: relative; z-index: 1;">Signed Manager</p>
                <div style="border-top: 1px solid #000; width: 50%; position: relative; z-index: 1; float: right;"></div>
              </div>
            </div>
          </div>
        </div>
        ${settings.footerImageUrl && hasHeaderFooter ? `<img src="${settings.footerImageUrl}" style="width: 100%; height: ${settings.footerImageHeight || 60}px; display: block; object-fit: cover; margin: 0; padding: 0;" />` : ''}
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
    alert('Failed to download PDF: ' + (e instanceof Error ? e.message : String(e)));
  }
};
```

### Key Changes in Step 2B:
1. ✅ **Single A4 template only** - removed thermal variant
2. ✅ **All inline styles** - no CSS classes
3. ✅ **Added unit column** - 5 columns now instead of 4
4. ✅ **Grid-based signature** - 2-column layout instead of background-image
5. ✅ **Kept watermark** - for downloads only (not email)
6. ✅ **Kept deliveryFee logic** - conditional display
7. ✅ **Kept proforma detection** - `useA4` still controls behavior
8. ✅ **Kept enrichedItems** - proper item enrichment
9. ✅ **CSS simpler** - no complex nesting rules

---

## Phase 3: sendWhatsAppReceipt() Alignment

### Quick Example: Simplify Template

```tsx
// Before (complex template, long lines, CSS classes)
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
      .page-wrapper { width: 210mm; margin: 0 auto; ... }
      .header-image { ... }
      .logo-section { ... }
      /* ... many more rules ... */
    </style>
  </head>
  <body>
    <div class="page-wrapper">
      ${settings.headerImageUrl ? ... : (settings.logoUrl ? ... : '')}
      <!-- content -->
    </div>
  </body>
  </html>
`;

// After (simple inline styles, aligned with email template)
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
    </style>
  </head>
  <body>
    <div style="display: flex; flex-direction: column;">
      <!-- Header/Logo with inline styles -->
      <div style="width: 210mm; margin: 0 auto; padding: 20px;">
        <!-- Content with inline styles -->
      </div>
    </div>
  </body>
  </html>
`;
```

**Key Principle:** Use the same inline style patterns from sendEmailReceipt() to ensure consistency.

---

## Validation Checklist Template

```tsx
// Test case template to verify each phase
const testSalesHistoryAlignment = async () => {
  // ✅ Test 1: Regular Invoice
  const regularSale = {
    id: 'sale-12345',
    date: new Date(),
    isProforma: false,
    isReturn: false,
    customerId: 'cust-1',
    items: [{ name: 'Item 1', quantity: 2, price: 10 }],
    subtotal: 20,
    vat: 2,
    deliveryFee: 0,
    total: 22,
    particulars: 'Test note'
  };
  
  // ✅ Test 2: Proforma Invoice
  const proformaSale = {
    ...regularSale,
    id: 'sale-proforma',
    isProforma: true
  };
  
  // ✅ Test 3: Sale with Delivery
  const salWithDelivery = {
    ...regularSale,
    deliveryFee: 5,
    total: 27
  };
  
  // ✅ Test 4: Walk-in Customer
  const walkinSale = {
    ...regularSale,
    customerId: null
  };
  
  // ✅ Test 5: Return
  const returnSale = {
    ...regularSale,
    id: 'return-1',
    isReturn: true
  };
  
  console.log('All test cases ready for validation');
};
```

---

## Common CSS→Inline Conversions Reference

```tsx
// Pattern: Convert CSS class to inline style
// BEFORE:
// .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
// <div class="header">

// AFTER:
// <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">

// Examples:

// Flexbox layouts
// display: flex; flex-direction: column; → <div style="display: flex; flex-direction: column;">
// justify-content: space-between; → style="justify-content: space-between;"

// Text styling
// font-size: 12px; font-weight: bold; → style="font-size: 12px; font-weight: bold;"

// Spacing
// margin-bottom: 20px; margin-left: 10px; → style="margin-bottom: 20px; margin-left: 10px;"
// padding: 8px 12px; → style="padding: 8px 12px;"

// Borders & colors
// border: 1px solid #cbd5e1; → style="border: 1px solid #cbd5e1;"
// background: #f1f5f9; → style="background: #f1f5f9;"

// Conditional styling
// ${condition ? 'style content' : 'alternate'}
// <div style="justify-content: ${align === 'center' ? 'center' : 'flex-start'}">
```

---

## Summary: What Changed in Each Phase

| Phase | Function | Before Lines | After Lines | Reduction | Key Change |
|-------|----------|--------------|-------------|-----------|------------|
| 1 | sendEmailReceipt() | 135 | 105 | -22% | CSS→inline, remove watermark/sig |
| 2 | downloadReceipt() | 270 | 200 | -26% | Single template, CSS→inline, new sig |
| 3 | sendWhatsAppReceipt() | 160 | 130 | -19% | Align with email, simplify |
| **Total** | **All three** | **~565** | **~435** | **-23%** | **Consistency, maintainability** |

