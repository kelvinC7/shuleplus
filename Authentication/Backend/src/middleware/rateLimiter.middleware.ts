import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.MAX_LOGIN_ATTEMPTS * 3,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});
