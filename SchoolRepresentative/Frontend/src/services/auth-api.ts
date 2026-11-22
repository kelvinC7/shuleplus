import axios from 'axios';

export const IAM_API_BASE_URL =
  process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles?: string[];
  permissions?: string[];
  modules?: string[];
  organization?: { id: string; name: string; slug: string; type: string };
  dashboardRoute?: string;
}

export interface LoginSuccess {
  requiresMfa: false;
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  user: AuthUser;
}

export interface LoginMfaRequired {
  requiresMfa: true;
  mfaSessionToken: string;
  userId?: string;
  methods?: string[];
  deliveryMessage?: string;
  devOtpHint?: string;
  otpDelivery?: { email?: boolean; sms?: boolean; phoneMasked?: string | null };
}

export type LoginResult = LoginSuccess | LoginMfaRequired;

export interface MfaVerifyResult extends Partial<LoginSuccess> {
  requiresSecondOtp?: boolean;
  step?: number;
  mfaSessionToken?: string;
  deliveryMessage?: string;
  devOtpHint?: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const { data } = await axios.post(`${IAM_API_BASE_URL}${path}`, body, {
    headers: { 'Content-Type': 'application/json' },
  });
  return (data?.data ?? data) as T;
}

export function loginRequest(input: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<LoginResult> {
  return post<LoginResult>('/auth/login', input);
}

export function verifyMfaRequest(input: {
  mfaSessionToken: string;
  code: string;
  method: 'email_otp' | 'authenticator';
}): Promise<MfaVerifyResult> {
  return post<MfaVerifyResult>('/mfa/verify', input);
}

export function resendMfaOtp(mfaSessionToken: string): Promise<{
  message?: string;
  devMode?: boolean;
}> {
  return post('/mfa/resend-otp', { mfaSessionToken });
}

export function authErrorMessage(err: unknown, fallback = 'Unable to sign in'): string {
  const response = (err as { response?: { data?: { message?: string; error?: string } } })?.response;
  if (!response) {
    return 'Cannot reach the authentication service. Check that the IAM backend is running and try again.';
  }
  return response.data?.message ?? response.data?.error ?? fallback;
}
