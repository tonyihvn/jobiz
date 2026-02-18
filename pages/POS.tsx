import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import db from '../services/apiClient';
import { fmt, getImageUrl } from '../services/format';
import useFmtCurrency from '../services/useFmtCurrency';
import { useCurrency } from '../services/CurrencyContext';
import { Product, CartItem, SaleRecord, CategoryGroup, Customer, CompanySettings } from '../types';
import { Plus, Minus, Trash2, Printer, Save, Search, X, User } from 'lucide-react';
import { useContextBusinessId } from '../services/useContextBusinessId';
import { useBusinessContext } from '../services/BusinessContext';

// Simple Icon component for empty state
const EmptyCartIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <path d="M16 10a4 4 0 0 1-8 0"></path>
    </svg>
);

const POS = () => {
    const { businessId } = useContextBusinessId();
    const { selectedBusinessId } = useBusinessContext();
    const { setSymbol } = useCurrency();
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const defaultSettings: CompanySettings = { businessId: '', name: '', motto: '', address: '', phone: '', email: '', logoUrl: '', vatRate: 7.5, currency: 'USD' };
    const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
    const fmtCurrency = useFmtCurrency();
  const [cart, setCart] = useState<CartItem[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
  
        // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');
        const [selectedCategory, setSelectedCategory] = useState<string>('Products');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);

    // Derived category tabs (from products)
    const [categoriesState, setCategoriesState] = React.useState<any[]>([]);
    const categoryTabs = React.useMemo(() => {
        const present = new Set<string>();
        const arr = Array.isArray(categoriesState) ? categoriesState : (categoriesState ? Object.values(categoriesState) : []);
        for (const c of arr) if (c && c.group) present.add(c.group as string);
        const tabs: string[] = ['Products'];
        // show a global Services tab when there are services available
        try {
            if (products && Array.isArray(products) && products.some(p => p.isService)) {
                tabs.push('Services');
            }
        } catch (e) { /* ignore */ }
        // always include All after Products/Services
        tabs.push('All');
        // Put Food & Drinks next if present
        if (present.has('Food & Drinks') && !tabs.includes('Food & Drinks')) tabs.push('Food & Drinks');
        for (const g of Array.from(present)) if (!tabs.includes(g)) tabs.push(g);
        return tabs;
    }, [categoriesState, products]);

  // Order Details
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProforma, setIsProforma] = useState(false);
  const [proformaTitle, setProformaTitle] = useState('PROFORMA INVOICE');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [particulars, setParticulars] = useState('');
  const [delivery, setDelivery] = useState({ enabled: false, fee: 0, address: '' });

  // UI State
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptType, setReceiptType] = useState<'thermal' | 'a4'>('thermal');
  const [showReceiptActions, setShowReceiptActions] = useState(true);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);

    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const init = async () => {
            try {
            const proms: any[] = [db.products.getAll(selectedBusinessId), db.services && db.services.getAll ? db.services.getAll(selectedBusinessId) : Promise.resolve([]), db.customers.getAll(selectedBusinessId), db.auth.getCurrentUser(), db.categories && db.categories.getAll ? db.categories.getAll(selectedBusinessId) : Promise.resolve([])];
                // settings may or may not exist on the client proxy
                if (db.settings && db.settings.get) {
                    proms.splice(3, 0, db.settings.get());
                }
                const results = await Promise.all(proms);
                // Results ordering depends on whether settings was included
                // results: products, services, customers, user, categories
                const [prods, svcs, custs, user, cats] = results;
                // Only use services from the services table (not from products table)
                const svcItems = Array.isArray(svcs) ? svcs.map((s: any) => ({ ...s, isService: true, isFromServicesTable: true })) : [];
                // Filter products to exclude any marked as services (only show actual products)
                const productsOnly = Array.isArray(prods) ? prods.filter((p: any) => {
                    const isServiceFlag = typeof p.isService !== 'undefined' ? !!p.isService : (typeof p.is_service !== 'undefined' ? !!p.is_service : false);
                    return !isServiceFlag;
                }) : [];
                const combined = [...productsOnly, ...svcItems];
                // normalize isService flag and image URLs across different shapes
                const isServiceFlag = (p: any) => {
                    if (typeof p.isService !== 'undefined') return !!p.isService;
                    if (typeof p.is_service !== 'undefined') return !!p.is_service;
                    return false;
                };
                setProducts((combined || []).map((p: any) => ({ 
                    ...p, 
                    isService: isServiceFlag(p),
                    imageUrl: p.imageUrl || p.image_url || '',
                    categoryGroup: p.categoryGroup || p.category_group || p.group || '',
                    categoryName: p.categoryName || p.category_name || p.name || ''
                })));
                setCustomers(custs || []);
                setCurrentUser(user || null);
                // categories map for group -> isProduct
                const catMap: Record<string, boolean> = {};
                if (Array.isArray(cats)) {
                    for (const c of cats) {
                        catMap[c.group] = typeof c.is_product !== 'undefined' ? !!c.is_product : (typeof c.isProduct !== 'undefined' ? !!c.isProduct : true);
                    }
                }
                setCategoriesState(cats || []);
                // If URL has category/group param, prefer it over defaults
                const urlCat = (typeof window !== 'undefined') ? (new URLSearchParams(window.location.search).get('group') || new URLSearchParams(window.location.search).get('category')) : null;
                if (urlCat) {
                    setSelectedCategory(urlCat);
                } else {
                    // default to Products view (show only products until Services tab clicked)
                    setSelectedCategory('Products');
                }
                
                // attach to products state via ref-like closure by storing catMap on window for now
                (window as any).__categoryMap = catMap;
                // apply settings if available
                if (db.settings && db.settings.get) {
                    const sett = await db.settings.get(selectedBusinessId);
                    const mergedSettings = { ...defaultSettings, ...(sett || {}) };
                    setSettings(mergedSettings);
                    // Update currency context if settings have a currency symbol
                    if (sett && sett.currency) {
                        setSymbol(sett.currency);
                    }
                }
            } catch (err) {
                console.error('Failed to initialize POS data', err);
            }
            if (searchInputRef.current) searchInputRef.current.focus();
        };
        init();
    }, [businessId, selectedBusinessId]);

    // Load edit data if passed from history pages
    useEffect(() => {
        const locationState = (window.history.state?.usr || null) as SaleRecord | null;
        if (locationState && locationState.id) {
            setEditingSale(locationState);
            // Deep clone items to avoid mutation issues when editing
            const clonedItems = JSON.parse(JSON.stringify(locationState.items || []));
            setCart(clonedItems);
            setSelectedCustomer(locationState.customerId || '');
            setOrderDate(new Date(locationState.date).toISOString().split('T')[0]);
            setIsProforma(locationState.isProforma || false);
            setProformaTitle(locationState.proformaTitle || 'PROFORMA INVOICE');
            setPaymentMethod(locationState.paymentMethod || 'Cash');
            setParticulars(locationState.particulars || '');
            if (locationState.deliveryFee && locationState.deliveryFee > 0) {
                setDelivery({ enabled: true, fee: locationState.deliveryFee, address: '' });
            }
        }
    }, []);

    // Helper: convert numbers to words (simple implementation, supports up to billions)
    const numberToWords = (amount: number) => {
        if (!amount && amount !== 0) return '';
        const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
        const tens = ['','', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
        const scale = (n: number) => {
            if (n < 20) return ones[n];
            if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
            if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + scale(n%100) : '');
            if (n < 1_000_000) return scale(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + scale(n%1000) : '');
            if (n < 1_000_000_000) return scale(Math.floor(n/1_000_000)) + ' Million' + (n%1_000_000 ? ' ' + scale(n%1_000_000) : '');
            return scale(Math.floor(n/1_000_000_000)) + ' Billion' + (n%1_000_000_000 ? ' ' + scale(n%1_000_000_000) : '');
        };
        const intPart = Math.floor(Math.abs(amount));
        const decPart = Math.round((Math.abs(amount) - intPart) * 100);
        const sign = amount < 0 ? 'Minus ' : '';
        const intWords = intPart === 0 ? 'Zero' : scale(intPart);
        const decWords = decPart > 0 ? `${decPart}/100` : '';
        return `${sign}${intWords}${decWords ? ' and ' + decWords : ''}`;
    };

    // Business rule: stock-tracked groups are defined in categories (isProduct=true). We'll consult categoryMap.
    const STOCK_TRACKED_GROUPS = Object.keys((window as any).__categoryMap || {}).filter(g => (window as any).__categoryMap[g]);

    const addToCart = async (product: Product) => {
        // Skip stock checks for services - they don't have inventory
        const isService = product.isService || product.is_service;
        
        // Only stock-tracked groups enforce inventory checks (and only for products, not services)
        const stockTracked = !isService && STOCK_TRACKED_GROUPS.includes(product.categoryGroup as CategoryGroup);
        const loc = currentUser?.defaultLocationId || settings.defaultLocationId;

        if (stockTracked && !isProforma) {
            let available = product.stock;
            if (loc && db.stock && db.stock.getForProduct) {
              try {
                const stockData = await db.stock.getForProduct(product.id);
                // stockData is an array of stock_entries — find the location
                const entry = Array.isArray(stockData) ? stockData.find((s: any) => s.location_id === (loc || s.location_id) || s.locationId === loc) : null;
                if (entry) available = entry.quantity;
              } catch (e) { /* ignore */ }
            }
            if ((available || 0) <= 0) {
                alert('Out of Stock at your location!');
                return;
            }
        }

        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1, discount: 0 }];
        });
        setSearchTerm(''); // Clear search after scan/add
        
        // Scroll to cart on small screens (mobile)
        setTimeout(() => {
            if (window.innerWidth < 768 && cartRef.current) {
                cartRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    };

            const updateQuantity = async (id: string, delta: number) => {
                const productItem = products.find(p => p.id === id);
                const current = cart.find(i => i.id === id);
                if (!current || !productItem) return;
                const newQty = Math.max(1, current.quantity + delta);

                    // Skip stock checks for services - they don't have inventory
                    const isService = productItem.isService || productItem.is_service;
                    
                    // Only enforce stock limits for configured stock-tracked products (not services)
                    const stockTracked = !isService && ((window as any).__categoryMap ? !!(window as any).__categoryMap[productItem.categoryGroup] : (productItem.categoryGroup === 'Food & Drinks'));
                if (stockTracked && (currentUser?.defaultLocationId || settings.defaultLocationId) && db.stock && db.stock.getForProduct) {
                        try {
                            const stockData = await db.stock.getForProduct(id);
                            const entry = Array.isArray(stockData) ? stockData.find((s: any) => s.location_id === (currentUser.defaultLocationId || s.location_id) || s.locationId === currentUser.defaultLocationId) : null;
                            const available = entry ? entry.quantity : (productItem.stock || 0);
                            if (!isProforma && newQty > available) {
                                alert('Insufficient Stock!');
                                return;
                            }
                        } catch (e) { /* ignore */ }
                }

                setCart(prev => prev.map(item => item.id === id ? { ...item, quantity: newQty } : item));
            };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const vatRate = settings.vatRate ? settings.vatRate / 100 : 0;
  const vat = subtotal * vatRate;
  const deliveryFee = delivery.enabled ? delivery.fee : 0;
  const total = subtotal + vat + deliveryFee;

    const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Clean items: ensure each has product_id, quantity, price, and is_service
    const cleanedItems = cart.map(item => ({
        product_id: (item.product_id || item.id || '').toString().trim(),
        id: (item.product_id || item.id || '').toString().trim(),
        quantity: parseFloat(String(item.quantity)) || 0,
        price: parseFloat(String(item.price)) || 0,
        is_service: item.is_service || item.isService ? 1 : 0,
        name: (item.name || '').toString().trim(),
        unit: (item.unit || '').toString().trim(),
        categoryGroup: item.categoryGroup
    }));

    // Validate items - must have non-empty product_id, quantity > 0, price >= 0
    const invalidItems = cleanedItems.filter(i => {
        const hasValidId = i.product_id && i.product_id.length > 0;
        const hasValidQty = !isNaN(i.quantity) && i.quantity > 0;
        const hasValidPrice = !isNaN(i.price) && i.price >= 0;
        return !hasValidId || !hasValidQty || !hasValidPrice;
    });
    
    if (invalidItems.length > 0) {
        const details = invalidItems.map((i, idx) => 
            `${idx + 1}. ${i.name || 'Unknown'} - ID: '${i.product_id}', Qty: ${i.quantity}, Price: ${i.price}`
        ).join('\n');
        alert(`Cannot save: ${invalidItems.length} invalid item(s):\n\n${details}\n\nPlease review your cart.`);
        console.error('[POS-VALIDATION] Invalid items:', invalidItems);
        return;
    }

                const sale: SaleRecord = {
            id: editingSale?.id || Date.now().toString(),
            businessId: businessId || '',
            date: new Date(orderDate).toISOString(), // Use custom date
            items: cleanedItems,
            subtotal,
            vat,
            total,
            paymentMethod,
                        cashier: currentUser?.name || currentUser?.email || 'Cashier',
                        locationId: currentUser?.defaultLocationId || settings.defaultLocationId,
            customerId: selectedCustomer,
            isProforma,
            proformaTitle: isProforma ? proformaTitle : undefined,
            deliveryFee: delivery.enabled ? delivery.fee : 0,
            particulars
        };

        try {
            console.log('[POS-CHECKOUT] Sending sale with items:', cleanedItems);
            const res = editingSale ? await db.sales.update(sale.id, sale) : await db.sales.add(sale);
            
            // Check if response contains error
            if (res && res.error) {
                let errorMsg = res.error;
                if (res.rejectedItems && res.rejectedItems.length > 0) {
                    errorMsg += '\n\nRejected items:\n';
                    errorMsg += res.rejectedItems.map((r: any) => `- ${r.item}: ${r.reason}`).join('\n');
                }
                alert(`Failed to update sale:\n\n${errorMsg}`);
                console.error('[POS-CHECKOUT] Server error:', res);
                return;
            }
            
            // Check if any items were rejected during update
            if (editingSale && res && res.rejectedItems && res.rejectedItems.length > 0) {
                const rejectedList = res.rejectedItems.map((r: any) => `- ${r.item}: ${r.reason}`).join('\n');
                const msg = `Warning: ${res.rejectedItems.length} of ${cleanedItems.length} items could not be saved:\n\n${rejectedList}\n\nSale was updated with ${res.insertedCount || 0} items. Please review in Sales History.`;
                alert(msg);
                console.warn('[POS-CHECKOUT] Partial save:', res);
            }
            
            // Reduce Stock ONLY if NOT Proforma and NOT editing (to avoid double-counting)
            if (!isProforma && !editingSale) {
                    const loc = sale.locationId || currentUser?.defaultLocationId || settings.defaultLocationId;
                        for (const item of cart) {
                            // Skip stock reduction for services - they don't have inventory
                            const isService = item.is_service || item.isService;
                            const shouldTrack = !isService && ((window as any).__categoryMap ? !!(window as any).__categoryMap[item.categoryGroup] : (item.categoryGroup === 'Food & Drinks'));
                            if (shouldTrack) {
                                try {
                                    if (db.stock && db.stock.decrease) {
                                    await db.stock.decrease(item.id, loc, item.quantity);
                                    }
                                } catch (e) {
                                    console.warn('Failed to decrease stock for', item.id, e);
                                }
                            }
                        }
                    // Refresh products AND services
                    try {
                      const [refreshedProds, refreshedSvcs] = await Promise.all([
                        db.products.getAll(selectedBusinessId),
                        db.services && db.services.getAll ? db.services.getAll(selectedBusinessId) : Promise.resolve([])
                      ]);
                      const productsOnly = Array.isArray(refreshedProds) ? refreshedProds.filter((p: any) => {
                        const isServiceFlag = typeof p.isService !== 'undefined' ? !!p.isService : (typeof p.is_service !== 'undefined' ? !!p.is_service : false);
                        return !isServiceFlag;
                      }) : [];
                      const svcItems = Array.isArray(refreshedSvcs) ? refreshedSvcs.map((s: any) => ({ ...s, isService: true, isFromServicesTable: true })) : [];
                      setProducts([...productsOnly, ...svcItems]);
                    } catch (e) { console.warn('Failed to refresh products:', e); }
            }

                if (res && res.saleId) sale.id = String(res.saleId);
            setLastSale(sale);
            setCart([]);
            setParticulars('');
            setDelivery({ enabled: false, fee: 0, address: '' });
            setSelectedCustomer(''); // Reset customer after save
            setOrderDate(new Date().toISOString().split('T')[0]); // Reset to today
            setIsProforma(false); // Reset proforma flag
            setPaymentMethod('Cash'); // Reset payment method
            setEditingSale(null); // Clear edit state
            // Show receipt in new window with print theme
            setLastSale(sale);
            setTimeout(() => {
              openReceiptPrintWindow(sale, isProforma ? 'a4' : 'thermal');
            }, 300);
        } catch (err) {
            console.error('[POS-CHECKOUT] Error:', err);
            const errorMsg = err instanceof Error ? err.message : String(err);
            alert(`Failed to ${editingSale ? 'update' : 'complete'} sale:\n\n${errorMsg}\n\nPlease try again or contact support.`);
        }
  };

    const filteredProducts = (() => {
        const matches = (it: any) => (it.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (it.id || '').includes(searchTerm);
        // If 'All' selected, show both products and services
        if (selectedCategory === 'All') return products.filter(p => matches(p));

        // If 'Products' selected, show only products (exclude services)
        if (selectedCategory === 'Products') return products.filter(p => matches(p) && !p.isService);

        // If 'Services' tab selected, show only services
        if (selectedCategory === 'Services') return products.filter(p => matches(p) && !!p.isService);
        // consult category map to determine if the group is products or services
        const cm = (window as any).__categoryMap || {};
        const isProductGroup = typeof cm[selectedCategory] === 'undefined' ? true : !!cm[selectedCategory];
        if (!isProductGroup) {
            // show services for this group
            return products.filter(p => matches(p) && (p.isService && p.categoryGroup === selectedCategory));
        }
        // otherwise show products in that group
        return products.filter(p => matches(p) && !p.isService && p.categoryGroup === selectedCategory);
    })();

    const categories = categoryTabs;

    const handleSelectCategory = (cat: string) => {
        setSelectedCategory(cat);
        // Only set URL `group` param for actual category group names (not Products/Services/All)
        if (cat === 'All' || cat === 'Products' || cat === 'Services') {
            setSearchParams({});
        } else {
            setSearchParams({ group: cat });
        }
    };

    const openReceiptPrintWindow = (sale: SaleRecord, type: 'thermal' | 'a4') => {
      const receiptWindow = window.open('', 'Receipt', 'width=800,height=600,resizable=yes,scrollbars=yes');
      if (!receiptWindow) {
        alert('Please allow pop-ups to view receipts');
        return;
      }
      
      const customer = sale.customerId ? customers.find(c => c.id === sale.customerId) : null;
      let htmlContent = '';
      
      if (type === 'thermal') {
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Receipt</title>
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
                ${settings.logoUrl ? `<img src="${settings.logoUrl}" style="width: auto; height: ${settings.logoHeight || 80}px; margin-bottom: 8px; object-fit: contain;" crossOrigin="anonymous" onError="this.style.display='none'" />` : ''}
                <h1>${settings.name ? settings.name : 'JOBIZ'}</h1>
                <p>${settings.address ? settings.address : ''}</p>
                <p>${settings.phone ? `Phone: ${settings.phone}` : ''}</p>
                ${settings.motto ? `<p style="font-style: italic; font-size: 9px; margin-top: 4px;">${settings.motto}</p>` : ''}
              </div>
              <div class="divider"></div>
              <div class="info">
                <span>Date: ${new Date(sale.date).toLocaleDateString()}</span>
                <span>Time: ${new Date(sale.date).toLocaleTimeString()}</span>
              </div>
              <div class="info">
                <span>Receipt #: ${sale.id.slice(-8)}</span>
                <span>Cashier: ${(currentUser?.name || sale.cashier || 'Cashier')}</span>
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
                  ${sale.items.map((item: any) => `
                    <tr>
                      <td>${item.name}<br><span style="font-size: 9px; color: #999;">${item.unit}</span></td>
                      <td class="text-right">${item.quantity}</td>
                      <td class="text-right">${fmtCurrency(Number(item.price) * Number(item.quantity), 2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="divider"></div>
              <div class="info"><span>Subtotal</span><span class="text-right">${fmtCurrency(sale.subtotal, 2)}</span></div>
              ${(settings.vatRate > 0) ? `<div class="info"><span>VAT (${settings.vatRate}%)</span><span class="text-right">${fmtCurrency(sale.vat, 2)}</span></div>` : ''}
              <div class="info" style="font-weight: bold; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ccc;">
                <span>TOTAL</span><span class="text-right">${fmtCurrency(Number(sale.total), 2)}</span>
              </div>
              <div class="footer">
                <p>Thank you for your business!</p>
              </div>
            </div>
            <script>
              window.onload = () => { window.print(); };
            </script>
          </body>
          </html>
        `;
      } else {
        // A4 Invoice
        htmlContent = `
          <!DOCTYPE html>
          <html style="margin: 0; padding: 0;">
          <head>
            <meta charset="UTF-8">
            <style>
              @page { size: A4; margin: 0; padding: 0; page-break-after: avoid; }
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html { margin: 0; padding: 0; }
              body { margin: 0; padding: 0; width: 100%; background: white; font-family: Arial, sans-serif; overflow-x: hidden; }                
            </style>
          </head>
          <body style="margin: 0; padding: 0; height: 297mm; position: relative;">
          <div style="font-family: Arial, sans-serif; max-width: 210mm; height: 100%; margin: 0 auto; padding: 0; color: #1e293b; position: relative; display: flex; flex-direction: column; box-sizing: border-box;">
            ${settings.headerImageUrl ? `<div style="margin: 0; padding: 0; width: 100%; flex-shrink: 0; order: -1; height: ${settings.headerImageHeight || 100}px; overflow: hidden;"><img src="${settings.headerImageUrl}" style="width: 100%; height: 100%; display: block; object-fit: cover;" crossOrigin="anonymous" onError="this.style.display='none'" /></div>` : (settings.logoUrl ? `<div style="width: 100%; padding: 8px 12px; display: flex; align-items: flex-start; justify-content: ${settings.logoAlign === 'center' ? 'center' : settings.logoAlign === 'right' ? 'flex-end' : 'flex-start'}; min-height: 60px; margin: 0;"><img src="${settings.logoUrl}" style="width: auto; height: ${settings.logoHeight || 80}px; max-width: 200px; display: block; object-fit: contain;" crossOrigin="anonymous" onError="this.style.display='none'" /></div>` : '')}
            <div style="padding: 10px 12px; display: flex; flex-direction: column; margin: 0; max-width: 100%; box-sizing: border-box; flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 8px; max-width: 100%; box-sizing: border-box;">
                <div style="flex-shrink: 0;">
                  <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 4px 0;">${sale.isProforma ? 'PROFORMA INVOICE' : 'INVOICE'}</h1>
                  <p style="color: #64748b; font-size: 13px; margin: 0;">#${sale.id.toString().slice(-8)}</p>
                </div>
              </div>
            
              <div style="margin-bottom: 20px; max-width: 100%; box-sizing: border-box; word-wrap: break-word; overflow-wrap: break-word;">
                <h3 style="font-size: 11px; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; text-transform: uppercase;">BILL TO</h3>
                ${customer ? `
                  <p style="font-size: 13px; color: #1e293b; margin: 0 0 2px 0; word-wrap: break-word; overflow-wrap: break-word;"><strong>${customer.name}</strong></p>
                  ${customer.company ? `<p style="font-size: 13px; color: #1e293b; margin: 0 0 2px 0; word-wrap: break-word; overflow-wrap: break-word;">${customer.company}</p>` : ''}
                  <p style="font-size: 13px; color: #1e293b; margin: 0 0 2px 0; word-wrap: break-word; overflow-wrap: break-word;">${customer.address || ''}</p>
                  <p style="font-size: 13px; color: #1e293b; margin: 0; word-wrap: break-word; overflow-wrap: break-word;">${customer.phone || ''}</p>
                ` : '<p style="font-size: 13px; color: #1e293b; margin: 0;">Walk-in Customer</p>'}
              </div>
              
              <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse; font-size: 10px; table-layout: fixed; box-sizing: border-box;">
                <thead>
                  <tr style="border-bottom: 2px solid #1e293b; background-color: #f1f5f9;">
                    <th style="text-align: left; padding: 4px 6px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;">Description</th>
                    <th style="text-align: right; padding: 4px 6px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1; width: 12%; word-break: break-word; overflow-wrap: break-word;">Qty</th>
                    <th style="text-align: right; padding: 4px 6px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1; width: 12%; word-break: break-word; overflow-wrap: break-word;">Unit</th>
                    <th style="text-align: right; padding: 4px 6px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1; width: 18%; word-break: break-word; overflow-wrap: break-word;">Price</th>
                    <th style="text-align: right; padding: 4px 6px; font-weight: bold; font-size: 10px; color: #1e293b; border: 1px solid #cbd5e1; width: 18%; word-break: break-word; overflow-wrap: break-word;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${sale.items.map((item: any) => `
                    <tr style="border-bottom: 1px solid #e2e8f0; background-color: #fafbfc;">
                      <td style="padding: 4px 6px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;">${item.name || ''}</td>
                      <td style="text-align: right; padding: 4px 6px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;">${item.quantity || 0}</td>
                      <td style="text-align: right; padding: 4px 6px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;">${item.unit || 'N/A'}</td>
                      <td style="text-align: right; padding: 4px 6px; font-size: 10px; color: #475569; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;">${settings.currency}${fmtCurrency(Number(item.price), 2)}</td>
                      <td style="text-align: right; padding: 4px 6px; font-size: 10px; color: #1e293b; font-weight: bold; border: 1px solid #cbd5e1; word-break: break-word; overflow-wrap: break-word;"><strong>${settings.currency}${fmtCurrency(Number(item.price) * Number(item.quantity), 2)}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div style="display: flex; justify-content: flex-end; margin-bottom: 15px; max-width: 100%; box-sizing: border-box;">
                <div style="width: 180px; max-width: 100%;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px; color: #475569;">
                    <span>Subtotal:</span>
                    <span style="text-align: right;">${settings.currency}${fmtCurrency(sale.subtotal, 2)}</span>
                  </div>
                  ${Number(sale.vat) > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px; color: #475569;">
                    <span>VAT (${settings.vatRate || 7.5}%)</span>
                    <span style="text-align: right;">${settings.currency}${fmtCurrency(sale.vat, 2)}</span>
                  </div>` : ''}
                  ${sale.deliveryFee ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px; color: #475569;">
                      <span>Delivery</span>
                      <span style="text-align: right;">${settings.currency}${fmtCurrency(sale.deliveryFee, 2)}</span>
                    </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; border-top: 2px solid #1e293b; padding-top: 8px; font-size: 13px; font-weight: bold; color: #1e293b;">
                    <span>Total</span>
                    <span style="text-align: right;">${settings.currency}${fmtCurrency(Number(sale.total), 2)}</span>
                  </div>
                </div>
              </div>
              ${settings.invoiceNotes ? `<div style="margin-bottom: 8px; font-size: 10px; color: #475569; word-break: break-word; overflow-wrap: break-word;"><strong>Invoice Notes:</strong><br/>${settings.invoiceNotes}</div>` : ''}
              
              ${settings.watermarkImageUrl ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.25; pointer-events: none; z-index: 0;"><img src="${settings.watermarkImageUrl}" style="width: 400px; height: auto; display: block; max-width: 90vw;" onError="this.style.display='none'" /></div>` : ''}
              
              <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; max-width: 100%; box-sizing: border-box;">
                <div style="display: flex; flex-direction: column; min-width: 0;">
                  <p style="margin: 0 0 30px 0; font-size: 12px; font-weight: bold; word-break: break-word; overflow-wrap: break-word;">Customer</p>
                  <div style="border-top: 1px solid #000; width: 50%; float: left; margin-top: 10px"></div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; min-width: 0;">
                  ${settings.signatureUrl ? `<div style="margin-bottom: 10px; width: 100%;"><img src="${settings.signatureUrl}" style="width: auto; height: 50px; max-height: 50px; display: block; margin-left: auto;" /></div>` : ''}
                  <p style="margin: 0 0 30px 0; font-size: 12px; font-weight: bold; text-align: right; word-break: break-word; overflow-wrap: break-word;">Signed Manager</p>
                  <div style="border-top: 1px solid #000; width: 50%; float: right; margin-top: 10px"></div>
                </div>
              </div>
            </div>
            ${settings.footerImageUrl ? `<div style="width: 100%; margin: 0; padding: 0; flex-shrink: 0; margin-top: auto; height: ${settings.footerImageHeight || 60}px; overflow: hidden;"><img src="${settings.footerImageUrl}" style="width: 100%; height: 100%; display: block; object-fit: cover;" crossOrigin="anonymous" onError="this.style.display='none'" /></div>` : ''}
          </div>
          </body>
          </html>
        `;
      }
      
      receiptWindow.document.write(htmlContent);
      receiptWindow.document.close();
    };

    const generateReceiptHTML = (sale: SaleRecord, type: 'thermal' | 'a4') => {
      const customer = sale.customerId ? customers.find(c => c.id === sale.customerId) : null;
      const hasHeaderFooter = settings.headerImageUrl && settings.footerImageUrl;
      
      // Helper to escape HTML entities
      const escapeHTML = (text: any) => {
        if (!text) return '';
        return String(text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };
      
      if (type === 'thermal') {
        return `
          <div style="font-family: monospace; background: white; width: 300px; margin: 0 auto; padding: 16px; border: 1px solid #ccc; font-size: 11px; line-height: 1.4;">
            <div style="text-align: center; margin-bottom: 16px;">
              <h1 style="font-size: 12px; font-weight: bold; margin: 0;">${settings.name}</h1>
              <p style="font-size: 10px; color: #666; margin: 2px 0;">${settings.address}</p>
              <p style="font-size: 10px; color: #666; margin: 2px 0;">${settings.phone}</p>
            </div>
            <div style="border-bottom: 1px dashed #999; margin: 12px 0;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
              <span>Date: ${new Date(sale.date).toLocaleDateString()}</span>
              <span>Time: ${new Date(sale.date).toLocaleTimeString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 12px;">
              <span>Receipt #: ${sale.id.slice(-8)}</span>
              <span>${sale.cashier}</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px;">
              <thead>
                <tr style="border-bottom: 1px solid #ccc;">
                  <th style="text-align: left; padding: 2px 0;">Item</th>
                  <th style="text-align: right; padding: 2px 0;">Qty</th>
                  <th style="text-align: right; padding: 2px 0;">Amt</th>
                </tr>
              </thead>
              <tbody>
                ${(sale.items || []).map((item: any) => {
                  const itemName = escapeHTML(item.name);
                  return `
                  <tr>
                    <td style="padding: 2px 0;">${itemName}</td>
                    <td style="text-align: right; padding: 2px 0;">${item.quantity}</td>
                    <td style="text-align: right; padding: 2px 0;">${fmtCurrency(Number(item.price) * Number(item.quantity), 2)}</td>
                  </tr>
                `;
                }).join('')}
              </tbody>
            </table>
            <div style="border-bottom: 1px dashed #999; margin: 8px 0;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
              <span>Subtotal</span>
              <span>${fmtCurrency(sale.subtotal, 2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
              <span>VAT</span>
              <span>${fmtCurrency(sale.vat, 2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; margin-bottom: 12px; padding-top: 4px; border-top: 1px solid #ccc;">
              <span>TOTAL</span>
              <span>${fmtCurrency(Number(sale.total), 2)}</span>
            </div>
            <div style="text-align: center; font-size: 10px; color: #999;">
              <p>Thank you for your business!</p>
            </div>
          </div>
        `;
      } else {
        // A4 Invoice
        return `
          <div style="font-family: Arial, sans-serif; max-width: 210mm; margin: 0 auto; color: #1e293b; display: flex; flex-direction: column; page-break-after: avoid;">
            ${hasHeaderFooter ? `<div style="width: 100%; height: ${settings.headerImageHeight || 100}px; display: flex; align-items: center; overflow: hidden;"><img src="${settings.headerImageUrl}" style="width: 100%; height: 100%; display: block; object-fit: cover;" /></div>` : (settings.logoUrl ? `<div style="width: 100%; padding: 20px 0; display: flex; align-items: center; justify-content: center;"><img src="${settings.logoUrl}" style="width: auto; height: ${settings.logoHeight || 80}px; max-width: 200px; display: block;" /></div>` : '')}
            <div style="padding: 40px; display: flex; flex-direction: column;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
                <div>
                  <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 4px 0;">${sale.isProforma ? (sale.proformaTitle || 'PROFORMA INVOICE') : 'INVOICE'}</h1>
                  <p style="color: #64748b; font-size: 13px; margin: 0;">#${sale.id}</p>
                </div>
                ${!hasHeaderFooter ? `<div style="text-align: right;">
                  <h2 style="font-weight: bold; font-size: 12px; margin: 0 0 4px 0;">${settings.name}</h2>
                  <p style="font-size: 11px; color: #64748b; margin: 0;">${settings.address}</p>
                  <p style="font-size: 11px; color: #64748b; margin: 0;">${settings.phone}</p>
                  <p style="font-size: 11px; color: #64748b; margin: 0;">${settings.email}</p>
                </div>` : `<div style="text-align: right;">
                  <h2 style="font-weight: bold; font-size: 12px; margin: 0 0 4px 0;">${settings.name}</h2>
                  <p style="font-size: 11px; color: #64748b; margin: 0;">${settings.address}</p>
                  <p style="font-size: 11px; color: #64748b; margin: 0;">${settings.phone}</p>
                  <p style="font-size: 11px; color: #64748b; margin: 0;">${settings.email}</p>
                </div>`}
              </div>
              
              <div style="margin-bottom: 24px;">
                <h3 style="font-size: 11px; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px;">BILL TO</h3>
                ${customer ? `
                  <p style="font-size: 13px; color: #1e293b; margin: 0 0 2px 0;"><strong>${customer.name}</strong></p>
                  ${customer.company ? `<p style="font-size: 13px; color: #1e293b; margin: 0 0 2px 0;">${customer.company}</p>` : ''}
                  <p style="font-size: 13px; color: #1e293b; margin: 0 0 2px 0;">${customer.address || 'N/A'}</p>
                  <p style="font-size: 13px; color: #1e293b; margin: 0;">${customer.phone || 'N/A'}</p>
                ` : '<p style="font-size: 13px; color: #1e293b; margin: 0;">Walk-in Customer</p>'}
              </div>
              
              <table style="width: 100%; margin-bottom: 24px; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #1e293b;">
                    <th style="text-align: left; padding: 10px 0; font-weight: bold; font-size: 12px;">Description</th>
                    <th style="text-align: right; padding: 10px 0; font-weight: bold; font-size: 12px;">Qty</th>
                    <th style="text-align: right; padding: 10px 0; font-weight: bold; font-size: 12px;">Unit</th>
                    <th style="text-align: right; padding: 10px 0; font-weight: bold; font-size: 12px;">Price</th>
                    <th style="text-align: right; padding: 10px 0; font-weight: bold; font-size: 12px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${(sale.items || []).map((item: any) => {
                    const itemName = item.name ? escapeHTML(String(item.name)) : '';
                    return `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 12px 0; font-size: 13px;">${itemName}</td>
                      <td style="text-align: right; padding: 12px 0; font-size: 13px;">${item.quantity || 0}</td>
                      <td style="text-align: right; padding: 12px 0; font-size: 13px;">${item.unit || 'N/A'}</td>
                      <td style="text-align: right; padding: 12px 0; font-size: 13px;">${fmtCurrency(item.price, 2)}</td>
                      <td style="text-align: right; padding: 12px 0; font-size: 13px;"><strong>${fmtCurrency(item.price * item.quantity, 2)}</strong></td>
                    </tr>
                  `;
                  }).join('')}
                </tbody>
              </table>
              
              <div style="display: flex; justify-content: flex-end;">
                <div style="width: 240px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
                    <span>Subtotal</span>
                    <span>${fmtCurrency(Number(sale.subtotal), 2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
                    <span>VAT (7.5%)</span>
                    <span>${fmtCurrency(Number(sale.vat), 2)}</span>
                  </div>
                  ${sale.deliveryFee ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
                      <span>Delivery</span>
                      <span>${fmtCurrency(Number(sale.deliveryFee), 2)}</span>
                    </div>
                  ` : ''}
                  <div style="display: flex; justify-content: space-between; border-top: 2px solid #1e293b; padding-top: 8px; font-size: 15px; font-weight: bold;">
                    <span>Total</span>
                    <span>${fmtCurrency(Number(sale.total), 2)}</span>
                  </div>
                </div>
              </div>
              
              ${settings.invoiceNotes ? `
                <div class="invoice-notes" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569; line-height: 1.5;">
                  ${settings.invoiceNotes}
                </div>
              ` : ''}
              
              ${settings.watermarkImageUrl ? `<div style="position: relative; margin-top: 30px; margin-bottom: 30px; text-align: ${settings.watermarkAlign === 'right' ? 'right' : settings.watermarkAlign === 'center' ? 'center' : 'left'}; opacity: 0.25;"><img src="${settings.watermarkImageUrl}" style="width: 360px; height: auto; display: inline-block; max-width: 100%;" onError="this.style.display='none'" /></div>` : ''}
              
              <div class="signatures" style="margin-top: 60px; display: flex; justify-content: space-between;">
                <div style="flex: 1;">
                  <p style="margin: 0 0 30px 0; font-size: 13px; font-weight: bold;">Customer</p>
                  <div style="border-top: 1px solid #000; width: 150px;"></div>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-end;">
                  ${settings.signatureUrl ? `<div style="margin-bottom: 10px;"><img src="${settings.signatureUrl}" style="width: auto; height: 50px; max-height: 50px; display: block;" /></div>` : ''}
                  <p style="margin: 0 0 30px 0; font-size: 13px; font-weight: bold;">Signed Manager</p>
                  <div style="border-top: 1px solid #000; width: 150px;"></div>
                </div>
              </div>
            </div>
            ${hasHeaderFooter ? `<div style="width: 100%; height: ${settings.footerImageHeight || 60}px; overflow: hidden;"><img src="${settings.footerImageUrl}" style="width: 100%; height: 100%; display: block; object-fit: cover;" /></div>` : ''}
          </div>
        `;
      }
    };

    return (
    <>
      {showReceipt && lastSale ? (
        <div className="w-full h-[calc(100vh-2rem)] overflow-auto bg-slate-100 p-4 flex flex-col">
          {/* Action Buttons - Hidden on Print */}
          <style>{`
            @media print {
              .receipt-actions { display: none !important; }
              #receipt-content { margin: 0 !important; padding: 0 !important; }
            }
          `}</style>
          
          <div className={`receipt-actions flex gap-3 mb-4 ${!showReceiptActions ? 'hidden' : ''}`}>
            <button
              onClick={() => {
                window.print();
                setShowReceiptActions(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            
            <button
              onClick={() => {
                const element = document.getElementById('receipt-content');
                if (element) {
                  const html2pdf = (window as any).html2pdf;
                  if (!html2pdf) {
                    // Fallback: use simple approach
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(element.innerHTML);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  } else {
                    const opt = {
                      margin: 5,
                      filename: `Receipt_${lastSale.id.slice(-8)}.pdf`,
                      image: { type: 'jpeg', quality: 0.98 },
                      html2canvas: { scale: 2 },
                      jsPDF: { orientation: receiptType === 'thermal' ? 'portrait' : 'portrait', unit: 'mm', format: receiptType === 'thermal' ? [80, 200] : 'a4' }
                    };
                    html2pdf().set(opt).from(element).save();
                  }
                }
                setShowReceiptActions(false);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              Download PDF
            </button>
            
            <button
              onClick={() => {
                const receiptHTML = generateReceiptHTML(lastSale, receiptType);
                const mailto = `mailto:?subject=Invoice ${lastSale.id.slice(-8)}&body=Please find attached your invoice%0D%0A%0D%0A${encodeURIComponent(receiptHTML)}`;
                window.location.href = mailto;
                setShowReceiptActions(false);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              Send Email
            </button>

            {!lastSale.isProforma && (
              <button
                onClick={() => {
                  setReceiptType(receiptType === 'thermal' ? 'a4' : 'thermal');
                }}
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                View {receiptType === 'thermal' ? 'A4 Invoice' : 'Thermal Receipt'}
              </button>
            )}

            <button
              onClick={() => {
                setShowReceipt(false);
                setShowReceiptActions(true);
                setReceiptType('thermal');
              }}
              className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 ml-auto"
            >
              <X className="w-4 h-4" />
              Back to POS
            </button>
          </div>

          {/* Receipt Content */}
          <div id="receipt-content" className="flex-1 flex items-start justify-center overflow-auto bg-white rounded-lg p-4 md:p-8">
            <div dangerouslySetInnerHTML={{ __html: generateReceiptHTML(lastSale, receiptType) }} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4 pb-20">
            {/* Product Grid (Left) */}
            <div className="flex-1 flex flex-col gap-4">
        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex gap-4 overflow-x-auto no-scrollbar">
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => handleSelectCategory(cat)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                        selectedCategory === cat 
                        ? 'bg-brand-600 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* Search */}
        <div className="relative">
             <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
             <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Scan barcode or search products..." 
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
             />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
                <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all flex flex-col items-start text-left h-48 justify-between group relative overflow-hidden"
                >
                    <div className="h-24 w-full bg-slate-100 relative">
                         {product.imageUrl ? (
                             <img 
                               src={getImageUrl(product.imageUrl) || product.imageUrl} 
                               alt={product.name} 
                               className="w-full h-full object-cover" 
                               crossOrigin="anonymous"
                               onError={(e) => {
                                 console.error('POS product image failed to load:', product.imageUrl, getImageUrl(product.imageUrl));
                                 (e.target as HTMLImageElement).style.display = 'none';
                               }}
                             />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Image</div>
                         )}
                         <span className="absolute top-2 left-2 bg-white/90 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-slate-600">{product.categoryGroup}</span>
                         {product.isService && (
                             <span className="absolute top-2 right-2 bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-semibold">Service</span>
                         )}
                    </div>

                    {product.categoryGroup === CategoryGroup.FOOD_DRINKS && product.stock <= 0 && (
                        <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center z-10">
                            <span className="bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded">OUT OF STOCK</span>
                        </div>
                    )}
                    
                    <div className="p-3 w-full flex-1 flex flex-col justify-between">
                        <h3 className="font-semibold text-slate-800 text-sm leading-tight group-hover:text-brand-600 line-clamp-2">{product.name}</h3>
                        <div className="w-full flex justify-between items-end">
                            <div>
                                <span className="text-lg font-bold text-slate-900">{fmtCurrency(product.price,2)}</span>
                                <p className="text-[10px] text-slate-500">
                                    <span>{product.unit}</span>
                                    {!product.isService && (
                                        <span className="block text-[10px] text-slate-500">Stock: {product.stock} {product.unit}</span>
                                    )}
                                </p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </button>
            ))}
        </div>
      </div>

    {/* Cart (Right) */}
    <div ref={cartRef} className="w-full md:w-96 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold text-lg text-slate-800">Current Order</h2>
                <div className="flex items-center gap-2">
                    <input type="date" className="text-xs border rounded p-1" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
                </div>
            </div>
            
            {/* Customer Dropdown (searchable) */}
            <div className="relative mb-2">
                <User className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                <input
                    list="customers-list"
                    className="w-full pl-8 pr-2 py-1.5 text-sm border rounded bg-white"
                    placeholder="Search or select customer..."
                    value={selectedCustomer ? (customers.find(c => c.id === selectedCustomer)?.name || '') : ''}
                    onChange={e => {
                        const val = e.target.value;
                        // try to resolve by exact name match
                        const found = customers.find(c => c.name === val);
                        if (found) setSelectedCustomer(found.id);
                        else setSelectedCustomer('');
                    }}
                />
                <datalist id="customers-list">
                    <option value="">Walk-in Customer</option>
                    {customers.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 font-medium cursor-pointer">
                <input type="checkbox" checked={isProforma} onChange={e => setIsProforma(e.target.checked)} className="rounded text-brand-600" />
                Proforma Invoice (No Stock Deduct)
            </label>

            {isProforma && (
                <div className="mt-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Document Title</label>
                    <input 
                        type="text" 
                        placeholder="e.g., Estimate, Quotation, Proforma Invoice..." 
                        className="w-full px-2 py-1.5 text-sm border rounded bg-white"
                        value={proformaTitle}
                        onChange={e => setProformaTitle(e.target.value)}
                    />
                </div>
            )}
        </div>

        <div className="p-4 space-y-3 min-h-[200px]">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                    <EmptyCartIcon size={48} />
                    <p className="mt-2 text-sm">Cart is empty</p>
                </div>
            ) : (
                cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center group border-b border-slate-50 pb-2 last:border-0">
                        <div className="flex-1">
                            <h4 className="font-medium text-slate-800 text-sm truncate w-32">{item.name}</h4>
                            <p className="text-xs text-slate-500">{fmtCurrency(item.price,2)} / {item.unit}</p>
                        </div>
                        <div className="flex items-center gap-1 mx-2">
                            <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><Minus className="w-3 h-3"/></button>
                            <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><Plus className="w-3 h-3"/></button>
                        </div>
                        <div className="text-right">
                             <p className="font-semibold text-sm">{fmtCurrency(Number(item.price) * Number(item.quantity),2)}</p>
                             <button onClick={() => removeItem(item.id)} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] hover:underline">Remove</button>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Extras: Delivery & Payment */}
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input type="checkbox" checked={delivery.enabled} onChange={e => setDelivery({...delivery, enabled: e.target.checked})} />
                    Add Delivery
                </label>
                {delivery.enabled && (
                    <input 
                        type="number" 
                        placeholder="Fee" 
                        className="w-20 text-xs border rounded p-1 text-right"
                        value={delivery.fee}
                        onChange={e => setDelivery({...delivery, fee: Number(e.target.value)})}
                    />
                )}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
                <select className="text-xs border rounded p-1" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>Transfer</option>
                    <option>Unpaid</option>
                </select>
                <input 
                    type="text" 
                    placeholder="Particulars (Optional)" 
                    className="text-xs border rounded p-1" 
                    value={particulars}
                    onChange={e => setParticulars(e.target.value)}
                />
            </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal</span>
                <span>{fmtCurrency(subtotal,2)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
                <span>VAT{settings.vatRate > 0 ? ` (${settings.vatRate}%)` : ''}</span>
                <span>{fmtCurrency(vat,2)}</span>
            </div>
            {delivery.enabled && (
                 <div className="flex justify-between text-xs text-slate-600">
                    <span>Delivery</span>
                    <span>{fmtCurrency(delivery.fee,2)}</span>
                </div>
            )}
            <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>{fmtCurrency(total,2)}</span>
            </div>
            
            <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
                <Save className="w-5 h-5" />
                {editingSale ? 'Update Sale' : (isProforma ? 'Generate Proforma' : 'Complete Sale')}
            </button>
            
            {editingSale && (
              <button 
                onClick={() => {
                  setEditingSale(null);
                  setCart([]);
                  setSelectedCustomer('');
                  setOrderDate(new Date().toISOString().split('T')[0]);
                  setIsProforma(false);
                  setPaymentMethod('Cash');
                  setParticulars('');
                  setDelivery({ enabled: false, fee: 0, address: '' });
                }}
                className="w-full bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel Edit
              </button>
            )}
        </div>
      </div>
        </div>
      )}
    </>
  );
};

export default POS;