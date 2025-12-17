import React, { useState, useEffect } from 'react';
import { MessageSquare, Mail, Smartphone, Send, Users, CheckCircle } from 'lucide-react';
import { Category } from '../types';
import db from '../services/apiClient';
import { authFetch } from '../services/auth';

const Communications = () => {
  const [method, setMethod] = useState<'email' | 'sms'>('email');
    const [recipientType, setRecipientType] = useState<'all' | 'group' | 'individual'>('all');
        const [selectedGroup, setSelectedGroup] = useState<string>('Membership');
        const [categories, setCategories] = useState<Category[]>([]);
        const [contacts, setContacts] = useState<any[]>([]);
        const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
        const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const cats = db.categories && db.categories.getAll ? await db.categories.getAll() : [];
                setCategories(cats || []);
                const groups = Array.from(new Set((cats || []).map((c: any) => c.group).filter(Boolean)));
                if (groups.length > 0) setSelectedGroup(groups[0]);
                const custs = db.customers && db.customers.getAll ? await db.customers.getAll() : [];
                setContacts(Array.isArray(custs) ? custs : []);
            } catch (e) { /* ignore */ }
        })();
    }, []);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isSent, setIsSent] = useState(false);

    const handleSend = async () => {
        setIsSent(true);
        try {
            if (method === 'sms') {
                let targets: string[] = [];
                if (recipientType === 'all') targets = contacts.map(c => c.phone).filter(Boolean);
                else if (recipientType === 'group') targets = contacts.filter(c => c.category === selectedGroup).map(c => c.phone).filter(Boolean);
                else if (recipientType === 'individual') targets = Object.keys(selectedIds).filter(id => selectedIds[id]).map(id => (contacts.find(c => c.id === id) || {}).phone).filter(Boolean);
                if (selectAll) targets = contacts.map(c => c.phone).filter(Boolean);
                if (targets.length === 0) throw new Error('No recipients selected');
                const resp = await authFetch('/api/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: targets, body: message }) });
                if (!resp.ok) throw new Error('Failed to send SMS');
            } else {
                let targets: string[] = [];
                if (recipientType === 'all') targets = contacts.map(c => c.email).filter(Boolean);
                else if (recipientType === 'group') targets = contacts.filter(c => c.category === selectedGroup).map(c => c.email).filter(Boolean);
                else if (recipientType === 'individual') targets = Object.keys(selectedIds).filter(id => selectedIds[id]).map(id => (contacts.find(c => c.id === id) || {}).email).filter(Boolean);
                if (selectAll) targets = contacts.map(c => c.email).filter(Boolean);
                for (const t of targets) {
                    await authFetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: t, subject, text: message }) });
                }
            }
            setMessage(''); setSubject('');
        } catch (e) {
            console.error('Send failed', e);
            alert(e && e.message ? e.message : 'Send failed');
        } finally {
            setIsSent(false);
        }
    };

    useEffect(() => {
        if (selectAll) {
            const s: Record<string, boolean> = {};
            contacts.forEach(c => { if (c.id) s[c.id] = true; });
            setSelectedIds(s);
        } else {
            setSelectedIds({});
        }
    }, [selectAll, contacts]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Communications Hub</h1>
            <p className="text-slate-500">Engage with members, students, and clients via Email or SMS.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Column */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <MessageSquare size={18} /> Channel
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setMethod('email')}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${method === 'email' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                    >
                        <Mail className="mb-2" />
                        <span className="font-medium">Email</span>
                    </button>
                    <button 
                        onClick={() => setMethod('sms')}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${method === 'sms' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-100 hover:border-slate-200 text-slate-500'}`}
                    >
                        <Smartphone className="mb-2" />
                        <span className="font-medium">SMS</span>
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Users size={18} /> Recipients
                </h3>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input type="radio" name="recipients" checked={recipientType === 'all'} onChange={() => setRecipientType('all')} className="text-brand-600 focus:ring-brand-500" />
                        <span className="text-sm font-medium">All Contacts</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input type="radio" name="recipients" checked={recipientType === 'group'} onChange={() => setRecipientType('group')} className="text-brand-600 focus:ring-brand-500" />
                        <div className="flex-1">
                            <span className="text-sm font-medium">Specific Group</span>
                            {recipientType === 'group' && (
                                <select 
                                    className="mt-2 w-full text-xs p-2 border rounded"
                                    value={selectedGroup}
                                    onChange={(e) => setSelectedGroup(e.target.value)}
                                >
                                    {(() => {
                                        const groups = Array.from(new Set((categories || []).map(c => c.group).filter(Boolean)));
                                        if (groups.length === 0) return <option value="Membership">Membership</option>;
                                        return groups.map(g => <option key={g} value={g}>{g}</option>);
                                    })()}
                                </select>
                            )}
                        </div>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded border border-slate-200 cursor-pointer hover:bg-slate-50">
                         <input type="radio" name="recipients" checked={recipientType === 'individual'} onChange={() => setRecipientType('individual')} className="text-brand-600 focus:ring-brand-500" />
                         <span className="text-sm font-medium">Manual Entry</span>
                    </label>
                    {recipientType === 'individual' && (
                         <input type="text" placeholder="Enter emails/numbers separated by comma" className="w-full text-sm p-2 border rounded" />
                    )}
                </div>
            </div>
        </div>

        {/* Composer Column */}
        <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-slate-800">Compose Message</h2>
                    <p className="text-sm text-slate-500">
                        Sending to: <span className="font-semibold text-brand-600">{recipientType === 'all' ? 'All Users' : recipientType === 'group' ? selectedGroup : 'Manual List'}</span>
                    </p>
                </div>

                <div className="space-y-4 flex-1">
                    {method === 'email' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Subject Line</label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-500 outline-none"
                                placeholder="e.g., Monthly Newsletter"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>
                    )}
                    <div className="h-full">
                         <label className="block text-sm font-medium text-slate-700 mb-1">Message Body</label>
                         <textarea 
                            className="w-full h-64 border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-500 outline-none resize-none font-sans"
                            placeholder="Type your message here..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                         ></textarea>
                         <p className="text-xs text-slate-400 text-right mt-1">{message.length} characters</p>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        {isSent && <span className="flex items-center gap-2 text-emerald-600 font-medium"><CheckCircle size={16}/> Message sent successfully!</span>}
                    </div>
                    <button 
                        onClick={handleSend}
                        disabled={!message || isSent}
                        className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50 transition-all"
                    >
                        <Send size={18} /> Send Blast
                    </button>
                </div>
            </div>
        </div>
            </div>

            {/* Contacts table */}
            {(recipientType === 'all' || recipientType === 'group' || recipientType === 'individual') && (
                <div className="bg-white mt-6 p-6 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-slate-800">Contacts</h3>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectAll} onChange={(e) => setSelectAll(e.target.checked)} /> Select All</label>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-slate-500">
                                    <th className="w-8"> </th>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Email</th>
                                    <th>Category</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contacts.filter(c => recipientType === 'all' || (recipientType === 'group' && c.category === selectedGroup) || recipientType === 'individual').map(c => (
                                    <tr key={c.id} className="border-t">
                                        <td className="py-2"><input type="checkbox" checked={!!selectedIds[c.id]} onChange={(e) => setSelectedIds({ ...selectedIds, [c.id]: e.target.checked })} /></td>
                                        <td className="py-2">{c.name}</td>
                                        <td className="py-2">{c.phone}</td>
                                        <td className="py-2">{c.email}</td>
                                        <td className="py-2">{c.category}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
  );
};

export default Communications;