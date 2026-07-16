'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Employee, LeaveBalance } from '@/types';

const STATUS_OPTIONS = [
  'DRAFT', 'PRE_BOARDING', 'ACTIVE', 'PROBATION', 'CONFIRMED', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'RETIRED', 'INACTIVE',
];

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [docType, setDocType] = useState('OTHER');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [empRes, balRes, docRes, policyRes] = await Promise.all([
      api.get(`/employees/${id}`),
      api.get(`/leave/balances/employee/${id}`),
      api.get(`/employees/${id}/documents`),
      api.get('/leave/policies'),
    ]);
    setEmployee(empRes.data);
    setBalances(balRes.data);
    setDocuments(docRes.data);
    setPolicies(policyRes.data);
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function changeStatus(status: string) {
    await api.post(`/employees/${id}/status`, { status });
    setMessage(`Status updated to ${status}`);
    load();
  }

  async function assignPolicy() {
    if (!selectedPolicy) return;
    await api.post('/leave/policies/assign', { employeeId: id, leavePolicyId: selectedPolicy });
    setMessage('Leave policy assigned');
    load();
  }

  async function uploadDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!docFile) return;
    const formData = new FormData();
    formData.append('file', docFile);
    formData.append('type', docType);
    formData.append('name', docFile.name);
    await api.post(`/employees/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    setDocFile(null);
    load();
  }

  async function downloadDocument(docId: string, name: string) {
    const res = await api.get(`/documents/${docId}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  if (!employee) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{employee.firstName} {employee.lastName}</h1>
        <p className="text-sm text-slate-500">{employee.employeeNumber} &middot; {employee.department?.name ?? 'No department'} &middot; {employee.designation?.title ?? 'No designation'}</p>
      </div>
      {message && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-lg font-medium">Status</h2>
          <p className="mb-3 text-sm">Current: <span className="badge bg-slate-100">{employee.status}</span></p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button key={s} onClick={() => changeStatus(s)} className="btn-secondary text-xs">{s}</button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-lg font-medium">Leave Policy</h2>
          <div className="flex gap-2">
            <select className="input" value={selectedPolicy} onChange={(e) => setSelectedPolicy(e.target.value)}>
              <option value="">Select policy</option>
              {policies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="btn-primary" onClick={assignPolicy}>Assign</button>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-lg font-medium">Leave Balances</h2>
        {balances.length === 0 ? <p className="text-sm text-slate-500">No leave policy assigned yet.</p> : (
          <table className="table-base">
            <thead><tr><th>Leave Type</th><th>Opening</th><th>Accrued</th><th>Used</th><th>Pending</th></tr></thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.id}>
                  <td>{b.leaveType.name}</td>
                  <td>{b.opening}</td>
                  <td>{b.accrued}</td>
                  <td>{b.used}</td>
                  <td>{b.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-lg font-medium">Documents</h2>
        <form onSubmit={uploadDocument} className="mb-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="label">Type</label>
            <select className="input" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {['PASSPORT', 'VISA', 'NATIONAL_ID', 'EMPLOYMENT_CONTRACT', 'EDUCATIONAL_CERTIFICATE', 'EXPERIENCE_CERTIFICATE', 'PROFILE_DOCUMENT', 'OTHER'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">File</label>
            <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
          </div>
          <button type="submit" className="btn-primary">Upload</button>
        </form>
        <ul className="space-y-1 text-sm">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between border-t border-slate-100 py-2">
              <span>{d.name} <span className="text-slate-400">({d.type})</span></span>
              <button className="text-brand-600 hover:underline" onClick={() => downloadDocument(d.id, d.name)}>Download</button>
            </li>
          ))}
          {documents.length === 0 && <p className="text-sm text-slate-500">No documents uploaded.</p>}
        </ul>
      </div>
    </div>
  );
}
