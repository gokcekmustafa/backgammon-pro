import { useTranslation } from '@/lib/i18n';

interface RoomCardProps {
  name: string;
  description?: string;
  tableCount: number;
  isActive: boolean;
  onClick: () => void;
}

export default function RoomCard({
  name,
  description,
  tableCount,
  isActive,
  onClick,
}: RoomCardProps) {
  const t = useTranslation();
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
        isActive
          ? 'border-amber-500 bg-amber-500/10 shadow-sm shadow-amber-500/10'
          : 'border-stone-800 bg-stone-900 hover:bg-stone-800 hover:border-stone-700'
      }`}
    >
      <p className={`text-sm font-semibold ${isActive ? 'text-amber-400' : 'text-stone-200'}`}>
        {name}
      </p>
      {description && <p className="mt-0.5 text-xs text-stone-500">{description}</p>}
      <p className={`mt-1 text-xs ${isActive ? 'text-amber-500/70' : 'text-stone-600'}`}>
        {tableCount} {tableCount === 1 ? t.common.table : t.common.tables}
      </p>
    </button>
  );
}
