'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface SecuritySummary {
  failedLogins24h: number;
  tokenAbuse24h: number;
  cheatAttempts24h: number;
  rateLimitViolations24h: number;
  totalEvents24h: number;
  connections: {
    activeUsers: number;
    totalConnections: number;
    authenticatedConnections: number;
  };
  games: {
    activeGames: number;
    finishedGamesToday: number;
  };
}

interface SecurityEvent {
  id: string;
  eventType: string;
  severity: string;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface SecurityEventsResponse {
  events: SecurityEvent[];
  total: number;
}

const severityColors: Record<string, string> = {
  INFO: 'text-blue-400 bg-blue-900/20',
  WARN: 'text-amber-400 bg-amber-900/20',
  ERROR: 'text-red-400 bg-red-900/20',
  CRITICAL: 'text-red-300 bg-red-900/40',
};

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color ?? 'text-stone-100'}`}>{value}</p>
    </div>
  );
}

export default function AdminSecurityPage() {
  const { data: summary } = useQuery({
    queryKey: ['admin', 'security', 'summary'],
    queryFn: () => api<SecuritySummary>('/api/admin/security/summary'),
    refetchInterval: 15000,
  });

  const { data: eventsData } = useQuery({
    queryKey: ['admin', 'security', 'events'],
    queryFn: () => api<SecurityEventsResponse>('/api/admin/security/events?limit=50'),
    refetchInterval: 30000,
  });

  const { data: metrics } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: () => api<any>('/api/admin/metrics'),
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-stone-100">Security Dashboard</h1>

      {/* Active Connections */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active Users" value={String(summary.connections.activeUsers)} color="text-green-400" />
          <StatCard label="Connections" value={String(summary.connections.totalConnections)} />
          <StatCard label="Active Games" value={String(summary.games.activeGames)} color="text-amber-400" />
          <StatCard label="Games Today" value={String(summary.games.finishedGamesToday)} />
        </div>
      )}

      {/* Security Summary */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Failed Logins (24h)" value={String(summary.failedLogins24h)} color="text-red-400" />
          <StatCard label="Token Abuse (24h)" value={String(summary.tokenAbuse24h)} color="text-amber-400" />
          <StatCard label="Cheat Attempts (24h)" value={String(summary.cheatAttempts24h)} color="text-red-400" />
          <StatCard label="Rate Limit (24h)" value={String(summary.rateLimitViolations24h)} color="text-amber-400" />
          <StatCard label="Total Events (24h)" value={String(summary.totalEvents24h)} />
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-4">
          <h2 className="text-sm font-semibold text-stone-400 mb-3 uppercase tracking-wider">Server Metrics</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-stone-500">Memory (Heap)</p>
              <p className="text-sm text-stone-200 font-mono">{(metrics.memory.heapUsed / 1024 / 1024).toFixed(1)} MB</p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Response Times (Avg/P95)</p>
              <p className="text-sm text-stone-200 font-mono">
                {metrics.responseTimes.average.toFixed(0)}ms / {metrics.responseTimes.p95.toFixed(0)}ms
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Uptime</p>
              <p className="text-sm text-stone-200 font-mono">{Math.floor(metrics.uptime / 60)}m</p>
            </div>
          </div>
        </div>
      )}

      {/* Security Events Log */}
      <div>
        <h2 className="text-sm font-semibold text-stone-400 mb-3 uppercase tracking-wider">
          Recent Security Events ({eventsData?.total ?? 0})
        </h2>
        {eventsData && eventsData.events.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-stone-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900">
                  <th className="px-3 py-2 font-semibold text-stone-400">Type</th>
                  <th className="px-3 py-2 font-semibold text-stone-400">Severity</th>
                  <th className="px-3 py-2 font-semibold text-stone-400">User ID</th>
                  <th className="px-3 py-2 font-semibold text-stone-400">IP</th>
                  <th className="px-3 py-2 font-semibold text-stone-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {eventsData.events.map((ev) => (
                  <tr key={ev.id} className="border-b border-stone-800 hover:bg-stone-900/50">
                    <td className="px-3 py-2 text-stone-300 font-mono text-xs">{ev.eventType}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${severityColors[ev.severity] || 'text-stone-500'}`}>
                        {ev.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{ev.userId?.slice(0, 8) ?? '—'}</td>
                    <td className="px-3 py-2 text-stone-500 text-xs">{ev.ipAddress ?? '—'}</td>
                    <td className="px-3 py-2 text-stone-500 text-xs">
                      {new Date(ev.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-stone-500 text-sm">No security events recorded.</p>
        )}
      </div>
    </div>
  );
}