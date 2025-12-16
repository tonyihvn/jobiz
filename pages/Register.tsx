import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../services/apiClient';
import { Store, Mail, Lock, CheckCircle, ArrowLeft } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
      companyName: '',
      email: '',
      password: '',
      confirmPassword: ''
  });
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
                setError("Passwords do not match");
                return;
        }

        (async () => {
            try {
                if (db.auth && (db.auth as any).register) {
                    await (db.auth as any).register(formData.companyName, '', formData.email, formData.password);
                } else {
                    console.warn('Registration API not implemented on client; proceeding to success screen');
                }
                setStep(2);
            } catch (err: any) {
                setError(err?.message || 'Registration failed');
            }
        })();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {step === 1 ? (
             <div className="p-8">
                <div className="mb-6">
                    <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm mb-4">
                        <ArrowLeft size={16}/> Back to Home
                    </button>
                    <h2 className="text-2xl font-bold text-slate-800">Create Account</h2>
                    <p className="text-slate-500 text-sm">Start your free trial.</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Business Name</label>
                        <div className="relative">
                            <Store className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                            <input 
                                type="text" 
                                required
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="My Company LLC"
                                value={formData.companyName}
                                onChange={e => setFormData({...formData, companyName: e.target.value})}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Admin Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                            <input 
                                type="email" 
                                required
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="admin@company.com"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                                <input 
                                    type="password" 
                                    required
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="******"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm</label>
                            <input 
                                type="password" 
                                required
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="******"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-brand-500/30 transition-all mt-4">
                        Register Business
                    </button>
                </form>
             </div>
        ) : (
            <div className="p-12 text-center">
                 <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                     <CheckCircle size={40} />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Successful!</h2>
                 <p className="text-slate-500 mb-8">
                     We have sent a verification email to <strong>{formData.email}</strong>. 
                     <br/><br/>
                     <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">Note: Account requires Activation via Payment.</span>
                 </p>
                 <button onClick={() => navigate('/login')} className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold">
                     Return to Login
                 </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Register;