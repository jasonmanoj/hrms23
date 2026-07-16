'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Employee } from '@/types';

export default function ProfilePage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState({ mobileNumber: '', residentialAddress: '', emergencyContactName: '', emergencyContactPhone: '' });
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const { data } = await api.get('/employees/me');
    setEmployee(data);
    setForm({
      mobileNumber: data.mobileNumber ?? '',
      residentialAddress: data.residentialAddress ?? '',
      emergencyContactName: data.emergencyContactName ?? '',
      emergencyContactPhone: data.emergencyContactPhone ?? '',
    });
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!employee) return;
    await api.patch(`/employees/${employee.id}`, form);
    setMessage('Profile updated');
    load();
  }

  if (!employee) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Profile</h1>

      <div className="card p-5">
        <h2 className="mb-3 text-lg font-medium">Employment Details</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
          <div><dt className="text-slate-500">Employee No</dt><dd>{employee.employeeNumber}</dd></div>
          <div><dt className="text-slate-500">Department</dt><dd>{employee.department?.name ?? '-'}</dd></div>
          <div><dt className="text-slate-500">Designation</dt><dd>{employee.designation?.title ?? '-'}</dd></div>
          <div><dt className="text-slate-500">Status</dt><dd>{employee.status}</dd></div>
          <div><dt className="text-slate-500">Date of Joining</dt><dd>{employee.dateOfJoining?.slice(0, 10) ?? '-'}</dd></div>
        </dl>
      </div>

      <form onSubmit={save} className="card space-y-4 p-5">
        <h2 className="text-lg font-medium">Editable Information</h2>
        <div><label className="label">Mobile Number</label><input className="input" value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} /></div>
        <div><label className="label">Residential Address</label><input className="input" value={form.residentialAddress} onChange={(e) => setForm({ ...form, residentialAddress: e.target.value })} /></div>
        <div><label className="label">Emergency Contact Name</label><input className="input" value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} /></div>
        <div><label className="label">Emergency Contact Phone</label><input className="input" value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} /></div>
        <button className="btn-primary">Save</button>
        {message && <span className="ml-3 text-sm text-green-600">{message}</span>}
      </form>
    </div>
  );
}
