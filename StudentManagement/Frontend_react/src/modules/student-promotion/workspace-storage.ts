import type { PromotionMode } from './types';

const STORAGE_KEY = 'sm-promotion-workspace';

export interface StoredPromotionWorkspace {
  fromYear: string;
  toYear: string;
  mode: PromotionMode;
  fromClassId: string | null;
  toClassId: string | null;
  selectedStudentIds: string[];
  targetClassByStudent: Record<string, string>;
  configured: boolean;
}

export function loadPromotionWorkspace(): StoredPromotionWorkspace | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPromotionWorkspace;
    return parsed?.configured ? parsed : null;
  } catch {
    return null;
  }
}

export function savePromotionWorkspace(workspace: StoredPromotionWorkspace) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
}

export function clearPromotionWorkspace() {
  sessionStorage.removeItem(STORAGE_KEY);
}
