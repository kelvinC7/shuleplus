import { env } from '../config/env';

export type NesaResolveInput = {
  ownershipType?: string;
  feeTargetStudents?: string;
  academicYear?: string;
  term?: string | number;
  educationLevel?: string;
  studentType?: string;
  classLabel?: string;
};

export type NesaResolveResult = {
  applies: boolean;
  reason?: string;
  tuitionMaxRwf?: number | null;
  generalAssemblyMaxRwf?: number | null;
  totalMaxRwf?: number | null;
  limit?: number | null;
  policies?: Array<Record<string, unknown>>;
  academicYear?: string | null;
  term?: number | null;
  educationLevel?: string;
  studentType?: string;
};

function baseUrl() {
  return (env.NESA_API_URL ?? 'http://localhost:3014/api').replace(/\/$/, '');
}

export async function resolveNesaPolicy(input: NesaResolveInput): Promise<NesaResolveResult | null> {
  try {
    const qs = new URLSearchParams();
    if (input.ownershipType) qs.set('ownershipType', input.ownershipType);
    if (input.feeTargetStudents) qs.set('feeTargetStudents', input.feeTargetStudents);
    if (input.academicYear) qs.set('academicYear', input.academicYear);
    if (input.term != null) qs.set('term', String(input.term));
    if (input.educationLevel) qs.set('educationLevel', input.educationLevel);
    if (input.studentType) qs.set('studentType', input.studentType);
    if (input.classLabel) qs.set('classLabel', input.classLabel);

    const response = await fetch(`${baseUrl()}/internal/policy-engine/resolve?${qs}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': env.SERVICE_API_KEY,
        'x-source-service': 'babyeyi-wizard',
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { success?: boolean; data?: NesaResolveResult };
    return body.data ?? null;
  } catch {
    return null;
  }
}
