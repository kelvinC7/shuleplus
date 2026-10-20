import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

const SETTINGS_ID = 'default';

let cachedPublicApiUrl: string | null = null;

export type DeveloperUrlSource = 'database' | 'environment' | 'frontend' | 'localhost';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/** Normalize Super Admin input — accepts base domain or full /api/v1 URL. */
export function normalizePublicApiUrlInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new AppError(400, 'Public API URL is required');
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new AppError(400, 'URL must start with http:// or https://');
  }

  let url = stripTrailingSlash(trimmed);
  if (!/\/api\/v1$/i.test(url)) {
    url = `${url}${env.API_PREFIX}`;
  }
  return stripTrailingSlash(url);
}

function resolveFromEnvironment(): { url: string; source: DeveloperUrlSource } {
  const explicit =
    process.env.PUBLIC_API_URL?.trim() || process.env.IAM_PUBLIC_API_URL?.trim();
  if (explicit) {
    return { url: stripTrailingSlash(explicit), source: 'environment' };
  }

  const frontend = env.FRONTEND_URL.replace(/\/$/, '');
  if (/localhost|127\.0\.0\.1/i.test(frontend)) {
    return {
      url: stripTrailingSlash(`http://localhost:${env.PORT}${env.API_PREFIX}`),
      source: 'localhost',
    };
  }

  if (/\/api\/v1$/i.test(frontend)) {
    return { url: frontend, source: 'frontend' };
  }

  return {
    url: stripTrailingSlash(`${frontend}${env.API_PREFIX}`),
    source: 'frontend',
  };
}

export function getCachedPublicApiUrl(): string | null {
  return cachedPublicApiUrl;
}

export function setCachedPublicApiUrl(url: string | null): void {
  cachedPublicApiUrl = url?.trim() ? stripTrailingSlash(url) : null;
}

/** Load DB setting into memory — call on server startup. */
export async function loadDeveloperPortalSettingsCache(): Promise<void> {
  try {
    const row = await prisma.developerPortalSettings.findUnique({
      where: { id: SETTINGS_ID },
    });
    setCachedPublicApiUrl(row?.publicApiUrl ?? null);
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: string }).code)
        : '';
    if (code === 'P2021') {
      console.warn(
        '[DeveloperPortalSettings] Table missing — run scripts/apply-developer-portal-db.sh (using env fallback)'
      );
    } else {
      console.warn('[DeveloperPortalSettings] Could not load cache:', err);
    }
    setCachedPublicApiUrl(null);
  }
}

export function resolvePublicApiBaseUrlSync(): string {
  if (cachedPublicApiUrl) {
    return cachedPublicApiUrl;
  }
  return resolveFromEnvironment().url;
}

export function resolveDeveloperGatewayBaseUrlSync(): string {
  return `${resolvePublicApiBaseUrlSync()}/developers/gateway`;
}

export function resolveModuleGatewayBaseUrlSync(moduleSlug: string): string {
  return `${resolveDeveloperGatewayBaseUrlSync()}/${moduleSlug}`;
}

export async function getDeveloperPortalSettings() {
  const row = await prisma.developerPortalSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  const configuredUrl = row?.publicApiUrl?.trim() || null;
  const resolved = resolvePublicApiBaseUrlSync();
  const source: DeveloperUrlSource = configuredUrl
    ? 'database'
    : resolveFromEnvironment().source;

  return {
    publicApiUrl: configuredUrl,
    resolvedPublicApiUrl: resolved,
    gatewayBaseUrl: `${resolved}/developers/gateway`,
    source,
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function updateDeveloperPortalSettings(input: {
  publicApiUrl: string | null;
  updatedById: string;
}) {
  const normalized =
    input.publicApiUrl && input.publicApiUrl.trim()
      ? normalizePublicApiUrlInput(input.publicApiUrl)
      : null;

  const row = await prisma.developerPortalSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      publicApiUrl: normalized,
      updatedById: input.updatedById,
    },
    update: {
      publicApiUrl: normalized,
      updatedById: input.updatedById,
    },
  });

  setCachedPublicApiUrl(normalized);

  return getDeveloperPortalSettings().then((settings) => ({
    ...settings,
    updatedAt: row.updatedAt,
  }));
}
