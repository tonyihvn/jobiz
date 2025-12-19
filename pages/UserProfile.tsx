import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import db from '../services/apiClient';

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    (async () => {
      try {
        const all = await db.employees.getAll();
        const found = (all || []).find((u: any) => u.id === id);
        if (found) {
          setUser(found);
          setForm({ name: found.name || '', email: found.email || '', phone: found.phone || '' });
        }
      } catch (e) { console.warn('Failed to load user', e); }
    })();
  }, [id]);

  const handleSave = async () => {
    try {
      await db.employees.update(id as string, { name: form.name, email: form.email, phone: form.phone });
      setEditing(false);
      // refresh
      const all = await db.employees.getAll();
      setUser((all || []).find((u: any) => u.id === id));
    } catch (e) { alert('Failed to save'); }
  };

  const handleDelete = async () => {
    if (!confirm('Remove this employee?')) return;
    try {
      await db.employees.delete(id as string);
      navigate('/finance');
    } catch (e) { alert('Failed to delete employee'); }
  };

  if (!user) return <div className="p-8">User not found</div>;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <div className="flex gap-2">
          <button onClick={() => setEditing(e => !e)} className="px-3 py-2 bg-slate-100 rounded">{editing ? 'Cancel' : 'Edit'}</button>
          <button onClick={handleDelete} className="px-3 py-2 bg-red-600 text-white rounded">Delete</button>
        </div>
      </div>

      {!editing ? (
        <div className="space-y-2">
          <div><strong>Role:</strong> {user.role_id}</div>
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>Phone:</strong> {user.phone}</div>
          <div><strong>Salary:</strong> {user.salary}</div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm">Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm">Email</label>
            <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm">Phone</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border rounded p-2" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
            <button onClick={() => setEditing(false)} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
