import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { Product, Supplier, TransactionType, Transaction, Location } from '../types';
import { PackagePlus, AlertTriangle, Save, X, Plus, Trash2, Package, History, Edit2 } from 'lucide-react';
import { useCurrency } from '../services/CurrencyContext';

const Stock: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [showRestockModal, setShowRestockModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'levels' | 'history'>('levels');

    // History Data
    const [supplyHistory, setSupplyHistory] = useState<Transaction[]>([]);
    const [stockByProduct, setStockByProduct] = useState<Record<string, Array<{locationId:string, quantity:number}>>>({});
    const location = useLocation();

    // Restock Form
    const [restockDate, setRestockDate] = useState(new Date().toISOString().split('T')[0]);
    const [invoiceNo, setInvoiceNo] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('');
    const [selectedLocation, setSelectedLocation] = useState<string>('');
    const [items, setItems] = useState<{productId: string, qty: number, cost: number}[]>([{productId: '', qty: 0, cost: 0}]);

    // Edit product modal (for quick stock/unit edits)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editStockValue, setEditStockValue] = useState<number>(0);
    const [editUnitValue, setEditUnitValue] = useState<string>('');

    const { symbol } = useCurrency();

    useEffect(() => { (async () => { await refreshData(); })(); }, []);

    const refreshData = async () => {
        try {
            const allProducts = await db.products.getAll();
            const isServiceFlag = (p: any) => {
                if (typeof p.isService !== 'undefined') return !!p.isService;
                if (typeof p.is_service !== 'undefined') return !!p.is_service;
                return false;
            };
            setProducts((allProducts || []).filter((p: any) => !isServiceFlag(p)));

            // Fetch stock entries per product (to display location breakdowns)
            try {
                const entriesMap: Record<string, Array<{locationId:string, quantity:number}>> = {};
                await Promise.all((allProducts || []).map(async (p: any) => {
                    if (!p || !p.id) return;
                    try {
                        if (db.stock && db.stock.getForProduct) {
                            const data: any[] = await db.stock.getForProduct(p.id);
                            entriesMap[p.id] = (data || []).map(d => ({ locationId: d.location_id || d.locationId || d.locationId, quantity: d.quantity || 0 }));
                        }
                    } catch (e) {
                        // ignore per-product failures
                    }
                }));
                setStockByProduct(entriesMap);
            } catch (e) {
                console.warn('Failed to fetch stock entries per product', e);
            }

            const sups = await db.suppliers.getAll();
            setSuppliers(sups || []);

            const locs = await db.locations.getAll();
            setLocations(locs || []);
            if (!selectedLocation && (locs || []).length > 0) setSelectedLocation(locs[0].id);

            const txs = await db.transactions.getAll();
            setSupplyHistory((txs || []).filter((t: any) => t.accountHead === 'Inventory Purchase'));
        } catch (e) {
            console.error('Failed to refresh stock data', e);
        }
    };

    const queryGroup = (() => {
        try { const qp = new URLSearchParams(location.search); return qp.get('group') || qp.get('category') || ''; } catch(e) { return ''; }
    })();

    const filteredProducts = (products || []).filter(p => {
        if (!queryGroup) return true;
        return (p.categoryGroup || '').toString() === queryGroup;
    });

    const addItemRow = () => setItems([...items, {productId: '', qty: 0, cost: 0}]);
    const removeItemRow = (idx: number) => setItems(items.filter((_, i) => i !== idx));
    const updateItemRow = (idx: number, field: string, value: any) => { const newItems = [...items]; (newItems[idx] as any)[field] = value; setItems(newItems); };

    const openEditProduct = (p: Product) => { setEditingProduct(p); setEditStockValue(p.stock || 0); setEditUnitValue(p.unit || 'pcs'); };

    const handleSaveEditProduct = async () => {
        if (!editingProduct) return;
        try {
            const updated = { ...editingProduct, stock: Number(editStockValue), unit: editUnitValue } as any;
            if (db.products && db.products.update) await db.products.update(editingProduct.id, updated);
        } catch (e) { console.error('Failed to update product', e); }
        setEditingProduct(null);
        await refreshData();
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('Delete this product? This will remove it from inventory.')) return;
        try { if (db.products && db.products.delete) await db.products.delete(id); } catch (e) { console.error('Failed to delete product', e); }
        await refreshData();
    };

    const handleRestock = async () => {
        if (!selectedSupplier || items.length === 0 || items.some(i => !i.productId || i.qty <= 0)) { alert("Please fill in all fields correctly."); return; }
        if (!selectedLocation) { alert('Please select a location to receive stock'); return; }

        let totalCost = 0;
        const particulars: string[] = [];

        for (const item of items) {
            try { await db.stock.increase(item.productId, selectedLocation, item.qty); } catch (e) { console.error('Failed to increase stock', e); }
            const pName = products.find(p => p.id === item.productId)?.name;
            particulars.push(`${pName} (x${item.qty})`);
            totalCost += Number(item.cost);
        }

        const currentUser = await db.auth.getCurrentUser();
        const tx: Transaction = {
            id: Date.now().toString(),
            businessId: (currentUser && currentUser.businessId) || '',
            date: restockDate,
            accountHead: 'Inventory Purchase',
            type: TransactionType.EXPENDITURE,
            amount: totalCost,
            particulars: `Inv#${invoiceNo}: ${particulars.join(', ')}`,
            paidBy: 'Company Account',
            receivedBy: suppliers.find(s=>s.id===selectedSupplier)?.name || 'Supplier',
            approvedBy: 'Admin'
        };
        try { await db.transactions.add(tx); } catch (e) { console.error('Failed to add transaction', e); }

        setShowRestockModal(false);
        setItems([{productId: '', qty: 0, cost: 0}]);
        setInvoiceNo('');
        refreshData();
    };

    const columns: Column<Product>[] = [
        { header: 'Product', accessor: 'name', key: 'name', sortable: true, filterable: true },
        { header: 'Category', accessor: 'categoryGroup', key: 'categoryGroup', filterable: true },
        { header: 'Locations', accessor: (p: Product) => (
                <div className="text-sm">
                    {(stockByProduct[p.id] || []).length === 0 ? (
                        <span className="text-slate-500">--</span>
                    ) : (
                        (stockByProduct[p.id] || []).map(s => {
                            const loc = locations.find(l => l.id === s.locationId);
                            return <div key={s.locationId} className="flex items-center gap-2"><span className="font-medium">{loc ? loc.name : s.locationId}</span><span className="text-slate-500">{s.quantity}</span></div>
                        })
                    )}
                </div>
            ), key: 'locations' },
        { header: 'Stock Level', accessor: (p: Product) => (
                <div className="flex items-center gap-2">
                    <span className={`font-bold ${p.stock < 10 ? 'text-rose-600' : 'text-slate-700'}`}>{p.stock}</span>
                    {p.stock < 10 && <AlertTriangle size={14} className="text-rose-500" />}
                </div>
            ), key: 'stock', sortable: true },
        { header: 'Supplier', accessor: (p: Product) => suppliers.find(s => s.id === p.supplierId)?.name || '-', key: 'supplierId' },
        { header: 'Actions', accessor: (p: Product) => (
                <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openEditProduct(p); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit2 size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p.id); }} className="text-rose-600 hover:bg-rose-50 p-1 rounded"><Trash2 size={16} /></button>
                </div>
            ), key: 'actions' }
    ];

    const historyColumns: Column<Transaction>[] = [
        { header: 'Date', accessor: (t) => new Date(t.date).toLocaleDateString(), key: 'date', sortable: true },
        { header: 'Supplier', accessor: 'receivedBy', key: 'receivedBy', filterable: true },
        { header: 'Details (Ref Invoice & Items)', accessor: 'particulars', key: 'particulars', filterable: true },
        { header: 'Total Cost', accessor: (t) => `${symbol}${t.amount.toFixed(2)}`, key: 'amount' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Stock Management</h1>
                    <p className="text-slate-500">Track levels and restock inventory.</p>
                </div>
                <button onClick={() => setShowRestockModal(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 shadow-sm transition-all">
                    <PackagePlus className="w-4 h-4" />
                    Receive Stock
                </button>
            </div>

            <div className="flex gap-4 border-b border-slate-200">
                <button onClick={() => setActiveTab('levels')} className={`pb-3 px-1 flex items-center gap-2 font-medium text-sm transition-colors ${activeTab === 'levels' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Package size={18} /> Current Levels
                </button>
                <button onClick={() => setActiveTab('history')} className={`pb-3 px-1 flex items-center gap-2 font-medium text-sm transition-colors ${activeTab === 'history' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <History size={18} /> Supply History
                </button>
            </div>

            {activeTab === 'levels' ? (
                <DataTable data={filteredProducts} columns={columns} title="Inventory Levels" />
            ) : (
                <DataTable data={supplyHistory} columns={historyColumns} title="Restock Log" />
            )}

            {showRestockModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Receive Inventory</h3>
                            <button onClick={() => setShowRestockModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                    <input type="date" className="w-full border rounded p-2" value={restockDate} onChange={e => setRestockDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Invoice #</label>
                                    <input type="text" className="w-full border rounded p-2" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="INV-0000" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                                    <select className="w-full border rounded p-2" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                                        <option value="">Select Supplier...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                    <select className="w-full border rounded p-2" value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)}>
                                        <option value="">Select Location...</option>
                                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="p-3 border-b">Product</th>
                                            <th className="p-3 border-b w-32">Qty Recv.</th>
                                            <th className="p-3 border-b w-32">Total Cost</th>
                                            <th className="p-3 border-b w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="border-b last:border-0">
                                                <td className="p-2">
                                                    <select className="w-full border rounded p-2" value={item.productId} onChange={e => updateItemRow(idx, 'productId', e.target.value)}>
                                                        <option value="">Select Product...</option>
                                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (Cur: {p.stock})</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-2"><input type="number" className="w-full border rounded p-2" value={item.qty} onChange={e => updateItemRow(idx, 'qty', Number(e.target.value))} /></td>
                                                <td className="p-2"><input type="number" className="w-full border rounded p-2" value={item.cost} onChange={e => updateItemRow(idx, 'cost', Number(e.target.value))} /></td>
                                                <td className="p-2 text-center">{items.length > 1 && (<button onClick={() => removeItemRow(idx)} className="text-rose-500 hover:bg-rose-50 p-1 rounded"><Trash2 size={16} /></button>)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="p-2 bg-slate-50 border-t">
                                    <button onClick={addItemRow} className="text-brand-600 text-sm font-bold flex items-center gap-1 hover:underline"><Plus size={16} /> Add Item Row</button>
                                </div>
                            </div>

                            <button onClick={handleRestock} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 flex justify-center items-center gap-2 mt-4"><Save size={18} /> Process Receipt</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {editingProduct && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Edit Product Stock</h3>
                            <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                                <div className="p-2 border rounded">{editingProduct.name}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Stock Level</label>
                                <input type="number" className="w-full border rounded p-2" value={editStockValue} onChange={e => setEditStockValue(Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
                                <input type="text" className="w-full border rounded p-2" value={editUnitValue} onChange={e => setEditUnitValue(e.target.value)} />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setEditingProduct(null)} className="px-4 py-2 border rounded">Cancel</button>
                                <button onClick={handleSaveEditProduct} className="px-4 py-2 bg-brand-600 text-white rounded">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stock;