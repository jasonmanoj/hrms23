'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';

interface ReportResult {
  title: string;
  columns: { header: string; key: string }[];
  rows: Record<string, unknown>[];
}

export default function ReportsPage() {
  const [reportKeys, setReportKeys] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);
  const [exportJobs, setExportJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadKeys() {
    const { data } = await api.get('/reports');
    setReportKeys(data);
    setSelected(data[0] ?? '');
  }

  async function loadExportJobs() {
    const { data } = await api.get('/exports');
    setExportJobs(data);
  }

  useEffect(() => {
    loadKeys();
    loadExportJobs();
    const interval = setInterval(loadExportJobs, 4000);
    return () => clearInterval(interval);
  }, []);

  async function runReport() {
    if (!selected) return;
    setLoading(true);
    const { data } = await api.get(`/reports/${selected}`, { params: { from: from || undefined, to: to || undefined } });
    setResult(data);
    setLoading(false);
  }

  async function exportReport(format: 'XLSX' | 'CSV') {
    await api.post('/exports', { reportKey: selected, format, filters: { from: from || undefined, to: to || undefined } });
    loadExportJobs();
  }

  async function downloadExport(id: string, filename: string) {
    const res = await api.get(`/exports/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>

      <div className="card flex flex-wrap items-end gap-3 p-5">
        <div>
          <label className="label">Report</label>
          <select className="input w-64" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {reportKeys.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div><label className="label">From</label><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label">To</label><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <button className="btn-secondary" onClick={runReport}>Preview</button>
        <button className="btn-primary" onClick={() => exportReport('XLSX')}>Export Excel</button>
        <button className="btn-secondary" onClick={() => exportReport('CSV')}>Export CSV</button>
      </div>

      {loading && <p className="text-slate-500">Running report...</p>}

      {result && (
        <div className="card overflow-x-auto p-5">
          <h2 className="mb-3 text-lg font-medium">{result.title}</h2>
          <table className="table-base">
            <thead><tr>{result.columns.map((c) => <th key={c.key}>{c.header}</th>)}</tr></thead>
            <tbody>
              {result.rows.slice(0, 200).map((row, i) => (
                <tr key={i}>{result.columns.map((c) => <td key={c.key}>{String(row[c.key] ?? '')}</td>)}</tr>
              ))}
            </tbody>
          </table>
          {result.rows.length === 0 && <p className="py-4 text-center text-slate-400">No data.</p>}
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-3 text-lg font-medium">Export History</h2>
        <table className="table-base">
          <thead><tr><th>Report</th><th>Format</th><th>Status</th><th>Requested</th><th></th></tr></thead>
          <tbody>
            {exportJobs.map((j) => (
              <tr key={j.id}>
                <td>{j.reportKey}</td>
                <td>{j.format}</td>
                <td><span className="badge bg-slate-100 text-slate-700">{j.status}</span></td>
                <td>{new Date(j.createdAt).toLocaleString()}</td>
                <td>{j.status === 'COMPLETED' && <button className="text-brand-600 hover:underline" onClick={() => downloadExport(j.id, j.fileUrl)}>Download</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
