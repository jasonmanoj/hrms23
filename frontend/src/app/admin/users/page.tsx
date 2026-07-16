'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Role, UserAccount } from '@/types';

export default function UsersPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [u, r] = await Promise.all([api.get('/users'), api.get('/roles')]);
    setUsers(u.data);
    setRoles(r.data);
    if (!roleId && r.data.length) setRoleId(r.data[0].id);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post('/users/invite', { email, roleId });
      setEmail('');
      setMessage('Invitation sent');
      load();
    } catch (err: any) {
      setMessage(err?.response?.data?.message ?? 'Failed to invite user');
    }
  }

  async function action(id: string, path: string) {
    await api.post(`/users/${id}/${path}`, {});
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users</h1>

      <form onSubmit={invite} className="card flex flex-wrap items-end gap-3 p-5">
        <div><label className="label">Email</label><input type="email" required className="input w-64" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div>
          <label className="label">Role</label>
          <select className="input w-56" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <button className="btn-primary">Invite User</button>
        {message && <span className="text-sm text-slate-600">{message}</span>}
      </form>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role?.name ?? '-'}</td>
                <td><span className="badge bg-slate-100 text-slate-700">{u.status}</span></td>
                <td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td>
                <td className="space-x-2 whitespace-nowrap text-xs">
                  <button className="btn-secondary text-xs" onClick={() => action(u.id, 'activate')}>Activate</button>
                  <button className="btn-secondary text-xs" onClick={() => action(u.id, 'deactivate')}>Deactivate</button>
                  <button className="btn-secondary text-xs" onClick={() => action(u.id, 'lock')}>Lock</button>
                  <button className="btn-secondary text-xs" onClick={() => action(u.id, 'force-password-reset')}>Force Reset</button>
                  <button className="btn-danger text-xs" onClick={() => action(u.id, 'revoke-sessions')}>Revoke Sessions</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
