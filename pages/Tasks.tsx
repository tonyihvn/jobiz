import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import RichTextEditor from '../components/Shared/RichTextEditor';
import db from '../services/apiClient';
import { Task, TaskStatus, Employee } from '../types';
import { Plus, X, Save, Edit2, Trash2, Calendar, CheckCircle, Clock } from 'lucide-react';

const Tasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // New Task Form State
  const [newTask, setNewTask] = useState<Partial<Task>>({
    status: TaskStatus.PENDING,
    type: 'Task',
    category: 'General'
  });

  useEffect(() => {
    (async () => { await refreshData(); })();
  }, []);

  const refreshData = () => {
    (async () => {
      try {
        const t = db.tasks && db.tasks.getAll ? await db.tasks.getAll() : [];
        const e = db.employees && db.employees.getAll ? await db.employees.getAll() : [];
        const normTasks = (Array.isArray(t) ? t : []).map((it: any) => ({
          ...it,
          assignedTo: it.assignedTo || it.assigned_to || it.assigned_to_id || '',
          dateToDo: it.dateToDo || it.date_to_do || '',
          dateToComplete: it.dateToComplete || it.date_to_complete || '',
          createdBy: it.createdBy || it.created_by || ''
        }));
        setTasks(normTasks);
        setEmployees(Array.isArray(e) ? e : []);
      } catch (err) {
        console.warn('Failed to refresh tasks/employees', err);
        setTasks([]);
        setEmployees([]);
      }
    })();
  };

  const handleEdit = (task: Task) => {
    setEditingId(task.id);
    setNewTask(task);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this task?')) {
      db.tasks.delete(id);
      refreshData();
    }
  };

  const handleSave = async () => {
    if (!newTask.title || !newTask.assignedTo) return;

    const currentUser = db.auth && db.auth.getCurrentUser ? await db.auth.getCurrentUser() : null;

    const task: Task = {
      id: editingId || Date.now().toString(),
      businessId: currentUser?.businessId || '',
      title: newTask.title!,
      description: newTask.description || '',
      assignedTo: newTask.assignedTo!,
      createdBy: (currentUser && (currentUser.name || currentUser.email)) || 'admin',
      dateToDo: newTask.dateToDo || new Date().toISOString().split('T')[0],
      dateToComplete: newTask.dateToComplete || '',
      status: newTask.status || TaskStatus.PENDING,
      type: newTask.type || 'Task',
      category: newTask.category || 'General'
    };

    try {
      if (editingId) {
        if (db.tasks && db.tasks.update) await db.tasks.update(editingId, task);
      } else {
        if (db.tasks && db.tasks.add) await db.tasks.add(task);
      }
    } catch (e) {
      console.warn('Failed to save task', e);
    }

    setShowModal(false);
    setNewTask({ status: TaskStatus.PENDING, type: 'Task', category: 'General' });
    setEditingId(null);
    refreshData();
  };

  const columns: Column<Task>[] = [
    { header: 'Title', accessor: 'title', key: 'title', sortable: true, filterable: true },
    { 
      header: 'Assigned To', 
      accessor: (t) => {
          if (t.assignedTo === 'admin') return 'Administrator';
          return employees.find(e => e.id === t.assignedTo)?.name || t.assignedTo;
      }, 
      key: 'assignedTo', 
      filterable: true 
    },
    { header: 'Type', accessor: 'type', key: 'type', sortable: true },
    { header: 'Due Date', accessor: (t) => t.dateToComplete || '-', key: 'dateToComplete', sortable: true },
    { 
      header: 'Status', 
      accessor: (t) => (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
          t.status === TaskStatus.COMPLETED ? 'bg-emerald-100 text-emerald-800' :
          t.status === TaskStatus.IN_PROGRESS ? 'bg-amber-100 text-amber-800' :
          'bg-slate-100 text-slate-800'
        }`}>
          {t.status}
        </span>
      ), 
      key: 'status',
      sortable: true
    },
    {
      header: 'Actions',
      accessor: (item: Task) => (
        <div className="flex gap-2">
          <button onClick={() => handleEdit(item)} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
            <Edit2 size={16} />
          </button>
          <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:bg-red-50 p-1 rounded">
            <Trash2 size={16} />
          </button>
        </div>
      ),
      key: 'actions'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tasks & Memos</h1>
          <p className="text-slate-500">Manage internal tasks and assignments.</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setNewTask({ status: TaskStatus.PENDING, type: 'Task', category: 'General' }); setShowModal(true); }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600"><CheckCircle size={20} /></div>
            <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-bold">{tasks.filter(t => t.status === TaskStatus.COMPLETED).length}</p>
            </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-full text-amber-600"><Clock size={20} /></div>
            <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-2xl font-bold">{tasks.filter(t => t.status !== TaskStatus.COMPLETED).length}</p>
            </div>
        </div>
      </div>

      <DataTable data={tasks} columns={columns} title="Task List" />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl w-full max-w-2xl shadow-2xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Task' : 'New Task'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2.5 outline-none"
                  value={newTask.title}
                  onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select
                        className="w-full border rounded-lg p-2.5 outline-none"
                        value={newTask.type}
                        onChange={e => setNewTask({ ...newTask, type: e.target.value })}
                    >
                        <option value="Task">Task</option>
                        <option value="Memo">Memo</option>
                        <option value="Reminder">Reminder</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <input
                        type="text"
                        className="w-full border rounded-lg p-2.5 outline-none"
                        value={newTask.category}
                        onChange={e => setNewTask({ ...newTask, category: e.target.value })}
                    />
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Rich Text)</label>
                <RichTextEditor 
                  value={newTask.description || ''}
                  onChange={(val) => setNewTask({ ...newTask, description: val })}
                  placeholder="Task details..."
                  className="h-64"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
                    <select
                        className="w-full border rounded-lg p-2.5 outline-none"
                        value={newTask.assignedTo}
                        onChange={e => setNewTask({ ...newTask, assignedTo: e.target.value })}
                    >
                        <option value="">Select User...</option>
                        <option value="admin">Administrator (Myself)</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </div>
                <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                     <select
                        className="w-full border rounded-lg p-2.5 outline-none"
                        value={newTask.status}
                        onChange={e => setNewTask({ ...newTask, status: e.target.value as TaskStatus })}
                    >
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date To Do</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg p-2.5 outline-none"
                    value={newTask.dateToDo}
                    onChange={e => setNewTask({ ...newTask, dateToDo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date To Complete</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg p-2.5 outline-none"
                    value={newTask.dateToComplete}
                    onChange={e => setNewTask({ ...newTask, dateToComplete: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <button onClick={handleSave} className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 flex justify-center items-center gap-2 mt-4">
              <Save size={18} /> Save Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;