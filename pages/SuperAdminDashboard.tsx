import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { Business, SubscriptionPlan } from '../types';
import { Shield, CheckCircle, XCircle, Settings, LogOut, CreditCard, AlertTriangle, Eye, Plus, X, Save } from 'lucide-react';
import { useCurrency } from '../services/CurrencyContext';

const SuperAdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
    const { symbol } = useCurrency();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeTab, setActiveTab] = useState<'businesses' | 'plans' | 'notifications'>('notifications');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  
  // Plan Modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan>>({ features: [] });

  // Receipt Modal
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setBusinesses(db.superAdmin.getBusinesses());
    setPlans(db.superAdmin.getPlans());
  };

  const toggleStatus = (b: Business) => {
      const newStatus = b.status === 'active' ? 'suspended' : 'active';
      db.superAdmin.updateBusinessStatus(b.id, newStatus);
      refreshData();
  };

  const handleVerifyPayment = (b: Business) => {
      if(window.confirm(`Confirm payment receipt for ${b.name} and activate account?`)) {
          db.superAdmin.verifyPayment(b.id);
          refreshData();
      }
  };

  const handleSavePlan = () => {
      if(!editingPlan.name || !editingPlan.price) return;
      const plan: SubscriptionPlan = {
          id: editingPlan.id || 'plan_' + Date.now(),
          name: editingPlan.name,
          price: Number(editingPlan.price),
          interval: editingPlan.interval || 'monthly',
          features: editingPlan.features || []
      };
      db.superAdmin.savePlan(plan);
      setShowPlanModal(false);
      setEditingPlan({ features: [] });
      refreshData();
  };

  // Notifications Logic
  const pendingActivations = businesses.filter(b => b.paymentStatus === 'pending_verification');
  const duePayments = businesses.filter(b => {
      if(!b.dueDate) return false;
      return new Date(b.dueDate) < new Date() && b.paymentStatus !== 'paid';
  });

  const businessColumns: Column<Business>[] = [
    { header: 'Company Name', accessor: 'name', key: 'name', filterable: true, sortable: true },
    { header: 'Email', accessor: 'email', key: 'email' },
    { header: 'Registered', accessor: (b) => new Date(b.registeredAt).toLocaleDateString(), key: 'registeredAt', sortable: true },
    { 
        header: 'Payment Status', 
        accessor: (b) => (
            <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                    b.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    b.paymentStatus === 'pending_verification' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                }`}>
                    {b.paymentStatus.replace('_', ' ')}
                </span>
                {b.paymentReceiptUrl && (
                    <button onClick={() => setViewReceipt(b.paymentReceiptUrl!)} className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                        <Eye size={12}/> Receipt
                    </button>
                )}
            </div>
        ),
        key: 'paymentStatus'
    },
    { 
        header: 'Account Status', 
        accessor: (b) => (
            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                b.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                b.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                'bg-rose-100 text-rose-700'
            }`}>
                {b.status}
            </span>
        ), 
        key: 'status',
        sortable: true
    },
    {
        header: 'Actions',
        accessor: (b) => (
            <div className="flex gap-2">
                {b.paymentStatus === 'pending_verification' && (
                    <button 
                        onClick={() => handleVerifyPayment(b)}
                        className="bg-emerald-600 text-white px-2 py-1 rounded text-xs font-bold hover:bg-emerald-700"
                    >
                        Verify & Activate
                    </button>
                )}
                <button 
                    onClick={() => toggleStatus(b)}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold border transition-colors ${
                        b.status === 'active' 
                        ? 'border-rose-200 text-rose-600 hover:bg-rose-50' 
                        : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                    }`}
                >
                    {b.status === 'active' ? 'Suspend' : 'Force Activate'}
                </button>
            </div>
        ),
        key: 'actions'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100">
        <header className="bg-slate-900 text-white p-4 shadow-lg sticky top-0 z-10">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Super Admin Console</h1>
                        <p className="text-xs text-slate-400">Platform Management</p>
                    </div>
                </div>
                <button onClick={onLogout} className="flex items-center gap-2 text-slate-300 hover:text-white">
                    <LogOut size={16} /> Logout
                </button>
            </div>
        </header>

        <main className="max-w-7xl mx-auto p-6">
            <div className="flex gap-4 mb-6">
                 <button onClick={() => setActiveTab('notifications')} className={`px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'notifications' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
                     Alerts ({pendingActivations.length + duePayments.length})
                 </button>
                 <button onClick={() => setActiveTab('businesses')} className={`px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'businesses' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
                     Tenants
                 </button>
                 <button onClick={() => setActiveTab('plans')} className={`px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'plans' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
                     Plans
                 </button>
            </div>

            {activeTab === 'notifications' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-amber-500">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><AlertTriangle className="text-amber-500"/> Pending Verification</h3>
                        {pendingActivations.length === 0 ? <p className="text-slate-400">No pending verifications.</p> : (
                            <ul className="space-y-3">
                                {pendingActivations.map(b => (
                                    <li key={b.id} className="flex justify-between items-center p-3 bg-amber-50 rounded">
                                        <div>
                                            <p className="font-bold text-slate-800">{b.name}</p>
                                            <p className="text-xs text-slate-500">Plan: {b.planId}</p>
                                        </div>
                                        <button onClick={() => { setActiveTab('businesses'); }} className="text-indigo-600 text-sm font-bold">Review</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-rose-500">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CreditCard className="text-rose-500"/> Overdue Payments</h3>
                        {duePayments.length === 0 ? <p className="text-slate-400">No overdue accounts.</p> : (
                            <ul className="space-y-3">
                                {duePayments.map(b => (
                                    <li key={b.id} className="flex justify-between items-center p-3 bg-rose-50 rounded">
                                        <div>
                                            <p className="font-bold text-slate-800">{b.name}</p>
                                            <p className="text-xs text-rose-600">Due: {new Date(b.dueDate!).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => { setActiveTab('businesses'); }} className="text-indigo-600 text-sm font-bold">Manage</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'businesses' && (
                <DataTable data={businesses} columns={businessColumns} title="Registered Tenants" />
            )}

            {activeTab === 'plans' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map(plan => (
                        <div key={plan.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                            <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
                                <div className="my-4">
                                <span className="text-3xl font-bold">{symbol}{plan.price}</span>
                                <span className="text-sm text-slate-500">/{plan.interval}</span>
                            </div>
                            <div className="space-y-2 mb-6 flex-1">
                                {plan.features.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                        <CheckCircle size={14} className="text-emerald-500"/> {f}
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => { setEditingPlan(plan); setShowPlanModal(true); }} className="w-full border border-slate-200 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50">
                                Edit Plan
                            </button>
                        </div>
                    ))}
                    <div onClick={() => { setEditingPlan({ features: [] }); setShowPlanModal(true); }} className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer h-full min-h-[250px]">
                        <Settings size={32} className="mb-2"/>
                        <span className="font-bold">Create New Plan</span>
                    </div>
                </div>
            )}
        </main>

        {/* Plan Modal */}
        {showPlanModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800">{editingPlan.id ? 'Edit Plan' : 'New Plan'}</h3>
                        <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                    </div>
                    <div className="space-y-4">
                        <input type="text" placeholder="Plan Name" className="w-full border rounded p-2" value={editingPlan.name || ''} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" placeholder="Price" className="w-full border rounded p-2" value={editingPlan.price || ''} onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})} />
                            <select className="w-full border rounded p-2" value={editingPlan.interval} onChange={e => setEditingPlan({...editingPlan, interval: e.target.value as any})}>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Features (Comma separated)</label>
                            <textarea className="w-full border rounded p-2" rows={3} value={editingPlan.features?.join(', ')} onChange={e => setEditingPlan({...editingPlan, features: e.target.value.split(',').map(s => s.trim())})} />
                        </div>
                        <button onClick={handleSavePlan} className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700">Save Plan</button>
                    </div>
                </div>
            </div>
        )}

        {/* Receipt Modal */}
        {viewReceipt && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={() => setViewReceipt(null)}>
                <img src={viewReceipt} alt="Receipt" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
            </div>
        )}
    </div>
  );
};

export default SuperAdminDashboard;