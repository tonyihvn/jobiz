// EXAMPLE: Updated Dashboard.tsx using Enhanced API
// This file shows how to update your pages to use the new loading system
// Copy the relevant parts into your actual Dashboard.tsx file

import React, { useEffect, useState } from 'react';
import { useEnhancedApi } from '../services/useEnhancedApi';
import { fmt } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';
import { useBusinessContext } from '../services/BusinessContext';
import { SaleRecord, Transaction, TransactionType } from '../types';
import { DollarSign, TrendingUp, TrendingDown, ShoppingBag } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <p className="text-xs text-slate-400 mt-4">{subtext}</p>
  </div>
);

const ExampleUpdatedDashboard = () => {
  const api = useEnhancedApi(); // ✅ Get enhanced API with loading support
  const { symbol } = useCurrency();
  const { selectedBusinessId } = useBusinessContext();
  
  // State management
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartKind, setChartKind] = useState<'bar' | 'line'>('bar');
  const [settings, setSettings] = useState<any>(null);
  const [statsRange, setStatsRange] = useState<'week'|'month'|'year'>('week');
  const [isSuper, setIsSuper] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount or when business changes
  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        setError(null);
        // ✅ Use enhanced API - automatically shows loading overlay
        // ✅ Parallel requests with deduplication
        const [
          salesData,
          transactionsData,
          servicesData,
          settingsData,
          userInfo
        ] = await Promise.all([
          api.sales.getAll(selectedBusinessId),
          api.transactions.getAll(selectedBusinessId),
          api.services.getAll(selectedBusinessId),
          api.settings.get(selectedBusinessId),
          api.auth.getCurrentUser(),
        ]);

        // Only update state if component is still mounted
        if (mounted) {
          setSales(Array.isArray(salesData) ? salesData : []);
          setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
          setServicesList(Array.isArray(servicesData) ? servicesData : []);
          
          if (settingsData) {
            setSettings(settingsData);
            if ((settingsData.statsRange as any)) {
              setStatsRange(settingsData.statsRange);
            }
          }
          
          setIsSuper(!!(userInfo && (userInfo.is_super_admin || userInfo.isSuperAdmin)));
        }
      } catch (err: any) {
        console.error('[DASHBOARD] Failed to load data:', err);
        if (mounted) {
          setError(err.message || 'Failed to load dashboard data');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    // Cleanup: prevent state updates after unmount
    return () => {
      mounted = false;
    };
  }, [selectedBusinessId, api]); // Include api in dependencies

  // ✅ Same calculations as before
  const getStartDate = (range: 'week'|'month'|'year') => {
    const now = new Date();
    if (range === 'week') {
      const d = new Date();
      d.setDate(now.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (range === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return new Date(now.getFullYear(), 0, 1);
  };

  const startDate = getStartDate(statsRange);
  const salesInRange = (sales || []).filter(s => new Date(s.date) >= startDate);
  const totalSales = salesInRange
    .filter(s => !(s.isProforma || s.is_proforma))
    .reduce((acc, sale) => acc + Number(sale.total || 0), 0);

  const serviceIds = new Set((servicesList || []).map(sv => sv.id));
  const totalServicesRevenue = salesInRange.reduce((acc, sale) => {
    const svcTotal = (sale.items || []).reduce((a, it: any) => {
      const id = it.id || it.product_id;
      const isSvc = !!it.isService || !!it.is_service || serviceIds.has(id);
      return a + (isSvc ? Number(it.price || 0) * Number(it.quantity || 1) : 0);
    }, 0);
    return acc + svcTotal;
  }, 0);

  const transactionsInRange = (transactions || []).filter(t => new Date(t.date) >= startDate);
  const incomeTx = transactionsInRange
    .filter(t => t.type === TransactionType.INFLOW)
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const expenses = transactionsInRange
    .filter(t => t.type === TransactionType.EXPENDITURE)
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const totalRevenue = Number(totalSales) + Number(incomeTx);
  const netProfit = Number(totalRevenue) - Number(expenses);

  // Loading state UI
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  // Error state UI
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <p className="font-semibold">Error Loading Dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Normal render
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-2">Welcome back! Here's your business overview.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={fmt(totalRevenue, symbol)}
          subtext={`Last ${statsRange}`}
          icon={DollarSign}
          color="bg-blue-600"
        />
        <StatCard
          title="Sales"
          value={fmt(totalSales, symbol)}
          subtext={`${salesInRange.length} transactions`}
          icon={ShoppingBag}
          color="bg-green-600"
        />
        <StatCard
          title="Services"
          value={fmt(totalServicesRevenue, symbol)}
          subtext={`${servicesList.length} services`}
          icon={TrendingUp}
          color="bg-purple-600"
        />
        <StatCard
          title="Net Profit"
          value={fmt(netProfit, symbol)}
          subtext={netProfit > 0 ? 'Positive trend' : 'Negative trend'}
          icon={TrendingDown}
          color={netProfit > 0 ? 'bg-emerald-600' : 'bg-red-600'}
        />
      </div>

      {/* Charts and other content... */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <p className="text-slate-500">Additional dashboard content will display here</p>
      </div>
    </div>
  );
};

export default ExampleUpdatedDashboard;

/**
 * KEY CHANGES FROM ORIGINAL:
 * 
 * 1. ✅ Import useEnhancedApi instead of just db
 *    import { useEnhancedApi } from '../services/useEnhancedApi';
 * 
 * 2. ✅ Add loading and error states
 *    const [isLoading, setIsLoading] = useState(true);
 *    const [error, setError] = useState<string | null>(null);
 * 
 * 3. ✅ Use api.method() instead of db.method()
 *    const salesData = await api.sales.getAll(selectedBusinessId);
 *    (instead of: await db.sales.getAll(selectedBusinessId))
 * 
 * 4. ✅ Use Promise.all() for parallel requests
 *    const [salesData, transactionsData, ...] = await Promise.all([...])
 * 
 * 5. ✅ Add include api in dependency array
 *    }, [selectedBusinessId, api]);
 * 
 * 6. ✅ Show loading skeleton while loading
 *    if (isLoading) return <LoadingSkeleton />
 * 
 * 7. ✅ Handle and display errors gracefully
 *    if (error) return <ErrorMessage error={error} />
 * 
 * BENEFITS:
 * - Global loading overlay appears automatically
 * - Requests are cached for 5 minutes
 * - Duplicate requests are deduplicated
 * - Better error handling
 * - Faster page transitions (cached data)
 * - Users see what's happening during loads
 */
