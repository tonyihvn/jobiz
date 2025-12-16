import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import db from '../services/apiClient';
import { fmt } from '../services/format';
import useFmtCurrency from '../services/useFmtCurrency';
import { Product, CartItem, SaleRecord, CategoryGroup, Customer, CompanySettings } from '../types';
import { Plus, Minus, Trash2, Printer, Save, Search, X, User } from 'lucide-react';

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
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const defaultSettings: CompanySettings = { businessId: '', name: '', motto: '', address: '', phone: '', email: '', logoUrl: '', vatRate: 7.5, currency: 'USD' };
    const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
    const fmtCurrency = useFmtCurrency();
  const [cart, setCart] = useState<CartItem[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
  
    // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const searchInputRef = useRef<HTMLInputElement>(null);

    // Derived category tabs (from products)
    const [categoriesState, setCategoriesState] = React.useState<any[]>([]);
    const categoryTabs = React.useMemo(() => {
        const present = new Set<string>();
        const arr = Array.isArray(categoriesState) ? categoriesState : (categoriesState ? Object.values(categoriesState) : []);
        for (const c of arr) if (c && c.group) present.add(c.group as string);
        const tabs: string[] = ['All'];
        // show a global Services tab when there are services available
        try {
            if (products && Array.isArray(products) && products.some(p => p.isService)) {
                tabs.push('Services');
            }
        } catch (e) { /* ignore */ }
        // Put Food & Drinks first if present
        if (present.has('Food & Drinks')) tabs.push('Food & Drinks');
        for (const g of Array.from(present)) if (!tabs.includes(g)) tabs.push(g);
        return tabs;
    }, [categoriesState, products]);

  // Order Details
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [isProforma, setIsProforma] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [particulars, setParticulars] = useState('');
  const [delivery, setDelivery] = useState({ enabled: false, fee: 0, address: '' });

  // UI State
  const [showReceipt, setShowReceipt] = useState<'thermal' | 'a4' | null>(null);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);

    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        const init = async () => {
            try {
            const proms: any[] = [db.products.getAll(), db.services && db.services.getAll ? db.services.getAll() : Promise.resolve([]), db.customers.getAll(), db.auth.getCurrentUser(), db.categories && db.categories.getAll ? db.categories.getAll() : Promise.resolve([])];
                // settings may or may not exist on the client proxy
                if (db.settings && db.settings.get) {
                    proms.splice(3, 0, db.settings.get());
                }
                const results = await Promise.all(proms);
                // Results ordering depends on whether settings was included
                // results: products, services, customers, user, categories
                const [prods, svcs, custs, user, cats] = results;
                const svcItems = Array.isArray(svcs) ? svcs.map((s: any) => ({ ...s, isService: true })) : [];
                const combined = [...(prods || []), ...svcItems];
                // normalize isService flag across different shapes (isService or is_service)
                const isServiceFlag = (p: any) => {
                    if (typeof p.isService !== 'undefined') return !!p.isService;
                    if (typeof p.is_service !== 'undefined') return !!p.is_service;
                    return false;
                };
                setProducts((combined || []).map((p: any) => ({ ...p, isService: isServiceFlag(p) })));
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
                    // default selected category: Food & Drinks if present, otherwise 'All'
                    const hasFood = combined.some((p: any) => p.categoryGroup === 'Food & Drinks');
                    setSelectedCategory(hasFood ? 'Food & Drinks' : 'All');
                }
                
                // attach to products state via ref-like closure by storing catMap on window for now
                (window as any).__categoryMap = catMap;
                // apply settings if available
                if (db.settings && db.settings.get) {
                    const sett = await db.settings.get();
                    setSettings({ ...defaultSettings, ...(sett || {}) });
                }
            } catch (err) {
                console.error('Failed to initialize POS data', err);
            }
            if (searchInputRef.current) searchInputRef.current.focus();
        };
        init();
    }, []);

    // Business rule: stock-tracked groups are defined in categories (isProduct=true). We'll consult categoryMap.
    const STOCK_TRACKED_GROUPS = Object.keys((window as any).__categoryMap || {}).filter(g => (window as any).__categoryMap[g]);

    const addToCart = async (product: Product) => {
        // Only stock-tracked groups enforce inventory checks
        const stockTracked = STOCK_TRACKED_GROUPS.includes(product.categoryGroup as CategoryGroup);
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
    };

            const updateQuantity = async (id: string, delta: number) => {
                const productItem = products.find(p => p.id === id);
                const current = cart.find(i => i.id === id);
                if (!current || !productItem) return;
                const newQty = Math.max(1, current.quantity + delta);

                    // Only enforce stock limits for configured stock-tracked groups
                    const stockTracked = (window as any).__categoryMap ? !!(window as any).__categoryMap[productItem.categoryGroup] : (productItem.categoryGroup === 'Food & Drinks');
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
  const vatRate = 0.075; // 7.5%
  const vat = subtotal * vatRate;
  const deliveryFee = delivery.enabled ? delivery.fee : 0;
  const total = subtotal + vat + deliveryFee;

    const handleCheckout = async () => {
    if (cart.length === 0) return;
    
                const sale: SaleRecord = {
            id: Date.now().toString(),
            businessId: currentUser?.businessId || '',
            date: new Date(orderDate).toISOString(), // Use custom date
            items: [...cart],
            subtotal,
            vat,
            total,
            paymentMethod,
                        cashier: currentUser?.name || currentUser?.email || 'Cashier',
                        locationId: currentUser?.defaultLocationId || settings.defaultLocationId,
            customerId: selectedCustomer,
            isProforma,
            deliveryFee: delivery.enabled ? delivery.fee : 0,
            particulars
        };

        try {
            const res = await db.sales.add(sale);
            // Reduce Stock ONLY if NOT Proforma
            if (!isProforma) {
                    const loc = sale.locationId || currentUser?.defaultLocationId || settings.defaultLocationId;
                        for (const item of cart) {
                            const shouldTrack = (window as any).__categoryMap ? !!(window as any).__categoryMap[item.categoryGroup] : (item.categoryGroup === 'Food & Drinks');
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
                    // Refresh products
                    try { const refreshed = await db.products.getAll(); setProducts(refreshed || []); } catch (e) { /* ignore */ }
            }

                if (res && res.saleId) sale.id = String(res.saleId);
            setLastSale(sale);
            setCart([]);
            setParticulars('');
            setDelivery({ enabled: false, fee: 0, address: '' });
            setShowReceipt(isProforma ? 'a4' : 'thermal');
        } catch (err) {
            alert(err.message || 'Failed to complete sale');
        }
  };

    const filteredProducts = (() => {
        const matches = (it: any) => (it.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (it.id || '').includes(searchTerm);
        // If 'All' selected, show both products and services
        if (selectedCategory === 'All') return products.filter(p => matches(p));

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
        if (cat === 'All') {
            setSearchParams({});
        } else {
            setSearchParams({ group: cat });
        }
    };

    

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col md:flex-row gap-4 overflow-hidden">
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
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
            {filteredProducts.map(product => (
                <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all flex flex-col items-start text-left h-48 justify-between group relative overflow-hidden"
                >
                    <div className="h-24 w-full bg-slate-100 relative">
                         {product.imageUrl ? (
                             <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
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
    <div className="w-full md:w-96 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full overflow-hidden">
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
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                <span>VAT (7.5%)</span>
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
                {isProforma ? 'Generate Proforma' : 'Complete Sale'}
            </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto w-full max-w-4xl flex flex-col">
                <div className="p-4 border-b flex justify-between items-center no-print">
                    <h3 className="font-bold text-lg">Receipt Preview {lastSale.isProforma && '(PROFORMA)'}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setShowReceipt('thermal')} className={`px-3 py-1 rounded border ${showReceipt === 'thermal' ? 'bg-brand-50 border-brand-500 text-brand-700' : ''}`}>Thermal</button>
                        <button onClick={() => setShowReceipt('a4')} className={`px-3 py-1 rounded border ${showReceipt === 'a4' ? 'bg-brand-50 border-brand-500 text-brand-700' : ''}`}>A4/Invoice</button>
                        <button onClick={() => window.print()} className="px-3 py-1 bg-slate-800 text-white rounded flex items-center gap-1"><Printer size={16}/> Print</button>
                        <button onClick={() => setShowReceipt(null)} className="px-3 py-1 hover:bg-slate-100 rounded"><X size={20}/></button>
                    </div>
                </div>
                
                <div className="p-8 bg-gray-100 overflow-auto flex justify-center">
                   {/* Thermal Layout */}
                   {showReceipt === 'thermal' && (
                       <div className="bg-white p-4 shadow-sm w-[300px]">
                            <div className="text-center mb-6">
                                {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="w-16 mx-auto mb-2" />}
                                <h1 className="font-bold text-lg uppercase tracking-wider">{settings.name}</h1>
                                <p className="text-xs text-gray-500">{settings.address}</p>
                                <p className="text-xs text-gray-500">{settings.phone}</p>
                                <p className="text-[10px] italic mt-1 text-gray-400">{settings.motto}</p>
                            </div>
                            
                            <div className="border-b border-dashed border-gray-300 my-4"></div>
                            
                            <div className="flex justify-between text-xs mb-4">
                                <span>Date: {new Date(lastSale.date).toLocaleDateString()}</span>
                                <span>Time: {new Date(lastSale.date).toLocaleTimeString()}</span>
                            </div>
                            <div className="flex justify-between text-xs mb-4">
                                <span>Receipt #: {lastSale.id.slice(-8)}</span>
                                <span>Cashier: {lastSale.cashier}</span>
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
                                    {lastSale.items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="py-1">
                                                {item.name}
                                                <div className="text-[9px] text-gray-400">{item.unit}</div>
                                            </td>
                                            <td className="py-1 text-right">{item.quantity}</td>
                                            <td className="py-1 text-right">{fmtCurrency(Number(item.price) * Number(item.quantity),2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                                <div className="border-t border-dashed border-gray-300 my-2 pt-2 space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                    <span>Subtotal</span>
                                    <span>{fmtCurrency(lastSale.subtotal,2)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-medium">
                                    <span>VAT ({settings.vatRate}%)</span>
                                    <span>{fmtCurrency(lastSale.vat,2)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-bold mt-2">
                                    <span>TOTAL</span>
                                    <span>{fmtCurrency(Number(lastSale.total),2)}</span>
                                </div>
                            </div>
                            
                            <div className="mt-8 text-center text-xs text-gray-400">
                                <p>Thank you for your business!</p>
                            </div>
                       </div>
                   )}

                   {/* A4 Invoice Layout */}
                   {showReceipt === 'a4' && (
                       <div className="bg-white shadow-sm w-[210mm] min-h-[297mm] flex flex-col">
                            {/* Header Image */}
                            {settings.headerImageUrl && (
                                <img src={settings.headerImageUrl} alt="Header" className="w-full h-auto max-h-[150px] object-cover" />
                            )}
                            
                            <div className="p-12 flex-1">
                                <div className="flex justify-between items-start mb-12">
                                    <div>
                                        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">{lastSale.isProforma ? 'PROFORMA INVOICE' : 'INVOICE'}</h1>
                                        <p className="text-slate-500 mt-2">#{lastSale.id}</p>
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
                                        {lastSale.customerId ? (
                                            <div className="text-slate-800">
                                                <p className="font-bold">{customers.find(c => c.id === lastSale.customerId)?.name}</p>
                                                <p className="text-sm">{customers.find(c => c.id === lastSale.customerId)?.address}</p>
                                                <p className="text-sm">{customers.find(c => c.id === lastSale.customerId)?.phone}</p>
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 italic">Walk-in Customer</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="mb-2">
                                            <span className="text-sm text-slate-400 font-bold uppercase tracking-wider mr-4">Date:</span>
                                            <span className="text-slate-800 font-medium">{new Date(lastSale.date).toLocaleDateString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-sm text-slate-400 font-bold uppercase tracking-wider mr-4">Payment:</span>
                                            <span className="text-slate-800 font-medium">{lastSale.paymentMethod}</span>
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
                                        {lastSale.items.map((item, i) => (
                                            <tr key={i}>
                                                <td className="py-4 text-slate-600">{item.name}</td>
                                                <td className="py-4 text-slate-600 text-right">{item.quantity}</td>
                                                <td className="py-4 text-slate-600 text-right text-xs uppercase">{item.unit}</td>
                                                <td className="py-4 text-slate-600 text-right">{fmtCurrency(item.price,2)}</td>
                                                <td className="py-4 text-slate-800 font-bold text-right">{fmtCurrency(item.price * item.quantity,2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="flex justify-end">
                                    <div className="w-64 space-y-3">
                                        <div className="flex justify-between text-slate-600">
                                            <span>Subtotal</span>
                                            <span>{fmtCurrency(lastSale.subtotal,2)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                            <span>VAT ({settings.vatRate}%)</span>
                                            <span>{fmtCurrency(lastSale.vat,2)}</span>
                                        </div>
                                        {lastSale.deliveryFee ? (
                                             <div className="flex justify-between text-slate-600">
                                                <span>Delivery</span>
                                                <span>{fmtCurrency(lastSale.deliveryFee,2)}</span>
                                            </div>
                                        ) : null}
                                            <div className="flex justify-between text-xl font-bold text-slate-900 border-t-2 border-slate-800 pt-3">
                                            <span>Total</span>
                                            <span>{fmtCurrency(lastSale.total,2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Image */}
                            {settings.footerImageUrl && (
                                <img src={settings.footerImageUrl} alt="Footer" className="w-full h-auto max-h-[100px] object-cover mt-auto" />
                            )}
                       </div>
                   )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default POS;