'use client';

import { useRouter } from 'next/navigation';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useAuth } from '@/providers/AuthProvider';
import { useTranslation } from '@/lib/i18n';

export default function NotificationBell() {
  const t = useTranslation();
  const { isAuthenticated } = useAuth();
  const { data } = useUnreadCount();
  const router = useRouter();
  const unread = data?.count ?? 0;

  if (!isAuthenticated) return null;

  return (
    <button
      type="button"
      onClick={() => router.push('/notifications')}
      className="relative text-stone-400 transition-colors hover:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-950 rounded"
      aria-label={t.notifications.notificationAria.replace(
        '{unread}',
        unread > 0 ? ` (${unread} unread)` : '',
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
