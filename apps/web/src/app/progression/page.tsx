'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useXp, useXpHistory, useAchievements, useDailyMissions, useWeeklyMissions, useClaimMissionReward } from '@/hooks/useProgression';

const XP_REASON_LABELS: Record<string, string> = {
  MATCH_WON: 'gameWin',
  MATCH_PLAYED: 'gamePlayed',
  DAILY_MISSION: 'dailyMission',
  WEEKLY_MISSION: 'weeklyMission',
  ACHIEVEMENT_UNLOCK: 'achievementUnlock',
};

function TabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex gap-2 border-b border-stone-800 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === tab
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-stone-500 hover:text-stone-300'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

function XpPanel() {
  const { data: xp, isLoading } = useXp();
  const { data: history } = useXpHistory(10);
  const t = useTranslation();

  if (isLoading || !xp) {
    return <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500 mx-auto mt-8" />;
  }

  const pct = Math.round(xp.progress * 100);

  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-amber-500">{t.progression.level.replace('{level}', String(xp.level))}</div>
        <div className="mt-2 text-sm text-stone-500">
          {t.progression.xpToNext.replace('{xp}', String(xp.xp)).replace('{needed}', String(xp.xpForNextLevel))}
        </div>
      </div>

      <div className="w-full bg-stone-800 rounded-full h-4 mb-2 overflow-hidden">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-stone-500 mb-6">
        <span>{t.progression.xp}: {xp.xp}</span>
        <span>{t.progression.totalXp}: {xp.totalXp}</span>
      </div>

      {history && history.history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-stone-400 mb-2 uppercase tracking-wider">{t.progression.xpHistory}</h3>
          <div className="space-y-1">
            {history.history.map((entry) => {
              const labelKey = XP_REASON_LABELS[entry.reason] || entry.reason;
              const reasonLabel = (t.progression as any)[labelKey] || entry.reason;
              return (
                <div key={entry.id} className="flex justify-between text-sm py-1 border-b border-stone-800/50">
                  <span className="text-stone-400">{reasonLabel}</span>
                  <span className="text-amber-500 font-mono">+{entry.amount} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AchievementsPanel() {
  const { data, isLoading } = useAchievements();
  const t = useTranslation();

  if (isLoading || !data) {
    return <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500 mx-auto mt-8" />;
  }

  const allAchievements = Object.values(data.groups).flat();

  if (allAchievements.length === 0) {
    return <p className="text-stone-500 text-center py-8">{t.progression.noAchievements}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {allAchievements.map((ach) => (
        <div
          key={ach.id}
          className={`rounded-lg border p-4 ${
            ach.unlocked
              ? 'border-amber-600/30 bg-amber-900/10'
              : 'border-stone-800 bg-stone-900/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                ach.unlocked ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 text-stone-500'
              }`}
            >
              {ach.icon || (ach.unlocked ? '★' : '☆')}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${ach.unlocked ? 'text-amber-400' : 'text-stone-400'}`}>
                {ach.hidden && !ach.unlocked ? t.progression.achievementHidden : ach.name}
              </p>
              {ach.unlocked ? (
                <p className="text-xs text-amber-600">{t.progression.achievementUnlocked}</p>
              ) : ach.hidden ? null : (
                <p className="text-xs text-stone-500 truncate">{ach.description}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MissionList({ missions, t }: { missions: { missionId: string; title: string; description: string | null; xpReward: number; progress: number; requirementValue: number; completed: boolean; claimed: boolean }[]; t: ReturnType<typeof useTranslation> }) {
  const claimMutation = useClaimMissionReward();

  if (missions.length === 0) {
    return <p className="text-stone-500 text-center py-4">{t.progression.noMissions}</p>;
  }

  return (
    <div className="space-y-3">
      {missions.map((m) => {
        const pct = Math.min(100, Math.round((m.progress / m.requirementValue) * 100));
        return (
          <div key={m.missionId} className="rounded-lg border border-stone-800 bg-stone-900/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-stone-200">{m.title}</p>
                {m.description && <p className="text-xs text-stone-500">{m.description}</p>}
              </div>
              <div className="text-xs text-amber-500 font-mono">+{m.xpReward} XP</div>
            </div>
            <div className="w-full bg-stone-800 rounded-full h-2 mb-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  m.completed ? 'bg-green-500' : 'bg-amber-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500">
                {t.progression.missionProgress.replace('{progress}', String(m.progress)).replace('{required}', String(m.requirementValue))}
              </span>
              {m.completed && !m.claimed && (
                <button
                  onClick={() => claimMutation.mutate(m.missionId)}
                  disabled={claimMutation.isPending}
                  className="text-xs px-3 py-1 rounded bg-amber-500 text-stone-950 font-medium hover:bg-amber-400 disabled:opacity-50 transition-colors"
                >
                  {t.progression.claim}
                </button>
              )}
              {m.claimed && (
                <span className="text-xs text-green-500">{t.progression.claimed}</span>
              )}
              {m.completed && m.claimed && (
                <span className="text-xs text-green-500">{t.progression.completed}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MissionsPanel() {
  const { data: daily, isLoading: dailyLoading } = useDailyMissions();
  const { data: weekly, isLoading: weeklyLoading } = useWeeklyMissions();
  const t = useTranslation();

  if (dailyLoading || weeklyLoading) {
    return <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-amber-500 mx-auto mt-8" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-stone-400 mb-3 uppercase tracking-wider">{t.progression.dailyMissions}</h3>
        <MissionList missions={daily?.missions || []} t={t} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-stone-400 mb-3 uppercase tracking-wider">{t.progression.weeklyMissions}</h3>
        <MissionList missions={weekly?.missions || []} t={t} />
      </div>
    </div>
  );
}

export default function ProgressionPage() {
  const [tab, setTab] = useState('xp');
  const t = useTranslation();

  const tabs = [
    t.progression.xp,
    t.progression.achievements,
    t.progression.missions,
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-stone-100 mb-6">{t.progression.title}</h1>
      <TabBar tabs={tabs} active={tab} onChange={setTab} />
      {tab === tabs[0] && <XpPanel />}
      {tab === tabs[1] && <AchievementsPanel />}
      {tab === tabs[2] && <MissionsPanel />}
    </div>
  );
}