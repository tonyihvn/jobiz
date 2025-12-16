import React, { useEffect, useState } from 'react';
import db from '../services/apiClient';
import { fmt } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';
import { SaleRecord, Transaction, TransactionType } from '../types';
import { DollarSign, TrendingUp, TrendingDown, ShoppingBag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = db.sales && db.sales.getAll ? await db.sales.getAll() : [];
        const t = db.transactions && db.transactions.getAll ? await db.transactions.getAll() : [];
        if (!mounted) return;
        setSales(Array.isArray(s) ? s : []);
        setTransactions(Array.isArray(t) ? t : []);
      } catch (e) {
        console.warn('Failed to load dashboard data:', e);
        if (mounted) {
          setSales([]);
          setTransactions([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const totalSales = sales.reduce((acc, curr) => acc + curr.total, 0);
  const expenses = transactions
    .filter(t => t.type === TransactionType.EXPENDITURE)
    .reduce((acc, curr) => acc + curr.amount, 0);
  
  const chartData = sales.slice(-7).map((s, i) => ({
    name: new Date(s.date).toLocaleDateString(),
    sales: s.total
  }));

  

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Executive Overview</h2>
        <span className="text-sm text-slate-500">Last updated: Just now</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`${symbol}${fmt(totalSales,2)}`} 
          subtext="+12.5% from last month" 
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
          value={`${symbol}${fmt(Number(totalSales) - Number(expenses),2)}`} 
          subtext="Revenue - Expenses" 
          icon={TrendingUp} 
          color="bg-brand-500" 
        />
        <StatCard 
          title="Total Orders" 
          value={sales.length} 
          subtext="Across all categories" 
          icon={ShoppingBag} 
          color="bg-amber-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-6">Sales Trends</h3>
          <div className="h-80 w-full">
            {/* Use explicit pixel height for ResponsiveContainer to avoid zero-dimension render errors when printing/modals */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="sales" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
