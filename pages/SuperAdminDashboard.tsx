import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { useBusinessContext } from '../services/BusinessContext';
import { Business, SubscriptionPlan } from '../types';
import { Shield, CheckCircle, XCircle, Settings, LogOut, CreditCard, AlertTriangle, Eye, Plus, X, Save, BarChart3, MessageCircle } from 'lucide-react';
import { useCurrency } from '../services/CurrencyContext';

type TabType = 'notifications' | 'businesses' | 'plans' | 'approvals' | 'payments' | 'activation' | 'feedbacks' | 'data' | 'settings';

const SuperAdminDashboard = ({ onLogout }: { onLogout: () => void }) => {
    const { symbol } = useCurrency();
    const { selectedBusiness, selectedBusinessId } = useBusinessContext();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('notifications');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [businessData, setBusinessData] = useState<any>({});
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [logoutSettings, setLogoutSettings] = useState<{ [key: string]: string }>({});
  const [savingLogoutUrl, setSavingLogoutUrl] = useState<string | null>(null);
  
  // Plan Modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<SubscriptionPlan>>({ features: [] });

  // Receipt Modal
  const [viewReceipt, setViewReceipt] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch data once on component mount
    const fetchData = async () => {
      try {
        const bizs = await db.superAdmin.getBusinesses();
        setBusinesses(bizs || []);
        
        const plans = await db.superAdmin.getPlans();
        setPlans(plans || []);

        const fbks = await db.feedbacks.getAll();
        setFeedbacks(fbks || []);
      } catch (e) {
        console.error('Failed to load initial data:', e);
      }
    };
    fetchData();
  }, []);

  const loadFeedbacks = async () => {
    try {
      const fbks = await db.feedbacks.getAll();
      setFeedbacks(fbks || []);
    } catch (e) {
      console.error('Failed to load feedbacks:', e);
    }
  };

  const refreshData = async () => {
    try {
      const bizs = await db.superAdmin.getBusinesses();
      setBusinesses(bizs || []);
      
      const plans = await db.superAdmin.getPlans();
      setPlans(plans || []);
    } catch (e) {
      console.error('Failed to refresh data:', e);
    }
  };

  // Load all logout redirect URLs
  const loadLogoutSettings = async () => {
    try {
      const token = localStorage.getItem('omnisales_token');
      const settings: { [key: string]: string } = {};
      const bizs = await db.superAdmin.getBusinesses();
      
      console.log('Loading logout settings for', bizs.length, 'businesses');
      
      for (const biz of bizs) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/super-admin/business-logout-url/${encodeURIComponent(biz.id)}`, {
            headers: { 'Authorization': `Bearer ${token || ''}` }
          });
          if (response.ok) {
            const data = await response.json();
            settings[biz.id] = data.logout_redirect_url || '';
          } else {
            console.warn(`Failed to load logout URL for business ${biz.id}:`, response.status, response.statusText);
          }
        } catch (e) {
          console.error(`Failed to load logout URL for business ${biz.id}:`, e);
        }
      }
      setLogoutSettings(settings);
    } catch (e) {
      console.error('Failed to load logout settings:', e);
      alert('Failed to load logout settings. Check console for details.');
    }
  };

  // Save logout redirect URL for a specific business
  const saveLogoutUrl = async (businessId: string, logoutUrl: string) => {
    setSavingLogoutUrl(businessId);
    try {
      const token = localStorage.getItem('omnisales_token');
      console.log('Saving logout URL for business:', businessId);
      console.log('Token present:', !!token);
      console.log('API URL:', import.meta.env.VITE_API_URL || 'not set');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/super-admin/business-logout-url/${encodeURIComponent(businessId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ logout_redirect_url: logoutUrl || null })
      });
      
      const data = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', data);
      
      if (response.ok) {
        setLogoutSettings({ ...logoutSettings, [businessId]: logoutUrl });
        alert('Logout URL saved successfully!');
      } else {
        const errorMsg = data.error || response.statusText || 'Unknown error';
        console.error('Save error:', errorMsg);
        alert(`Failed to save logout URL: ${errorMsg}`);
      }
    } catch (e: any) {
      console.error('Failed to save logout URL:', e);
      alert(`Error saving logout URL: ${e.message}`);
    } finally {
      setSavingLogoutUrl(null);
    }
  };

  // Load logout settings when switching to settings tab
  useEffect(() => {
    if (activeTab === 'settings') {
      loadLogoutSettings();
    }
  }, [activeTab]);

  // Load business data when viewing data tab or when selected business changes
  useEffect(() => {
    const loadBusinessData = async () => {
      if (activeTab === 'data' || activeTab === 'payments' || activeTab === 'approvals') {
        try {
          const data = {
            products: await db.products.getAll(selectedBusinessId).catch(() => []),
            sales: await db.sales.getAll(selectedBusinessId).catch(() => []),
            customers: await db.customers.getAll(selectedBusinessId).catch(() => []),
            employees: await db.employees.getAll(selectedBusinessId).catch(() => []),
            transactions: await db.transactions.getAll().catch(() => []),
          };
          
          // Backend already filters by selectedBusinessId when passed
          
          setBusinessData(data);
        } catch (e) {
          console.error('Failed to load business data:', e);
        }
      }
    };
    loadBusinessData();
  }, [activeTab, selectedBusinessId]);

  const toggleStatus = (b: Business) => {
      if (b.status === 'active') {
          // Suspend business
          const newStatus = 'suspended';
          db.superAdmin.updateBusinessStatus(b.id, newStatus);
          refreshData();
      } else {
          // Force activate business with account_approved
          if(window.confirm(`Activate account for ${b.name}? This will set account_approved = 1 for the business and all employees.`)) {
              db.superAdmin.activateBusiness(b.id);
              refreshData();
          }
      }
  };

  const handleVerifyPayment = (b: Business) => {
      if(window.confirm(`Confirm payment receipt for ${b.name} and activate account?`)) {
          db.superAdmin.activateBusiness(b.id);
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
    { header: 'Email', accessor: 'email', key: 'email', filterable: true },
    { header: 'Registered', accessor: (b) => new Date(b.registeredAt).toLocaleDateString(), key: 'registeredAt', sortable: true, filterable: true },
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
            <div className="flex gap-2 mb-6 flex-wrap">
                 <button onClick={() => setActiveTab('notifications')} className={`px-6 py-3 rounded-lg font-bold transition-all text-sm ${activeTab === 'notifications' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
                     Alerts ({pendingActivations.length + duePayments.length})
                 </button>
                 <button onClick={() => setActiveTab('businesses')} className={`px-6 py-3 rounded-lg font-bold transition-all text-sm ${activeTab === 'businesses' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
                     Tenants
                 </button>
                 <button onClick={() => setActiveTab('plans')} className={`px-6 py-3 rounded-lg font-bold transition-all text-sm ${activeTab === 'plans' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
                     Plans
                 </button>
                 <button onClick={() => setActiveTab('approvals')} className={`px-6 py-3 rounded-lg font-bold transition-all text-sm ${activeTab === 'approvals' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
                     Approvals
                 </button>
                 <button onClick={() => setActiveTab('payments')} className={`px-6 py-3 rounded-lg font-bold transition-all text-sm ${activeTab === 'payments' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
                     Payments
                 </button>
                 <button onClick={() => setActiveTab('activation')} className={`px-6 py-3 rounded-lg font-bold transition-all text-sm ${activeTab === 'activation' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
                     Activation
                 </button>
                 <button onClick={() => setActiveTab('feedbacks')} className={`px-6 py-3 rounded-lg font-bold transition-all text-sm ${activeTab === 'feedbacks' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
                     Feedbacks
                 </button>
                 <button onClick={() => setActiveTab('data')} className={`px-6 py-3 rounded-lg font-bold transition-all text-sm ${activeTab === 'data' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
                     Business Data
                 </button>
                 <button onClick={() => setActiveTab('settings')} className={`px-6 py-3 rounded-lg font-bold transition-all text-sm ${activeTab === 'settings' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-white/50'}`}>
                     Settings
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

            {/* Approvals Tab */}
            {activeTab === 'approvals' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <CheckCircle className="text-emerald-500" /> Business Approvals
                    </h2>
                    {selectedBusiness ? (
                        <div>
                            <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <p className="font-medium text-slate-800">Currently managing: <span className="font-bold text-indigo-600">{selectedBusiness.name}</span></p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border rounded-lg">
                                    <h3 className="font-bold mb-2">Status</h3>
                                    <p className="text-lg"><span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                        selectedBusiness.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                    }`}>{selectedBusiness.status}</span></p>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <h3 className="font-bold mb-2">Payment Status</h3>
                                    <p className="text-lg"><span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                        selectedBusiness.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    }`}>{selectedBusiness.paymentStatus}</span></p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-8">Select a business from the switcher above</p>
                    )}
                </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <CreditCard className="text-blue-500" /> Payment Management
                    </h2>
                    {selectedBusiness ? (
                        <div>
                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="font-medium text-slate-800">Business: <span className="font-bold text-blue-600">{selectedBusiness.name}</span></p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="p-4 border rounded-lg">
                                    <p className="text-sm text-slate-600">Plan</p>
                                    <p className="text-lg font-bold text-slate-800">{selectedBusiness.planId}</p>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <p className="text-sm text-slate-600">Subscription Expiry</p>
                                    <p className="text-lg font-bold text-slate-800">{new Date(selectedBusiness.subscriptionExpiry).toLocaleDateString()}</p>
                                </div>
                                <div className="p-4 border rounded-lg">
                                    <p className="text-sm text-slate-600">Payment Status</p>
                                    <p className={`text-lg font-bold ${
                                        selectedBusiness.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>{selectedBusiness.paymentStatus}</p>
                                </div>
                            </div>
                            {selectedBusiness.paymentReceiptUrl && (
                                <button onClick={() => setViewReceipt(selectedBusiness.paymentReceiptUrl!)} className="flex items-center gap-2 text-blue-600 hover:underline">
                                    <Eye size={16} /> View Receipt
                                </button>
                            )}
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-8">Select a business from the switcher above</p>
                    )}
                </div>
            )}

            {/* Activation Tab */}
            {activeTab === 'activation' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" /> Business Activation
                    </h2>
                    {selectedBusiness ? (
                        <div>
                            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="font-medium text-slate-800">Business: <span className="font-bold text-amber-600">{selectedBusiness.name}</span></p>
                            </div>
                            <div className="space-y-4">
                                <button 
                                    onClick={() => toggleStatus(selectedBusiness)}
                                    className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg font-bold text-white transition-colors ${
                                        selectedBusiness.status === 'active' 
                                        ? 'bg-rose-600 hover:bg-rose-700' 
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                    }`}
                                >
                                    {selectedBusiness.status === 'active' ? 'Suspend Business' : 'Activate Business'}
                                </button>
                                {selectedBusiness.paymentStatus === 'pending_verification' && (
                                    <button 
                                        onClick={() => handleVerifyPayment(selectedBusiness)}
                                        className="w-full flex items-center gap-2 px-4 py-3 rounded-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                                    >
                                        <CheckCircle size={16} /> Verify & Activate Payment
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center py-8">Select a business from the switcher above</p>
                    )}
                </div>
            )}

            {/* Feedbacks Tab */}
            {activeTab === 'feedbacks' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <MessageCircle className="text-purple-500" /> Landing Page Feedbacks
                    </h2>
                    {feedbacks.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">No feedbacks received yet</p>
                    ) : (
                        <div className="space-y-4">
                            {feedbacks.map((feedback, i) => (
                                <div key={i} className="p-4 border rounded-lg hover:bg-slate-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-slate-800">{feedback.name}</p>
                                            <p className="text-sm text-slate-500">{feedback.email}</p>
                                        </div>
                                        <span className="text-xs text-slate-400">{new Date(feedback.date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-slate-700">{feedback.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Business Data Tab */}
            {activeTab === 'data' && (
                <div className="space-y-6">
                    {selectedBusiness ? (
                        <>
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-4">
                                <p className="text-sm text-slate-600">Currently viewing data for: <span className="font-bold text-indigo-600">{selectedBusiness.name}</span></p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold mb-4">Products ({businessData.products?.length || 0})</h3>
                                {businessData.products && businessData.products.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="border-b">
                                                <tr>
                                                    <th className="text-left py-2 px-3 font-bold">Product</th>
                                                    <th className="text-left py-2 px-3 font-bold">Category</th>
                                                    <th className="text-left py-2 px-3 font-bold">Price</th>
                                                    <th className="text-left py-2 px-3 font-bold">Stock</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {businessData.products.slice(0, 10).map((p: any) => (
                                                    <tr key={p.id} className="border-b hover:bg-slate-50">
                                                        <td className="py-2 px-3">{p.name}</td>
                                                        <td className="py-2 px-3 text-slate-600">{p.categoryName}</td>
                                                        <td className="py-2 px-3 font-medium">{symbol}{p.price}</td>
                                                        <td className="py-2 px-3">{p.stock}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-slate-500">No products in this business</p>
                                )}
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold mb-4">Recent Sales ({businessData.sales?.length || 0})</h3>
                                {businessData.sales && businessData.sales.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="border-b">
                                                <tr>
                                                    <th className="text-left py-2 px-3 font-bold">Date</th>
                                                    <th className="text-left py-2 px-3 font-bold">Items</th>
                                                    <th className="text-left py-2 px-3 font-bold">Total</th>
                                                    <th className="text-left py-2 px-3 font-bold">Payment</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {businessData.sales.slice(0, 10).map((s: any) => (
                                                    <tr key={s.id} className="border-b hover:bg-slate-50">
                                                        <td className="py-2 px-3">{new Date(s.date).toLocaleDateString()}</td>
                                                        <td className="py-2 px-3">{s.items?.length || 0} items</td>
                                                        <td className="py-2 px-3 font-medium">{symbol}{s.total}</td>
                                                        <td className="py-2 px-3 text-slate-600">{s.paymentMethod}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-slate-500">No sales in this business</p>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
                            <p className="text-slate-500">Select a business from the switcher above to view its data</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-100 rounded">
                                <Settings className="text-indigo-600" size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Logout Redirect URLs</h3>
                                <p className="text-sm text-slate-500">Configure where users are redirected after logout for each business</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            {businesses.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">No businesses found</p>
                            ) : (
                                businesses.map((business) => (
                                    <div key={business.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex flex-col md:flex-row md:items-end gap-4">
                                            <div className="flex-1">
                                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                                    {business.name}
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g., https://example.com/login or /login/businessid"
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 text-sm"
                                                    value={logoutSettings[business.id] || ''}
                                                    onChange={(e) => setLogoutSettings({
                                                        ...logoutSettings,
                                                        [business.id]: e.target.value
                                                    })}
                                                />
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Examples: <code className="bg-slate-100 px-1 rounded">/login</code>, <code className="bg-slate-100 px-1 rounded">#/login/123</code>, <code className="bg-slate-100 px-1 rounded">https://example.com</code>. Leave empty for default (landing page).
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => saveLogoutUrl(business.id, logoutSettings[business.id] || '')}
                                                disabled={savingLogoutUrl === business.id}
                                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:bg-slate-400 transition-colors flex items-center gap-2 whitespace-nowrap"
                                            >
                                                <Save size={16} />
                                                {savingLogoutUrl === business.id ? 'Saving...' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
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