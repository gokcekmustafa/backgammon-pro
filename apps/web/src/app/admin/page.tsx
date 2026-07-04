'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface DashboardStats {
  totalUsers: number;
  bannedUsers: number;
  activeTables: number;
  gamesToday: number;
  newUsersToday: number;
  onlineUsers: number;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-stone-100">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api<DashboardStats>('/api/admin/dashboard'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-400">Failed to load dashboard data.</p>
      </div>
    );
  }

  const cards = [
    { label: 'Total Users', value: data.totalUsers.toLocaleString() },
    { label: 'Online Users', value: String(data.onlineUsers) },
    { label: 'Active Tables', value: String(data.activeTables) },
    { label: 'Games Today', value: String(data.gamesToday) },
    { label: 'New Users Today', value: String(data.newUsersToday) },
    { label: 'Banned Users', value: String(data.bannedUsers) },
  ];

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-stone-100">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>
    </div>
  );
}
