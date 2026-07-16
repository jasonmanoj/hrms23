// Canonical list of permission-gated modules in the system. Used by the Roles module to
// validate grants and by the seed script to build default role permission sets.
export const MODULES = [
  'organizations',
  'users',
  'roles',
  'employees',
  'employee-sensitive-fields',
  'departments',
  'designations',
  'locations',
  'leave-types',
  'leave-policies',
  'leave-requests',
  'leave-balances',
  'attendance',
  'attendance-policies',
  'shifts',
  'holidays',
  'regularizations',
  'reports',
  'exports',
  'audit-logs',
  'documents',
  'notifications',
] as const;

export type ModuleKey = (typeof MODULES)[number];
