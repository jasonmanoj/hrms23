'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { AuditLogEntry } from '@/types';

export default function AuditLogsPage() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [module, setModule] = useState('');

  async function load() {
    const { data } = await api.get('/audit-logs', { params: { module: module || undefined } });
    setItems(data.items);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <input className="input w-56" placeholder="Filter by module" value={module} onChange={(e) => setModule(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>When</th><th>User</th><th>Module</th><th>Action</th><th>Record</th></tr></thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{new Date(i.createdAt).toLocaleString()}</td>
                <td>{i.user?.email ?? 'System'}</td>
                <td>{i.module}</td>
                <td>{i.action}</td>
                <td className="max-w-xs truncate text-slate-400">{i.recordId}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">No entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
