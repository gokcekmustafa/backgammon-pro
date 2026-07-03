import Button from '../Button';

type TableStatus = 'open' | 'occupied' | 'playing' | 'finished' | 'closed';

interface TableCardProps {
  name: string;
  status: TableStatus;
  playerCount: number;
  maxPlayers: number;
  isRanked: boolean;
  isJoined?: boolean;
  isDisabled?: boolean;
  onJoin?: () => void;
  onLeave?: () => void;
  onCancel?: () => void;
}

const statusLabel: Record<TableStatus, string> = {
  open: 'Open',
  occupied: 'Occupied',
  playing: 'Playing',
  finished: 'Finished',
  closed: 'Closed',
};

const statusColor: Record<TableStatus, string> = {
  open: 'text-emerald-400',
  occupied: 'text-amber-400',
  playing: 'text-sky-400',
  finished: 'text-stone-400',
  closed: 'text-red-400',
};

const statusBg: Record<TableStatus, string> = {
  open: 'bg-emerald-500/10 border-emerald-500/30',
  occupied: 'bg-amber-500/10 border-amber-500/30',
  playing: 'bg-sky-500/10 border-sky-500/30',
  finished: 'bg-stone-500/10 border-stone-500/30',
  closed: 'bg-red-500/10 border-red-500/30',
};

export default function TableCard({
  name,
  status,
  playerCount,
  maxPlayers,
  isRanked,
  isJoined,
  isDisabled,
  onJoin,
  onLeave,
  onCancel,
}: TableCardProps) {
  const canJoin = status === 'open' && !isJoined;
  const canLeave = isJoined && status !== 'closed' && status !== 'finished';
  const canCancel = status === 'open' && isJoined && playerCount === 1;

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
        {canCancel ? (
          <Button
            variant="ghost"
            className="ml-4 shrink-0 text-red-400 hover:text-red-300"
            onClick={onCancel}
            disabled={isDisabled}
          >
            Cancel
          </Button>
        ) : canJoin ? (
          <Button
            variant="primary"
            className="ml-4 shrink-0"
            onClick={onJoin}
            disabled={isDisabled}
          >
            Join
          </Button>
        ) : canLeave ? (
          <Button
            variant="ghost"
            className="ml-4 shrink-0 text-red-400 hover:text-red-300"
            onClick={onLeave}
            disabled={isDisabled}
          >
            Leave
          </Button>
        ) : (
          <span className="ml-4 shrink-0 text-xs text-stone-600">
            {status === 'playing' ? 'In progress' : statusLabel[status]}
          </span>
        )}
      </div>
    </div>
  );
}
