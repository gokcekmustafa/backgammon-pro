import Button from '../Button';

type TableStatus = 'open' | 'occupied' | 'playing' | 'closed';

interface TableCardProps {
  name: string;
  status: TableStatus;
  playerCount: number;
  maxPlayers: number;
  isRanked: boolean;
}

const statusLabel: Record<TableStatus, string> = {
  open: 'Open',
  occupied: 'Occupied',
  playing: 'Playing',
  closed: 'Closed',
};

const statusColor: Record<TableStatus, string> = {
  open: 'text-emerald-400',
  occupied: 'text-amber-400',
  playing: 'text-sky-400',
  closed: 'text-red-400',
};

const statusBg: Record<TableStatus, string> = {
  open: 'bg-emerald-500/10 border-emerald-500/30',
  occupied: 'bg-amber-500/10 border-amber-500/30',
  playing: 'bg-sky-500/10 border-sky-500/30',
  closed: 'bg-red-500/10 border-red-500/30',
};

export default function TableCard({
  name,
  status,
  playerCount,
  maxPlayers,
  isRanked,
}: TableCardProps) {
  const canJoin = status === 'open';

  return (
    <div className={`rounded-lg border p-4 ${statusBg[status]}`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-stone-100">{name}</p>
            {isRanked && (
              <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                Ranked
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs">
            <span className={`font-medium ${statusColor[status]}`}>{statusLabel[status]}</span>
            <span className="text-stone-500">
              {playerCount}/{maxPlayers} players
            </span>
          </div>
        </div>
        {canJoin ? (
          <Button variant="primary" className="ml-4 shrink-0">
            Join
          </Button>
        ) : (
          <span className="ml-4 shrink-0 text-xs text-stone-600">In progress</span>
        )}
      </div>
    </div>
  );
}
