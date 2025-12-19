import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import db from '../services/apiClient';
import { Store, Mail, Lock, CheckCircle, ArrowLeft, Smartphone } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
      companyName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
  });
  const [step, setStep] = useState(1); // 1: registration form, 2: verification (email + OTP)
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [formattedPhone, setFormattedPhone] = useState('');
  const navigate = useNavigate();

  // Format phone number: remove leading 0 and add +234 prefix
  const formatPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return `+234${cleaned}`;
  };

  const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        // Enforce password policy: minimum 8 characters, at least one number and at least one letter
        const pwd = formData.password || '';
        const hasLetter = /[a-zA-Z]/.test(pwd);
        const hasNumber = /\d/.test(pwd);
        const hasMinLength = pwd.length >= 8;
        
        if (!hasMinLength || !hasLetter || !hasNumber) {
            setError("Password must be at least 8 characters and include both letters and numbers");
            return;
        }

        (async () => {
            try {
                if (db.auth && db.auth.register) {
                    const phone = formData.phone ? formatPhoneNumber(formData.phone) : '';
                    setFormattedPhone(phone);
                    const result = await db.auth.register(formData.companyName, formData.companyName + ' Admin', formData.email, formData.password, phone);
                    if (result && result.success) {
                        setStep(2);
                        // Both email and OTP are sent automatically by backend
                    } else {
                        setError(result?.message || 'Registration failed');
                    }
                } else {
                    setError('Registration service not available');
                }
            } catch (err: any) {
                setError(err?.message || 'Registration failed');
                console.error('Registration error:', err);
            }
        })();
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendMessage('');
    try {
        const response = await fetch('/api/resend-verification-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email })
        });
        const result = await response.json();
        if (result.success) {
            setResendMessage({ type: 'success', text: '✅ Verification email resent! Check your inbox.' });
        } else {
            setResendMessage({ type: 'error', text: result.message || 'Failed to resend email' });
        }
    } catch (err: any) {
        setResendMessage({ type: 'error', text: 'Error resending email. Please try again.' });
    } finally {
        setResendLoading(false);
    }
  };

  const handleSendOtp = async (phone?: string) => {
    const phoneNumber = phone || formatPhoneNumber(formData.phone);
    setOtpLoading(true);
    setOtpError('');
    try {
        const response = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phoneNumber })
        });
        const result = await response.json();
        if (result.success) {
            setOtpError('');
        } else {
            setOtpError(result.message || 'Failed to send OTP');
        }
    } catch (err: any) {
        setOtpError('Error sending OTP. Please try again.');
    } finally {
        setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
        setOtpError('Please enter a valid 6-digit OTP');
        return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
        const response = await fetch('/api/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: formattedPhone, otp })
        });
        const result = await response.json();
        if (result.success) {
            navigate('/login');
            setOtp('');
        } else {
            setOtpError(result.message || 'Invalid OTP');
        }
    } catch (err: any) {
        setOtpError('Error verifying OTP. Please try again.');
    } finally {
        setOtpLoading(false);
    }
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

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Admin Phone (Optional)</label>
                        <div className="relative">
                            <Smartphone className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                            <input 
                                type="tel" 
                                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="+234 or 080..."
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">For phone verification (include country code or starts with 0)</p>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                                <input 
                                    type="password" 
                                    required
                                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                    placeholder="At least 8 characters"
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                />
                            </div>
                            
                            {/* Password Strength Indicator */}
                            {formData.password && (
                                <div className="mt-3 space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <p className="text-xs font-bold text-slate-600 mb-2">Password Requirements:</p>
                                    <div className="space-y-1.5">
                                        {/* Minimum 8 characters */}
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold ${formData.password.length >= 8 ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                {formData.password.length >= 8 ? '✓' : '○'}
                                            </div>
                                            <span className={`text-xs ${formData.password.length >= 8 ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                                At least 8 characters ({formData.password.length}/8)
                                            </span>
                                        </div>
                                        
                                        {/* At least one letter */}
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold ${/[a-zA-Z]/.test(formData.password) ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                {/[a-zA-Z]/.test(formData.password) ? '✓' : '○'}
                                            </div>
                                            <span className={`text-xs ${/[a-zA-Z]/.test(formData.password) ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                                At least one letter (a-z, A-Z)
                                            </span>
                                        </div>
                                        
                                        {/* At least one number */}
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold ${/\d/.test(formData.password) ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                {/\d/.test(formData.password) ? '✓' : '○'}
                                            </div>
                                            <span className={`text-xs ${/\d/.test(formData.password) ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                                At least one number (0-9)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirm Password</label>
                            <input 
                                type="password" 
                                required
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                            />
                            {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                <p className="text-xs text-rose-600 mt-1 font-medium">Passwords do not match</p>
                            )}
                            {formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && (
                                <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Passwords match</p>
                            )}
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-brand-500/30 transition-all mt-4">
                        Register Business
                    </button>
                </form>
             </div>
        ) : step === 2 ? (
            // Verification screen - both email and phone OTP
            <div className="p-12 text-center">
                 <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                     <CheckCircle size={40} />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Successful! 🎉</h2>
                 <div className="text-slate-500 mb-8 space-y-3 text-sm">
                     <p>
                         Your account has been created and saved to our database.
                     </p>
                     <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
                         <p className="font-semibold text-blue-900 mb-3">✅ Choose Your Verification Method:</p>
                         
                         {/* Email Verification */}
                         <div className="text-left mb-4">
                             <p className="text-blue-800 text-xs font-bold mb-2">📧 EMAIL VERIFICATION:</p>
                             <p className="text-blue-700 text-xs mb-3">Verification email sent to <strong>{formData.email}</strong></p>
                             <div className="space-y-2">
                                 <p className="text-xs text-slate-600">Check your inbox and click the verification link in the email.</p>
                                 {resendMessage && (
                                     <div className={`p-2 rounded text-xs font-medium ${resendMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                         {resendMessage.text}
                                     </div>
                                 )}
                                 <button 
                                     onClick={handleResendEmail} 
                                     disabled={resendLoading}
                                     className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-3 py-2 rounded text-xs font-bold transition-all">
                                      {resendLoading ? 'Sending...' : '📧 Resend Email'}
                                 </button>
                             </div>
                         </div>

                         <div className="border-t border-blue-200 my-4"></div>

                         {/* Phone Verification */}
                         {formattedPhone && (
                             <div className="text-left">
                                 <p className="text-blue-800 text-xs font-bold mb-2">📱 PHONE VERIFICATION (FASTER):</p>
                                 <p className="text-blue-700 text-xs mb-3">OTP sent to <strong>{formattedPhone}</strong></p>
                                 <div className="space-y-2">
                                     {otpError && (
                                         <div className="p-2 bg-rose-50 text-rose-700 text-xs rounded border border-rose-200 font-medium">
                                             {otpError}
                                         </div>
                                     )}
                                     <div>
                                         <label className="block text-xs font-bold text-slate-600 mb-1">Enter 6-digit OTP:</label>
                                         <input 
                                             type="text" 
                                             maxLength={6}
                                             className="w-full px-3 py-2 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-brand-500 text-center text-xl tracking-widest font-mono"
                                             placeholder="000000"
                                             value={otp}
                                             onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                         />
                                     </div>
                                     <button 
                                         onClick={handleVerifyOtp} 
                                         disabled={otpLoading || otp.length !== 6}
                                         className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-3 py-2 rounded text-xs font-bold transition-all">
                                          {otpLoading ? 'Verifying...' : 'Verify OTP'}
                                     </button>
                                 </div>
                             </div>
                         )}
                     </div>

                     <p className="text-xs text-slate-400 mt-4">✨ Complete verification via either method to proceed to payment. Whichever completes first will verify your account!</p>
                 </div>
                 <div className="space-y-2">
                     <button onClick={() => navigate('/login')} className="w-full bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 text-sm">
                         Return to Login
                     </button>
                 </div>
            </div>
        ) : (
            // Fallback - shouldn't show
            <div className="p-12 text-center">
                <p>Unknown registration state</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Register;