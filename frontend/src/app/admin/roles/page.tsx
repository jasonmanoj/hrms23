'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Role } from '@/types';

const ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'APPROVE', 'EXPORT', 'IMPORT', 'CONFIGURE', 'VIEW_OWN', 'VIEW_SUBORDINATE', 'VIEW_DEPARTMENT', 'VIEW_ALL'];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [grants, setGrants] = useState<Record<string, Set<string>>>({});
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [r, m] = await Promise.all([api.get('/roles'), api.get('/roles/modules')]);
    setRoles(r.data);
    setModules(m.data);
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(module: string, action: string) {
    setGrants((prev) => {
      const next = { ...prev };
      const set = new Set(next[module] ?? []);
      if (set.has(action)) set.delete(action);
      else set.add(action);
      next[module] = set;
      return next;
    });
  }

  function startNew() {
    setSelectedRole(null);
    setName('');
    setGrants({});
    setShowForm(true);
  }

  function edit(role: Role) {
    setSelectedRole(role);
    setName(role.name);
    const g: Record<string, Set<string>> = {};
    for (const p of role.permissions) {
      g[p.module] = g[p.module] ?? new Set();
      g[p.module].add(p.action);
    }
    setGrants(g);
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const permissions = Object.entries(grants)
      .filter(([, actions]) => actions.size > 0)
      .map(([module, actions]) => ({ module, actions: Array.from(actions) }));

    try {
      if (selectedRole) {
        await api.put(`/roles/${selectedRole.id}`, { name, permissions });
      } else {
        await api.post('/roles', { name, permissions });
      }
      setShowForm(false);
      setMessage('Role saved');
      load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message ?? 'Failed to save role');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Roles &amp; Permissions</h1>
        <button className="btn-primary" onClick={startNew}>New Custom Role</button>
      </div>
      {message && <p className="text-sm text-slate-600">{message}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{r.name}</h3>
              {r.isSystem && <span className="badge bg-slate-100 text-slate-500">system</span>}
            </div>
            <p className="mt-1 text-xs text-slate-500">{(r as any)._count?.users ?? 0} users</p>
            <button className="btn-secondary mt-3 text-xs" onClick={() => edit(r)}>Edit permissions</button>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={save} className="card space-y-4 p-5">
          <div><label className="label">Role Name</label><input required disabled={!!selectedRole?.isSystem} className="input max-w-sm" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Module</th>{ACTIONS.map((a) => <th key={a}>{a}</th>)}</tr>
              </thead>
              <tbody>
                {modules.map((mod) => (
                  <tr key={mod}>
                    <td className="font-medium">{mod}</td>
                    {ACTIONS.map((action) => (
                      <td key={action}>
                        <input
                          type="checkbox"
                          checked={grants[mod]?.has(action) ?? false}
                          onChange={() => toggle(mod, action)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="submit" className="btn-primary">Save Role</button>
        </form>
      )}
    </div>
  );
}
