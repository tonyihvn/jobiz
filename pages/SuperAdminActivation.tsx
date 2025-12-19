import React, { useState, useEffect } from 'react';
import { Power, Zap, Download, Trash2 } from 'lucide-react';
import { Business } from '../types';
import { getToken } from '../services/auth';

interface ActivationData {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended';
  registeredAt: string;
}

const SuperAdminActivation = () => {
  const [businesses, setBusinesses] = useState<ActivationData[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<ActivationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('active');

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
        filterBusinesses(data.businesses || [], 'active');
      }
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBusinesses = (items: ActivationData[], status: string) => {
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

  const toggleBusinessStatus = async (businessId: string, newStatus: 'active' | 'suspended') => {
    try {
      const response = await fetch(`/api/super-admin/toggle-business/${businessId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        fetchBusinesses();
      }
    } catch (error) {
      console.error('Failed to toggle business status:', error);
    }
  };

  const deleteBusiness = async (businessId: string) => {
    if (!window.confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`/api/super-admin/delete-business/${businessId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });
      if (response.ok) {
        fetchBusinesses();
      } else {
        alert('Failed to delete business');
      }
    } catch (error) {
      console.error('Failed to delete business:', error);
      alert('Error deleting business');
    }
  };

return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Power className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-800">Business Activation</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Download className="w-5 h-5" />
          Export
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 border-b border-slate-200">
        {['active', 'suspended', 'all'].map(status => (
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
                      business.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {business.status.charAt(0).toUpperCase() + business.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(business.registeredAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleBusinessStatus(business.id, business.status === 'active' ? 'suspended' : 'active')}
                        className={`inline-flex items-center gap-2 px-3 py-1 rounded font-medium transition-colors ${
                          business.status === 'active'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        <Zap className="w-4 h-4" />
                        {business.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteBusiness(business.id)}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
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

export default SuperAdminActivation;
