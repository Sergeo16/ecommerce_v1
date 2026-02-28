'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: { orderId?: string; orderNumber?: string } | null;
  readAt: string | null;
  createdAt: string;
};

export function AdminNotificationsBell({ token }: { token: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchNotifs(unreadOnly = false) {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?unreadOnly=${unreadOnly}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifs(false);
    const iv = setInterval(() => fetchNotifs(false), 60000);
    return () => clearInterval(iv);
  }, [token]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      document.addEventListener('click', fn);
      return () => document.removeEventListener('click', fn);
    }
  }, [open]);

  async function markRead(id: string) {
    if (!token) return;
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchNotifs(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-square indicator"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        {unreadCount > 0 && (
          <span className="indicator-item badge badge-primary badge-sm min-w-4">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m-6 0H9" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 max-h-[70vh] overflow-y-auto rounded-lg shadow-xl bg-base-100 border border-base-300 py-2 z-50">
          <div className="px-4 py-2 border-b border-base-300 font-semibold flex justify-between items-center">
            <span>Notifications</span>
            <Link href="/dashboard/admin/orders" className="link link-primary text-sm" onClick={() => setOpen(false)}>
              Voir les commandes
            </Link>
          </div>
          {loading ? (
            <div className="p-4 text-center text-base-content/70">Chargement...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-base-content/70">Aucune notification</div>
          ) : (
            <ul className="divide-y divide-base-300">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 hover:bg-base-200 cursor-pointer ${!n.readAt ? 'bg-primary/5' : ''}`}
                  onClick={() => {
                    if (!n.readAt) markRead(n.id);
                    if (n.data?.orderId) window.location.href = `/dashboard/admin/orders?highlight=${n.data.orderId}`;
                    setOpen(false);
                  }}
                >
                  <p className="font-medium text-sm">{n.title}</p>
                  {n.body && <p className="text-xs text-base-content/70 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-xs opacity-60 mt-1">
                    {new Date(n.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
