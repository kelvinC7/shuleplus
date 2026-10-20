import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { loginIdentifierSchema } from '../utils/login-identifier';

const loginSchema = z
  .object({
    email: loginIdentifierSchema.optional(),
    identifier: loginIdentifierSchema.optional(),
    password: z.string().min(1),
    rememberMe: z.boolean().optional(),
  })
  .refine((body) => Boolean(body.email || body.identifier), {
    message: 'Email or phone is required',
    path: ['email'],
  });

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

const forgotPasswordOtpSchema = z.object({
  email: z.string().email(),
});

const resetPasswordOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
  password: z.string().min(8),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const updateProfileSchema = z.object({
  avatarUrl: z.string().url().optional().nullable().or(z.literal('')),
});

export class AuthController {
  /**
   * @swagger
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Authenticate user with email or phone and password
   *     description: Validates credentials, organization status, and account state. Returns JWT tokens and user profile on success. May require MFA for privileged roles.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginRequest'
   *     responses:
   *       200:
   *         description: Login successful or MFA required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/LoginResponse'
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       423:
   *         description: Account temporarily locked
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = loginSchema.parse(req.body);
      const result = await authService.login({
        email: (body.email ?? body.identifier) as string,
        password: body.password,
        rememberMe: body.rememberMe,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Log out current session
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logged out successfully
   *       401:
   *         description: Not authenticated
   */
  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      await authService.logout(user.sub, user.sessionId);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Refresh access token
   *     description: Exchange a valid refresh token for a new access token.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RefreshRequest'
   *     responses:
   *       200:
   *         description: New access token issued
   *       401:
   *         description: Invalid refresh token
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await authService.refresh(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /auth/forgot-password:
   *   post:
   *     tags: [Auth]
   *     summary: Request password reset email
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ForgotPasswordRequest'
   *     responses:
   *       200:
   *         description: Reset email sent if account exists
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(email);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /auth/reset-password:
   *   post:
   *     tags: [Auth]
   *     summary: Reset password with token
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ResetPasswordRequest'
   *     responses:
   *       200:
   *         description: Password reset successful
   *       400:
   *         description: Invalid token or password policy violation
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(token, password);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async forgotPasswordOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = forgotPasswordOtpSchema.parse(req.body);
      const result = await authService.forgotPasswordOtp(email);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async resetPasswordOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, code, password } = resetPasswordOtpSchema.parse(req.body);
      const result = await authService.resetPasswordOtp(email, code, password);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /auth/verify-email:
   *   post:
   *     tags: [Auth]
   *     summary: Verify email address
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/VerifyEmailRequest'
   *     responses:
   *       200:
   *         description: Email verified successfully
   *       400:
   *         description: Invalid or expired token
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = verifyEmailSchema.parse(req.body);
      await authService.verifyEmail(token);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const result = await authService.changePassword(
        req.user!.sub,
        currentPassword,
        newPassword
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await authService.getMe(req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = updateProfileSchema.parse(req.body);
      const avatarUrl =
        body.avatarUrl === undefined ? undefined : body.avatarUrl?.trim() ? body.avatarUrl.trim() : null;
      if (avatarUrl === undefined) {
        res.json({ success: true, data: await authService.getMe(req.user!.sub) });
        return;
      }
      await authService.updateAvatar(req.user!.sub, avatarUrl);
      const data = await authService.getMe(req.user!.sub);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
