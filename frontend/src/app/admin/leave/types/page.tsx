'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { LeaveType } from '@/types';

const EMPTY = { name: '', code: '', isPaid: true, annualEntitlement: 0, accrualFrequency: 'YEARLY', allowHalfDay: true, allowHourly: false };

export default function LeaveTypesPage() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const { data } = await api.get('/leave/types');
    setTypes(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/leave/types', form);
    setForm(EMPTY);
    setShowForm(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leave Types</h1>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'New Leave Type'}</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card grid grid-cols-2 gap-4 p-5 md:grid-cols-3">
          <div><label className="label">Name</label><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Code</label><input required className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></div>
          <div><label className="label">Annual Entitlement (days)</label><input type="number" className="input" value={form.annualEntitlement} onChange={(e) => setForm({ ...form, annualEntitlement: Number(e.target.value) })} /></div>
          <div>
            <label className="label">Accrual</label>
            <select className="input" value={form.accrualFrequency} onChange={(e) => setForm({ ...form, accrualFrequency: e.target.value })}>
              <option value="YEARLY">Yearly (upfront)</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} /> Paid</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowHalfDay} onChange={(e) => setForm({ ...form, allowHalfDay: e.target.checked })} /> Allow half-day</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allowHourly} onChange={(e) => setForm({ ...form, allowHourly: e.target.checked })} /> Allow hourly</label>
          <div className="col-span-full"><button type="submit" className="btn-primary">Create</button></div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Code</th><th>Name</th><th>Paid</th><th>Entitlement</th><th>Accrual</th><th>Active</th></tr></thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id}>
                <td>{t.code}</td>
                <td>{t.name}</td>
                <td>{t.isPaid ? 'Yes' : 'No'}</td>
                <td>{t.annualEntitlement}</td>
                <td>{(t as any).accrualFrequency}</td>
                <td>{t.active ? 'Active' : 'Inactive'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
