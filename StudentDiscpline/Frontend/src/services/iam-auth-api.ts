import axios from 'axios';

const IAM_API_URL = process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';

export interface IamLoginUser {
  id: string;
  email: string;
  roles: string[];
  mustChangePassword?: boolean;
}

export interface IamLoginResult {
  requiresMfa: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: IamLoginUser;
  mfaSessionToken?: string;
  deliveryMessage?: string;
}

export async function iamLogin(email: string, password: string, rememberMe = false) {
  const { data } = await axios.post<{ data: IamLoginResult }>(`${IAM_API_URL}/auth/login`, {
    email,
    password,
    rememberMe,
  });
  return data.data;
}
