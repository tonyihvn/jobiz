import React, { useEffect, useState } from 'react';
import db from '../services/apiClient';
import { Category } from '../types';
import { Plus, X, Save, Edit2, Trash2 } from 'lucide-react';

const CategoriesPage = () => {
  const [items, setItems] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [isNew, setIsNew] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<any>(null);
    const [isSuper, setIsSuper] = useState(false);
    const [authorized, setAuthorized] = useState(true);
  
    useEffect(() => { (async () => { await loadAuth(); await refresh(); })(); }, []);
  useEffect(() => { refresh(); }, []);

  const refresh = async () => {
    try {
      const cats = db.categories && db.categories.getAll ? await db.categories.getAll() : [];
      setItems(Array.isArray(cats) ? cats : []);
    } catch (e) { setItems([]); }
  };
    const loadAuth = async () => {
      try {
        const user = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
        setCurrentUser(user);
        setIsSuper(!!(user && (user.is_super_admin || user.isSuperAdmin)));
        if (!user) { setUserRole(null); setAuthorized(false); return; }
        if (db.roles && db.roles.getAll) {
          const roles = await db.roles.getAll();
          const role = roles.find((r: any) => r.id === (user.roleId || user.role_id));
          setUserRole(role || null);
          const canRead = (user && (user.is_super_admin || user.isSuperAdmin)) || (role && role.permissions && role.permissions.includes('categories:read')) || (role && role.permissions && role.permissions.includes('categories'));
          setAuthorized(!!canRead);
        } else {
          setAuthorized(!!(user && (user.is_super_admin || user.isSuperAdmin)));
        }
      } catch (e) { setAuthorized(false); }
    };

  const handleCreate = () => {
    setIsNew(true);
    setEditing({ id: Date.now().toString(), businessId: '', name: '', group: '', isProduct: true, description: '' });
  };

  const handleEdit = (c: Category) => { setIsNew(false); setEditing(c); };

  const handleDelete = async (id: string) => {
    if (!can('delete')) { alert('Not authorized'); return; }
    if (!confirm('Delete this category?')) return;
    try { if (db.categories && db.categories.delete) await db.categories.delete(id); } catch (e) { console.warn(e); }
    await refresh();
    try { window.dispatchEvent(new CustomEvent('categories:changed')); } catch (e) { /* ignore */ }
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!can(isNew ? 'create' : 'update')) { alert('Not authorized'); return; }
    try {
      if (isNew) {
        if (db.categories && db.categories.add) await db.categories.add(editing);
      } else {
        if (db.categories && db.categories.update) await db.categories.update(editing.id, editing);
      }
      setEditing(null);
      await refresh();
      try { window.dispatchEvent(new CustomEvent('categories:changed')); } catch (e) { /* ignore */ }
    } catch (e) { console.warn('Save failed', e); }
  };

  const can = (action: 'create' | 'read' | 'update' | 'delete') => {
    if (isSuper) return true;
    if (!userRole || !userRole.permissions) return false;
    // allow broad 'categories' permission or specific 'categories:action'
    return userRole.permissions.includes('categories') || userRole.permissions.includes(`categories:${action}`);
  };

  return (
    !authorized ? (
      <div className="p-8 bg-white rounded-lg">
        <h3 className="text-lg font-bold">Access Denied</h3>
        <p className="text-sm text-slate-500 mt-2">You do not have permission to view categories. Ask an administrator to grant 'Categories' access.</p>
      </div>
    ) : (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Categories & Groups</h1>
          <p className="text-slate-500">Create category groups and mark whether they are stocked products.</p>
        </div>
        {can('create') && (
        <button onClick={handleCreate} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus /> New Category
        </button>)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-lg border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{c.name}</h3>
                <p className="text-xs text-slate-500">Group: {c.group} • {c.isProduct ? 'Product (stocked)' : 'Service (no stock)'}</p>
                <p className="text-sm mt-2">{c.description}</p>
              </div>
              <div className="flex flex-col gap-2">
                {can('update') && <button onClick={() => handleEdit(c)} className="text-blue-600"><Edit2/></button>}
                {can('delete') && <button onClick={() => handleDelete(c.id)} className="text-rose-600"><Trash2/></button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">{isNew ? 'New Category' : 'Edit Category'}</h3>
              <button onClick={() => setEditing(null)}><X/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm">Name</label>
                <input className="w-full border p-2" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm">Group Name</label>
                <input className="w-full border p-2" value={editing.group} onChange={e => setEditing({...editing, group: e.target.value})} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={!!editing.isProduct} onChange={e => setEditing({...editing, isProduct: e.target.checked})} />
                <label className="text-sm">This group represents physical products (stock-tracked)</label>
              </div>
              <div>
                <label className="block text-sm">Description</label>
                <textarea className="w-full border p-2" value={editing.description} onChange={e => setEditing({...editing, description: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(null)} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-brand-600 text-white rounded">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    )
  );
};

export default CategoriesPage;
