import React, { useEffect, useState } from 'react';
import db from '../services/apiClient';
import { fmt, getImageUrl } from '../services/format';
import { CompanySettings } from '../types';
import { X, Printer, Download } from 'lucide-react';
import { generatePDFFromElement } from '../services/pdfGenerator';
import { useBusinessContext } from '../services/BusinessContext';

const PrintReceipt = () => {
  const { selectedBusinessId } = useBusinessContext();
  const [receiptType, setReceiptType] = useState<'thermal' | 'a4'>('thermal');
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [saleData, setSaleData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    // Get sale data from sessionStorage (passed from ServiceHistory/SalesHistory)
    const invoiceDataStr = sessionStorage.getItem('invoiceData');
    const receiptTypeStr = sessionStorage.getItem('receiptType');
    const customerIdStr = sessionStorage.getItem('customerId');
    
    if (invoiceDataStr) {
      try {
        const parsedData = JSON.parse(invoiceDataStr);
        // Ensure customerId is included from sessionStorage if not in data
        if (!parsedData.customerId && customerIdStr) {
          parsedData.customerId = customerIdStr;
        }
        setSaleData(parsedData);
      } catch (e) {
        console.error('Failed to parse sale data from sessionStorage', e);
      }
    }

    if (receiptTypeStr && (receiptTypeStr === 'thermal' || receiptTypeStr === 'a4')) {
      setReceiptType(receiptTypeStr);
    }

    // Load settings and customers
    (async () => {
      try {
        const sett = db.settings && db.settings.get ? await db.settings.get(selectedBusinessId) : null;
        setSettings(sett || {});

        const custs = db.customers && db.customers.getAll ? await db.customers.getAll(selectedBusinessId) : [];
        setCustomers(custs || []);

        const prods = db.products && db.products.getAll ? await db.products.getAll(selectedBusinessId) : [];
        setProducts(prods || []);

        const emps = db.employees && db.employees.getAll ? await db.employees.getAll(selectedBusinessId) : [];
        setEmployees(emps || []);
      } catch (err) {
        console.error('Failed to load receipt data', err);
      } finally {
        setLoading(false);
      }
    })();

    // Auto-print if autoprint=true in URL (disabled)
    // const autoprint = params.get('autoprint') === 'true';
    // setTimeout(() => {
    //   if (autoprint) {
    //     window.print();
    //   }
    // }, 500);
  }, []);

  // Helper to get employee name by email
  const getEmployeeName = (emailOrName: string) => {
    if (!emailOrName) return 'Cashier';
    // If it's already a name (doesn't contain @), return as-is
    if (!emailOrName.includes('@')) return emailOrName;
    // If it looks like an email, try to find the employee
    const emp = employees.find(e => e.email === emailOrName);
    return emp ? emp.name : emailOrName;
  };

  const numberToWords = (amount: number) => {
    if (!amount && amount !== 0) return '';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scale = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + scale(n % 100) : '');
      if (n < 1_000_000) return scale(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + scale(n % 1000) : '');
      if (n < 1_000_000_000) return scale(Math.floor(n / 1_000_000)) + ' Million' + (n % 1_000_000 ? ' ' + scale(n % 1_000_000) : '');
      return scale(Math.floor(n / 1_000_000_000)) + ' Billion' + (n % 1_000_000_000 ? ' ' + scale(n % 1_000_000_000) : '');
    };
    return scale(Math.floor(amount));
  };

  if (loading || !saleData || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-slate-600">Loading receipt...</p>
      </div>
    );
  }

  const fmtCurrency = (val: number, decimals: number = 2) => {
    return val.toLocaleString('en-NG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const enrichItem = (item: any) => {
    const prod = products.find(p => p.id === (item.product_id || item.id));
    return {
      ...item,
      id: item.id || item.product_id,
      name: item.name || (prod ? prod.name : '') || '',
      unit: item.unit || prod?.unit || 'N/A',
    };
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const elementId = receiptType === 'thermal' ? 'thermal-receipt' : 'a4-invoice';
      const filename = `${saleData.isProforma ? 'Proforma-Invoice' : 'Invoice'}-${saleData.id.slice(-8)}`;
      
      await generatePDFFromElement(elementId, filename, {
        orientation: 'portrait',
        format: 'a4'
      });
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading || !saleData || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <p className="text-slate-600 text-lg">Loading invoice...</p>
          {!saleData && <p className="text-slate-500 text-sm mt-2">No invoice data found</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Receipt Content */}
      <div className="bg-gray-100 p-8 flex justify-center min-h-screen overflow-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Thermal Receipt */}
        {receiptType === 'thermal' && (
          <div id="thermal-receipt" className="bg-white p-4 w-[300px] printable-receipt">
            <div className="text-center mb-6">
              {settings.logoUrl && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}><img src={getImageUrl(settings.logoUrl) || settings.logoUrl} alt="Logo" style={{ height: `${settings.logoHeight || 100}px`, maxHeight: `${settings.logoHeight || 100}px`, width: 'auto', maxWidth: '200px' }} crossOrigin="anonymous" /></div>}
              <h1 className="font-bold text-lg uppercase tracking-wider">{settings.name}</h1>
              <p className="text-xs text-gray-500">{settings.address}</p>
              <p className="text-xs text-gray-500">{settings.phone}</p>
              <p className="text-[10px] italic mt-1 text-gray-400">{settings.motto}</p>
            </div>

            <div className="border-b border-dashed border-gray-300 my-4"></div>

            <div className="flex justify-between text-xs mb-4">
              <span>Date: {new Date(saleData.date).toLocaleDateString()}</span>
              <span>Time: {new Date(saleData.date).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between text-xs mb-4">
              <span>Receipt #: {saleData.id.slice(-8)}</span>
              <span>Cashier: {saleData.cashier}</span>
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
                {saleData.items.map((item: any, i: number) => {
                  const enriched = enrichItem(item);
                  return (
                    <tr key={i}>
                      <td className="py-1">
                        {enriched.name}
                        <div className="text-[9px] text-gray-400">{enriched.unit}</div>
                      </td>
                      <td className="py-1 text-right">{item.quantity}</td>
                      <td className="py-1 text-right">{fmtCurrency(Number(item.price) * Number(item.quantity), 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="border-t border-dashed border-gray-300 my-2 pt-2 space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span>Subtotal</span>
                <span>{fmtCurrency(saleData.subtotal, 2)}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span>VAT ({settings.vatRate}%)</span>
                <span>{fmtCurrency(saleData.vat, 2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold mt-2">
                <span>TOTAL</span>
                <span>{fmtCurrency(Number(saleData.total), 2)}</span>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-400">
              <p>Thank you for your business!</p>
            </div>
          </div>
        )}

        {/* A4 Invoice */}
        {receiptType === 'a4' && (
          <div id="a4-invoice" style={{ position: 'relative', width: '210mm', maxWidth: '100%', minWidth: '210mm', height: 'auto', boxSizing: 'border-box', margin: '0 auto', padding: 0, overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* A4 Content Wrapper - strict width constraint */}
            <div style={{ width: '100%', maxWidth: '100%', height: '100%', boxSizing: 'border-box', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', overflowX: 'hidden', backgroundColor: 'white', flex: 1, minHeight: 0 }}>
            {/* Header Image or Logo */}
            {settings.headerImageUrl ? (
              <img
                src={getImageUrl(settings.headerImageUrl) || settings.headerImageUrl}
                alt="Header"
                style={{ width: '100%', maxWidth: '100%', height: `${settings.headerImageHeight || 100}px`, maxHeight: `${settings.headerImageHeight || 100}px`, margin: 0, padding: 0, boxSizing: 'border-box', display: 'block', objectFit: 'cover' }}
                crossOrigin="anonymous"
                onError={e => {
                  // fallback to logo if header fails
                  if (settings.logoUrl) {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getImageUrl(settings.logoUrl) || settings.logoUrl;
                    e.currentTarget.style.width = 'auto';
                    e.currentTarget.style.objectFit = 'contain';
                    e.currentTarget.style.height = `${settings.logoHeight || 100}px`;
                    e.currentTarget.style.maxHeight = `${settings.logoHeight || 100}px`;
                  }
                }}
              />
            ) : settings.logoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: settings.logoAlign === 'center' ? 'center' : settings.logoAlign === 'right' ? 'flex-end' : 'flex-start', padding: '8px 12px', width: '100%', boxSizing: 'border-box', minHeight: `${settings.logoHeight || 100}px` }}>
                <img
                  src={getImageUrl(settings.logoUrl) || settings.logoUrl}
                  alt="Logo"
                  style={{ height: `${settings.logoHeight || 100}px`, maxHeight: `${settings.logoHeight || 100}px`, width: 'auto', maxWidth: '200px', display: 'inline-block' }}
                  crossOrigin="anonymous"
                  onError={e => {
                    // fallback to blank if logo fails
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '';
                  }}
                />
              </div>
            ) : null}

            <div className="flex-1" style={{ width: '100%', maxWidth: '100%', margin: 0, boxSizing: 'border-box', padding: '10px 12px', display: 'flex', flexDirection: 'column', position: 'relative', overflowX: 'hidden' }}>
              {/* Invoice Title and Company Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
                
                {!settings?.headerImageUrl && (
                  <div style={{ textAlign: 'right', flex: 1 }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 6px 0' }}>{settings?.name}</h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 2px 0' }}>{settings?.address}</p>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 2px 0' }}>{settings?.email}</p>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0' }}>{settings?.phone}</p>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 6px 0', lineHeight: '1.2' }}>
                    {saleData.isProforma ? 'PROFORMA INVOICE' : 'INVOICE'}
                  </h1>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: '0' }}>#{saleData.id.slice(-8)}</p>
                </div>
              </div>

              {/* Bill To and Invoice Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '15px' }}>
                <div style={{ flex: 'auto', minWidth: 0 }}>
                  <h3 style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Bill To</h3>
                  {saleData.customerName ? (
                    <div style={{ color: '#1e293b' }}>
                      <p style={{ fontWeight: 'bold', fontSize: '15px', margin: '0 0 4px 0' }}>{saleData.customerName}</p>
                      {saleData.customerCompany && <p style={{ fontSize: '13px', margin: '0 0 2px 0' }}>{saleData.customerCompany}</p>}
                      <p style={{ fontSize: '13px', margin: '0 0 2px 0' }}>{saleData.customerAddress || ''}</p>
                      <p style={{ fontSize: '13px', margin: '0 0 2px 0' }}>{saleData.customerPhone || ''}</p>
                      {saleData.customerEmail && <p style={{ fontSize: '13px', margin: '0' }}>{saleData.customerEmail}</p>}
                    </div>
                  ) : (() => {
                    const custId = saleData.customerId || (saleData as any).customer_id;
                    const customer = custId ? customers.find(c => c.id === custId || String(c.id) === String(custId)) : null;
                    return customer ? (
                      <div style={{ color: '#1e293b' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '15px', margin: '0 0 4px 0' }}>{customer.name}</p>
                        {customer.company && <p style={{ fontSize: '13px', margin: '0 0 2px 0' }}>{customer.company}</p>}
                        <p style={{ fontSize: '13px', margin: '0 0 2px 0' }}>{customer.address}</p>
                        <p style={{ fontSize: '13px', margin: '0 0 2px 0' }}>{customer.phone}</p>
                        {customer.email && <p style={{ fontSize: '13px', margin: '0' }}>{customer.email}</p>}
                      </div>
                    ) : <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '13px', margin: '0' }}>Walk-in Customer</p>;
                  })()
                  }
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginRight: '8px' }}>Date:</span>
                    <span style={{ fontSize: '15px', color: '#1e293b', fontWeight: '500' }}>{new Date(saleData.date).toLocaleDateString()}</span>
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginRight: '8px' }}>Payment:</span>
                    <span style={{ fontSize: '15px', color: '#1e293b', fontWeight: '500' }}>{saleData.paymentMethod}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginRight: '8px' }}>Cashier:</span>
                    <span style={{ fontSize: '15px', color: '#1e293b', fontWeight: '500' }}>{getEmployeeName(saleData.cashier)}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Table with Watermark Background */}
              <div style={{ position: 'relative', marginBottom: '0px', backgroundImage: settings.watermarkImageUrl ? `url('${getImageUrl(settings.watermarkImageUrl) || settings.watermarkImageUrl}')` : 'none', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundSize: 'cover', backgroundAttachment: 'scroll', minHeight: '0px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', boxSizing: 'border-box', tableLayout: 'fixed', overflowX: 'hidden', position: 'relative', zIndex: 1 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #1e293b', backgroundColor: '#f1f5f9' }}>
                      <th style={{ padding: '8px', fontWeight: 'bold', color: '#1e293b', fontSize: '13px', textAlign: 'left', border: '1px solid #cbd5e1' }} width="40%">Description</th>
                      <th style={{ padding: '8px', fontWeight: 'bold', color: '#1e293b', fontSize: '13px', textAlign: 'right', border: '1px solid #cbd5e1' }} width="12%">Qty</th>
                      <th style={{ padding: '8px', fontWeight: 'bold', color: '#1e293b', fontSize: '13px', textAlign: 'right', border: '1px solid #cbd5e1' }} width="12%">Unit</th>
                      <th style={{ padding: '8px', fontWeight: 'bold', color: '#1e293b', fontSize: '13px', textAlign: 'right', border: '1px solid #cbd5e1' }} width="18%">Rate</th>
                      <th style={{ padding: '8px', fontWeight: 'bold', color: '#1e293b', fontSize: '13px', textAlign: 'right', border: '1px solid #cbd5e1' }} width="18%">Amount ({settings.currency})</th>
                    </tr>
                  </thead>
                  <tbody>
                  {saleData.items.map((item: any, i: number) => {
                    const enriched = enrichItem(item);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
                        <td style={{ padding: '8px', color: '#475569', fontSize: '13px', textAlign: 'left', wordBreak: 'break-word', border: '1px solid #cbd5e1' }}>{enriched.name}</td>
                        <td style={{ padding: '8px', color: '#475569', fontSize: '13px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{item.quantity}</td>
                        <td style={{ padding: '8px', color: '#475569', fontSize: '13px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{enriched.unit}</td>
                        <td style={{ padding: '8px', color: '#475569', fontSize: '13px', textAlign: 'right', border: '1px solid #cbd5e1' }}>{fmtCurrency(item.price, 2)}</td>
                        <td style={{ padding: '8px', color: '#1e293b', fontSize: '13px', fontWeight: 'bold', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                          {fmtCurrency(item.price * item.quantity, 2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px', marginTop: '2px' }}>
                <div style={{ minWidth: '35%', maxWidth: '45%', float: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '13px', marginBottom: '8px' }}>
                    <span>Subtotal: </span>
                    <span>{settings.currency} {fmtCurrency(saleData.subtotal, 2)}</span>
                  </div>
                  {settings.vatRate > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '13px', marginBottom: '8px' }}>
                      <span>VAT ({settings.vatRate}%)</span>
                      <span>{fmtCurrency(saleData.vat, 2)}</span>
                    </div>
                  )}
                  {saleData.deliveryFee ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '13px', marginBottom: '8px' }}>
                      <span>Delivery</span>
                      <span>{fmtCurrency(saleData.deliveryFee, 2)}</span>
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 'bold', color: '#1e293b', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                    <span>Total: </span>
                    <span>{settings.currency}{fmtCurrency(saleData.total, 2)}</span>
                  </div>
                </div>
              </div>

              {/* Amount in words, notes, and signature */}
              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '15px' }}>
                {/* <div>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginRight: '8px' }}>Cashier:</span>
                  <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{getEmployeeName(saleData.cashier)}</span>
                </div> */}
                <div style={{ fontStyle: 'italic', marginBottom: '8px', marginTop: '8px' }}>Amount in words: <b>{numberToWords(Number(saleData.total))} Naira Only</b></div>
                {settings.invoiceNotes && (
                  <div style={{ marginBottom: '8px' }}><strong>Invoice Notes:</strong><br/><div dangerouslySetInnerHTML={{ __html: settings.invoiceNotes }} style={{ display: 'inline' }} /></div>
                )}
                {saleData.particulars && (
                  <div style={{ marginBottom: '8px' }}><strong>Notes:</strong> {saleData.particulars}</div>
                )}
                <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <p style={{ margin: '0 0 30px 0', fontSize: '13px', fontWeight: 'bold' }}>Customer</p>
                    <div style={{ borderTop: '1px solid #000', width: '50%', float: 'left', marginTop: '20px' }}></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0, position: 'relative', backgroundImage: settings?.signatureUrl ? `url('${getImageUrl(settings.signatureUrl) || settings.signatureUrl}')` : 'none', backgroundPosition: 'right center', backgroundRepeat: 'no-repeat', backgroundSize: 'contain', minHeight: '0px' }}>
                    <p style={{ margin: '0 0 30px 0', fontSize: '13px', fontWeight: 'bold', textAlign: 'right', position: 'relative', zIndex: 1 }}>Signed Manager</p>
                    <div style={{ borderTop: '1px solid #000', width: '50%', float: 'right', marginTop: '20px', position: 'relative', zIndex: 1 }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            </div>
            {/* Footer Image */}
            {settings.footerImageUrl && (
              <img src={getImageUrl(settings.footerImageUrl) || settings.footerImageUrl} alt="Footer" className="w-full block" crossOrigin="anonymous" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', maxWidth: '100%', height: `${settings.footerImageHeight || 60}px`, maxHeight: `${settings.footerImageHeight || 60}px`, boxSizing: 'border-box', margin: 0, padding: 0, display: 'block', objectFit: 'cover' }} onError={e => { console.error('Footer image failed to load'); e.currentTarget.style.display = 'none'; }} />
            )}
          </div>
          
        )}
      </div>

      <style>{`
        /* Hide scrollbar for all browsers */
        ::-webkit-scrollbar {
          display: none;
        }
        
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        /* Remove shadows and ensure clean appearance */
        .printable-receipt,
        #a4-invoice {
          box-shadow: none !important;
          -webkit-box-shadow: none !important;
        }

        /* A4 Invoice specific styling */
        #a4-invoice {
          position: relative !important;
          width: 210mm !important;
          max-width: 210mm !important;
          min-width: 210mm !important;
          min-height: 297mm !important;
          height: auto !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: column !important;
          margin: 0 auto !important;
          padding: 0 !important;
          page-break-after: avoid;
          overflow-x: hidden !important;
          overflow-y: visible !important;
          left: 0 !important;
        }

        #a4-invoice img {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
        }

        #a4-invoice img[alt="Logo"],
        #a4-invoice img[alt="Header"] {
          width: auto !important;
          max-width: 200px !important;
          display: inline-block !important;
        }

        #a4-invoice > div {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 10px 12px !important;
          overflow-x: hidden !important;
          position: relative !important;
          display: flex !important;
          flex-direction: column !important;
          min-height: 100% !important;
          padding-bottom: 0 !important;
        }

        #a4-invoice > img {
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
        }

        #a4-invoice table {
          width: 100% !important;
          max-width: calc(210mm - 24px) !important;
          border-collapse: collapse;
          font-size: 11px !important;
          overflow-x: hidden !important;
          table-layout: fixed !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          white-space: normal !important;
          word-break: break-word !important;
          display: table !important;
        }

        #a4-invoice thead {
          background-color: #f1f5f9;
        }

        #a4-invoice th,
        #a4-invoice td {
          padding: 6px 8px !important;
          margin: 0 !important;
          text-align: left;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
          white-space: normal !important;
          line-height: 1.2 !important;
          border: 1px solid #cbd5e1 !important;
          display: table-cell !important;
          max-width: 100% !important;
          font-size: 11px !important;
        }

        #a4-invoice tbody tr {
          border-bottom: 1px solid #e2e8f0;
          background-color: #fafbfc;
        }

        #a4-invoice tbody tr:last-child {
          border-bottom: none;
        }

        #a4-invoice h1 {
          font-size: 24px !important;
          font-weight: bold !important;
          margin: 0 !important;
          line-height: 1.2 !important;
          color: #1e293b !important;
        }

        #a4-invoice h2 {
          font-size: 13px !important;
          font-weight: bold !important;
          margin: 0 !important;
          color: #1e293b !important;
        }

        #a4-invoice h3 {
          font-size: 11px !important;
          font-weight: bold !important;
          margin: 0 !important;
          color: #64748b !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }

        #a4-invoice p {
          margin: 0 !important;
          font-size: 11px !important;
          color: #475569 !important;
        }

        #a4-invoice div[style*="display: grid"] {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        #a4-invoice div[style*="display: flex"] {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          overflow-x: hidden !important;
        }

        /* Page container fix */
        .bg-gray-100 {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          overflow-y: auto;
          overflow-x: hidden;
          background-color: #f3f4f6;
        }

        /* Thermal receipt styling */
        .printable-receipt {
          overflow: visible !important;
          height: auto !important;
          display: block !important;
        }
        
        @media print {
          /* Global print styles */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            overflow: visible;
            background: white;
            height: auto;
            width: 100%;
          }
          
          body {
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          
          .no-print {
            display: none !important;
          }

          /* Hide non-printable elements */
          button,
          a:not(.invoice-link),
          [role="button"] {
            display: none !important;
          }
          
          .printable-receipt {
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            page-break-inside: avoid;
            page-break-after: avoid;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #a4-invoice {
            width: 210mm !important;
            height: auto !important;
            page-break-after: avoid;
            page-break-inside: avoid;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          #a4-invoice img {
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          }
          
          .printable-receipt * {
            page-break-inside: avoid;
          }

          /* A4 Invoice print styles */
          #a4-invoice {
            width: 210mm !important;
            max-width: 210mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
            page-break-inside: avoid;
            page-break-after: always;
            display: block !important;
            overflow-x: hidden !important;
            overflow-y: visible !important;
            box-sizing: border-box !important;
          }

          #a4-invoice > * {
            page-break-inside: avoid;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          #a4-invoice table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            overflow-x: hidden !important;
            page-break-inside: avoid !important;
          }

          #a4-invoice th,
          #a4-invoice td {
            overflow-x: hidden !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
            page-break-inside: avoid !important;
            max-width: 100% !important;
          }

          #a4-invoice div[style*="flex"] {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }

          #a4-invoice div[style*="grid"] {
            display: grid !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          
          /* For container */
          .bg-gray-100 {
            background: white !important;
            padding: 0 !important;
            display: block !important;
            margin: 0 !important;
            width: 100% !important;
          }

          /* Remove container background */
          .bg-gray-100 > * {
            display: block !important;
          }

          /* Thermal receipt print */
          .printable-receipt {
            width: 80mm !important;
            margin: 0 auto !important;
            overflow: visible !important;
          }
        }
        
        @page {
          size: A4;
          margin: 0;
          padding: 0;
        }

        @page :first {
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default PrintReceipt;
