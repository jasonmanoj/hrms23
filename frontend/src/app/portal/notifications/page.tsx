'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Notification } from '@/types';

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);

  async function load() {
    const { data } = await api.get('/notifications');
    setItems(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string) {
    await api.post(`/notifications/${id}/read`, {});
    load();
  }

  async function markAllRead() {
    await api.post('/notifications/read-all', {});
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <button className="btn-secondary" onClick={markAllRead}>Mark all as read</button>
      </div>

      <div className="card divide-y divide-slate-100">
        {items.map((n) => (
          <div key={n.id} className={`flex items-start justify-between p-4 ${n.read ? '' : 'bg-brand-50/40'}`}>
            <div>
              <p className="font-medium">{n.title}</p>
              <p className="text-sm text-slate-600">{n.message}</p>
              <p className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            {!n.read && <button className="text-xs text-brand-600 hover:underline" onClick={() => markRead(n.id)}>Mark read</button>}
          </div>
        ))}
        {items.length === 0 && <p className="p-6 text-center text-slate-400">No notifications.</p>}
      </div>
    </div>
  );
}
