'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { LeaveRequest } from '@/types';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED', 'CANCELLATION_PENDING'];

function statusColor(status: string) {
  switch (status) {
    case 'APPROVED': return 'bg-green-100 text-green-700';
    case 'REJECTED': return 'bg-red-100 text-red-700';
    case 'PENDING': return 'bg-amber-100 text-amber-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

export default function AdminLeaveRequestsPage() {
  const [status, setStatus] = useState('PENDING');
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get('/leave/requests', { params: { status } });
    setRequests(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(id: string, action: 'approve' | 'reject' | 'return') {
    try {
      await api.post(`/leave/requests/${id}/${action}`, {});
      setMessage(`Request ${action}d`);
      load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message ?? 'Action failed');
    }
  }

  async function resolveCancellation(id: string, approve: boolean) {
    await api.post(`/leave/requests/${id}/cancellation/${approve ? 'approve' : 'reject'}`, {});
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leave Requests</h1>
        <select className="input w-56" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {message && <p className="rounded bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Reason</th><th></th></tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.employee?.firstName} {r.employee?.lastName}</td>
                <td>{r.leaveType.name}</td>
                <td>{r.fromDate.slice(0, 10)}</td>
                <td>{r.toDate.slice(0, 10)}</td>
                <td>{r.totalDays}</td>
                <td><span className={`badge ${statusColor(r.status)}`}>{r.status}</span></td>
                <td className="max-w-xs truncate">{r.reason}</td>
                <td className="space-x-2 whitespace-nowrap">
                  {r.status === 'PENDING' && (
                    <>
                      <button className="btn-secondary text-xs" onClick={() => act(r.id, 'approve')}>Approve</button>
                      <button className="btn-secondary text-xs" onClick={() => act(r.id, 'return')}>Return</button>
                      <button className="btn-danger text-xs" onClick={() => act(r.id, 'reject')}>Reject</button>
                    </>
                  )}
                  {r.status === 'CANCELLATION_PENDING' && (
                    <>
                      <button className="btn-secondary text-xs" onClick={() => resolveCancellation(r.id, true)}>Approve Cancel</button>
                      <button className="btn-danger text-xs" onClick={() => resolveCancellation(r.id, false)}>Reject Cancel</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-slate-400">No requests found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
