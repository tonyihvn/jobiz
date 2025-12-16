import React, { useState, useEffect } from 'react';
import { Product, CategoryGroup, Supplier, Role } from '../types';
import { authFetch } from '../services/auth';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { Plus, X, Save, Edit2, Trash2, Upload } from 'lucide-react';

    const Suppliers = () => {
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);

    // Quick-create of products/services removed — use Product Master and Services pages instead

  useEffect(() => {
        (async () => {
            try {
                const sups = db.suppliers && db.suppliers.getAll ? await db.suppliers.getAll() : [];
                setSuppliers(sups || []);
                const roles = db.roles && db.roles.getAll ? await db.roles.getAll() : [];
                setUserRole((roles || []).find((r: any) => r.id === 'admin') || null);
            } catch (e) { console.warn('Failed to load suppliers/roles', e); }
        })();
    }, []);

        // No global quick-create listeners — product/service creation lives in Product Master and Services pages

  const hasPermission = (action: string) => {
    if (!userRole) return false;
    return userRole.permissions.includes(`suppliers:${action}`);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setNewSupplier(supplier);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
      (async () => {
        if(window.confirm('Are you sure?')) {
            try { if (db.suppliers && db.suppliers.delete) await db.suppliers.delete(id); } catch (e) { console.warn('Delete failed', e); }
            try { const sups = db.suppliers && db.suppliers.getAll ? await db.suppliers.getAll() : []; setSuppliers(sups || []); } catch {};
        }
      })();
  };

  const handleSave = () => {
    (async () => {
    if (!newSupplier.name) return;
    const s: Supplier = {
        id: editingId || Date.now().toString(),
        businessId: (await (db.auth && db.auth.getCurrentUser ? db.auth.getCurrentUser() : Promise.resolve(null)))?.businessId || '',
        name: newSupplier.name!,
        contactPerson: newSupplier.contactPerson || '',
        phone: newSupplier.phone || '',
        email: newSupplier.email || '',
        address: newSupplier.address || ''
    };
    
    if (editingId) {
        try { if (db.suppliers && db.suppliers.update) await db.suppliers.update(s.id, s); } catch (e) { console.warn('Update failed', e); }
    } else {
        try { if (db.suppliers && db.suppliers.save) await db.suppliers.save([s, ...(suppliers || [])]); } catch (e) { console.warn('Save failed', e); }
    }
    
    try { const sups = db.suppliers && db.suppliers.getAll ? await db.suppliers.getAll() : []; setSuppliers(sups || []); } catch {}
    setShowModal(false);
    setNewSupplier({});
    setEditingId(null);
    })();
  };

  const columns: Column<Supplier>[] = [
    { header: 'Company Name', accessor: 'name', key: 'name', sortable: true, filterable: true },
    { header: 'Contact Person', accessor: 'contactPerson', key: 'contactPerson' },
    { header: 'Phone', accessor: 'phone', key: 'phone' },
    { header: 'Email', accessor: 'email', key: 'email' },
    { header: 'Address', accessor: 'address', key: 'address' },
    {
        header: 'Actions',
        accessor: (item: Supplier) => (
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
            <h1 className="text-2xl font-bold text-slate-800">Suppliers</h1>
            <p className="text-slate-500">Manage vendor database.</p>
        </div>
                <div className="flex items-center gap-3">
                        <>
                            <button 
                                onClick={() => { setEditingId(null); setNewSupplier({}); setShowModal(true); }}
                                className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 shadow-sm transition-all"
                            >
                                <Plus className="w-4 h-4" /> 
                                Add Supplier
                            </button>
                        </>
                </div>
      </div>

      <DataTable data={suppliers} columns={columns} title="Supplier List" />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Supplier' : 'Add Supplier'}</h3>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                        <input type="text" className="w-full border rounded-lg p-2.5 outline-none" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                        <input type="text" className="w-full border rounded-lg p-2.5 outline-none" value={newSupplier.contactPerson} onChange={e => setNewSupplier({...newSupplier, contactPerson: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                             <input type="text" className="w-full border rounded-lg p-2.5 outline-none" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                             <input type="email" className="w-full border rounded-lg p-2.5 outline-none" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} />
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                         <input type="text" className="w-full border rounded-lg p-2.5 outline-none" value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} />
                    </div>
                    <button onClick={handleSave} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 flex justify-center items-center gap-2 mt-4">
                        <Save size={18} /> {editingId ? 'Update' : 'Save'} Supplier
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Product/Service quick-create removed */}
    </div>
  );
};

export default Suppliers;