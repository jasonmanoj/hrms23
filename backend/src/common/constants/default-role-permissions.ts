import { PermissionAction, RoleKey } from '@prisma/client';
import { ModuleKey } from './modules';

const ALL_ACTIONS = Object.values(PermissionAction);
const RW = [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT];
const VIEW_ALL = [PermissionAction.VIEW, PermissionAction.VIEW_ALL];

type Grant = { module: ModuleKey; actions: PermissionAction[] };

// Default permission grants seeded for each built-in role. Organizations can further
// customize per-role grants after seeding via the Roles module.
export const DEFAULT_ROLE_PERMISSIONS: Record<Exclude<RoleKey, 'CUSTOM'>, Grant[]> = {
  SUPER_ADMIN: [], // SUPER_ADMIN bypasses the permission guard entirely.
  HR_ADMIN: [
    { module: 'employees', actions: ALL_ACTIONS },
    { module: 'employee-sensitive-fields', actions: [PermissionAction.VIEW, PermissionAction.EDIT] },
    { module: 'departments', actions: ALL_ACTIONS },
    { module: 'designations', actions: ALL_ACTIONS },
    { module: 'locations', actions: ALL_ACTIONS },
    { module: 'leave-types', actions: ALL_ACTIONS },
    { module: 'leave-policies', actions: ALL_ACTIONS },
    { module: 'leave-requests', actions: [...VIEW_ALL, PermissionAction.APPROVE, PermissionAction.EDIT] },
    { module: 'leave-balances', actions: [...VIEW_ALL, PermissionAction.EDIT] },
    { module: 'attendance', actions: [...VIEW_ALL, ...RW, PermissionAction.CONFIGURE] },
    { module: 'attendance-policies', actions: ALL_ACTIONS },
    { module: 'shifts', actions: ALL_ACTIONS },
    { module: 'holidays', actions: ALL_ACTIONS },
    { module: 'regularizations', actions: [...VIEW_ALL, PermissionAction.APPROVE] },
    { module: 'reports', actions: [PermissionAction.VIEW, PermissionAction.EXPORT] },
    { module: 'exports', actions: [PermissionAction.VIEW, PermissionAction.EXPORT] },
    { module: 'audit-logs', actions: [PermissionAction.VIEW] },
    { module: 'documents', actions: ALL_ACTIONS },
    { module: 'notifications', actions: [PermissionAction.VIEW] },
    { module: 'users', actions: ALL_ACTIONS },
    { module: 'roles', actions: [PermissionAction.VIEW, PermissionAction.CONFIGURE] },
  ],
  HR_EXECUTIVE: [
    { module: 'employees', actions: RW },
    { module: 'departments', actions: [PermissionAction.VIEW] },
    { module: 'designations', actions: [PermissionAction.VIEW] },
    { module: 'locations', actions: [PermissionAction.VIEW] },
    { module: 'leave-requests', actions: [...VIEW_ALL, PermissionAction.APPROVE] },
    { module: 'leave-balances', actions: VIEW_ALL },
    { module: 'attendance', actions: VIEW_ALL },
    { module: 'regularizations', actions: [...VIEW_ALL, PermissionAction.APPROVE] },
    { module: 'reports', actions: [PermissionAction.VIEW, PermissionAction.EXPORT] },
    { module: 'documents', actions: RW },
  ],
  DEPARTMENT_HEAD: [
    { module: 'employees', actions: [PermissionAction.VIEW, PermissionAction.VIEW_DEPARTMENT] },
    { module: 'leave-requests', actions: [PermissionAction.VIEW_DEPARTMENT, PermissionAction.APPROVE] },
    { module: 'leave-balances', actions: [PermissionAction.VIEW_DEPARTMENT] },
    { module: 'attendance', actions: [PermissionAction.VIEW_DEPARTMENT] },
    { module: 'regularizations', actions: [PermissionAction.VIEW_DEPARTMENT, PermissionAction.APPROVE] },
    { module: 'reports', actions: [PermissionAction.VIEW] },
  ],
  REPORTING_MANAGER: [
    { module: 'employees', actions: [PermissionAction.VIEW, PermissionAction.VIEW_SUBORDINATE] },
    { module: 'leave-requests', actions: [PermissionAction.VIEW_SUBORDINATE, PermissionAction.APPROVE] },
    { module: 'leave-balances', actions: [PermissionAction.VIEW_SUBORDINATE] },
    { module: 'attendance', actions: [PermissionAction.VIEW_SUBORDINATE] },
    { module: 'regularizations', actions: [PermissionAction.VIEW_SUBORDINATE, PermissionAction.APPROVE] },
  ],
  EMPLOYEE: [
    { module: 'employees', actions: [PermissionAction.VIEW_OWN, PermissionAction.EDIT] },
    { module: 'leave-requests', actions: [PermissionAction.VIEW_OWN, PermissionAction.CREATE] },
    { module: 'leave-balances', actions: [PermissionAction.VIEW_OWN] },
    { module: 'attendance', actions: [PermissionAction.VIEW_OWN, PermissionAction.CREATE] },
    { module: 'regularizations', actions: [PermissionAction.VIEW_OWN, PermissionAction.CREATE] },
    { module: 'documents', actions: [PermissionAction.VIEW_OWN, PermissionAction.CREATE] },
    { module: 'notifications', actions: [PermissionAction.VIEW_OWN] },
  ],
  ATTENDANCE_ADMIN: [
    { module: 'attendance', actions: [...VIEW_ALL, ...RW, PermissionAction.CONFIGURE, PermissionAction.IMPORT] },
    { module: 'attendance-policies', actions: ALL_ACTIONS },
    { module: 'shifts', actions: ALL_ACTIONS },
    { module: 'holidays', actions: ALL_ACTIONS },
    { module: 'regularizations', actions: [...VIEW_ALL, PermissionAction.APPROVE] },
    { module: 'reports', actions: [PermissionAction.VIEW, PermissionAction.EXPORT] },
  ],
  REPORT_VIEWER: [
    { module: 'reports', actions: [PermissionAction.VIEW, PermissionAction.EXPORT] },
    { module: 'employees', actions: [PermissionAction.VIEW_ALL] },
    { module: 'attendance', actions: [PermissionAction.VIEW_ALL] },
    { module: 'leave-requests', actions: [PermissionAction.VIEW_ALL] },
  ],
};
