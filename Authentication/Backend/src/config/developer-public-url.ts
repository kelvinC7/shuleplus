import {
  resolveDeveloperGatewayBaseUrlSync,
  resolveModuleGatewayBaseUrlSync,
  resolvePublicApiBaseUrlSync,
} from '../services/developer-portal-settings.service';

/** Public IAM API base — Super Admin DB setting, then env, then localhost. */
export function resolvePublicApiBaseUrl(): string {
  return resolvePublicApiBaseUrlSync();
}

/** Full gateway prefix: …/api/v1/developers/gateway */
export function resolveDeveloperGatewayBaseUrl(): string {
  return resolveDeveloperGatewayBaseUrlSync();
}

/** Per-module gateway base: …/developers/gateway/{moduleSlug} */
export function resolveModuleGatewayBaseUrl(moduleSlug: string): string {
  return resolveModuleGatewayBaseUrlSync(moduleSlug);
}
