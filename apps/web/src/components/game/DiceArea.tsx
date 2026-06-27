export default function DiceArea() {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
        Dice
      </span>
      <div className="flex gap-1.5">
        <div className="flex h-9 w-9 items-center justify-center rounded border border-stone-700 bg-stone-900">
          <span className="text-xs font-bold text-stone-600">?</span>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded border border-stone-700 bg-stone-900">
          <span className="text-xs font-bold text-stone-600">?</span>
        </div>
      </div>
    </div>
  );
}
