'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Department, Designation, Employee } from '@/types';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  personalEmail: '',
  mobileNumber: '',
  departmentId: '',
  designationId: '',
  employmentType: 'FULL_TIME',
  dateOfJoining: new Date().toISOString().slice(0, 10),
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [empRes, deptRes, desigRes] = await Promise.all([
      api.get('/employees', { params: search ? { search } : {} }),
      api.get('/departments'),
      api.get('/designations'),
    ]);
    setEmployees(empRes.data);
    setDepartments(deptRes.data);
    setDesignations(desigRes.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/employees', {
        ...form,
        departmentId: form.departmentId || undefined,
        designationId: form.designationId || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to create employee');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Employees</h1>
        <div className="flex gap-2">
          <input className="input w-64" placeholder="Search by name or number" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : 'New Employee'}</button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={createEmployee} className="card grid grid-cols-2 gap-4 p-5 md:grid-cols-3">
          <div><label className="label">First Name</label><input required className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
          <div><label className="label">Last Name</label><input required className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
          <div><label className="label">Personal Email</label><input type="email" className="input" value={form.personalEmail} onChange={(e) => setForm({ ...form, personalEmail: e.target.value })} /></div>
          <div><label className="label">Mobile Number</label><input className="input" value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} /></div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">-</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Designation</label>
            <select className="input" value={form.designationId} onChange={(e) => setForm({ ...form, designationId: e.target.value })}>
              <option value="">-</option>
              {designations.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Employment Type</label>
            <select className="input" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
              <option value="CONSULTANT">Consultant</option>
            </select>
          </div>
          <div><label className="label">Date of Joining</label><input type="date" className="input" value={form.dateOfJoining} onChange={(e) => setForm({ ...form, dateOfJoining: e.target.value })} /></div>
          <div className="col-span-full flex items-center gap-3">
            <button type="submit" className="btn-primary">Create</button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Emp No</th><th>Name</th><th>Department</th><th>Designation</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td>{emp.employeeNumber}</td>
                <td>{emp.firstName} {emp.lastName}</td>
                <td>{emp.department?.name ?? '-'}</td>
                <td>{emp.designation?.title ?? '-'}</td>
                <td><span className="badge bg-slate-100 text-slate-700">{emp.status}</span></td>
                <td><Link href={`/admin/employees/${emp.id}`} className="text-brand-600 hover:underline">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
