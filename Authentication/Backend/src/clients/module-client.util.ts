import { AppError } from '../middleware/error.middleware';

type ServiceJson = { success?: boolean; message?: string };

export function throwModuleClientError(
  response: Response,
  body: ServiceJson,
  serviceLabel: string
): never {
  const status = response.status >= 400 && response.status < 600 ? response.status : 502;
  const message =
    (typeof body.message === 'string' && body.message.trim()) ||
    `${serviceLabel} request failed (${response.status})`;
  throw new AppError(status, message);
}

export function throwModuleUnavailable(serviceLabel: string): never {
  throw new AppError(503, `${serviceLabel} is unavailable. Check that the service is running and configured.`);
}
