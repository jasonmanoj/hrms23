'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { LeaveBalance, LeaveRequest, LeaveType } from '@/types';

const EMPTY_FORM = { leaveTypeId: '', fromDate: '', toDate: '', dayType: 'FULL_DAY', reason: '' };

function statusColor(status: string) {
  switch (status) {
    case 'APPROVED': return 'bg-green-100 text-green-700';
    case 'REJECTED': return 'bg-red-100 text-red-700';
    case 'PENDING': return 'bg-amber-100 text-amber-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

export default function PortalLeavePage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [t, b, r] = await Promise.all([api.get('/leave/types'), api.get('/leave/balances/me'), api.get('/leave/requests')]);
    setLeaveTypes(t.data);
    setBalances(b.data);
    setRequests(r.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/leave/requests', form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to apply for leave');
    }
  }

  async function cancel(id: string) {
    await api.post(`/leave/requests/${id}/cancel`, {});
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leave</h1>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'Apply for Leave'}</button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {balances.map((b) => (
          <div key={b.id} className="card p-3">
            <p className="text-xs text-slate-500">{b.leaveType.name}</p>
            <p className="text-xl font-semibold">
              {(Number(b.opening) + Number(b.accrued) + Number(b.carriedForward) + Number(b.adjusted) - Number(b.used) - Number(b.pending) - Number(b.expired)).toFixed(1)}
            </p>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={apply} className="card grid grid-cols-2 gap-4 p-5 md:grid-cols-3">
          <div>
            <label className="label">Leave Type</label>
            <select required className="input" value={form.leaveTypeId} onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}>
              <option value="">Select</option>
              {leaveTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Day Type</label>
            <select className="input" value={form.dayType} onChange={(e) => setForm({ ...form, dayType: e.target.value })}>
              <option value="FULL_DAY">Full Day</option>
              <option value="HALF_DAY">Half Day</option>
            </select>
          </div>
          <div />
          <div><label className="label">From</label><input type="date" required className="input" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} /></div>
          <div><label className="label">To</label><input type="date" required className="input" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} /></div>
          <div className="col-span-full"><label className="label">Reason</label><input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
          <div className="col-span-full flex items-center gap-3">
            <button className="btn-primary">Submit</button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <h2 className="p-5 pb-0 text-lg font-medium">My Leave Requests</h2>
        <table className="table-base">
          <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.leaveType.name}</td>
                <td>{r.fromDate.slice(0, 10)}</td>
                <td>{r.toDate.slice(0, 10)}</td>
                <td>{r.totalDays}</td>
                <td><span className={`badge ${statusColor(r.status)}`}>{r.status}</span></td>
                <td>
                  {(r.status === 'PENDING' || r.status === 'APPROVED') && (
                    <button className="text-xs text-red-600 hover:underline" onClick={() => cancel(r.id)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
