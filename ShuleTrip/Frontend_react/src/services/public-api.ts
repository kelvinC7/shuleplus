import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3076/api';

export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

export interface PublicTripVerification {
  reference: string;
  title: string;
  purpose?: string | null;
  destination?: string | null;
  departAt?: string | null;
  returnAt?: string | null;
  status: string;
  tripLeaderName?: string | null;
  organizationName?: string | null;
  schoolCode?: string | null;
  district?: string | null;
  access: { allowed: boolean; headline: string; detail: string };
  governmentDecision?: {
    decision: string;
    stageLabel: string;
    reason?: string | null;
    decidedAt?: string | null;
  } | null;
  counts: {
    participants: number;
    staff: number;
    documents: number;
    consentRecorded: number;
  };
  participants: Array<{
    fullName: string;
    studentCode?: string | null;
    classLabel?: string | null;
    guardianConsent: boolean;
  }>;
  staff: Array<{ fullName: string; role: string; isLeader: boolean }>;
  vehicle?: { mode?: string | null; plateNumber?: string | null; driverName?: string | null } | null;
  authorization?: {
    authorizationNo: string;
    issuedAt: string;
    issuedByName?: string | null;
    conditions: string[];
    revokedAt?: string | null;
  } | null;
}
