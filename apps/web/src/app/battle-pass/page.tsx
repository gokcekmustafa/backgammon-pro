'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useActiveSeason, useUserSeason, useSeasonLevels, useSeasonRewards, useClaimReward } from '@/hooks/useSeasons';

function LevelRow({ level, freeRewards, premiumRewards, userLevel, canClaim, onClaim, isClaimed }: {
  level: number;
  freeRewards: { id: string; rewardType: string; rewardValue: string; claimed: boolean }[];
  premiumRewards: { id: string; rewardType: string; rewardValue: string; claimed: boolean }[];
  userLevel: number;
  canClaim: boolean;
  onClaim: (id: string) => void;
  isClaimed: boolean;
}) {
  const isUnlocked = level <= userLevel;
  const isCurrent = level === userLevel;

  return (
    <div className={`flex items-center gap-3 py-3 px-4 rounded-lg border transition-colors ${
      isCurrent ? 'border-amber-600/30 bg-amber-900/10' : 'border-stone-800 bg-stone-900/30'
    } ${isUnlocked ? 'opacity-100' : 'opacity-50'}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        isUnlocked ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-500'
      }`}>
        {level}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-2">
        <div className="flex flex-wrap gap-1">
          {freeRewards.length === 0 ? (
            <span className="text-xs text-stone-600">—</span>
          ) : (
            freeRewards.map((r) => (
              <span key={r.id} className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                {r.rewardValue}
              </span>
            ))
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {premiumRewards.length === 0 ? (
            <span className="text-xs text-stone-600">—</span>
          ) : (
            premiumRewards.map((r) => (
              <span key={r.id} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-300">
                {r.rewardValue}
                {isUnlocked && !r.claimed && canClaim && (
                  <button
                    onClick={() => onClaim(r.id)}
                    className="ml-1 text-amber-500 hover:text-amber-400 text-xs font-semibold"
                  >
                    Claim
                  </button>
                )}
                {r.claimed && <span className="text-green-500 text-xs">✓</span>}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function BattlePassPage() {
  const searchParams = useSearchParams();
  const seasonIdParam = searchParams.get('seasonId');
  const { data: active } = useActiveSeason();
  const seasonId = seasonIdParam || active?.id;
  const { data: userSeason } = useUserSeason(seasonId);
  const { data: levelsData } = useSeasonLevels(seasonId);
  const { data: rewardsData } = useSeasonRewards(seasonId);
  const claimMutation = useClaimReward();
  const t = useTranslation();

  const userBp = userSeason?.battlePasses?.[0];
  const currentLevel = userBp?.level ?? 1;
  const currentXp = userBp?.xp ?? 0;
  const xpPerLevel = userBp?.xpPerLevel ?? 100;
  const xpProgress = xpPerLevel > 0 ? Math.min(100, Math.round((currentXp / xpPerLevel) * 100)) : 0;

  const freeLevels = levelsData?.levels?.FREE ?? [];
  const premiumLevels = levelsData?.levels?.PREMIUM ?? [];

  const rewardMap = new Map<string, { id: string; rewardType: string; rewardValue: string; claimed: boolean; claimedAt: string | null }>();
  if (rewardsData?.rewards) {
    for (const r of rewardsData.rewards) {
      rewardMap.set(r.id, r);
    }
  }

  const handleClaim = (rewardId: string) => {
    claimMutation.mutate(rewardId);
  };

  const maxLevel = userBp?.maxLevel ?? 50;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {active && !seasonIdParam && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-stone-100">{active.name}</h1>
          <p className="text-sm text-stone-500">Season {active.seasonNumber}</p>
        </div>
      )}

      {userBp && (
        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm text-stone-400">Level {currentLevel}</span>
              {userBp.hasPremium && (
                <span className="ml-2 text-xs text-amber-500 bg-amber-900/20 px-2 py-0.5 rounded">Premium</span>
              )}
            </div>
            <span className="text-xs text-stone-500">{currentXp} / {xpPerLevel} XP</span>
          </div>
          <div className="w-full bg-stone-800 rounded-full h-3 mb-1 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${xpProgress}%` }} />
          </div>
          <div className="text-xs text-stone-600 text-right">Season XP: {userSeason?.xp ?? 0}</div>
        </div>
      )}

      <div className="grid grid-cols-[40px_1fr_1fr] gap-2 items-center mb-3 px-4 text-xs text-stone-500 uppercase tracking-wider">
        <div />
        <div>Free</div>
        <div>Premium</div>
      </div>

      <div className="space-y-1">
        {Array.from({ length: maxLevel }, (_, i) => i + 1).map((level) => {
          const freeLvl = freeLevels.find((l) => l.level === level);
          const premiumLvl = premiumLevels.find((l) => l.level === level);
          const freeRewards = (freeLvl?.rewards ?? []).map((r) => ({
            ...r,
            claimed: rewardMap.get(r.id)?.claimed ?? false,
          }));
          const premiumRewards = (premiumLvl?.rewards ?? []).map((r) => ({
            ...r,
            claimed: rewardMap.get(r.id)?.claimed ?? false,
          }));
          const canClaim = level <= currentLevel;

          return (
            <LevelRow
              key={level}
              level={level}
              freeRewards={freeRewards}
              premiumRewards={premiumRewards}
              userLevel={currentLevel}
              canClaim={canClaim}
              onClaim={handleClaim}
              isClaimed={false}
            />
          );
        })}
      </div>
    </div>
  );
}