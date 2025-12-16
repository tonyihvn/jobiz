import React, { useState } from 'react';
import { MessageSquare, Mail, Smartphone, Send, Users, CheckCircle } from 'lucide-react';
import { Category } from '../types';
import db from '../services/apiClient';

const Communications = () => {
  const [method, setMethod] = useState<'email' | 'sms'>('email');
  const [recipientType, setRecipientType] = useState<'all' | 'group' | 'individual'>('all');
    const [selectedGroup, setSelectedGroup] = useState<string>('Membership');
    const [categories, setCategories] = useState<Category[]>([]);

    React.useEffect(() => {
        (async () => {
            try {
                const cats = db.categories && db.categories.getAll ? await db.categories.getAll() : [];
                setCategories(cats || []);
                const groups = Array.from(new Set((cats || []).map((c: any) => c.group).filter(Boolean)));
                if (groups.length > 0) setSelectedGroup(groups[0]);
            } catch (e) { /* ignore */ }
        })();
    }, []);
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSend = () => {
    // Simulation of API call
    setIsSent(true);
    setTimeout(() => {
        setIsSent(false);
        setMessage('');
        setSubject('');
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Communications Hub</h1>
            <p className="text-slate-500">Engage with members, students, and customers via Email or SMS.</p>
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
    </div>
  );
};

export default Communications;