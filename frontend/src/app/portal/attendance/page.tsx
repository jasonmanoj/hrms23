'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { AttendanceRecord, Regularization } from '@/types';

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const REG_TYPES = ['MISSING_CHECK_IN', 'MISSING_CHECK_OUT', 'INCORRECT_ATTENDANCE', 'WORK_FROM_HOME', 'CLIENT_VISIT', 'ON_DUTY'];

export default function PortalAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [regularizations, setRegularizations] = useState<Regularization[]>([]);
  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({ date: new Date().toISOString().slice(0, 10), type: 'MISSING_CHECK_OUT', reason: '', requestedCheckIn: '', requestedCheckOut: '' });
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [r, reg] = await Promise.all([
      api.get('/attendance/history', { params: { from: daysAgoIso(30), to: daysAgoIso(0) } }),
      api.get('/attendance/regularizations'),
    ]);
    setRecords(r.data);
    setRegularizations(reg.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submitRegularization(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/attendance/regularizations', {
        date: regForm.date,
        type: regForm.type,
        reason: regForm.reason,
        requestedCheckIn: regForm.requestedCheckIn ? new Date(`${regForm.date}T${regForm.requestedCheckIn}`).toISOString() : undefined,
        requestedCheckOut: regForm.requestedCheckOut ? new Date(`${regForm.date}T${regForm.requestedCheckOut}`).toISOString() : undefined,
      });
      setMessage('Regularization request submitted');
      setShowRegForm(false);
      load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message ?? 'Failed to submit request');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Attendance</h1>
        <button className="btn-primary" onClick={() => setShowRegForm((s) => !s)}>{showRegForm ? 'Cancel' : 'Request Regularization'}</button>
      </div>
      {message && <p className="text-sm text-slate-600">{message}</p>}

      {showRegForm && (
        <form onSubmit={submitRegularization} className="card grid grid-cols-2 gap-4 p-5 md:grid-cols-3">
          <div><label className="label">Date</label><input type="date" required className="input" value={regForm.date} onChange={(e) => setRegForm({ ...regForm, date: e.target.value })} /></div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={regForm.type} onChange={(e) => setRegForm({ ...regForm, type: e.target.value })}>
              {REG_TYPES.map((t) => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
          <div><label className="label">Requested Check-in</label><input type="time" className="input" value={regForm.requestedCheckIn} onChange={(e) => setRegForm({ ...regForm, requestedCheckIn: e.target.value })} /></div>
          <div><label className="label">Requested Check-out</label><input type="time" className="input" value={regForm.requestedCheckOut} onChange={(e) => setRegForm({ ...regForm, requestedCheckOut: e.target.value })} /></div>
          <div className="col-span-full"><label className="label">Reason</label><input required className="input" value={regForm.reason} onChange={(e) => setRegForm({ ...regForm, reason: e.target.value })} /></div>
          <div className="col-span-full"><button className="btn-primary">Submit</button></div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <h2 className="p-5 pb-0 text-lg font-medium">History (last 30 days)</h2>
        <table className="table-base">
          <thead><tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.date.slice(0, 10)}</td>
                <td>{r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                <td>{r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                <td>{r.workingMinutes != null ? (r.workingMinutes / 60).toFixed(2) : '-'}</td>
                <td><span className="badge bg-slate-100 text-slate-700">{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="p-5 pb-0 text-lg font-medium">My Regularization Requests</h2>
        <table className="table-base">
          <thead><tr><th>Date</th><th>Type</th><th>Status</th><th>Reason</th></tr></thead>
          <tbody>
            {regularizations.map((r) => (
              <tr key={r.id}>
                <td>{r.date.slice(0, 10)}</td>
                <td>{r.type}</td>
                <td><span className="badge bg-slate-100 text-slate-700">{r.status}</span></td>
                <td className="max-w-xs truncate">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
