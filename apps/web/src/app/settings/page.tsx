'use client';

import Link from 'next/link';
import { useTheme } from '@/providers/ThemeProvider';
import { useSettings, type AnimationSpeed } from '@/providers/SettingsProvider';
import { useTranslation } from '@/lib/i18n';

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg border border-stone-800 bg-stone-900 p-4"
      style={{
        borderColor: 'rgb(var(--color-border))',
        backgroundColor: 'rgb(var(--color-bg-secondary))',
      }}
    >
      {children}
    </div>
  );
}

function Toggle({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-stone-950 ${enabled ? 'bg-amber-500' : 'bg-stone-700'}`}
      aria-label={label}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { soundEnabled, setSoundEnabled, animationSpeed, setAnimationSpeed } = useSettings();
  const t = useTranslation();

  const themeOptions: Array<{ value: 'light' | 'dark' | 'system'; label: string }> = [
    { value: 'light', label: t.settings.themeLight },
    { value: 'dark', label: t.settings.themeDark },
    { value: 'system', label: t.settings.themeSystem },
  ];

  const speedOptions: Array<{ value: AnimationSpeed; label: string }> = [
    { value: 'normal', label: t.settings.animationNormal },
    { value: 'fast', label: t.settings.animationFast },
    { value: 'off', label: t.settings.animationOff },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-stone-100">{t.settings.title}</h1>

      <div className="space-y-4">
        {/* Theme */}
        <SettingCard>
          <h2 className="mb-3 text-sm font-semibold text-stone-300">{t.settings.theme}</h2>
          <div className="flex gap-2" role="radiogroup" aria-label={t.settings.theme}>
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                role="radio"
                aria-checked={theme === opt.value}
                onClick={() => setTheme(opt.value)}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  theme === opt.value
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                    : 'border-stone-700 text-stone-400 hover:text-stone-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SettingCard>

        {/* Sound */}
        <SettingCard>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-stone-300">{t.settings.sound}</h2>
              <p className="text-xs text-stone-500">
                {soundEnabled ? t.settings.soundOn : t.settings.soundOff}
              </p>
            </div>
            <Toggle enabled={soundEnabled} onChange={setSoundEnabled} label={t.settings.sound} />
          </div>
        </SettingCard>

        {/* Animation Speed */}
        <SettingCard>
          <h2 className="mb-3 text-sm font-semibold text-stone-300">{t.settings.animationSpeed}</h2>
          <div className="flex gap-2" role="radiogroup" aria-label={t.settings.animationSpeed}>
            {speedOptions.map((opt) => (
              <button
                key={opt.value}
                role="radio"
                aria-checked={animationSpeed === opt.value}
                onClick={() => setAnimationSpeed(opt.value)}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  animationSpeed === opt.value
                    ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                    : 'border-stone-700 text-stone-400 hover:text-stone-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SettingCard>

        {/* Language */}
        <SettingCard>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-stone-300">{t.settings.language}</h2>
              <p className="text-xs text-stone-500">{t.settings.languageEnglish}</p>
            </div>
            <span className="rounded bg-stone-800 px-2 py-0.5 text-xs text-stone-500">English</span>
          </div>
        </SettingCard>
      </div>

      <div className="mt-6">
        <Link href="/lobby" className="text-sm text-amber-500 hover:text-amber-400">
          &larr; Back to Lobby
        </Link>
      </div>
    </div>
  );
}
