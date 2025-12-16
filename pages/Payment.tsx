import React, { useState, useEffect } from 'react';
import db from '../services/apiClient';
import { Business, SubscriptionPlan } from '../types';
import { CreditCard, Upload, CheckCircle, Clock, AlertTriangle, LogOut } from 'lucide-react';
import { useCurrency } from '../services/CurrencyContext';
import { useNavigate } from 'react-router-dom';

const Payment = () => {
    const { symbol } = useCurrency();
  const [business, setBusiness] = useState<Business | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
        const init = async () => {
            try {
                const user = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
                if (!user) { navigate('/login'); return; }

                // Try superAdmin helper if available, otherwise fallback
                let businesses: Business[] = [];
                if ((db as any).superAdmin && (db as any).superAdmin.getBusinesses) {
                    try { businesses = await (db as any).superAdmin.getBusinesses(); } catch (e) { businesses = []; }
                }
                const myBiz = businesses.find(b => b.id === user.businessId) || { id: user.businessId, name: 'My Business', email: user.email, phone: '', status: 'active', paymentStatus: 'unpaid', planId: '', paymentReceiptUrl: '', registeredAt: new Date().toISOString(), dueDate: '' } as Business;
                setBusiness(myBiz);

                let plans: SubscriptionPlan[] = [];
                if ((db as any).superAdmin && (db as any).superAdmin.getPlans) {
                    try { plans = await (db as any).superAdmin.getPlans(); } catch (e) { plans = []; }
                }
                const myPlan = plans.find(p => p.id === myBiz.planId) || null;
                setPlan(myPlan);
            } catch (err) {
                console.warn('Failed to initialize payment page', err);
                navigate('/login');
            }
        };
        init();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setReceipt(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSubmitPayment = () => {
            (async () => {
                if (!receipt) return;
                try {
                    if ((db as any).superAdmin && (db as any).superAdmin.submitPaymentReceipt) {
                        await (db as any).superAdmin.submitPaymentReceipt(receipt);
                        // Refresh local state if possible
                        if ((db as any).superAdmin && (db as any).superAdmin.getBusinesses) {
                            const businesses = await (db as any).superAdmin.getBusinesses();
                            const myBiz = businesses.find((b: Business) => b.id === business?.id);
                            if (myBiz) setBusiness(myBiz);
                        }
                    } else {
                        console.warn('submitPaymentReceipt not implemented on client API');
                    }
                } catch (e) {
                    console.warn('Failed to submit payment receipt', e);
                }
            })();
  };

  const handleLogout = () => {
      db.auth.logout();
      navigate('/login');
  };

  if (!business || !plan) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">
            
            {/* Left Side: Order Summary */}
            <div className="bg-slate-900 text-white p-8 md:w-1/3 flex flex-col justify-between">
                <div>
                    <h2 className="text-2xl font-bold mb-6">Order Summary</h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-slate-400 text-sm">Company</p>
                            <p className="font-semibold">{business.name}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Selected Plan</p>
                            <p className="font-semibold text-xl">{plan.name}</p>
                        </div>
                        <div className="border-t border-slate-700 pt-4 mt-4">
                            <p className="text-slate-400 text-sm">Amount Due</p>
                            <p className="font-bold text-3xl text-emerald-400">{symbol}{plan.price} <span className="text-sm font-normal text-white">/{plan.interval}</span></p>
                        </div>
                    </div>
                </div>
                
                <button onClick={handleLogout} className="mt-8 flex items-center gap-2 text-slate-400 hover:text-white text-sm">
                    <LogOut size={16}/> Logout
                </button>
            </div>

            {/* Right Side: Payment Action */}
            <div className="p-8 md:w-2/3">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Activate Account</h1>
                    <p className="text-slate-500">Complete payment to access the platform.</p>
                </div>

                {/* Status: Unpaid */}
                {business.paymentStatus === 'unpaid' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                                <CreditCard size={18}/> Bank Transfer Details
                            </h3>
                            <div className="text-sm text-blue-700 space-y-1">
                                <p><strong>Bank Name:</strong> OmniBank Corp</p>
                                <p><strong>Account Name:</strong> OmniSales Systems Ltd</p>
                                <p><strong>Account Number:</strong> 123-456-7890</p>
                                <p><strong>Reference:</strong> {business.id}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Upload Payment Receipt</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer relative">
                                {receipt ? (
                                    <div className="text-center">
                                        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2"/>
                                        <p className="text-emerald-600 font-bold">Receipt Selected</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-10 h-10 mb-2 text-slate-400"/>
                                        <p>Click to upload image/pdf</p>
                                    </>
                                )}
                                <input type="file" accept="image/*,.pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                            </div>
                        </div>

                        <button 
                            onClick={handleSubmitPayment}
                            disabled={!receipt}
                            className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Submit Payment for Verification
                        </button>
                    </div>
                )}

                {/* Status: Pending Verification */}
                {business.paymentStatus === 'pending_verification' && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <Clock size={40}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Payment Under Review</h3>
                        <p className="text-slate-500 max-w-sm mt-2">
                            Our team is verifying your receipt. Your account will be activated shortly. Please check back later.
                        </p>
                    </div>
                )}

                {/* Status: Active (Should generally redirect, but as fallback) */}
                {business.paymentStatus === 'paid' && business.status === 'active' && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                            <CheckCircle size={40}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Account Active</h3>
                        <button onClick={() => navigate('/')} className="mt-4 bg-slate-900 text-white px-6 py-2 rounded-lg font-bold">
                            Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default Payment;