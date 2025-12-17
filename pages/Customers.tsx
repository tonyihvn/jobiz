import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { Customer, Role } from '../types';
import { Plus, X, Save, Edit2, Trash2 } from 'lucide-react';

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);

  useEffect(() => {
        (async () => {
            try {
                const custs = db.customers && db.customers.getAll ? await db.customers.getAll() : [];
                setCustomers(custs || []);
                const currentUser = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
                if (currentUser && db.roles && db.roles.getAll) {
                    const roles = await db.roles.getAll();
                    setUserRole(Array.isArray(roles) ? roles.find(r => r.id === currentUser.roleId) || null : null);
                }
            } catch (e) {
                console.warn('Failed to load customers', e);
            }
        })();
    }, []);

  const hasPermission = (action: string) => {
    if (!userRole) return false;
    // Allow super admin bypass or strictly check permissions
        return userRole.permissions.includes(`clients:${action}`);
  };

  const handleEdit = (customer: Customer) => {
      setEditingId(customer.id);
      setNewCustomer(customer);
      setShowModal(true);
  };

  const handleDelete = async (id: string) => {
      if(window.confirm('Are you sure you want to remove this client?')) {
          try {
              const updatedCustomers = customers.filter(c => c.id !== id);
              setCustomers(updatedCustomers);
          } catch (e) { console.warn('Delete failed', e); }
      }
  };

    const handleSave = async () => {
        if (!newCustomer.name) return;
        const c: Customer = {
                id: editingId || Date.now().toString(),
                businessId: (db.auth && db.auth.getCurrentUser) ? (await db.auth.getCurrentUser())?.businessId || '' : '',
                name: newCustomer.name!,
                phone: newCustomer.phone || '',
                email: newCustomer.email || '',
                address: newCustomer.address || '',
                category: newCustomer.category || 'Regular',
                details: newCustomer.details || ''
        };
        try {
            if (db.customers && db.customers.add) await db.customers.add(c);
        } catch (e) { console.warn('Save customer failed', e); }
        const custs = db.customers && db.customers.getAll ? await db.customers.getAll() : [];
        setCustomers(custs || []);
        setShowModal(false);
        setNewCustomer({});
        setEditingId(null);
    };

  const columns: Column<Customer>[] = [
    { header: 'Customer Name', accessor: 'name', key: 'name', sortable: true, filterable: true },
    { header: 'Category', accessor: 'category', key: 'category', filterable: true, sortable: true },
    { header: 'Phone', accessor: 'phone', key: 'phone', filterable: true },
    { header: 'Email', accessor: 'email', key: 'email', filterable: true },
    { 
        header: 'Actions', 
        accessor: (item: Customer) => (
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
            <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
            <p className="text-slate-500">Manage clients and customers.</p>
        </div>
            <button 
                onClick={() => { setEditingId(null); setNewCustomer({ category: 'Regular' }); setShowModal(true); }}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 shadow-sm transition-all"
            >
                <Plus className="w-4 h-4" /> 
                Add Client
            </button>
      </div>

      <DataTable data={customers} columns={columns} title="Client List" />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Customer' : 'Add Customer'}</h3>
                    <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                            <input type="text" className="w-full border rounded-lg p-2.5 outline-none" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <select 
                                className="w-full border rounded-lg p-2.5 outline-none"
                                value={newCustomer.category} 
                                onChange={e => setNewCustomer({...newCustomer, category: e.target.value})}
                            >
                                <option value="Regular">Regular</option>
                                <option value="VIP">VIP</option>
                                <option value="Corporate">Corporate</option>
                                <option value="Student">Student</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                             <input type="text" className="w-full border rounded-lg p-2.5 outline-none" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                             <input type="email" className="w-full border rounded-lg p-2.5 outline-none" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                         <input type="text" className="w-full border rounded-lg p-2.5 outline-none" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Additional Details</label>
                         <textarea 
                            className="w-full border rounded-lg p-2.5 outline-none" 
                            rows={3} 
                            value={newCustomer.details} 
                            onChange={e => setNewCustomer({...newCustomer, details: e.target.value})} 
                            placeholder="Preferences, Notes, History..."
                         />
                    </div>
                    <button onClick={handleSave} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 flex justify-center items-center gap-2 mt-4">
                        <Save size={18} /> {editingId ? 'Update' : 'Save'} Client
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Customers;