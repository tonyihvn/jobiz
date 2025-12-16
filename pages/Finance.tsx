import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { Transaction, TransactionType, AccountHead, Employee, Role } from '../types';
import { fmt } from '../services/format';
import { useCurrency } from '../services/CurrencyContext';
import { PlusCircle, MinusCircle, Users, Wallet, FileText, Plus, X, Save, Upload, Edit2, Trash2 } from 'lucide-react';

const Finance = () => {
    const { symbol } = useCurrency();
  const [activeTab, setActiveTab] = useState<'transactions' | 'heads' | 'personnel'>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRole, setUserRole] = useState<Role | null>(null);

  // Modals
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showHeadModal, setShowHeadModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTx, setNewTx] = useState<Partial<Transaction>>({ type: TransactionType.INFLOW, amount: 0 });
  const [newHead, setNewHead] = useState<Partial<AccountHead>>({ type: TransactionType.INFLOW });
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({});

  useEffect(() => {
        (async () => {
            await refreshData();
            try {
                const currentUser = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;
                if (currentUser && db.roles && db.roles.getAll) {
                    const allRoles = await db.roles.getAll();
                    const role = Array.isArray(allRoles) ? allRoles.find((r: Role) => r.id === currentUser.roleId) : null;
                    setUserRole(role || null);
                }
            } catch (e) { console.warn('Failed to load user roles', e); }
        })();
    }, []);

    const refreshData = async () => {
        try {
            const businessId = (db.auth && db.auth.getCurrentUser) ? (await db.auth.getCurrentUser())?.businessId || 'demo' : 'demo';
            let txs = db.transactions && db.transactions.getAll ? await db.transactions.getAll() : [];
            if (!Array.isArray(txs) || txs.length === 0) {
                txs = [
                        { id: '1', businessId, date: new Date().toISOString(), accountHead: 'Sales Revenue', type: TransactionType.INFLOW, amount: 1200.50, particulars: 'Daily Sales', paidBy: 'Customers', receivedBy: 'Admin', approvedBy: 'Admin' },
                        { id: '2', businessId, date: new Date().toISOString(), accountHead: 'Rent Payment', type: TransactionType.EXPENDITURE, amount: 5000.00, particulars: 'Office Rent Oct', paidBy: 'Admin', receivedBy: 'Landlord', approvedBy: 'Director' },
                ];
                try { if (db.transactions && (db.transactions as any).save) await (db.transactions as any).save(txs); } catch (e) { /* ignore */ }
            }
            setTransactions(Array.isArray(txs) ? txs : []);
            const heads = db.accountHeads && db.accountHeads.getAll ? await db.accountHeads.getAll() : [];
            setAccountHeads(heads || []);
            const emps = db.employees && db.employees.getAll ? await db.employees.getAll() : [];
            setEmployees(emps || []);
            const rls = db.roles && db.roles.getAll ? await db.roles.getAll() : [];
            setRoles(rls || []);
        } catch (e) {
            console.warn('Failed to refresh finance data', e);
            setTransactions([]); setAccountHeads([]); setEmployees([]); setRoles([]);
        }
    };

  const hasPermission = (resource: string, action: string) => {
    if (!userRole) return false;
    return userRole.permissions.includes(`${resource}:${action}`);
  };

  // --- Deletion Handlers ---
  const handleDeleteHead = async (id: string) => {
      if(window.confirm('Delete this account head?')) {
          try { if (db.accountHeads && db.accountHeads.delete) await db.accountHeads.delete(id); } catch (e) { console.warn('Delete head failed', e); }
          await refreshData();
      }
  };

  const handleDeleteEmployee = async (id: string) => {
      if(window.confirm('Remove this employee?')) {
          try { if (db.employees && (db.employees as any).delete) await (db.employees as any).delete(id); } catch (e) { console.warn('Delete employee failed', e); }
          await refreshData();
      }
  };

  // --- Edit Handlers ---
  const handleEditHead = (item: AccountHead) => {
      setEditingId(item.id);
      setNewHead(item);
      setShowHeadModal(true);
  };

  const handleEditEmployee = (item: Employee) => {
      setEditingId(item.id);
      setNewEmp(item);
      setShowEmployeeModal(true);
  };

  // --- Save Handlers ---
    const handleSaveTransaction = async () => {
        if (!newTx.amount || !newTx.accountHead) return;
        const tx: Transaction = {
                id: Date.now().toString(),
                businessId: (db.auth && db.auth.getCurrentUser) ? (await db.auth.getCurrentUser())?.businessId || '' : '',
                date: new Date().toISOString(),
                accountHead: newTx.accountHead!,
                type: newTx.type!,
                amount: Number(newTx.amount),
                particulars: newTx.particulars || 'N/A',
                paidBy: newTx.paidBy || 'N/A',
                receivedBy: newTx.receivedBy || 'System',
                approvedBy: 'Admin'
        };
        try { if (db.transactions && db.transactions.add) await db.transactions.add(tx); }
        catch (e) { console.warn('Save transaction failed', e); }
        setShowTransactionModal(false);
        setNewTx({ type: TransactionType.INFLOW, amount: 0 });
        await refreshData();
    };

    const handleSaveHead = async () => {
        if (!newHead.title) return;
        const head: AccountHead = {
                id: editingId || Date.now().toString(),
                businessId: (db.auth && db.auth.getCurrentUser) ? (await db.auth.getCurrentUser())?.businessId || '' : '',
                title: newHead.title!,
                type: newHead.type!,
                description: newHead.description || ''
        };
        try {
            if (editingId) {
                if (db.accountHeads && db.accountHeads.update) await db.accountHeads.update(head.id, head);
            } else {
                if (db.accountHeads && db.accountHeads.add) await db.accountHeads.add(head);
            }
        } catch (e) { console.warn('Save head failed', e); }
        setShowHeadModal(false);
        setNewHead({ type: TransactionType.INFLOW });
        setEditingId(null);
        await refreshData();
    };

    const handleSaveEmployee = async () => {
        if (!newEmp.name || !newEmp.password) return;
        const emp: Employee = {
                id: editingId || Date.now().toString(),
                businessId: (db.auth && db.auth.getCurrentUser) ? (await db.auth.getCurrentUser())?.businessId || '' : '',
                name: newEmp.name!,
                roleId: newEmp.roleId || 'staff',
                password: newEmp.password,
                salary: Number(newEmp.salary || 0),
                email: newEmp.email || '',
                phone: newEmp.phone || '',
                passportUrl: 'mock_passport.jpg',
                cvUrl: 'mock_cv.pdf'
        };
        try {
            if (editingId) {
                const updated = employees.map(e => e.id === emp.id ? emp : e);
                if (db.employees && (db.employees as any).save) await (db.employees as any).save(updated);
            } else {
                if (db.employees && db.employees.add) await db.employees.add(emp);
                else if (db.employees && (db.employees as any).save) await (db.employees as any).save([emp, ...employees]);
            }
        } catch (e) { console.warn('Save employee failed', e); }
        setShowEmployeeModal(false);
        setNewEmp({});
        setEditingId(null);
        await refreshData();
    };

  const transactionColumns: Column<Transaction>[] = [
    { header: 'Date', accessor: (t: Transaction) => new Date(t.date).toLocaleDateString(), key: 'date', sortable: true },
    { header: 'Particulars', accessor: 'particulars', key: 'particulars', filterable: true },
    { header: 'Account Head', accessor: 'accountHead', key: 'accountHead', filterable: true },
    { 
        header: 'Type', 
        accessor: (t: Transaction) => (
            <span className={`flex items-center gap-1 ${t.type === TransactionType.INFLOW ? 'text-emerald-600' : 'text-rose-600'}`}>
                {t.type === TransactionType.INFLOW ? <PlusCircle size={14}/> : <MinusCircle size={14}/>}
                {t.type}
            </span>
        ), 
        key: 'type', 
        sortable: true 
    },
    { header: 'Amount', accessor: (t: Transaction) => <span className="font-mono font-medium">{symbol}{fmt(t.amount,2)}</span>, key: 'amount', sortable: true },
    { header: 'Approved By', accessor: 'approvedBy', key: 'approvedBy' },
  ];

  const headColumns: Column<AccountHead>[] = [
    { header: 'Title', accessor: 'title', key: 'title', filterable: true },
    { header: 'Type', accessor: 'type', key: 'type', sortable: true },
    { header: 'Description', accessor: 'description', key: 'description' },
    { 
        header: 'Actions', 
        accessor: (item: AccountHead) => (
            <div className="flex gap-2">
                {hasPermission('finance', 'update') && (
                    <button onClick={() => handleEditHead(item)} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                        <Edit2 size={16} />
                    </button>
                )}
                {hasPermission('finance', 'delete') && (
                    <button onClick={() => handleDeleteHead(item.id)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        ), 
        key: 'actions' 
    }
  ];

  const employeeColumns: Column<Employee>[] = [
    { header: 'Name', accessor: 'name', key: 'name', sortable: true },
    { header: 'Role', accessor: (e) => roles.find(r=>r.id===e.roleId)?.name || e.roleId, key: 'roleId', filterable: true },
    { header: 'Email', accessor: 'email', key: 'email' },
    { header: 'Salary', accessor: (e: Employee) => `${symbol}${e.salary.toLocaleString()}`, key: 'salary', sortable: true },
    { 
        header: 'Actions', 
        accessor: (item: Employee) => (
            <div className="flex gap-2">
                {hasPermission('employees', 'update') && (
                    <button onClick={() => handleEditEmployee(item)} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                        <Edit2 size={16} />
                    </button>
                )}
                {hasPermission('employees', 'delete') && (
                    <button onClick={() => handleDeleteEmployee(item.id)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        ), 
        key: 'actions' 
    }
  ];

  const income = transactions.filter(t => t.type === TransactionType.INFLOW).reduce((a,b) => a+b.amount, 0);
  const expense = transactions.filter(t => t.type === TransactionType.EXPENDITURE).reduce((a,b) => a+b.amount, 0);

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Finance & HR</h1>
            <p className="text-slate-500">Track inflows, expenditures, and personnel management.</p>
        </div>
        <button 
            onClick={() => {
                setEditingId(null);
                if (activeTab === 'transactions') { setNewTx({ type: TransactionType.INFLOW, amount: 0 }); setShowTransactionModal(true); }
                else if (activeTab === 'heads') { setNewHead({ type: TransactionType.INFLOW }); setShowHeadModal(true); }
                else { setNewEmp({}); setShowEmployeeModal(true); }
            }}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center gap-2"
        >
            <Plus size={18} /> 
            {activeTab === 'transactions' ? 'Record Transaction' : activeTab === 'heads' ? 'Add Account Head' : 'Add Employee'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500">Net Balance</h3>
            <p className="text-3xl font-bold text-slate-800 mt-2">{symbol}{fmt(Number(income) - Number(expense),2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500">Total Income (YTD)</h3>
            <p className="text-3xl font-bold text-emerald-600 mt-2">{symbol}{fmt(income,2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-sm font-medium text-slate-500">Total Expenses (YTD)</h3>
            <p className="text-3xl font-bold text-rose-600 mt-2">{symbol}{fmt(expense,2)}</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 px-1 flex items-center gap-2 font-medium text-sm transition-colors ${activeTab === 'transactions' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Wallet size={18} /> Transactions
        </button>
        <button 
          onClick={() => setActiveTab('heads')}
          className={`pb-3 px-1 flex items-center gap-2 font-medium text-sm transition-colors ${activeTab === 'heads' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <FileText size={18} /> Account Heads
        </button>
        <button 
          onClick={() => setActiveTab('personnel')}
          className={`pb-3 px-1 flex items-center gap-2 font-medium text-sm transition-colors ${activeTab === 'personnel' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Users size={18} /> Personnel & Payroll
        </button>
      </div>

      {activeTab === 'transactions' && <DataTable data={transactions} columns={transactionColumns} title="General Ledger" />}
      {activeTab === 'heads' && <DataTable data={accountHeads} columns={headColumns} title="Chart of Accounts" />}
      {activeTab === 'personnel' && <DataTable data={employees} columns={employeeColumns} title="Employee Directory" />}

      {/* Transaction Modal */}
      {showTransactionModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Record Transaction</h3>
                    <button onClick={() => setShowTransactionModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                             <select className="w-full border rounded-lg p-2.5" value={newTx.type} onChange={e => setNewTx({...newTx, type: e.target.value as TransactionType})}>
                                 <option value={TransactionType.INFLOW}>Inflow</option>
                                 <option value={TransactionType.EXPENDITURE}>Expenditure</option>
                             </select>
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Account Head</label>
                             <select className="w-full border rounded-lg p-2.5" value={newTx.accountHead} onChange={e => setNewTx({...newTx, accountHead: e.target.value})}>
                                 <option value="">Select Head</option>
                                 {accountHeads.filter(h => h.type === newTx.type).map(h => <option key={h.id} value={h.title}>{h.title}</option>)}
                             </select>
                         </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                        <input type="number" className="w-full border rounded-lg p-2.5" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Particulars / Description</label>
                        <input type="text" className="w-full border rounded-lg p-2.5" value={newTx.particulars} onChange={e => setNewTx({...newTx, particulars: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Paid By</label>
                             <input type="text" className="w-full border rounded-lg p-2.5" value={newTx.paidBy} onChange={e => setNewTx({...newTx, paidBy: e.target.value})} />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Received By</label>
                             <input type="text" className="w-full border rounded-lg p-2.5" value={newTx.receivedBy} onChange={e => setNewTx({...newTx, receivedBy: e.target.value})} />
                        </div>
                    </div>
                    <button onClick={handleSaveTransaction} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 mt-4">Save Record</button>
                </div>
            </div>
         </div>
      )}

      {/* Account Head Modal */}
      {showHeadModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Head' : 'Add Account Head'}</h3>
                    <button onClick={() => setShowHeadModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Account Title</label>
                        <input type="text" className="w-full border rounded-lg p-2.5" value={newHead.title} onChange={e => setNewHead({...newHead, title: e.target.value})} />
                     </div>
                     <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                             <select className="w-full border rounded-lg p-2.5" value={newHead.type} onChange={e => setNewHead({...newHead, type: e.target.value as TransactionType})}>
                                 <option value={TransactionType.INFLOW}>Inflow (Revenue)</option>
                                 <option value={TransactionType.EXPENDITURE}>Expenditure (Expense)</option>
                             </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea className="w-full border rounded-lg p-2.5" rows={3} value={newHead.description} onChange={e => setNewHead({...newHead, description: e.target.value})} />
                    </div>
                    <button onClick={handleSaveHead} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 mt-4">Save Account Head</button>
                </div>
            </div>
         </div>
      )}

      {/* Employee Modal */}
      {showEmployeeModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl w-full max-w-lg shadow-2xl">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Employee' : 'Add Employee'}</h3>
                    <button onClick={() => setShowEmployeeModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                            <input type="text" className="w-full border rounded-lg p-2.5" value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password (For Login)</label>
                            <input type="password" className="w-full border rounded-lg p-2.5" value={newEmp.password} onChange={e => setNewEmp({...newEmp, password: e.target.value})} placeholder="******" />
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                            <select 
                                className="w-full border rounded-lg p-2.5" 
                                value={newEmp.roleId} 
                                onChange={e => setNewEmp({...newEmp, roleId: e.target.value})}
                            >
                                <option value="">Select Role...</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Monthly Salary</label>
                            <input type="number" className="w-full border rounded-lg p-2.5" value={newEmp.salary} onChange={e => setNewEmp({...newEmp, salary: Number(e.target.value)})} />
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input type="email" className="w-full border rounded-lg p-2.5" value={newEmp.email} onChange={e => setNewEmp({...newEmp, email: e.target.value})} />
                     </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input type="text" className="w-full border rounded-lg p-2.5" value={newEmp.phone} onChange={e => setNewEmp({...newEmp, phone: e.target.value})} />
                     </div>

                     <div className="grid grid-cols-2 gap-4 border-t pt-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Passport Photo</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer">
                                <Upload size={24} />
                                <span className="text-xs mt-1">Upload JPG/PNG</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">CV / Resume</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer">
                                <FileText size={24} />
                                <span className="text-xs mt-1">Upload PDF</span>
                            </div>
                        </div>
                     </div>

                     <button onClick={handleSaveEmployee} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 mt-4">Save Employee</button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default Finance;
