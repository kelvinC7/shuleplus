import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export type GovOfficialStatus = 'invited' | 'active' | 'suspended';

export interface GovOfficialRecord {
  id: string;
  fullName: string;
  email: string;
  employeeRef?: string;
  roleSlug: string;
  authority: string;
  jurisdictionScope: 'assigned_only' | 'sectors' | 'districts' | 'national';
  districts: string[];
  sectors: string[];
  permissions: string[];
  canFinalApprove: boolean;
  status: GovOfficialStatus;
  invitedAt: string;
  lastLoginAt?: string | null;
  assignedApplicationCount: number;
}

const STORE_PATH = path.join(process.cwd(), 'data', 'gov-officials.json');

async function readStore(): Promise<GovOfficialRecord[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as GovOfficialRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeStore(rows: GovOfficialRecord[]) {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(rows, null, 2), 'utf8');
}

export class GovAdminService {
  async listOfficials(): Promise<GovOfficialRecord[]> {
    const rows = await readStore();
    return rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  async createOfficial(input: Omit<GovOfficialRecord, 'id' | 'invitedAt' | 'assignedApplicationCount'>): Promise<GovOfficialRecord> {
    const rows = await readStore();
    const email = input.email.trim().toLowerCase();
    if (rows.some((r) => r.email.toLowerCase() === email)) {
      throw new Error('An official with this email already exists');
    }
    const record: GovOfficialRecord = {
      ...input,
      id: randomUUID(),
      email,
      invitedAt: new Date().toISOString(),
      assignedApplicationCount: 0,
    };
    rows.push(record);
    await writeStore(rows);
    return record;
  }

  async updateOfficial(id: string, patch: Partial<GovOfficialRecord>): Promise<GovOfficialRecord> {
    const rows = await readStore();
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error('Official not found');
    const next = { ...rows[idx], ...patch, id: rows[idx].id, email: rows[idx].email };
    rows[idx] = next;
    await writeStore(rows);
    return next;
  }

  async deleteOfficial(id: string): Promise<void> {
    const rows = await readStore();
    await writeStore(rows.filter((r) => r.id !== id));
  }
}

export const govAdminService = new GovAdminService();
