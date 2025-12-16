import React, { useState, useEffect } from 'react';
import DataTable, { Column } from '../components/Shared/DataTable';
import db from '../services/apiClient';
import { AuditLog } from '../types';
import { Activity } from 'lucide-react';

const AuditTrails = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const l = db.audit && db.audit.getAll ? await db.audit.getAll() : [];
        setLogs(l || []);
      } catch (e) { console.warn('Failed to load audit logs', e); setLogs([]); }
    })();
  }, []);

  const columns: Column<AuditLog>[] = [
    { header: 'Time', accessor: (l) => new Date(l.timestamp).toLocaleString(), key: 'timestamp', sortable: true },
    { header: 'User', accessor: 'userName', key: 'userName', filterable: true },
    { header: 'Action', accessor: 'action', key: 'action', filterable: true },
    { header: 'Resource', accessor: 'resource', key: 'resource', filterable: true },
    { header: 'Details', accessor: 'details', key: 'details', filterable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Audit Trails</h1>
          <p className="text-slate-500">System logs and user activity history.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-4 flex items-center gap-2 text-sm text-slate-600">
         <Activity size={18} />
         <span>Showing {logs.length} logged activities. Logs are stored locally.</span>
      </div>

      <DataTable data={logs} columns={columns} title="Activity Logs" />
    </div>
  );
};

export default AuditTrails;
