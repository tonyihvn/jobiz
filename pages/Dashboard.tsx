import React, { useEffect, useState } from 'react';
import db from '../services/apiClient';
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

const Dashboard = () => {
  const { symbol } = useCurrency();
  const { selectedBusinessId } = useBusinessContext();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartKind, setChartKind] = useState<'bar' | 'line'>('bar');
  const [settings, setSettings] = useState<any>(null);
  const [statsRange, setStatsRange] = useState<'week'|'month'|'year'>('week');
  const [isSuper, setIsSuper] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = db.sales && db.sales.getAll ? await db.sales.getAll(selectedBusinessId) : [];
        const t = db.transactions && db.transactions.getAll ? await db.transactions.getAll(selectedBusinessId) : [];
        const sv = db.services && db.services.getAll ? await db.services.getAll(selectedBusinessId) : [];
        const sett = db.settings && db.settings.get ? await db.settings.get() : null;
        const currentUser = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
        if (!mounted) return;
        setSales(Array.isArray(s) ? s : []);
        setTransactions(Array.isArray(t) ? t : []);
        setServicesList(Array.isArray(sv) ? sv : []);
        if (sett) { setSettings(sett); if ((sett.statsRange as any)) setStatsRange(sett.statsRange); }
        setIsSuper(!!(currentUser && (currentUser.is_super_admin || currentUser.isSuperAdmin)));
      } catch (e) {
        console.warn('Failed to load dashboard data:', e);
        if (mounted) {
          setSales([]);
          setTransactions([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, [selectedBusinessId]);

  // Compute total sales from sale items to ensure services/products both counted
  const getStartDate = (range: 'week'|'month'|'year') => {
    const now = new Date();
    if (range === 'week') { const d = new Date(); d.setDate(now.getDate() - 6); d.setHours(0,0,0,0); return d; }
    if (range === 'month') { const d = new Date(now.getFullYear(), now.getMonth(), 1); d.setHours(0,0,0,0); return d; }
    return new Date(now.getFullYear(), 0, 1);
  };
  const startDate = getStartDate(statsRange);
  const salesInRange = (sales || []).filter(s => new Date(s.date) >= startDate);
  // Total sales should be sum of `total` field on sales table excluding proformas
  const totalSales = salesInRange.filter(s => !(s.isProforma || s.is_proforma)).reduce((acc, sale) => acc + Number(sale.total || 0), 0);
  // Compute services revenue by matching sale items to services list or isService flag
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
  const incomeTx = transactionsInRange.filter(t => t.type === TransactionType.INFLOW).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const expenses = transactionsInRange.filter(t => t.type === TransactionType.EXPENDITURE).reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const totalRevenue = Number(totalSales) + Number(incomeTx);
  const netProfit = Number(totalRevenue) - Number(expenses);
  
  // Determine date window based on statsRange
  const makeMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const days = statsRange === 'week' ? 7 : (statsRange === 'month' ? 30 : 365);
  const makeDateKey = (d: Date) => d.toISOString().slice(0,10);
  const getLastNDays = (n: number) => {
    const res: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      res.push(makeDateKey(dt));
    }
    return res;
  };

  let chartDataAll: any[] = [];
  let chartDataServices: any[] = [];
  if (statsRange === 'year') {
    // Aggregate by month for last 12 months
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) { const dt = new Date(); dt.setMonth(dt.getMonth() - i); months.push(makeMonthKey(dt)); }
    const aggAllM: Record<string, number> = {};
    const aggSvcM: Record<string, number> = {};
    months.forEach(m => { aggAllM[m] = 0; aggSvcM[m] = 0; });
    for (const sale of sales) {
      const dt = new Date(sale.date);
      const key = makeMonthKey(dt);
      if (!(key in aggAllM)) continue;
      const saleTotal = (sale.items || []).reduce((a, it: any) => a + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
      aggAllM[key] = (aggAllM[key] || 0) + saleTotal;
      const svcTotal = (sale.items || []).reduce((a, it: any) => {
        const id = it.id || it.product_id;
        const isSvc = !!it.isService || !!it.is_service || serviceIds.has(id);
        return a + (isSvc ? Number(it.price || 0) * Number(it.quantity || 1) : 0);
      }, 0);
      aggSvcM[key] = (aggSvcM[key] || 0) + svcTotal;
    }
    chartDataAll = months.map(m => ({ name: new Date(m + '-01').toLocaleString(undefined, { month: 'short', year: 'numeric' }), value: aggAllM[m] || 0 }));
    chartDataServices = months.map(m => ({ name: new Date(m + '-01').toLocaleString(undefined, { month: 'short', year: 'numeric' }), value: aggSvcM[m] || 0 }));
  } else {
    const allDays = getLastNDays(days);
    const aggAll: Record<string, number> = {};
    const aggSvc: Record<string, number> = {};
    for (const d of allDays) { aggAll[d] = 0; aggSvc[d] = 0; }
    for (const sale of sales) {
      const key = makeDateKey(new Date(sale.date));
      if (!(key in aggAll)) continue;
      const saleTotal = (sale.items || []).reduce((a, it: any) => a + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
      aggAll[key] = (aggAll[key] || 0) + saleTotal;
      const svcTotal = (sale.items || []).reduce((a, it: any) => {
        const id = it.id || it.product_id;
        const isSvc = !!it.isService || !!it.is_service || serviceIds.has(id);
        return a + (isSvc ? Number(it.price || 0) * Number(it.quantity || 1) : 0);
      }, 0);
      aggSvc[key] = (aggSvc[key] || 0) + svcTotal;
    }
    chartDataAll = allDays.map(d => ({ name: new Date(d).toLocaleDateString(), value: aggAll[d] || 0 }));
    chartDataServices = allDays.map(d => ({ name: new Date(d).toLocaleDateString(), value: aggSvc[d] || 0 }));
  }

  

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Executive Overview</h2>
        <div className="flex items-center gap-4">
          {isSuper && (
            <select value={statsRange} onChange={async e => {
              const v = e.target.value as any;
              setStatsRange(v);
              try {
                const cur = db.settings && db.settings.get ? await db.settings.get() : {};
                const merged = { ...(cur || {}), statsRange: v };
                if (db.settings && db.settings.save) await db.settings.save(merged);
                setSettings(merged);
              } catch (err) { console.warn('Failed to save statsRange', err); }
            }} className="border rounded px-3 py-2 text-sm font-medium">
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          )}
          <span className="text-sm text-slate-500">Last updated: Just now</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`${symbol}${fmt(totalRevenue,2)}`} 
          subtext={`Sales: ${symbol}${fmt(totalSales,2)} · Tx Income: ${symbol}${fmt(incomeTx,2)}`} 
          icon={DollarSign} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Total Expenses" 
          value={`${symbol}${fmt(expenses,2)}`} 
          subtext="Operating costs" 
          icon={TrendingDown} 
          color="bg-rose-500" 
        />
        <StatCard 
          title="Net Profit" 
          value={<span className={ (Number(totalRevenue) - Number(expenses)) < 0 ? 'text-rose-600' : 'text-emerald-600'}>{symbol}{fmt(Number(totalRevenue) - Number(expenses),2)}</span>} 
          subtext="Revenue - Expenses" 
          icon={TrendingUp} 
          color="bg-brand-500" 
        />
        <StatCard 
          title="Total Orders" 
          value={salesInRange.length} 
          subtext="Across all categories" 
          icon={ShoppingBag} 
          color="bg-amber-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Sales Trends</h3>
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-500">Chart Type</label>
              <select value={chartKind} onChange={e => setChartKind(e.target.value as any)} className="border rounded px-2 py-1">
                <option value="bar">Bar</option>
                <option value="line">Line</option>
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {/* All Sales Chart */}
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">All Sales (by day)</p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height={220}>
                  {chartKind === 'bar' ? (
                    <BarChart data={chartDataAll}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <LineChart data={chartDataAll}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Services Chart */}
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Services (by day)</p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height={220}>
                  {chartKind === 'bar' ? (
                    <BarChart data={chartDataServices}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <LineChart data={chartDataServices}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {sales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    S
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sale #{sale.id.slice(0,6)}</p>
                    <p className="text-xs text-slate-500">{new Date(sale.date).toLocaleTimeString()}</p>
                  </div>
                </div>
                <span className="font-semibold text-emerald-600">+{symbol}{fmt(sale.total,2)}</span>
              </div>
            ))}
            {sales.length === 0 && <p className="text-slate-400 text-center py-4">No recent activity.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
