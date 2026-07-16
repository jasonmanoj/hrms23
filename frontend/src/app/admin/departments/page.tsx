'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Department, Designation } from '@/types';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [newDept, setNewDept] = useState('');
  const [newDesig, setNewDesig] = useState('');

  async function load() {
    const [d, g] = await Promise.all([api.get('/departments'), api.get('/designations')]);
    setDepartments(d.data);
    setDesignations(g.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function addDept(e: React.FormEvent) {
    e.preventDefault();
    if (!newDept.trim()) return;
    await api.post('/departments', { name: newDept });
    setNewDept('');
    load();
  }

  async function addDesig(e: React.FormEvent) {
    e.preventDefault();
    if (!newDesig.trim()) return;
    await api.post('/designations', { title: newDesig });
    setNewDesig('');
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Departments &amp; Designations</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-lg font-medium">Departments</h2>
          <form onSubmit={addDept} className="mb-4 flex gap-2">
            <input className="input" placeholder="New department" value={newDept} onChange={(e) => setNewDept(e.target.value)} />
            <button className="btn-primary">Add</button>
          </form>
          <ul className="divide-y divide-slate-100 text-sm">
            {departments.map((d) => <li key={d.id} className="py-2">{d.name} <span className="text-slate-400">({(d as any)._count?.employees ?? 0} employees)</span></li>)}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-lg font-medium">Designations</h2>
          <form onSubmit={addDesig} className="mb-4 flex gap-2">
            <input className="input" placeholder="New designation" value={newDesig} onChange={(e) => setNewDesig(e.target.value)} />
            <button className="btn-primary">Add</button>
          </form>
          <ul className="divide-y divide-slate-100 text-sm">
            {designations.map((d) => <li key={d.id} className="py-2">{d.title}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
