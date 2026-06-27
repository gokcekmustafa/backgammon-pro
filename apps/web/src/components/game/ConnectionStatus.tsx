export default function ConnectionStatus() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
      <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">
        Connected
      </span>
    </div>
  );
}
