import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { DeveloperEnvironment } from '../generated/prisma';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { DeveloperAuthenticatedRequest, DeveloperJwtPayload } from './developer-auth.middleware';
import {
  developerGatewayService,
  GatewayContext,
} from '../services/developer-gateway.service';

interface ApiClientJwtPayload {
  sub: string;
  partnerId: string;
  scopes: string[];
  environment: string;
  type: 'api_client';
}

export interface GatewayRequest extends DeveloperAuthenticatedRequest {
  gatewayContext?: GatewayContext;
}

export async function authenticateGateway(
  req: GatewayRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError(401, 'Bearer token required for API gateway'));
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as
      | DeveloperJwtPayload
      | ApiClientJwtPayload;

    if ('portal' in payload && payload.portal === 'developer') {
      const envHeader = req.headers['x-developer-environment'];
      const environment =
        envHeader === 'PRODUCTION'
          ? DeveloperEnvironment.PRODUCTION
          : DeveloperEnvironment.SANDBOX;
      req.gatewayContext = await developerGatewayService.resolveContextFromDeveloperUser(
        payload.sub,
        environment
      );
      req.developer = payload;
      next();
      return;
    }

    if ('type' in payload && payload.type === 'api_client') {
      req.gatewayContext = await developerGatewayService.resolveContextFromApiClient(
        payload.sub
      );
      next();
      return;
    }

    next(new AppError(401, 'Invalid gateway token'));
  } catch {
    next(new AppError(401, 'Invalid or expired gateway token'));
  }
}
