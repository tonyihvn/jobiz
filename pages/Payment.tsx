import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Building2, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { getToken } from '../services/auth';
import { useCurrency } from '../services/CurrencyContext';

interface PaymentRecord {
  paymentType: 'bank_transfer' | 'online_payment';
  amount: number;
  cardBrand?: string;
  cardLastFour?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  transactionRef?: string;
  billingCycleStart?: string;
  billingCycleEnd?: string;
  receiptUrl?: string;
  notes?: string;
}

const Payment = () => {
  const navigate = useNavigate();
  const { symbol } = useCurrency();
  const [activeTab, setActiveTab] = useState<'method' | 'record'>('method');
  const [payment, setPayment] = useState<PaymentRecord>({
    paymentType: 'online_payment',
    amount: 0
  });
  const [uploading, setUploading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleMethodChange = (method: 'bank_transfer' | 'online_payment') => {
    setPayment(p => ({ ...p, paymentType: method }));
  };

  const handleBankTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment.amount || !payment.bankName || !payment.accountNumber || !payment.accountHolder) {
      setMessage('Please fill in all required fields');
      return;
    }

    try {
      setSubmitStatus('submitting');
      const response = await fetch('/api/add-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          paymentType: 'bank_transfer',
          amount: payment.amount,
          bankName: payment.bankName,
          accountNumber: payment.accountNumber,
          accountHolder: payment.accountHolder,
          billingCycleStart: payment.billingCycleStart,
          billingCycleEnd: payment.billingCycleEnd,
          notes: payment.notes
        })
      });

      if (response.ok) {
        setSubmitStatus('success');
        setMessage('Bank transfer details submitted successfully! Our team will verify and activate your account.');
        setTimeout(() => {
          setMessage('');
          setSubmitStatus('idle');
        }, 5000);
        setPayment({ paymentType: 'online_payment', amount: 0 });
      } else {
        const err = await response.json();
        setMessage(err.error || 'Failed to submit payment');
        setSubmitStatus('error');
      }
    } catch (e: any) {
      setMessage(e.message || 'Failed to submit payment');
      setSubmitStatus('error');
    }
  };

  const handleOnlinePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment.amount || !payment.cardBrand || !payment.cardLastFour) {
      setMessage('Please fill in all required fields');
      return;
    }

    try {
      setSubmitStatus('submitting');
      const response = await fetch('/api/add-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          paymentType: 'online_payment',
          amount: payment.amount,
          cardBrand: payment.cardBrand,
          cardLastFour: payment.cardLastFour,
          billingCycleStart: payment.billingCycleStart,
          billingCycleEnd: payment.billingCycleEnd,
          notes: payment.notes
        })
      });

      if (response.ok) {
        setSubmitStatus('success');
        setMessage('Online payment recorded successfully! Our team will process and activate your account.');
        setTimeout(() => {
          setMessage('');
          setSubmitStatus('idle');
        }, 5000);
        setPayment({ paymentType: 'online_payment', amount: 0 });
      } else {
        const err = await response.json();
        setMessage(err.error || 'Failed to submit payment');
        setSubmitStatus('error');
      }
    } catch (e: any) {
      setMessage(e.message || 'Failed to submit payment');
      setSubmitStatus('error');
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: fd
      });
      if (res.ok) {
        const data = await res.json();
        setPayment(p => ({ ...p, receiptUrl: data.url || data.fileUrl }));
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/login')}
            className="text-slate-600 hover:text-slate-900 text-sm mb-4"
          >
            ← Back to Login
          </button>
          <h1 className="text-4xl font-bold text-slate-900">Complete Your Payment</h1>
          <p className="text-slate-600 mt-2">
            Choose a payment method to activate your JOBIZ account
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('method')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'method'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              💳 Payment Method
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'record'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              📝 Transaction Record
            </button>
          </div>

          <div className="p-8">
            {message && (
              <div
                className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                  submitStatus === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {submitStatus === 'success' ? (
                  <>
                    <CheckCircle className="text-green-600 mt-0.5 shrink-0" size={20} />
                    <p className="text-green-800">{message}</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="text-red-600 mt-0.5 shrink-0" size={20} />
                    <p className="text-red-800">{message}</p>
                  </>
                )}
              </div>
            )}

            {/* Payment Method Tab */}
            {activeTab === 'method' && (
              <div className="space-y-6">
                {/* Online Payment Section */}
                <div className="border-2 border-slate-200 rounded-lg p-6">
                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input
                      type="radio"
                      checked={payment.paymentType === 'online_payment'}
                      onChange={() => handleMethodChange('online_payment')}
                      className="w-5 h-5"
                    />
                    <CreditCard className="text-blue-600" size={24} />
                    <span className="font-semibold text-lg text-slate-900">Online Payment (Card)</span>
                  </label>

                  {payment.paymentType === 'online_payment' && (
                    <form onSubmit={handleOnlinePaymentSubmit} className="space-y-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Payment Amount {symbol}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="0.00"
                          value={payment.amount || ''}
                          onChange={e => setPayment(p => ({ ...p, amount: parseFloat(e.target.value) }))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Card Brand (Visa, Mastercard, etc.)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., Visa"
                            value={payment.cardBrand || ''}
                            onChange={e => setPayment(p => ({ ...p, cardBrand: e.target.value }))}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Last 4 Digits
                          </label>
                          <input
                            type="text"
                            required
                            maxLength="4"
                            placeholder="1234"
                            value={payment.cardLastFour || ''}
                            onChange={e => setPayment(p => ({ ...p, cardLastFour: e.target.value }))}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Billing Cycle Start
                          </label>
                          <input
                            type="date"
                            value={payment.billingCycleStart || ''}
                            onChange={e => setPayment(p => ({ ...p, billingCycleStart: e.target.value }))}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Billing Cycle End
                          </label>
                          <input
                            type="date"
                            value={payment.billingCycleEnd || ''}
                            onChange={e => setPayment(p => ({ ...p, billingCycleEnd: e.target.value }))}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Additional Notes
                        </label>
                        <textarea
                          placeholder="Any additional information about this payment"
                          value={payment.notes || ''}
                          onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))}
                          rows={3}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitStatus === 'submitting'}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
                      >
                        {submitStatus === 'submitting' ? 'Submitting...' : 'Submit Online Payment'}
                      </button>
                    </form>
                  )}
                </div>

                {/* Bank Transfer Section */}
                <div className="border-2 border-slate-200 rounded-lg p-6">
                  <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input
                      type="radio"
                      checked={payment.paymentType === 'bank_transfer'}
                      onChange={() => handleMethodChange('bank_transfer')}
                      className="w-5 h-5"
                    />
                    <Building2 className="text-slate-600" size={24} />
                    <span className="font-semibold text-lg text-slate-900">Bank Transfer</span>
                  </label>

                  {payment.paymentType === 'bank_transfer' && (
                    <form onSubmit={handleBankTransferSubmit} className="space-y-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Payment Amount {symbol}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="0.00"
                          value={payment.amount || ''}
                          onChange={e => setPayment(p => ({ ...p, amount: parseFloat(e.target.value) }))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., First Bank Nigeria"
                          value={payment.bankName || ''}
                          onChange={e => setPayment(p => ({ ...p, bankName: e.target.value }))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Account Number
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="0123456789"
                          value={payment.accountNumber || ''}
                          onChange={e => setPayment(p => ({ ...p, accountNumber: e.target.value }))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Account Holder Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Your name"
                          value={payment.accountHolder || ''}
                          onChange={e => setPayment(p => ({ ...p, accountHolder: e.target.value }))}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Billing Cycle Start
                          </label>
                          <input
                            type="date"
                            value={payment.billingCycleStart || ''}
                            onChange={e => setPayment(p => ({ ...p, billingCycleStart: e.target.value }))}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Billing Cycle End
                          </label>
                          <input
                            type="date"
                            value={payment.billingCycleEnd || ''}
                            onChange={e => setPayment(p => ({ ...p, billingCycleEnd: e.target.value }))}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Additional Notes
                        </label>
                        <textarea
                          placeholder="Any additional information about this payment"
                          value={payment.notes || ''}
                          onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))}
                          rows={3}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitStatus === 'submitting'}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-400 transition-colors"
                      >
                        {submitStatus === 'submitting' ? 'Submitting...' : 'Submit Bank Transfer'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Transaction Record Tab */}
            {activeTab === 'record' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-900 text-sm">
                    📌 Use this section to record your transaction details. Upload receipts and provide information about your payment.
                  </p>
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8">
                  <div className="text-center">
                    <Upload className="mx-auto mb-4 text-slate-400" size={48} />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Payment Receipt</h3>
                    <p className="text-slate-600 mb-4">
                      Upload a screenshot or image of your payment receipt/confirmation
                    </p>
                    <label className="inline-block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      <span className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 cursor-pointer inline-block">
                        {uploading ? 'Uploading...' : 'Choose Receipt Image'}
                      </span>
                    </label>
                    {payment.receiptUrl && (
                      <div className="mt-4">
                        <p className="text-green-600 font-semibold">✓ Receipt uploaded</p>
                        <img src={payment.receiptUrl} alt="Receipt" className="mt-2 max-h-48 mx-auto rounded" />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., TXN123456789"
                    value={payment.transactionRef || ''}
                    onChange={e => setPayment(p => ({ ...p, transactionRef: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Payment Notes
                  </label>
                  <textarea
                    placeholder="Describe your transaction (amount, date, bank, etc.)"
                    value={payment.notes || ''}
                    onChange={e => setPayment(p => ({ ...p, notes: e.target.value }))}
                    rows={5}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-700">
                    <strong>What Happens Next:</strong> Our payment verification team will review your transaction record and receipt. Once verified, your account will be activated and you'll receive an activation email.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            ℹ️ Questions about payment? Email us at <a href="mailto:billing@jobiz.ng" className="font-semibold underline">billing@jobiz.ng</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Payment;