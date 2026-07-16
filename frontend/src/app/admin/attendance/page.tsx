'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { AttendanceRecord } from '@/types';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminAttendancePage() {
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  async function load() {
    const { data } = await api.get('/attendance/history', { params: { from, to } });
    setRecords(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Attendance Records</h1>
        <div className="flex items-center gap-2">
          <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="text-slate-400">to</span>
          <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Employee</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th></tr></thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td>{r.employee?.firstName} {r.employee?.lastName}</td>
                <td>{r.date.slice(0, 10)}</td>
                <td>{r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                <td>{r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                <td>{r.workingMinutes != null ? (r.workingMinutes / 60).toFixed(2) : '-'}</td>
                <td><span className="badge bg-slate-100 text-slate-700">{r.status}</span></td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">No records for this range.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
