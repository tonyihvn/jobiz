import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { Product, Role, Category } from '../types';
import { fmt } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';
import { Edit2, Trash2, X, Save, Plus } from 'lucide-react';

const Courses = () => {
    const { symbol } = useCurrency();
  const [items, setItems] = useState<Product[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);
    const [isSuper, setIsSuper] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [isNew, setIsNew] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                await refreshData();
                const currentUser = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
                setIsSuper(!!(currentUser && (currentUser.is_super_admin || currentUser.isSuperAdmin)));
                if (!mounted) return;
                if (currentUser) {
                    const roles = db.roles && db.roles.getAll ? await db.roles.getAll() : [];
                    const role = roles.find((r: any) => r.id === (currentUser.roleId || currentUser.role_id));
                    setUserRole(role || null);
                }
            } catch (e) {
                console.warn('Courses init failed', e);
            }
        })();
        return () => { mounted = false; };
  }, []);

    const location = useLocation();

    const refreshData = async () => {
        try {
            // Combine products and services so items saved to either table show up
            const prods = db.products && db.products.getAll ? await db.products.getAll() : [];
            let svcs: any[] = [];
            try { svcs = db.services && db.services.getAll ? await db.services.getAll() : []; } catch(e) { svcs = []; }
            const combined = [...(prods || []), ...(svcs || [])];
            try {
                const cats = db.categories && db.categories.getAll ? await db.categories.getAll() : [];
                setCategories(cats || []);
            } catch (e) { /* ignore */ }
            setItems(Array.isArray(combined) ? combined.filter((p: any) => (p.categoryGroup || '') === 'Art School') : []);
        } catch (e) {
            console.warn('Failed to load courses', e);
            setItems([]);
        }
    };

  const hasPermission = (action: string) => {
      if (isSuper) return true;
      if (!userRole) return false;
      return userRole.permissions && userRole.permissions.includes(`inventory:${action}`);
  };

  const handleDelete = (id: string) => {
      if(window.confirm('Delete this course?')) {
          (async () => {
            try {
                // Delete from services if present, otherwise products
                if (db.services && (db.services as any).delete) {
                    await (db.services as any).delete(id);
                } else if (db.products && db.products.delete) {
                    await db.products.delete(id);
                }
            } catch (e) { console.warn('Delete failed', e); }
            await refreshData();
          })();
      }
  };

  const handleCreate = () => {
            (async () => {
                setIsNew(true);
                const currentUser = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
                // Prefer persisted 'Art School' group if present
                const artGroups = Array.from(new Set((categories || []).filter(c => (c.group || '') === 'Art School').map(c => c.group))).filter(Boolean);
                const defaultGroup = artGroups.length > 0 ? artGroups[0] : 'Art School';
                setEditingItem({
                    id: Date.now().toString(),
                    businessId: currentUser?.businessId || '',
                    name: '',
                    categoryName: 'Beginner',
                    categoryGroup: defaultGroup,
                    price: 0,
                    stock: 9999,
                    unit: 'course',
                    isService: true // Default to service (no physical stock)
                });
            })();
  };

  const handleEdit = (item: Product) => {
      setIsNew(false);
      setEditingItem(item);
  };

  const handleSave = async () => {
      if (editingItem && editingItem.name) {
        if (isNew) {
            if (editingItem.isService) {
                if (db.services && (db.services as any).add) await (db.services as any).add(editingItem);
            } else {
                const current: any[] = db.products && db.products.getAll ? await db.products.getAll() : [];
                if (db.products && db.products.save) await db.products.save([...current, editingItem]);
            }
        } else {
            if (editingItem.isService) {
                if (db.services && (db.services as any).update) await (db.services as any).update(editingItem.id || editingItem.id, editingItem);
            } else {
                if (db.products && db.products.update) await db.products.update(editingItem.id || editingItem.id, editingItem);
            }
        }
          setEditingItem(null);
        await refreshData();
      }
  };

  const columns: Column<Product>[] = [
    { header: 'Course Name', accessor: 'name', key: 'name', sortable: true, filterable: true },
    { header: 'Level/Category', accessor: 'categoryName', key: 'categoryName', sortable: true, filterable: true },
    { header: 'Tuition Fee', accessor: (item: Product) => `${symbol}${fmt(item.price,2)}`, key: 'price', sortable: true, filterable: true },
    { header: 'Materials', accessor: (item: Product) => item.isService ? 'Not Included' : 'Included (Stock Item)', key: 'isService', filterable: true },
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
                        <h1 className="text-2xl font-bold text-slate-800">Courses</h1>
                        <p className="text-slate-500">Manage courses, workshops, and student enrollments.</p>
        </div>
        {hasPermission('create') && (
             <button onClick={handleCreate} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 shadow-sm transition-all">
                <Plus className="w-4 h-4" /> Add Course
            </button>
        )}
      </div>
      
      <DataTable 
        data={items} 
        columns={columns} 
        title="Course Catalog"
      />

      {/* Simplified Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">{isNew ? 'New Course' : 'Edit Course'}</h3>
                    <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Course Name</label>
                        <input 
                            type="text" 
                            className="w-full border rounded-lg p-2.5 outline-none"
                            value={editingItem.name}
                            onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Level / Category</label>
                        <input 
                            type="text" 
                            className="w-full border rounded-lg p-2.5 outline-none"
                            placeholder="e.g. Beginner, Advanced, Workshop"
                            value={editingItem.categoryName}
                            onChange={e => setEditingItem({...editingItem, categoryName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tuition Fee</label>
                        <input 
                            type="number" 
                            className="w-full border rounded-lg p-2.5 outline-none"
                            value={editingItem.price}
                            onChange={e => setEditingItem({...editingItem, price: Number(e.target.value)})}
                        />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <input 
                            type="checkbox" 
                            id="materials"
                            checked={!editingItem.isService}
                            onChange={e => setEditingItem({...editingItem, isService: !e.target.checked})}
                            className="w-4 h-4 text-brand-600 rounded border-gray-300"
                        />
                        <label htmlFor="materials" className="text-sm text-slate-700">Physical Stock Item (Materials Included)</label>
                    </div>
                    
                    <button onClick={handleSave} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 flex justify-center items-center gap-2 mt-4">
                        <Save size={18} /> {isNew ? 'Create Course' : 'Update Course'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
