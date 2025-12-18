import React, { useState, useEffect } from 'react';
import { Database, Download, RefreshCw } from 'lucide-react';
import { getToken } from '../services/auth';

interface BusinessData {
  business: any;
  employees: any[];
  settings: any;
  inventory?: any[];
  customers?: any[];
  services?: any[];
  stats: {
    totalEmployees: number;
    totalTransactions: number;
    totalRevenue: number;
  };
}

const SuperAdminData = () => {
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllBusinessesData();
  }, []);

  const fetchAllBusinessesData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/super-admin/all-data', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBusinesses(data.businessesData || []);
        if (data.businessesData && data.businessesData.length > 0) {
          setSelectedBusiness(data.businessesData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportBusinessData = async () => {
    if (!selectedBusiness) return;
    
    setRefreshing(true);
    try {
      const response = await fetch(
        `/api/super-admin/export-business/${selectedBusiness.business.id}`,
        {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedBusiness.business.name}-data.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setRefreshing(false);
    }
  };

return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-800">Business Data</h1>
        </div>
        <button
          onClick={fetchAllBusinessesData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Business List */}
        <div className="col-span-1 bg-white rounded-lg shadow overflow-hidden max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <p className="text-sm font-semibold text-slate-700">Businesses ({businesses.length})</p>
          </div>
          {loading ? (
            <div className="p-4 text-center text-slate-500 text-sm">Loading...</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {businesses.map(biz => (
                <button
                  key={biz.business.id}
                  onClick={() => setSelectedBusiness(biz)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                    selectedBusiness?.business.id === biz.business.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <p className="font-medium text-slate-900 text-sm">{biz.business.name}</p>
                  <p className="text-xs text-slate-600">{biz.business.email}</p>
                  <p className="text-xs text-slate-500 mt-1">Status: {biz.business.status}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Business Details */}
        <div className="col-span-3 space-y-6">
          {selectedBusiness ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-slate-600 mb-1">Employees</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedBusiness.stats.totalEmployees}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-slate-600 mb-1">Transactions</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedBusiness.stats.totalTransactions}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                  <p className="text-sm text-slate-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-slate-900">${selectedBusiness.stats.totalRevenue.toFixed(2)}</p>
                </div>
              </div>

              {/* Business Info */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-slate-900">Company Information</h3>
                  <button
                    onClick={exportBusinessData}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    <Download className="w-5 h-5" />
                    Export Data
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600">Name</p>
                    <p className="font-medium text-slate-900">{selectedBusiness.business.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Email</p>
                    <p className="font-medium text-slate-900">{selectedBusiness.business.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Status</p>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                      selectedBusiness.business.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedBusiness.business.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Payment Status</p>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                      selectedBusiness.business.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedBusiness.business.paymentStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Employees */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Employees ({selectedBusiness.employees.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-slate-700 font-medium">Name</th>
                        <th className="px-4 py-2 text-left text-slate-700 font-medium">Email</th>
                        <th className="px-4 py-2 text-left text-slate-700 font-medium">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedBusiness.employees.slice(0, 5).map((emp: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-2">{emp.name}</td>
                          <td className="px-4 py-2">{emp.email}</td>
                          <td className="px-4 py-2">{emp.role_id || 'Standard'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedBusiness.employees.length > 5 && (
                    <p className="text-sm text-slate-600 mt-2">+{selectedBusiness.employees.length - 5} more employees</p>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Business Settings</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Company Name</p>
                    <p className="font-medium text-slate-900">{selectedBusiness.settings.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Currency</p>
                    <p className="font-medium text-slate-900">{selectedBusiness.settings.currency}</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Select a business to view data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminData;
