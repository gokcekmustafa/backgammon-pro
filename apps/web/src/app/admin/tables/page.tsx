'use client';

import { useState } from 'react';
import { useAdminTables, useAdminTableAction } from '@/hooks/useAdmin';
import Button from '@/components/Button';
import { useTranslation } from '@/lib/i18n';

function formatDuration(ms: number) {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

export default function AdminLiveTables() {
  const t = useTranslation();
  const { data, isLoading, isError } = useAdminTables();
  const tableAction = useAdminTableAction();
  const [warningInputs, setWarningInputs] = useState<Record<string, string>>({});
  const [broadcastInputs, setBroadcastInputs] = useState<Record<string, string>>({});
  const [removeInputs, setRemoveInputs] = useState<Record<string, string>>({});

  function handleWarning(tableId: string) {
    const msg = warningInputs[tableId];
    if (!msg?.trim()) return;
    tableAction.mutate({ tableId, action: 'warning', body: { message: msg } });
    setWarningInputs((prev) => ({ ...prev, [tableId]: '' }));
  }

  function handleBroadcast(tableId: string) {
    const msg = broadcastInputs[tableId];
    if (!msg?.trim()) return;
    tableAction.mutate({ tableId, action: 'broadcast', body: { message: msg } });
    setBroadcastInputs((prev) => ({ ...prev, [tableId]: '' }));
  }

  function handleRemove(tableId: string) {
    const connId = removeInputs[tableId];
    if (!connId?.trim()) return;
    tableAction.mutate({ tableId, action: 'remove-player', body: { connectionId: connId } });
    setRemoveInputs((prev) => ({ ...prev, [tableId]: '' }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500" />
      </div>
    );
  }

  if (isError) {
    return <p className="py-8 text-center text-sm text-red-400">{t.admin.failedTables}</p>;
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-stone-100">{t.admin.liveTablesTitle}</h1>

      <div className="overflow-x-auto rounded-lg border border-stone-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-800 bg-stone-900">
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_table}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_room}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_status}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_locked}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_player1}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_specs}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_duration}</th>
              <th className="px-4 py-3 font-semibold text-stone-400">{t.admin.column_actions}</th>
            </tr>
          </thead>
          <tbody>
            {data?.tables.map((table) => (
              <tr
                key={table.id}
                className="border-b border-stone-800 last:border-0 hover:bg-stone-900/50"
              >
                <td className="px-4 py-3 font-medium text-stone-100">{table.name}</td>
                <td className="px-4 py-3 text-xs text-stone-400">{table.roomId}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs ${
                      table.status === 'playing'
                        ? 'bg-green-900/30 text-green-400'
                        : table.status === 'waiting'
                          ? 'bg-blue-900/30 text-blue-400'
                          : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {table.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs ${
                      table.locked ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'
                    }`}
                  >
                    {table.locked ? t.admin.locked_yes : t.admin.locked_no}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-300">{table.playerCount}</td>
                <td className="px-4 py-3 text-stone-300">{table.spectatorCount}</td>
                <td className="px-4 py-3 text-xs text-stone-500">
                  {formatDuration(table.duration)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          tableAction.mutate({
                            tableId: table.id,
                            action: table.locked ? 'unlock' : 'lock',
                          })
                        }
                        disabled={tableAction.isPending}
                      >
                        {table.locked ? t.admin.unlock : t.admin.lock}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => tableAction.mutate({ tableId: table.id, action: 'close' })}
                        disabled={tableAction.isPending}
                      >
                        {t.admin.close}
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder={t.admin.connId}
                        value={removeInputs[table.id] ?? ''}
                        onChange={(e) =>
                          setRemoveInputs((prev) => ({ ...prev, [table.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && handleRemove(table.id)}
                        className="w-20 rounded border border-stone-700 bg-stone-800 px-1 py-0.5 text-xs text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                      />
                      <Button
                        variant="ghost"
                        onClick={() => handleRemove(table.id)}
                        disabled={tableAction.isPending}
                      >
                        {t.common.remove}
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder={t.common.warning}
                        value={warningInputs[table.id] ?? ''}
                        onChange={(e) =>
                          setWarningInputs((prev) => ({ ...prev, [table.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && handleWarning(table.id)}
                        className="w-28 rounded border border-stone-700 bg-stone-800 px-1 py-0.5 text-xs text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                      />
                      <Button
                        variant="ghost"
                        onClick={() => handleWarning(table.id)}
                        disabled={tableAction.isPending}
                      >
                        {t.admin.warn}
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder={t.admin.broadcast}
                        value={broadcastInputs[table.id] ?? ''}
                        onChange={(e) =>
                          setBroadcastInputs((prev) => ({ ...prev, [table.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && handleBroadcast(table.id)}
                        className="w-28 rounded border border-stone-700 bg-stone-800 px-1 py-0.5 text-xs text-stone-100 placeholder-stone-500 focus:border-amber-500 focus:outline-none"
                      />
                      <Button
                        variant="ghost"
                        onClick={() => handleBroadcast(table.id)}
                        disabled={tableAction.isPending}
                      >
                        {t.admin.broadcast}
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data?.tables.length === 0 && (
        <p className="py-8 text-center text-sm text-stone-500">{t.admin.noActiveTables}</p>
      )}
    </div>
  );
}
