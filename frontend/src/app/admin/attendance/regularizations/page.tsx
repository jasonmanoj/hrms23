'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Regularization } from '@/types';

export default function RegularizationsAdminPage() {
  const [status, setStatus] = useState('PENDING');
  const [items, setItems] = useState<Regularization[]>([]);

  async function load() {
    const { data } = await api.get('/attendance/regularizations', { params: { status } });
    setItems(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(id: string, approve: boolean) {
    await api.post(`/attendance/regularizations/${id}/${approve ? 'approve' : 'reject'}`, {});
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Attendance Regularizations</h1>
        <select className="input w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Employee</th><th>Date</th><th>Type</th><th>Reason</th><th></th></tr></thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id}>
                <td>{r.employee?.firstName} {r.employee?.lastName}</td>
                <td>{r.date.slice(0, 10)}</td>
                <td>{r.type}</td>
                <td className="max-w-sm truncate">{r.reason}</td>
                <td className="space-x-2 whitespace-nowrap">
                  {status === 'PENDING' && (
                    <>
                      <button className="btn-secondary text-xs" onClick={() => act(r.id, true)}>Approve</button>
                      <button className="btn-danger text-xs" onClick={() => act(r.id, false)}>Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">No requests.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
