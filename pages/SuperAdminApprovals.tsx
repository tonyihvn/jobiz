import React, { useState, useEffect } from 'react';
import { CheckCircle, Filter, Download, Trash2 } from 'lucide-react';
import db from '../services/apiClient';
import { Business } from '../types';
import { getToken } from '../services/auth';

interface BusinessApproval {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
  status: 'pending' | 'approved' | 'rejected';
  paymentStatus: 'unpaid' | 'paid';
}

const SuperAdminApprovals = () => {
  const [businesses, setBusinesses] = useState<BusinessApproval[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<BusinessApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/super-admin/businesses', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data.businesses || []);
        filterBusinesses(data.businesses || [], 'pending');
      }
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBusinesses = (items: BusinessApproval[], status: string) => {
    if (status === 'all') {
      setFilteredBusinesses(items);
    } else {
      setFilteredBusinesses(items.filter(b => b.status === status));
    }
  };

  const handleFilterChange = (status: string) => {
    setFilter(status);
    filterBusinesses(businesses, status);
  };

  const approveBusiness = async (businessId: string) => {
    try {
      const response = await fetch(`/api/super-admin/approve-business/${businessId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      if (response.ok) {
        // Update the business status locally first for immediate feedback
        const updatedBusinesses = businesses.map(b => 
          b.id === businessId ? { ...b, status: 'approved' as const } : b
        );
        setBusinesses(updatedBusinesses);
        filterBusinesses(updatedBusinesses, filter);
        // Then fetch fresh data
        setTimeout(fetchBusinesses, 500);
      }
    } catch (error) {
      console.error('Failed to approve business:', error);
    }
  };

  const rejectBusiness = async (businessId: string) => {
    try {
      const response = await fetch(`/api/super-admin/reject-business/${businessId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      if (response.ok) {
        // Update the business status locally first for immediate feedback
        const updatedBusinesses = businesses.map(b => 
          b.id === businessId ? { ...b, status: 'rejected' as const } : b
        );
        setBusinesses(updatedBusinesses);
        filterBusinesses(updatedBusinesses, filter);
        // Then fetch fresh data
        setTimeout(fetchBusinesses, 500);
      }
    } catch (error) {
      console.error('Failed to reject business:', error);
    }
  };

  const deactivateBusiness = async (businessId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this business?')) return;
    try {
      const response = await fetch(`/api/super-admin/deactivate-business/${businessId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      if (response.ok) {
        fetchBusinesses();
      }
    } catch (error) {
      console.error('Failed to deactivate business:', error);
    }
  };

return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-800">Business Approvals</h1>
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
            <span className="ml-2 text-sm">({businesses.filter(b => status === 'all' || b.status === status).length})</span>
          </button>
        ))}
      </div>

      {/* Businesses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading businesses...</div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No businesses found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Company Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Payment</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Registered</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBusinesses.map(business => (
                <tr key={business.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{business.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{business.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      business.status === 'approved' ? 'bg-green-100 text-green-700' :
                      business.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {business.status.charAt(0).toUpperCase() + business.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                      business.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {business.paymentStatus.charAt(0).toUpperCase() + business.paymentStatus.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(business.registeredAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    {business.status === 'pending' && (
                      <>
                        <button
                          onClick={() => approveBusiness(business.id)}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectBusiness(business.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {business.status === 'approved' && (
                      <button
                        onClick={() => deactivateBusiness(business.id)}
                        className="text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Deactivate
                      </button>
                    )}
                    {business.status === 'rejected' && (
                      <span className="text-slate-400 text-sm">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SuperAdminApprovals;
