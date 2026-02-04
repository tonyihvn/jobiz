import React, { useEffect, useState } from 'react';
import db from '../services/apiClient';
import { fmt, getImageUrl } from '../services/format';
import { CompanySettings } from '../types';
import { X, Printer, Download } from 'lucide-react';
import { generatePDFFromElement } from '../services/pdfGenerator';

const PrintReceipt = () => {
  const [receiptType, setReceiptType] = useState<'thermal' | 'a4'>('thermal');
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [saleData, setSaleData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    // Get sale data from URL query params or sessionStorage
    const params = new URLSearchParams(window.location.search);
    const saleJson = params.get('sale');
    const receiptTypeParam = params.get('type') || 'thermal';
    
    setReceiptType(receiptTypeParam as 'thermal' | 'a4');

    if (saleJson) {
      try {
        setSaleData(JSON.parse(decodeURIComponent(saleJson)));
      } catch (e) {
        console.error('Failed to parse sale data', e);
      }
    }

    // Load settings and customers
    (async () => {
      try {
        const sett = db.settings && db.settings.get ? await db.settings.get() : null;
        setSettings(sett || {});

        const custs = db.customers && db.customers.getAll ? await db.customers.getAll() : [];
        setCustomers(custs || []);
      } catch (err) {
        console.error('Failed to load receipt data', err);
      } finally {
        setLoading(false);
      }
    })();

    // Auto-print if autoprint=true in URL
    const autoprint = params.get('autoprint') === 'true';
    setTimeout(() => {
      if (autoprint) {
        window.print();
      }
    }, 500);
  }, []);

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

  return (
    <div className="bg-white min-h-screen">
      {/* Header Controls - Print Only */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center no-print sticky top-0 z-10 overflow-hidden">
        <div className="flex gap-2">
          <button
            onClick={() => setReceiptType('thermal')}
            className={`px-4 py-2 rounded border font-medium ${
              receiptType === 'thermal'
                ? 'bg-brand-50 border-brand-500 text-brand-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Thermal Receipt
          </button>
          <button
            onClick={() => setReceiptType('a4')}
            className={`px-4 py-2 rounded border font-medium ${
              receiptType === 'a4'
                ? 'bg-brand-50 border-brand-500 text-brand-700'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            A4 Invoice
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Download size={18} /> {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-800 text-white rounded flex items-center gap-2 hover:bg-slate-900 font-medium"
          >
            <Printer size={18} /> Print
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 font-medium"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Receipt Content */}
      <div className="bg-gray-100 p-8 flex justify-center min-h-[calc(100vh-80px)] overflow-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Thermal Receipt */}
        {receiptType === 'thermal' && (
          <div id="thermal-receipt" className="bg-white p-4 w-[300px] printable-receipt">
            <div className="text-center mb-6">
              {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="w-16 mx-auto mb-2" />}
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
                {saleData.items.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="py-1">
                      {item.name}
                      <div className="text-[9px] text-gray-400">{item.unit}</div>
                    </td>
                    <td className="py-1 text-right">{item.quantity}</td>
                    <td className="py-1 text-right">{fmtCurrency(Number(item.price) * Number(item.quantity), 2)}</td>
                  </tr>
                ))}
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
          <div id="a4-invoice" className="bg-white w-[210mm] min-h-[297mm] flex flex-col overflow-visible">
            {/* Header Image */}
            {settings.headerImageUrl && (
              <img src={getImageUrl(settings.headerImageUrl) || settings.headerImageUrl} alt="Header" className="w-full h-auto" style={{ display: 'block' }} />
            )}
            <div className="flex-1 overflow-visible px-12 py-8">
              <div className="flex justify-between items-start mb-12">
                <div>
                  {!settings.headerImageUrl && settings.logoUrl && <img src={getImageUrl(settings.logoUrl) || settings.logoUrl} alt="Logo" className="w-auto h-20 mb-4" />}
                  <h1 className="text-4xl font-bold text-slate-800 tracking-tight">
                    {saleData.isProforma ? 'PROFORMA INVOICE' : 'INVOICE'}
                  </h1>
                  <p className="text-slate-500 mt-2">#{saleData.id}</p>
                </div>
                <div className="text-right">
                  <h2 className="font-bold text-lg text-slate-800">{settings.name}</h2>
                  <p className="text-sm text-slate-500 w-64 ml-auto">{settings.address}</p>
                  <p className="text-sm text-slate-500">{settings.email}</p>
                  <p className="text-sm text-slate-500">{settings.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Bill To</h3>
                  {saleData.customerId ? (
                    <div className="text-slate-800">
                      <p className="font-bold">{customers.find(c => c.id === saleData.customerId)?.name}</p>
                      <p className="text-sm">{customers.find(c => c.id === saleData.customerId)?.address}</p>
                      <p className="text-sm">{customers.find(c => c.id === saleData.customerId)?.phone}</p>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">Walk-in Customer</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <span className="text-sm text-slate-400 font-bold uppercase tracking-wider mr-4">Date:</span>
                    <span className="text-slate-800 font-medium">{new Date(saleData.date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-sm text-slate-400 font-bold uppercase tracking-wider mr-4">Payment:</span>
                    <span className="text-slate-800 font-medium">{saleData.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <table className="w-full text-left mb-8">
                <thead>
                  <tr className="border-b-2 border-slate-800">
                    <th className="py-3 font-bold text-slate-800">Description</th>
                    <th className="py-3 font-bold text-slate-800 text-right">Quantity</th>
                    <th className="py-3 font-bold text-slate-800 text-right">UOM</th>
                    <th className="py-3 font-bold text-slate-800 text-right">Unit Price</th>
                    <th className="py-3 font-bold text-slate-800 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {saleData.items.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-4 text-slate-600">{item.name}</td>
                      <td className="py-4 text-slate-600 text-right">{item.quantity}</td>
                      <td className="py-4 text-slate-600 text-right text-xs uppercase">{item.unit}</td>
                      <td className="py-4 text-slate-600 text-right">{fmtCurrency(item.price, 2)}</td>
                      <td className="py-4 text-slate-800 font-bold text-right">
                        {fmtCurrency(item.price * item.quantity, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>{fmtCurrency(saleData.subtotal, 2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>VAT ({settings.vatRate}%)</span>
                    <span>{fmtCurrency(saleData.vat, 2)}</span>
                  </div>
                  {saleData.deliveryFee ? (
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery</span>
                      <span>{fmtCurrency(saleData.deliveryFee, 2)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-xl font-bold text-slate-900 border-t-2 border-slate-800 pt-3">
                    <span>Total</span>
                    <span>{fmtCurrency(saleData.total, 2)}</span>
                  </div>
                </div>
              </div>
              {/* Amount in words and invoice notes */}
              <div className="p-6">
                <div className="text-sm text-slate-700 italic">Amount in words: {numberToWords(Number(saleData.total))}</div>
                {settings.invoiceNotes && (
                  <div className="text-sm text-slate-700 mt-2">{settings.invoiceNotes}</div>
                )}
              </div>
            </div>

            {/* Footer Image */}
            {settings.footerImageUrl && (
              <img src={getImageUrl(settings.footerImageUrl) || settings.footerImageUrl} alt="Footer" className="w-full h-auto mt-auto" style={{ display: 'block' }} />
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
          width: 210mm !important;
          height: auto !important;
          box-sizing: border-box;
          display: flex !important;
          flex-direction: column !important;
          margin: 0 auto;
          padding: 0;
        }

        #a4-invoice .flex-1 {
          flex: 1 !important;
          overflow: visible !important;
          display: flex !important;
          flex-direction: column !important;
        }

        /* Table styling for invoices */
        #a4-invoice table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        #a4-invoice thead {
          background-color: #f8fafc;
        }

        #a4-invoice th,
        #a4-invoice td {
          padding: 10px;
          text-align: left;
        }

        #a4-invoice tbody tr {
          border-bottom: 1px solid #e2e8f0;
        }

        #a4-invoice tbody tr:last-child {
          border-bottom: none;
        }

        /* Invoice footer and totals area */
        #a4-invoice .space-y-3 {
          background-color: #ffffff;
          padding: 15px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }

        /* Ensure no overflow on images */
        #a4-invoice img {
          max-width: 100%;
          height: auto !important;
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
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
            page-break-inside: avoid;
            page-break-after: always;
            display: block !important;
            overflow: visible !important;
          }

          #a4-invoice > * {
            page-break-inside: avoid;
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
