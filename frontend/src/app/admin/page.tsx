'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Employee, LeaveRequest } from '@/types';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pendingLeave, setPendingLeave] = useState<LeaveRequest[]>([]);
  const [anomalies, setAnomalies] = useState<{ lateArrivals: unknown[]; missingCheckouts: unknown[] }>({ lateArrivals: [], missingCheckouts: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [empRes, leaveRes, anomalyRes] = await Promise.all([
        api.get('/employees'),
        api.get('/leave/requests', { params: { status: 'PENDING' } }),
        api.get('/attendance/anomalies'),
      ]);
      setEmployees(empRes.data);
      setPendingLeave(leaveRes.data);
      setAnomalies(anomalyRes.data);
      setLoading(false);
    })();
  }, []);

  const active = employees.filter((e) => e.status === 'ACTIVE').length;
  const onProbation = employees.filter((e) => e.status === 'PROBATION').length;

  if (loading) return <p className="text-slate-500">Loading dashboard...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Employees" value={employees.length} />
        <StatCard label="Active Employees" value={active} />
        <StatCard label="On Probation" value={onProbation} />
        <StatCard label="Pending Leave Approvals" value={pendingLeave.length} />
        <StatCard label="Late Arrivals Today" value={anomalies.lateArrivals.length} />
        <StatCard label="Missing Check-outs" value={anomalies.missingCheckouts.length} />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-lg font-medium">Pending Leave Approvals</h2>
        {pendingLeave.length === 0 ? (
          <p className="text-sm text-slate-500">No pending leave approvals.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr><th>Employee</th><th>Leave Type</th><th>From</th><th>To</th><th>Days</th></tr>
            </thead>
            <tbody>
              {pendingLeave.slice(0, 10).map((r) => (
                <tr key={r.id}>
                  <td>{r.employee?.firstName} {r.employee?.lastName}</td>
                  <td>{r.leaveType.name}</td>
                  <td>{r.fromDate.slice(0, 10)}</td>
                  <td>{r.toDate.slice(0, 10)}</td>
                  <td>{r.totalDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
