'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export interface NavItem {
  href: string;
  label: string;
}

export function AppShell({ title, navItems, children }: { title: string; navItems: NavItem[]; children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center border-b border-slate-200 px-5">
          <span className="text-lg font-semibold text-brand-600">HRMS</span>
          <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{title}</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/admin' && item.href !== '/portal' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium ${active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user?.email}</span>
            <span className="badge bg-slate-100 text-slate-600">{user?.roleName}</span>
            <button onClick={logout} className="btn-secondary">Sign out</button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
