import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { fmt, getImageUrl } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';
import { Product, Category, CategoryGroup, Role } from '../types';
import { Plus, Package, Layers, X, Save, Printer, Barcode, Edit2, Trash2, Upload, Truck } from 'lucide-react';
import useFmtCurrency from '../services/useFmtCurrency';
import { Location } from '../types';
import { authFetch } from '../services/auth';

const Inventory = () => {
    const { symbol } = useCurrency();
    const [activeTab, setActiveTab] = useState<'products'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);
    const [isSuper, setIsSuper] = useState(false);
  
    // Modals
    const [showProductModal, setShowProductModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
    const [barcodeUrls, setBarcodeUrls] = useState<Record<string,string>>({});
    const [currentBarcodeProduct, setCurrentBarcodeProduct] = useState<Product | null>(null);
    const [barcodeImages, setBarcodeImages] = useState<string[]>([]);
    const [printerType, setPrinterType] = useState<'thermal'|'a4'>('thermal');
    const [barcodesPerRow, setBarcodesPerRow] = useState<number>(3);
    const closeBarcodeModal = () => {
        try { barcodeImages.forEach(u => { try { URL.revokeObjectURL(u); } catch(e){} }); } catch(e){}
        setBarcodeImages([]);
        setCurrentBarcodeProduct(null);
        setShowBarcodeModal(false);
    };
        const [showBarcodeQtyModal, setShowBarcodeQtyModal] = useState(false);
        const [barcodeQty, setBarcodeQty] = useState<number>(1);
        const [pendingBarcodeProduct, setPendingBarcodeProduct] = useState<Product | null>(null);

        const generateBarcodesForProduct = async (product: Product, qty: number) => {
            if (!product || qty <= 0) return;
            try {
                // revoke previous
                try { barcodeImages.forEach(u => { try { URL.revokeObjectURL(u); } catch(e){} }); } catch(e){}
                setBarcodeImages([]);
                // fetch images
                const fetches = Array.from({ length: qty }).map(() => authFetch(`/api/barcode/${encodeURIComponent(product.id)}`));
                const results = await Promise.all(fetches);
                const ok = results.every(r => r.ok);
                if (!ok) {
                    const first = results.find(r => !r.ok);
                    const txt = first ? await first.text().catch(()=>'') : 'Provider error';
                    alert('Failed to generate barcode: ' + txt);
                    return;
                }
                const blobs = await Promise.all(results.map(r => r.blob()));
                const urls = blobs.map(b => URL.createObjectURL(b));
                setBarcodeImages(urls);
                setCurrentBarcodeProduct(product);
                setShowBarcodeModal(true);
            } catch (e) { console.error('Barcode generation failed', e); alert('Barcode generation failed'); }
        };
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveProduct, setMoveProduct] = useState<Product | null>(null);
    const [locationsList, setLocationsList] = useState<Location[]>([]);
    const [moveFrom, setMoveFrom] = useState<string>('');
    const [moveTo, setMoveTo] = useState<string>('');
    const [moveQty, setMoveQty] = useState<number>(0);
    const fmtCurrency = useFmtCurrency();
    const location = useLocation();

  // Form States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ 
    name: '', price: 0, stock: 0, unit: 'pcs', categoryGroup: CategoryGroup.OTHER, isService: false, imageUrl: '' 
  });
  

  useEffect(() => {
        (async () => {
            await refreshData();
            try { if (db.locations && db.locations.getAll) { const locs = await db.locations.getAll(); setLocationsList(locs || []); } } catch (e) {}
            try {
                const currentUser = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
                setIsSuper(!!(currentUser && (currentUser.is_super_admin || currentUser.isSuperAdmin)));
                if (currentUser && db.roles && db.roles.getAll) {
                    const roles = await db.roles.getAll();
                    const role = Array.isArray(roles) ? roles.find((r: Role) => r.id === currentUser.roleId) : null;
                    setUserRole(role || null);
                }
            } catch (e) {
                console.warn('Failed to load user/roles', e);
            }
        })();
    }, []);

    // Refresh products when a product is created elsewhere (e.g., from Suppliers quick-create)
    useEffect(() => {
        const onCreated = (e: any) => {
            try { refreshData(); } catch (err) { console.warn('refreshData failed', err); }
        };
        window.addEventListener('product:created', onCreated as EventListener);
        return () => window.removeEventListener('product:created', onCreated as EventListener);
    }, []);

    const refreshData = async () => {
        try {
            const prods = db.products && db.products.getAll ? await db.products.getAll() : [];
            // normalize service flag: support both camelCase and snake_case from backend
            const isServiceFlag = (p: any) => {
                if (typeof p.isService !== 'undefined') return !!p.isService;
                if (typeof p.is_service !== 'undefined') return !!p.is_service;
                return false;
            };
            const normalizedProds = (prods || []).map((p: any) => ({
                ...p,
                isService: isServiceFlag(p),
                categoryGroup: p.categoryGroup || p.category_group || p.group || '',
                categoryName: p.categoryName || p.category_name || p.name || ''
            }));
            setProducts(normalizedProds.filter((p: Product) => !p.isService));
            const cats = db.categories && db.categories.getAll ? await db.categories.getAll() : [];
            const normalizedCats = (cats || []).map((c: any) => ({ ...c, isProduct: typeof c.isProduct !== 'undefined' ? !!c.isProduct : (typeof c.is_product !== 'undefined' ? !!c.is_product : false), group: c.group || c.category_group || '', name: c.name || c.label || '' }));
            setCategories(normalizedCats || []);
        } catch (e) {
            console.warn('Failed to refresh inventory data', e);
        }
    };

    // Compute filtered products based on ?group=<GroupName>
    const params = useParams();
    const queryGroup = (() => {
        try {
            const qp = new URLSearchParams(location.search);
            return params.group || qp.get('group') || qp.get('category') || '';
        } catch (e) { return params.group || ''; }
    })();
    const filteredProducts = (products || []).filter(p => {
        if (!queryGroup) return true;
        return (p.categoryGroup || '').toString() === queryGroup;
    });

  const hasPermission = (resource: string, action: string) => {
      if (isSuper) return true;
      if (!userRole) return false;
      return userRole.permissions && userRole.permissions.includes(`${resource}:${action}`);
  };

  const handleEditProduct = (product: Product) => {
      setEditingId(product.id);
      setNewProduct(product);
      setShowProductModal(true);
  };

  const handleDeleteProduct = async (id: string) => {
      if(window.confirm('Are you sure you want to delete this product?')) {
          try {
            if (db.products && db.products.delete) await db.products.delete(id);
          } catch (e) { console.warn('Failed to delete product', e); }
          await refreshData();
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                    const fd = new FormData();
                    fd.append('file', file);
                    authFetch('/api/upload', { method: 'POST', body: fd })
                        .then(r => r.json())
                        .then(data => {
                            if (data && data.url) {
                                setNewProduct(prev => ({...prev, imageUrl: data.url}));
                            }
                        })
                        .catch(err => console.error('Upload error', err));
            }
  };

    const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    
    const currentUser = await db.auth.getCurrentUser();
    const product: Product = {
      id: editingId || Date.now().toString(),
      businessId: currentUser?.businessId || '',
      name: newProduct.name!,
      categoryName: newProduct.categoryName || 'General',
      categoryGroup: newProduct.categoryGroup || CategoryGroup.OTHER,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock),
      unit: newProduct.unit || 'pcs',
      supplierId: newProduct.supplierId || '',
      isService: false, // Force false in Inventory
      imageUrl: newProduct.imageUrl || ''
    };

    try {
      if (editingId) {
          if (db.products && db.products.update) await db.products.update(editingId, product);
      } else {
          if (db.products && db.products.add) await db.products.add(product);
      }
    } catch (e) { console.warn('Failed to save product', e); }
    
        setShowProductModal(false);
        setNewProduct({ name: '', price: 0, stock: 0, unit: 'pcs', categoryGroup: CategoryGroup.OTHER, isService: false, imageUrl: '' });
        setEditingId(null);
        await refreshData();
  };

    

  const productColumns: Column<Product>[] = [
    { 
        header: 'Image', 
        accessor: (item: Product) => {
          const imageUrl = getImageUrl(item.imageUrl);
          return (
            <div className="w-10 h-10 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                {item.imageUrl && imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        console.error('Image failed to load:', imageUrl);
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                ) : (
                    <div className="text-slate-400 text-[10px]">No Img</div>
                )}
            </div>
          );
        }, 
        key: 'imageUrl' 
    },
    { header: 'Name', accessor: 'name', key: 'name', sortable: true, filterable: true },
    { header: 'Category', accessor: 'categoryName', key: 'categoryName', sortable: true, filterable: true },
    { 
        header: 'Group', 
        accessor: (item: Product) => (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                item.categoryGroup === CategoryGroup.FOOD_DRINKS ? 'bg-amber-100 text-amber-800' :
                item.categoryGroup === CategoryGroup.RENTING ? 'bg-purple-100 text-purple-800' :
                'bg-blue-100 text-blue-800'
            }`}>
                {item.categoryGroup}
            </span>
        ), 
        key: 'categoryGroup', 
        sortable: true,
        filterable: true
    },
    { header: 'Price', accessor: (item: Product) => {
            const n = Number((item as any).price);
            return fmtCurrency(isNaN(n) ? 0 : n, 2);
        }, key: 'price', sortable: true, filterable: true },
    { header: 'Stock', accessor: (p) => `${p.stock} ${p.unit}`, key: 'stock', sortable: true, filterable: true },
    { 
        header: 'Actions', 
        accessor: (item: Product) => (
            <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); setPendingBarcodeProduct(item); setBarcodeQty(1); setShowBarcodeQtyModal(true); }} title="Generate Barcodes" className="text-slate-700 hover:bg-slate-50 p-1 rounded">
                    <Barcode size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); openHistory(item); }} title="History" className="text-slate-600 hover:bg-slate-50 p-1 rounded">
                    <Layers size={16} />
                </button>
                {hasPermission('inventory', 'update') && (
                    <button onClick={(e) => { e.stopPropagation(); handleEditProduct(item); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                        <Edit2 size={16} />
                    </button>
                )}
                    {hasPermission('inventory', 'move') && (
                        <button onClick={(e) => { e.stopPropagation(); setMoveProduct(item); setShowMoveModal(true); }} className="text-amber-600 hover:bg-amber-50 p-1 rounded">
                            <Truck size={16} />
                        </button>
                    )}
                {hasPermission('inventory', 'delete') && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(item.id); }} className="text-red-600 hover:bg-red-50 p-1 rounded">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        ), 
        key: 'actions' 
    }
  ];

  

  const openNewProduct = () => {
      setEditingId(null);
      const defaultGroup = queryGroup || (categories && categories.length > 0 ? categories[0].group : CategoryGroup.OTHER);
      setNewProduct({ name: '', price: 0, stock: 0, unit: 'pcs', categoryGroup: defaultGroup as any, isService: false, imageUrl: '' });
      setShowProductModal(true);
  }

  // Stock history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);

  const openHistory = async (product: Product) => {
      setHistoryProduct(product);
      setShowHistoryModal(true);
      try {
          const rows = await db.stock.history(product.id);
          setHistoryRecords(Array.isArray(rows) ? rows : []);
      } catch (e) {
          console.warn('Failed to load stock history', e);
          setHistoryRecords([]);
      }
  };


    

    const [showCategoryModal, setShowCategoryModal] = useState(false);
  return (
    <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                        <h1 className="text-2xl font-bold text-slate-800">Product Master{queryGroup ? ` — ${queryGroup}` : ''}</h1>
                        <p className="text-slate-500">Define physical products. Services are managed in the Services page.</p>
                </div>
        <div className="flex gap-2">
            {/* Services are managed on the Services page — open that page or use its modal there */}
            <button 
                onClick={() => activeTab === 'products' ? openNewProduct() : setShowCategoryModal(true)}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 shadow-sm transition-all"
            >
                <Plus className="w-4 h-4" /> 
                {activeTab === 'products' ? 'Define New Product' : 'Create Category'}
            </button>
        </div>
      </div>

      

            <DataTable
                data={filteredProducts}
                columns={productColumns}
                title="Physical Inventory"
               
            />

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Product' : 'Define New Product'}</h3>
                    <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
                            <input 
                                type="text" 
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                value={newProduct.name}
                                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                            />
                        </div>
                                <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">Group</label>
                                      <div className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 text-slate-700">
                                          {newProduct.categoryGroup || queryGroup || (categories && categories.length > 0 ? categories[0].group : CategoryGroup.OTHER)}
                                      </div>
                                      <input type="hidden" value={String(newProduct.categoryGroup || queryGroup || (categories && categories.length > 0 ? categories[0].group : CategoryGroup.OTHER))} />
                                </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">UOM</label>
                            <input 
                                type="text" 
                                placeholder="e.g. pcs, kg"
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                value={newProduct.unit}
                                onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
                            {(() => {
                                const groups = Array.from(new Set((categories || []).map(c => c.group).filter(Boolean)));
                                const names = (categories || []).filter(c => (c.group || '') === (newProduct.categoryGroup || (groups[0] || ''))).map(c => c.name);
                                if (names.length === 0) {
                                    return (
                                        <input 
                                            type="text" 
                                            placeholder="e.g., Snacks, Electronics"
                                            className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                            value={newProduct.categoryName}
                                            onChange={e => setNewProduct({...newProduct, categoryName: e.target.value})}
                                        />
                                    );
                                }
                                return (
                                    <select className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={newProduct.categoryName} onChange={e => setNewProduct({...newProduct, categoryName: e.target.value})}>
                                        <option value="">Select category</option>
                                        {names.map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                );
                            })()}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price</label>
                            <input 
                                type="number" 
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                value={newProduct.price}
                                onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Current Stock</label>
                            <input 
                                type="number" 
                                className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                                value={newProduct.stock}
                                onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Product Image</label>
                        <div className="flex gap-4 items-center">
                            {newProduct.imageUrl && (
                                <div className="relative">
                                  <img 
                                    src={getImageUrl(newProduct.imageUrl) || newProduct.imageUrl} 
                                    alt="Preview" 
                                    className="w-16 h-16 rounded object-cover border" 
                                    onError={(e) => {
                                      console.error('Preview image failed to load:', getImageUrl(newProduct.imageUrl));
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                            )}
                            <label className="flex-1 border-2 border-dashed border-slate-300 rounded-lg p-3 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50">
                                <Upload size={20} className="mb-1" />
                                <span className="text-xs">Click to upload image</span>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageUpload}
                                />
                            </label>
                        </div>
                    </div>

                    <button onClick={handleSaveProduct} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 flex justify-center items-center gap-2 mt-4">
                        <Save size={18} /> {editingId ? 'Update Product' : 'Save Definition'}
                    </button>
                </div>
            </div>
        </div>
      )}

            {/* Barcode Quantity Modal */}
            {showBarcodeQtyModal && pendingBarcodeProduct && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-60">
                    <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">Generate Barcodes — {pendingBarcodeProduct.name}</h3>
                            <button onClick={() => { setShowBarcodeQtyModal(false); setPendingBarcodeProduct(null); }} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm mb-2">Quantity</label>
                                <div className="flex gap-2">
                                    {[1,2,5,10,20].map(p => (
                                        <button key={p} onClick={() => setBarcodeQty(p)} className={`px-3 py-2 rounded border ${barcodeQty===p ? 'bg-brand-600 text-white' : 'bg-white'}`}>{p}</button>
                                    ))}
                                </div>
                                <input type="number" className="w-full mt-3 border p-2" value={barcodeQty} onChange={e => setBarcodeQty(Number(e.target.value) || 1)} min={1} />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => { setShowBarcodeQtyModal(false); setPendingBarcodeProduct(null); }} className="px-4 py-2 border rounded">Cancel</button>
                                <button onClick={async () => { if (pendingBarcodeProduct) { await generateBarcodesForProduct(pendingBarcodeProduct, barcodeQty); setShowBarcodeQtyModal(false); setPendingBarcodeProduct(null); } }} className="px-4 py-2 bg-brand-600 text-white rounded">Generate</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

      {/* Categories are now managed in the Administration → Categories page */}

      {/* Barcode Modal (No Change) */}
       {showBarcodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl h-[85vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800">Print Product Barcodes{currentBarcodeProduct ? ` — ${currentBarcodeProduct.name}` : ''}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="bg-slate-800 text-white px-3 py-1 rounded flex items-center gap-1"><Printer size={16}/> Print</button>
                        <button onClick={closeBarcodeModal} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                </div>
                
                <div className="p-8 overflow-y-auto bg-slate-100 flex-1">
                    {/* Controls for print layout */}
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600">Printer:</label>
                            <select className="border rounded px-2 py-1 text-sm" value={printerType} onChange={e => setPrinterType(e.target.value as any)}>
                                <option value="thermal">Thermal</option>
                                <option value="a4">A4</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-slate-600">Barcodes / row:</label>
                            <select className="border rounded px-2 py-1 text-sm" value={barcodesPerRow} onChange={e => setBarcodesPerRow(Number(e.target.value))}>
                                <option value={1}>1</option>
                                <option value={2}>2</option>
                                <option value={3}>3</option>
                                <option value={4}>4</option>
                            </select>
                        </div>
                    </div>

                    {/* Grid: adjust columns for screen and print according to selection */}
                    <div className={`grid gap-4 ${barcodesPerRow===1? 'grid-cols-1 print:grid-cols-1' : barcodesPerRow===2 ? 'grid-cols-2 print:grid-cols-2' : barcodesPerRow===3 ? 'grid-cols-3 print:grid-cols-3' : 'grid-cols-4 print:grid-cols-4'}`}>
                        {currentBarcodeProduct && barcodeImages.length > 0 ? (
                            barcodeImages.map((u, idx) => (
                                <div key={idx} className={`bg-white p-4 rounded border border-slate-300 flex flex-col items-center justify-center text-center ${printerType==='thermal' ? 'text-sm' : ''}`}>
                                    <h4 className="font-bold text-sm mb-1 truncate w-full">{currentBarcodeProduct.name}</h4>
                                    <div className="h-24 w-full flex items-center justify-center text-center my-2">
                                        <img src={u} alt={`${currentBarcodeProduct.id}-${idx}`} className="mx-auto max-h-20" />
                                    </div>
                                    <p className="text-xs text-slate-500">{symbol}{fmt(currentBarcodeProduct.price, 2)} / {currentBarcodeProduct.unit}</p>
                                </div>
                            ))
                        ) : (
                            products.map(p => (
                                <div key={p.id} className={`bg-white p-4 rounded border border-slate-300 flex flex-col items-center justify-center text-center ${printerType==='thermal' ? 'text-sm' : ''}`}>
                                    <h4 className="font-bold text-sm mb-1 truncate w-full">{p.name}</h4>
                                    <div className="h-16 w-full flex items-center justify-center text-center my-2">
                                        {barcodeUrls[p.id] ? (
                                            <img src={barcodeUrls[p.id]} alt={p.id} className="mx-auto max-h-16" />
                                        ) : (
                                            <div className="text-[10px] text-slate-400">Loading...</div>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500">{symbol}{fmt(p.price, 2)} / {p.unit}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Stock History Modal */}
      {showHistoryModal && historyProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-4 rounded-xl w-full max-w-3xl shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Stock History — {historyProduct.name}</h3>
                    <button onClick={() => { setShowHistoryModal(false); setHistoryProduct(null); setHistoryRecords([]); }} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="overflow-y-auto max-h-[60vh]">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="text-left text-slate-600">
                                <th className="p-2">When</th>
                                <th className="p-2">Change</th>
                                <th className="p-2">Type</th>
                                <th className="p-2">Location</th>
                                <th className="p-2">Supplier</th>
                                <th className="p-2">User</th>
                                <th className="p-2">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historyRecords.length === 0 && (
                                <tr><td colSpan={7} className="p-4 text-center text-slate-500">No history found.</td></tr>
                            )}
                            {historyRecords.map((r: any) => (
                                <tr key={r.id} className="border-t">
                                    <td className="p-2 align-top">{r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}</td>
                                    <td className="p-2 align-top">{r.change_amount}</td>
                                    <td className="p-2 align-top">{r.type}</td>
                                    <td className="p-2 align-top">{(locationsList.find(l => l.id === r.location_id) || { name: r.location_id }).name}</td>
                                    <td className="p-2 align-top">{r.supplier_id || '-'}</td>
                                    <td className="p-2 align-top">{r.user_id || '-'}</td>
                                    <td className="p-2 align-top">{r.notes || ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* Move Stock Modal */}
      {showMoveModal && moveProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Move Stock - {moveProduct.name}</h3>
                    <button onClick={() => { setShowMoveModal(false); setMoveProduct(null); }} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm text-slate-700 mb-1">From Location</label>
                        <select className="w-full border rounded p-2" value={moveFrom} onChange={e => setMoveFrom(e.target.value)}>
                            <option value="">Select location</option>
                            {locationsList.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-700 mb-1">To Location</label>
                        <select className="w-full border rounded p-2" value={moveTo} onChange={e => setMoveTo(e.target.value)}>
                            <option value="">Select location</option>
                            {locationsList.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm text-slate-700 mb-1">Quantity</label>
                        <input type="number" className="w-full border rounded p-2" value={moveQty} onChange={e => setMoveQty(Number(e.target.value))} />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setShowMoveModal(false); setMoveProduct(null); }} className="px-4 py-2 rounded border">Cancel</button>
                        <button onClick={async () => {
                            if (!moveProduct) return;
                            if (!moveFrom || !moveTo || moveFrom === moveTo || moveQty <= 0) { alert('Please select valid locations and quantity'); return; }
                            try {
                                await db.stock.move(moveProduct.id, moveFrom, moveTo, moveQty);
                                setShowMoveModal(false);
                                setMoveProduct(null);
                                setMoveQty(0);
                                await refreshData();
                            } catch (e) { console.warn('Move failed', e); alert('Move failed: ' + (e && e.message ? e.message : 'unknown')); }
                        }} className="px-4 py-2 rounded bg-brand-600 text-white">Move</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;