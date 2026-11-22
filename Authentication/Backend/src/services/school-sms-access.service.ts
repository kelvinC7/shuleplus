import { rootAdminService } from './root-admin.service';
import { ChatSchoolSmsRow, internalChatClient } from '../clients/internal-chat.client';

export type SchoolSmsAccessRow = {
  organizationId: string;
  organizationName: string;
  organizationCode: string | null;
  smsEnabled: boolean;
  maxSegments: number;
  segmentsUsed: number;
  remaining: number;
  quotaPeriod: string;
  parentPackagesEnabled?: boolean;
  momoPayeeNumber?: string | null;
};

function defaultRow(org: {
  id: string;
  name: string;
  organizationCode: string | null;
}): SchoolSmsAccessRow {
  return {
    organizationId: org.id,
    organizationName: org.name,
    organizationCode: org.organizationCode,
    smsEnabled: false,
    maxSegments: 0,
    segmentsUsed: 0,
    remaining: 0,
    quotaPeriod: 'MONTHLY',
  };
}

function fromChat(row: ChatSchoolSmsRow): SchoolSmsAccessRow {
  return {
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    organizationCode: row.organizationCode,
    smsEnabled: row.smsEnabled,
    maxSegments: row.maxSegments,
    segmentsUsed: row.segmentsUsed,
    remaining: row.remaining,
    quotaPeriod: row.quotaPeriod,
    parentPackagesEnabled: row.parentPackagesEnabled,
    momoPayeeNumber: row.momoPayeeNumber,
  };
}

export async function listSchoolSmsAccessForSuperAdmin(): Promise<{
  rows: SchoolSmsAccessRow[];
  chatApiOk: boolean;
  chatError?: string;
}> {
  const organizations = await rootAdminService.listOrganizations();
  let chatRows: ChatSchoolSmsRow[] = [];
  let chatApiOk = false;
  let chatError: string | undefined;

  try {
    chatRows = await internalChatClient.listSchoolSmsSettings();
    chatApiOk = true;
  } catch (e) {
    chatError = e instanceof Error ? e.message : 'Internal Chat API unavailable';
  }

  const chatByOrg = new Map(chatRows.map((r) => [r.organizationId, r]));

  const rows = organizations
    .map((org) => {
      const chat = chatByOrg.get(org.id);
      if (!chat) return defaultRow(org);
      return {
        ...fromChat(chat),
        organizationName: org.name,
        organizationCode: org.organizationCode ?? chat.organizationCode,
      };
    })
    .sort((a, b) => a.organizationName.localeCompare(b.organizationName));

  for (const chat of chatRows) {
    if (!rows.some((r) => r.organizationId === chat.organizationId)) {
      rows.push(fromChat(chat));
    }
  }

  return { rows, chatApiOk, chatError };
}
