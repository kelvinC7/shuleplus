import axios, { type InternalAxiosRequestConfig } from 'axios';
import { getToken, setToken } from '@/shared/auth-token';
import { refreshAccessToken } from '@/services/api';

const IAM_API = process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';

const iamApi = axios.create({
  baseURL: IAM_API,
  headers: { 'Content-Type': 'application/json' },
});

iamApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

iamApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        setToken(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return iamApi(original);
      }
    }
    return Promise.reject(error);
  }
);

export interface LicensedModuleOption {
  slug: string;
  name: string;
  shortName?: string | null;
}

export interface UserAccessLookup {
  found: boolean;
  email: string;
  assignedModuleSlugs: string[];
  licensedModules: LicensedModuleOption[];
}

export const hrIamApi = {
  licensedModules: () =>
    iamApi.get<{ success: boolean; data: LicensedModuleOption[] }>('/iam/org/licensed-modules'),
  lookupUserAccess: (email: string) =>
    iamApi.get<{ success: boolean; data: UserAccessLookup }>('/iam/users/access-lookup', {
      params: { email },
    }),
};
