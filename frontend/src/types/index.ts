export interface CurrentUser {
  id: string;
  email: string;
  organizationId: string;
  roleKey: string | null;
  roleName: string | null;
  employeeId: string | null;
  passwordResetRequired: boolean;
  permissions: string[];
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  personalEmail?: string | null;
  mobileNumber?: string | null;
  gender?: string;
  status: string;
  dateOfJoining?: string | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  designationId?: string | null;
  designation?: { id: string; title: string } | null;
  locationId?: string | null;
  location?: { id: string; name: string } | null;
  reportingManagerId?: string | null;
  employmentType?: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string | null;
}

export interface Designation {
  id: string;
  title: string;
}

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  isPaid: boolean;
  annualEntitlement: number;
  allowHalfDay: boolean;
  allowHourly: boolean;
  active: boolean;
}

export interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  opening: number;
  accrued: number;
  used: number;
  pending: number;
  carriedForward: number;
  adjusted: number;
  expired: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee?: { firstName: string; lastName: string; employeeNumber: string };
  leaveTypeId: string;
  leaveType: LeaveType;
  fromDate: string;
  toDate: string;
  dayType: string;
  totalDays: number;
  reason?: string | null;
  status: string;
  currentStepOrder: number;
  approvalSteps: { id: string; stepOrder: number; approverRole: string; action: string | null; comments: string | null }[];
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employee?: { firstName: string; lastName: string; employeeNumber: string };
  date: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  workingMinutes?: number | null;
  status: string;
  breaks?: { id: string; startAt: string; endAt: string | null }[];
}

export interface Regularization {
  id: string;
  employeeId: string;
  employee?: { firstName: string; lastName: string; employeeNumber: string };
  date: string;
  type: string;
  status: string;
  reason: string;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  isSystem: boolean;
  permissions: { module: string; action: string }[];
}

export interface UserAccount {
  id: string;
  email: string;
  status: string;
  roleId?: string | null;
  role?: { name: string } | null;
  employee?: { firstName: string; lastName: string } | null;
  lastLoginAt?: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  module: string;
  recordId?: string | null;
  createdAt: string;
  user?: { email: string } | null;
}
