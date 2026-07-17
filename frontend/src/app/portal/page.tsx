'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { LeaveBalance, LeaveRequest } from '@/types';

export default function PortalDashboardPage() {
  const [today, setToday] = useState<any>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [t, b, r] = await Promise.all([
      api.get('/attendance/today'),
      api.get('/leave/balances/me'),
      api.get('/leave/requests', { params: { status: 'PENDING' } }),
    ]);
    setToday(t.data);
    setBalances(b.data);
    setMyRequests(r.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function checkIn() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/attendance/check-in', {});
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Check-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function checkOut() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/attendance/check-out', {});
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Check-out failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-slate-500">Loading...</p>;

  const record = today?.record;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Dashboard</h1>

      <div className="card p-5">
        <h2 className="mb-3 text-lg font-medium">Today&apos;s Attendance</h2>
        <div className="flex items-center gap-4">
          <div>
            <p className="text-sm text-slate-500">Check-in</p>
            <p className="text-lg font-medium">{record?.checkInAt ? new Date(record.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Check-out</p>
            <p className="text-lg font-medium">{record?.checkOutAt ? new Date(record.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="btn-primary" disabled={busy || !!record?.checkInAt} onClick={checkIn}>Check In</button>
            <button className="btn-secondary" disabled={busy || !record?.checkInAt || !!record?.checkOutAt} onClick={checkOut}>Check Out</button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-lg font-medium">Leave Balances</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {balances.map((b) => (
            <div key={b.id} className="rounded border border-slate-200 p-3">
              <p className="text-xs text-slate-500">{b.leaveType.name}</p>
              <p className="text-xl font-semibold">
                {(Number(b.opening) + Number(b.accrued) + Number(b.carriedForward) + Number(b.adjusted) - Number(b.used) - Number(b.pending) - Number(b.expired)).toFixed(1)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-lg font-medium">Pending Requests</h2>
        {myRequests.length === 0 ? <p className="text-sm text-slate-500">No pending requests.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {myRequests.map((r) => <li key={r.id} className="py-2">{r.leaveType.name}: {r.fromDate.slice(0, 10)} - {r.toDate.slice(0, 10)} ({r.totalDays} days)</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
