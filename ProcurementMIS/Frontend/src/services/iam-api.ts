import axios from 'axios';
import { getToken } from '@/shared/auth-token';

const IAM_API_URL = process.env.NEXT_PUBLIC_IAM_API_URL ?? 'http://localhost:3001/api/v1';
export const PROCUREMENT_MODULE_SLUG =
  process.env.NEXT_PUBLIC_MODULE_SLUG ?? 'procurement-mis';

export type ModuleAccessLevel = 'USER' | 'HEAD';

export interface ModuleVisibility {
  accessLevel: ModuleAccessLevel;
  dataScope: string;
  canViewAll: boolean;
}

export async function fetchProcurementModuleVisibility(): Promise<ModuleVisibility | null> {
  const token = getToken();
  if (!token) return null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { data } = await axios.get<{ success: boolean; data: ModuleVisibility }>(
        `${IAM_API_URL}/iam/me/modules/${PROCUREMENT_MODULE_SLUG}/visibility`,
        { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 },
      );
      return data.data;
    } catch {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
  }
  return null;
}
