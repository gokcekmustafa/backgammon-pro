interface PlayerPanelProps {
  _side?: 'left' | 'right';
}

export default function PlayerPanel({ _side }: PlayerPanelProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 lg:py-8">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-xs font-bold text-stone-500">
        ?
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-stone-500">Waiting for opponent</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-stone-300">0</p>
        <p className="text-[10px] uppercase tracking-wider text-stone-600">Score</p>
      </div>
    </div>
  );
}
