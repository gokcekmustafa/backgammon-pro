import { describe, it, expect } from 'vitest';
import en from './locales/en';

describe('English translations', () => {
  it('contains all required namespaces', () => {
    expect(en.common).toBeDefined();
    expect(en.nav).toBeDefined();
    expect(en.profile).toBeDefined();
    expect(en.match).toBeDefined();
    expect(en.leaderboard).toBeDefined();
    expect(en.settings).toBeDefined();
  });

  it('has correct common translations', () => {
    expect(en.common.loading).toBe('Loading...');
    expect(en.common.error).toBe('An error occurred');
    expect(en.common.search).toBe('Search');
  });

  it('has correct settings translations', () => {
    expect(en.settings.theme).toBe('Theme');
    expect(en.settings.themeLight).toBe('Light');
    expect(en.settings.themeDark).toBe('Dark');
    expect(en.settings.themeSystem).toBe('System');
    expect(en.settings.language).toBe('Language');
    expect(en.settings.languageEnglish).toBe('English');
  });
});
