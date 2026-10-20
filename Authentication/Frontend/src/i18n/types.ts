export type AppLang = 'en' | 'rw' | 'fr' | 'sw';

export const APP_LANGUAGES = [
  { code: 'en' as const, display: 'ENG', flag: 'gb', alt: 'United Kingdom', native: 'English' },
  { code: 'rw' as const, display: 'KIN', flag: 'rw', alt: 'Rwanda', native: 'Ikinyarwanda' },
  { code: 'fr' as const, display: 'FRA', flag: 'fr', alt: 'France', native: 'Français' },
  { code: 'sw' as const, display: 'SWA', flag: 'ke', alt: 'Kenya', native: 'Kiswahili' },
] as const;

export const LANG_STORAGE_KEY = 'shuleplus-lang';

export function isAppLang(value: string | null | undefined): value is AppLang {
  return value === 'en' || value === 'rw' || value === 'fr' || value === 'sw';
}

export function displayCodeToLang(code: string): AppLang {
  const map: Record<string, AppLang> = { ENG: 'en', KIN: 'rw', FRA: 'fr', SWA: 'sw' };
  return map[code] ?? 'en';
}

export function langToDisplayCode(lang: AppLang): string {
  return APP_LANGUAGES.find((l) => l.code === lang)?.display ?? 'ENG';
}
