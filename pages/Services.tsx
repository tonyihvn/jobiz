import React, { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { Product, Role, Category } from '../types';
import { fmt } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';
import { Edit2, Trash2, X, Save, Plus } from 'lucide-react';

const Services = () => {
    const { symbol } = useCurrency();
  const [items, setItems] = useState<Product[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);
    const [isSuper, setIsSuper] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const location = useLocation();

  useEffect(() => {
        (async () => {
            await refreshData();
            try {
                const currentUser = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
                setIsSuper(!!(currentUser && (currentUser.is_super_admin || currentUser.isSuperAdmin)));
                if (currentUser) {
                    const roles = db.roles && db.roles.getAll ? await db.roles.getAll() : [];
                    const role = (roles || []).find((r: any) => r.id === currentUser.roleId || r.id === currentUser.role_id);
                    setUserRole(role || null);
                }
            } catch (e) {
                console.warn('Failed to resolve user/roles', e);
            }
        })();
        }, []);

    // Refresh services list when a service is created elsewhere
    useEffect(() => {
        const onSvcCreated = (e: any) => {
            try { refreshData(); } catch (err) { console.warn('refreshData failed', err); }
        };
        window.addEventListener('service:created', onSvcCreated as EventListener);
        return () => window.removeEventListener('service:created', onSvcCreated as EventListener);
    }, []);


    const refreshData = async () => {
        try {
            // Services are stored in `services` table — prefer that endpoint if available
            let svcList: any[] = [];
            try {
                svcList = db.services && db.services.getAll ? await db.services.getAll() : [];
            } catch (e) {
                // fallback to products table where some services may live
                const prods = db.products && db.products.getAll ? await db.products.getAll() : [];
                const isSvc = (p: any) => {
                    if (typeof p.isService !== 'undefined') return !!p.isService;
                    if (typeof p.is_service !== 'undefined') return !!p.is_service;
                    return false;
                };
                svcList = (prods || []).filter((p: any) => isSvc(p));
            }
            // load categories for dropdowns (normalize fields)
            try {
                const cats = db.categories && db.categories.getAll ? await db.categories.getAll() : [];
                const normalizedCats = (cats || []).map((c: any) => ({
                    ...c,
                    isProduct: typeof c.isProduct !== 'undefined' ? !!c.isProduct : (typeof c.is_product !== 'undefined' ? !!c.is_product : false),
                    group: c.group || c.category_group || '',
                    name: c.name || c.label || ''
                }));
                setCategories(normalizedCats || []);
            } catch (e) { /* ignore */ }

            // Exclude art school entries here (they are managed in Courses)
            const norm = (svcList || []).map((p: any) => ({
                ...p,
                categoryGroup: p.categoryGroup || p.category_group || p.group || '',
                categoryName: p.categoryName || p.category_name || p.name || ''
            }));
            const filtered = norm.filter((p: any) => (p.categoryGroup || '') !== 'Art School');
            console.log('[Services] Loaded services:', filtered);
            setItems(filtered);
        } catch (e) {
            console.error('[Services] Failed to load services:', e);
            setItems([]);
        }
    };

    const params = useParams();
    const queryGroup = (() => { try { const qp = new URLSearchParams(location.search); return params.group || qp.get('group') || qp.get('category') || ''; } catch(e) { return params.group || ''; } })();
    
    // Normalize for comparison (trim and handle spaces/encoding)
    const normalizeGroup = (str: string) => (str || '').trim();
    const normalizedQueryGroup = normalizeGroup(queryGroup);
    
    const displayedItems = (items || []).filter(i => { 
        if (!normalizedQueryGroup) return true; 
        return normalizeGroup(i.categoryGroup || '') === normalizedQueryGroup; 
    });
    if (normalizedQueryGroup) {
        console.log('[Services] Filtering by queryGroup:', normalizedQueryGroup, '-> displayed items:', displayedItems);
    }

  const hasPermission = (action: string) => {
      if (isSuper) return true;
      if (!userRole) return false;
      return userRole.permissions && userRole.permissions.includes(`inventory:${action}`);
  };

  const handleDelete = async (id: string) => {
      if(window.confirm('Delete this service?')) {
          try {
            if (db.services && db.services.delete) {
                await db.services.delete(id);
            } else {
                alert('Services API not available — cannot delete service. Please check server configuration.');
                return;
            }
          } catch (e) { console.warn('Failed to delete service', e); }
          await refreshData();
      }
  };

  const handleEdit = (item: Product) => {
      setIsNew(false);
      setEditingItem(item);
  };

  const handleCreate = () => {
      setIsNew(true);
      // Use current page's group if viewing a specific group, otherwise pick default
      let defaultGroup = normalizedQueryGroup;
      if (!defaultGroup) {
          // pick a default service group from persisted categories (non-product groups)
          const svcGroups = Array.from(new Set((categories || []).filter(c => !c.isProduct).map(c => c.group))).filter(Boolean) as string[];
          defaultGroup = svcGroups.length > 0 ? svcGroups[0] : 'Renting';
      }
      setEditingItem({
          id: Date.now().toString(),
          businessId: '',
          name: '',
          categoryName: 'General',
          categoryGroup: defaultGroup,
          price: 0,
          stock: 9999,
          unit: 'hr',
          isService: true
      });
  };

  const handleSave = () => {
      (async () => {
        if (editingItem && editingItem.name) {
            try {
              if (isNew) {
                  if (db.services && db.services.add) {
                      const res = await db.services.add(editingItem);
                      if (!res) {
                          alert('Failed to create service. Please check server logs.');
                          return;
                      }
                  } else {
                      alert('Services API not available — cannot create service. Please enable /api/services on the server.');
                      return;
                  }
              } else {
                  if (db.services && db.services.update) {
                      const res = await db.services.update(editingItem.id, editingItem);
                      if (!res) { alert('Failed to update service. Please check server logs.'); return; }
                  } else {
                      alert('Services API not available — cannot update service. Please enable /api/services on the server.');
                      return;
                  }
              }
            } catch (e) { console.warn('Failed to save service', e); }
            setEditingItem(null);
            await refreshData();
        }
      })();
  };

  const columns: Column<Product>[] = [
    { header: 'Service Name', accessor: 'name', key: 'name', sortable: true, filterable: true },
    { header: 'Category', accessor: 'categoryName', key: 'categoryName', filterable: true },
    { header: 'Rate/Price', accessor: (item: Product) => `${symbol}${fmt(item.price, 2)}`, key: 'price', sortable: true, filterable: true },
    { header: 'Unit', accessor: 'unit', key: 'unit', filterable: true },
    { 
        header: 'Actions', 
        accessor: (item: Product) => (
            <div className="flex gap-2">
                {hasPermission('update') && (
                    <button onClick={() => handleEdit(item)} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                        <Edit2 size={16} />
                    </button>
                )}
                {hasPermission('delete') && (
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        ), 
        key: 'actions' 
    }
  ];

  return (
    <div className="space-y-6">
    <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Services{queryGroup ? ` — ${queryGroup}` : ''}</h1>
            <p className="text-slate-500">Manage services (rentals, memberships, and other non-stock offerings).</p>
        </div>
             <button onClick={handleCreate} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 shadow-sm transition-all">
                <Plus className="w-4 h-4" /> Add Service
            </button>
      </div>
      
            <DataTable 
                data={displayedItems} 
                columns={columns} 
                title="Active Services"
               
            />

      {/* Simplified Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">{isNew ? 'Create New Service' : 'Edit Service'}</h3>
                    <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Service Name</label>
                        <input 
                            type="text" 
                            className="w-full border rounded-lg p-2.5 outline-none"
                            value={editingItem.name}
                            onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                        />
                    </div>
                    {/* Type field removed per request; categoryGroup is set programmatically */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
                        {(() => {
                            const names = (categories || []).filter(c => (c.group || '') === (editingItem.categoryGroup || '')).map(c => c.name);
                            if (names.length === 0) {
                                return <input type="text" className="w-full border rounded-lg p-2.5 outline-none" value={editingItem.categoryName} onChange={e => setEditingItem({...editingItem, categoryName: e.target.value})} />;
                            }
                            return (
                                <select className="w-full border rounded-lg p-2.5 outline-none" value={editingItem.categoryName} onChange={e => setEditingItem({...editingItem, categoryName: e.target.value})}>
                                    <option value="">Select category</option>
                                    {names.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            );
                        })()}
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Billing Unit</label>
                         <input 
                            type="text" 
                            className="w-full border rounded-lg p-2.5 outline-none"
                            placeholder="e.g. hr, month, year"
                            value={editingItem.unit}
                            onChange={e => setEditingItem({...editingItem, unit: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Price / Rate</label>
                        <input 
                            type="number" 
                            className="w-full border rounded-lg p-2.5 outline-none"
                            value={editingItem.price}
                            onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})}
                        />
                    </div>
                    
                    <button onClick={handleSave} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 flex justify-center items-center gap-2 mt-4">
                        <Save size={18} /> {isNew ? 'Save Service' : 'Update Service'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Services;


