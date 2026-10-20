import axios from 'axios';

const IAM_API_URL = process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';

export interface IamLoginUser {
  id: string;
  email: string;
  roles: string[];
  mustChangePassword?: boolean;
  position?: string | null;
  defaultLaunch?: {
    slug: string;
    name: string;
    frontendUrl: string | null;
    entryPath?: string;
  } | null;
}

export interface IamLoginResult {
  requiresMfa: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: IamLoginUser;
  mfaSessionToken?: string;
  deliveryMessage?: string;
  devOtpHint?: string;
  authenticatorEnabled?: boolean;
  otpDelivery?: { sms?: boolean; phoneMasked?: string };
}

export async function iamLogin(email: string, password: string, rememberMe: boolean) {
  const { data } = await axios.post<{ data: IamLoginResult }>(`${IAM_API_URL}/auth/login`, {
    email,
    password,
    rememberMe,
  });
  return data.data;
}

export async function iamVerifyMfa(mfaSessionToken: string, code: string, method: 'email_otp' | 'authenticator') {
  const { data } = await axios.post<{ data: { accessToken: string; refreshToken: string; user: IamLoginUser } }>(
    `${IAM_API_URL}/auth/mfa/verify`,
    { mfaSessionToken, code, method }
  );
  return data.data;
}

export async function iamResendMfaOtp(mfaSessionToken: string) {
  const { data } = await axios.post<{ data: { deliveryMessage?: string } }>(`${IAM_API_URL}/auth/mfa/resend`, {
    mfaSessionToken,
  });
  return data.data;
}
