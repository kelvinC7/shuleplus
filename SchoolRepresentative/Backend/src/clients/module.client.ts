import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

type ServiceEnvelope<T> = { success?: boolean; data?: T; message?: string };

export interface ModuleRequest {
  /** Service label used in error messages, e.g. "Student Management". */
  service: string;
  baseUrl: string;
  path: string;
  organizationId: string;
  query?: Record<string, string | undefined>;
  method?: 'GET' | 'POST';
  body?: unknown;
}

/**
 * Call a Shule+ module's service-to-service API.
 * Mirrors the IAM `smart-access-module.client.ts` conventions:
 * x-service-key + x-organization-id headers and the shared success envelope.
 */
export async function moduleRequest<T>(request: ModuleRequest): Promise<T> {
  const url = new URL(
    `${request.baseUrl.replace(/\/$/, '')}${request.path.startsWith('/') ? request.path : `/${request.path}`}`
  );
  url.searchParams.set('organizationId', request.organizationId);
  for (const [key, value] of Object.entries(request.query ?? {})) {
    if (value !== undefined && value !== '') url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: request.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'director-console',
        'x-organization-id': request.organizationId,
      },
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new AppError(
      502,
      `${request.service} is unreachable — start the module backend or use demo mode`,
      'MODULE_UNREACHABLE'
    );
  }

  const body = (await response.json().catch(() => ({}))) as ServiceEnvelope<T> & { message?: string };
  if (!response.ok) {
    // Never forward upstream 401/403 as a user session failure — that would
    // cause the browser to clear the Director session token. Treat module
    // auth/connectivity issues as a bad-gateway integration error instead.
    const status =
      response.status === 401 || response.status === 403 ? 502 : response.status;
    const message =
      response.status === 401 || response.status === 403
        ? `${request.service} rejected the service request (${response.status}). Check SERVICE_API_KEY/module access on the server.`
        : body.message ?? `${request.service} request failed (${response.status})`;
    throw new AppError(status, message, 'MODULE_ERROR');
  }
  return body.data as T;
}

/** Same as moduleRequest but returns null instead of throwing. */
export async function moduleRequestSafe<T>(request: ModuleRequest): Promise<T | null> {
  try {
    return await moduleRequest<T>(request);
  } catch {
    return null;
  }
}
