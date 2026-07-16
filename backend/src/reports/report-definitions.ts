export const REPORT_KEYS = [
  'employee-master',
  'active-employees',
  'new-joiners',
  'resigned-employees',
  'employee-document-expiry',
  'leave-balance',
  'leave-application',
  'pending-leave-approvals',
  'daily-attendance',
  'attendance-summary',
  'late-arrivals',
  'missing-checkouts',
  'overtime',
  'attendance-regularization',
] as const;

export type ReportKey = (typeof REPORT_KEYS)[number];

export interface ReportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ReportResult {
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}

export interface ReportFilters {
  from?: string;
  to?: string;
  departmentId?: string;
  employeeId?: string;
  status?: string;
  leaveTypeId?: string;
}
