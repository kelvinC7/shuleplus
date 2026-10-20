import { Router } from 'express';
import { mfaController } from '../controllers/mfa.controller';
import { authenticate } from '../middleware/auth.middleware';
import { loginRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/resend-otp', (req, res, next) => mfaController.resendOtp(req, res, next));

router.post('/verify', loginRateLimiter, (req, res, next) =>
  mfaController.verify(req, res, next)
);

router.post('/status', (req, res, next) => mfaController.status(req, res, next));

router.post('/authenticator/setup', (req, res, next) =>
  mfaController.setupAuthenticator(req, res, next)
);

router.post('/authenticator/confirm', (req, res, next) =>
  mfaController.confirmAuthenticator(req, res, next)
);

router.post('/authenticator/confirm-authenticated', authenticate, (req, res, next) =>
  mfaController.confirmAuthenticator(req, res, next)
);

export default router;
