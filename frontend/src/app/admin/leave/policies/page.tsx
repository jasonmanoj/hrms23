'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { LeaveType } from '@/types';

export default function LeavePoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [name, setName] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    const [p, t] = await Promise.all([api.get('/leave/policies'), api.get('/leave/types')]);
    setPolicies(p.data);
    setLeaveTypes(t.data);
  }

  useEffect(() => {
    load();
  }, []);

  function toggleType(id: string) {
    setSelectedTypes((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name || selectedTypes.length === 0) return;
    await api.post('/leave/policies', { name, rules: selectedTypes.map((leaveTypeId) => ({ leaveTypeId })) });
    setName('');
    setSelectedTypes([]);
    setShowForm(false);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leave Policies</h1>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'New Policy'}</button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card space-y-4 p-5">
          <div><label className="label">Policy Name</label><input required className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <label className="label">Included Leave Types</label>
            <div className="flex flex-wrap gap-3">
              {leaveTypes.map((t) => (
                <label key={t.id} className="flex items-center gap-2 rounded border border-slate-200 px-3 py-1.5 text-sm">
                  <input type="checkbox" checked={selectedTypes.includes(t.id)} onChange={() => toggleType(t.id)} /> {t.name}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn-primary">Create Policy</button>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {policies.map((p) => (
          <div key={p.id} className="card p-5">
            <h3 className="text-lg font-medium">{p.name}</h3>
            <ul className="mt-2 text-sm text-slate-600">
              {p.rules.map((r: any) => (
                <li key={r.id}>{r.leaveType.name} &mdash; {r.annualEntitlementOverride ?? r.leaveType.annualEntitlement} days/yr</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
