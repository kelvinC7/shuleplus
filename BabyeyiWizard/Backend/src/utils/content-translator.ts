import { env } from '../config/env';

/** Skip machine translation for values that are empty, purely numeric, or too short to matter. */
export function shouldSkipTranslation(text: string | undefined | null): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length < 2) return true;
  if (/^[\d\s.,+()/-]+$/.test(trimmed)) return true; // amounts, phone numbers, account numbers
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(trimmed)) return true; // emails
  return false;
}

interface MyMemoryResponse {
  responseData?: { translatedText?: string; match?: number };
  responseStatus?: number | string;
}

interface LibreTranslateResponse {
  translatedText?: string;
  error?: string;
}

/** Gentle rate-limit so free MyMemory API does not reject burst requests. */
let lastTranslateAt = 0;

async function throttleTranslation() {
  const now = Date.now();
  const wait = Math.max(0, 400 - (now - lastTranslateAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastTranslateAt = Date.now();
}

/**
 * MyMemory — free translation memory API, primary provider. It is the only free option
 * that actually covers Kinyarwanda (`rw`); LibreTranslate has no `rw` model.
 */
async function translateViaMyMemory(text: string, targetLang: 'rw' | 'fr'): Promise<{ text: string; ok: boolean }> {
  try {
    const url = new URL(env.MYMEMORY_URL);
    url.searchParams.set('q', text);
    url.searchParams.set('langpair', `en|${targetLang}`);
    if (env.MYMEMORY_EMAIL) url.searchParams.set('de', env.MYMEMORY_EMAIL);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return { text, ok: false };

    const data = (await res.json()) as MyMemoryResponse;
    const translated = data.responseData?.translatedText;
    const status = String(data.responseStatus ?? '');
    const match = data.responseData?.match ?? 0;

    if (!translated || status !== '200' || /MYMEMORY WARNING/i.test(translated) || match < 0.1) {
      return { text, ok: false };
    }
    return { text: translated, ok: true };
  } catch {
    return { text, ok: false };
  }
}

/** LibreTranslate — fallback provider (no Kinyarwanda coverage, useful mainly for French). */
async function translateViaLibreTranslate(text: string, targetLang: 'rw' | 'fr'): Promise<{ text: string; ok: boolean }> {
  try {
    const res = await fetch(env.LIBRETRANSLATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: targetLang,
        format: 'text',
        ...(env.LIBRETRANSLATE_API_KEY ? { api_key: env.LIBRETRANSLATE_API_KEY } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { text, ok: false };

    const data = (await res.json()) as LibreTranslateResponse;
    if (!data.translatedText || data.error) return { text, ok: false };
    return { text: data.translatedText, ok: true };
  } catch {
    return { text, ok: false };
  }
}

/**
 * Translates a single string, trying MyMemory first and falling back to LibreTranslate.
 * Never throws — a translation outage degrades to the original English text so saving a
 * circular is never blocked.
 */
export async function translateText(text: string, targetLang: 'rw' | 'fr'): Promise<{ text: string; ok: boolean }> {
  if (!env.TRANSLATION_ENABLED || shouldSkipTranslation(text)) {
    return { text, ok: true };
  }

  await throttleTranslation();
  const primary = await translateViaMyMemory(text, targetLang);
  if (primary.ok) return primary;

  await throttleTranslation();
  const fallback = await translateViaLibreTranslate(text, targetLang);
  return fallback.ok ? fallback : { text, ok: false };
}

/** Translates the same English string into both Kinyarwanda and French, in parallel. */
export async function translateToRwFr(text: string): Promise<{ rw: string; fr: string; ok: boolean }> {
  if (!text || shouldSkipTranslation(text)) {
    return { rw: text ?? '', fr: text ?? '', ok: true };
  }
  const rw = await translateText(text, 'rw');
  const fr = await translateText(text, 'fr');
  return { rw: rw.text, fr: fr.text, ok: rw.ok && fr.ok };
}
