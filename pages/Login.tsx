import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../services/apiClient';
import { login as apiLogin } from '../services/auth';
import { Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
        (async () => {
            try {
                const data = await apiLogin(email, password);
                if (data && data.user) {
                    onLogin(data.user);
                    // Redirect user according to system settings (per-role), default to Dashboard
                    try {
                        if (db.settings && db.settings.get) {
                            const s = await db.settings.get();
                                const route = s?.loginRedirects?.[data.user.roleId] || '/';
                            navigate(route);
                        } else {
                                navigate('/');
                        }
                    } catch (e) {
                            navigate('/');
                    }
                } else {
                    setError('Invalid credentials');
                }
            } catch (err: any) {
                setError(err.message || 'Login failed');
            }
        })();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-slate-900 p-8 text-center relative">
            <button onClick={() => navigate('/landing')} className="absolute left-4 top-4 text-slate-400 hover:text-white">
                <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-white mb-2">Jobiz Manager</h1>
            <p className="text-slate-400 text-sm">Sign in to access your business dashboard</p>
        </div>
        
        <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                        <input 
                            type="email" 
                            required
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                            placeholder="you@company.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                        <input 
                            type="password" 
                            required
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <p className="mt-2 text-xs text-brand-600 cursor-pointer hover:underline" onClick={() => navigate('/forgot-password')}>
                        Forgot password?
                    </p>
                </div>

                <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-brand-500/30 transition-all">
                    Sign In
                </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
                <p className="mt-4 text-brand-600 cursor-pointer hover:underline" onClick={() => navigate('/register')}>
                    Register your business
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;