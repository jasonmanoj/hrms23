'use client';

import { Guard } from '@/components/Guard';
import { AppShell, NavItem } from '@/components/AppShell';

const NAV_ITEMS: NavItem[] = [
  { href: '/portal', label: 'Dashboard' },
  { href: '/portal/profile', label: 'My Profile' },
  { href: '/portal/attendance', label: 'Attendance' },
  { href: '/portal/leave', label: 'Leave' },
  { href: '/portal/notifications', label: 'Notifications' },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Guard>
      <AppShell title="Employee Portal" navItems={NAV_ITEMS}>
        {children}
      </AppShell>
    </Guard>
  );
}
