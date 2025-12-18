import React, { useState, useEffect } from 'react';
import { CreditCard, Filter, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import db from '../services/apiClient';
import { Business } from '../types';
import { getToken } from '../services/auth';

interface BusinessPayment {
  id: string;
  business_id: string;
  businessName: string;
  businessEmail: string;
  payment_type: 'subscription' | 'one-time';
  plan_id: string;
  amount: number;
  card_last_four: string;
  card_brand: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  billing_cycle_start: string;
  billing_cycle_end: string;
  created_at: string;
}

const SuperAdminPayments = () => {
  const [payments, setPayments] = useState<BusinessPayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<BusinessPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/super-admin/pending-payments', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
        filterPayments(data.payments || [], 'pending');
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = (items: BusinessPayment[], status: string) => {
    if (status === 'all') {
      setFilteredPayments(items);
    } else {
      setFilteredPayments(items.filter(p => p.status === status));
    }
  };

  const handleFilterChange = (status: string) => {
    setFilter(status);
    filterPayments(payments, status);
  };

  const handleApprovePayment = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/super-admin/approve-payment/${paymentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({})
      });
      if (response.ok) {
        fetchPayments();
      } else {
        alert('Failed to approve payment');
      }
    } catch (error) {
      console.error('Failed to approve payment:', error);
      alert('Error approving payment');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/super-admin/reject-payment/${paymentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ reason: rejectReason })
      });
      if (response.ok) {
        setRejectingId(null);
        setRejectReason('');
        fetchPayments();
      } else {
        alert('Failed to reject payment');
      }
    } catch (error) {
      console.error('Failed to reject payment:', error);
      alert('Error rejecting payment');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-800">Payment Management</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Download className="w-5 h-5" />
          Export
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 border-b border-slate-200">
        {['pending', 'approved', 'rejected', 'all'].map(status => (
          <button
            key={status}
            onClick={() => handleFilterChange(status)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === status
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="ml-2 text-sm">({payments.filter(p => status === 'all' || p.status === status).length})</span>
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No payments found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Business</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Card</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPayments.map(payment => (
                <React.Fragment key={payment.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">{payment.businessName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{payment.businessEmail}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">${payment.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{payment.payment_type}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {payment.card_brand.toUpperCase()} ••{payment.card_last_four}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                        payment.status === 'approved' ? 'bg-green-100 text-green-700' :
                        payment.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payment.status === 'approved' && <CheckCircle className="w-4 h-4" />}
                        {payment.status === 'rejected' && <XCircle className="w-4 h-4" />}
                        {payment.status === 'pending' && <AlertCircle className="w-4 h-4" />}
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      {payment.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprovePayment(payment.id)}
                            className="text-green-600 hover:text-green-700 font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectingId(payment.id)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {rejectingId === payment.id && (
                    <tr className="bg-red-50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-slate-700">Rejection Reason (optional)</label>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Explain why this payment is being rejected..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRejectPayment(payment.id)}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              Confirm Rejection
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason('');
                              }}
                              className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default SuperAdminPayments;