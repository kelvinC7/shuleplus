import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { loginRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/login', loginRateLimiter, (req, res, next) =>
  authController.login(req, res, next)
);

router.post('/logout', authenticate, (req, res, next) =>
  authController.logout(req, res, next)
);

router.post('/refresh', (req, res, next) =>
  authController.refresh(req, res, next)
);

router.post('/forgot-password', loginRateLimiter, (req, res, next) =>
  authController.forgotPassword(req, res, next)
);

router.post('/forgot-password-otp', loginRateLimiter, (req, res, next) =>
  authController.forgotPasswordOtp(req, res, next)
);

router.post('/reset-password', (req, res, next) =>
  authController.resetPassword(req, res, next)
);

router.post('/reset-password-otp', loginRateLimiter, (req, res, next) =>
  authController.resetPasswordOtp(req, res, next)
);

router.post('/verify-email', (req, res, next) =>
  authController.verifyEmail(req, res, next)
);

router.post('/change-password', authenticate, (req, res, next) =>
  authController.changePassword(req, res, next)
);

router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));

router.patch('/profile', authenticate, (req, res, next) =>
  authController.updateProfile(req, res, next)
);

export default router;
