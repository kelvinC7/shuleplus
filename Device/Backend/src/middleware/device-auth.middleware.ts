import { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';
import * as ingestion from '../services/ingestion.service';

export interface DeviceAuthRequest extends Request {
  device?: Awaited<ReturnType<typeof ingestion.authenticateDevice>>;
}

export async function requireDeviceAuth(
  req: DeviceAuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deviceCode =
      (typeof req.headers['x-device-code'] === 'string' && req.headers['x-device-code']) ||
      (typeof req.body?.deviceCode === 'string' && req.body.deviceCode) ||
      '';

    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const token =
      bearer ||
      (typeof req.headers['x-device-token'] === 'string' && req.headers['x-device-token']) ||
      (typeof req.body?.deviceToken === 'string' && req.body.deviceToken) ||
      '';

    if (!deviceCode || !token) {
      throw new AppError(401, 'Device authentication required (x-device-code + Bearer token)');
    }

    req.device = await ingestion.authenticateDevice(deviceCode, token);
    next();
  } catch (err) {
    next(err);
  }
}
