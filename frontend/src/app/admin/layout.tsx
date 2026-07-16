'use client';

import { Guard } from '@/components/Guard';
import { AppShell, NavItem } from '@/components/AppShell';

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/employees', label: 'Employees' },
  { href: '/admin/departments', label: 'Departments' },
  { href: '/admin/leave/types', label: 'Leave Types' },
  { href: '/admin/leave/policies', label: 'Leave Policies' },
  { href: '/admin/leave/requests', label: 'Leave Requests' },
  { href: '/admin/attendance', label: 'Attendance' },
  { href: '/admin/attendance/regularizations', label: 'Regularizations' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/roles', label: 'Roles & Permissions' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard requireAdmin>
      <AppShell title="Admin" navItems={NAV_ITEMS}>
        {children}
      </AppShell>
    </Guard>
  );
}
