import { prisma } from '../config/database';
import {
  fetchIamAcademicSettings,
  fetchIamSchoolProfile,
  updateIamAcademicSettings,
  type AcademicSettings,
} from '../clients/iam.client';

export interface SignatoryInfo {
  name: string;
  title: string;
  signatureUrl?: string;
}

export interface ProcurementReceiptSettings {
  verifier: SignatoryInfo;
  approver: SignatoryInfo;
  supplier: SignatoryInfo;
}

const SETTINGS_KEY = 'procurement.receipt';

const DEFAULT_SIGNATORY = (): SignatoryInfo => ({
  name: '',
  title: '',
  signatureUrl: '',
});

function parseReceiptSettings(raw: string | null | undefined): ProcurementReceiptSettings {
  if (!raw) {
    return {
      verifier: DEFAULT_SIGNATORY(),
      approver: DEFAULT_SIGNATORY(),
      supplier: DEFAULT_SIGNATORY(),
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ProcurementReceiptSettings>;
    return {
      verifier: { ...DEFAULT_SIGNATORY(), ...parsed.verifier },
      approver: { ...DEFAULT_SIGNATORY(), ...parsed.approver },
      supplier: { ...DEFAULT_SIGNATORY(), ...parsed.supplier },
    };
  } catch {
    return {
      verifier: DEFAULT_SIGNATORY(),
      approver: DEFAULT_SIGNATORY(),
      supplier: DEFAULT_SIGNATORY(),
    };
  }
}

export class SettingsService {
  async getReceiptSettings(organizationId: string): Promise<ProcurementReceiptSettings> {
    const row = await prisma.setting.findUnique({
      where: { organizationId_key: { organizationId, key: SETTINGS_KEY } },
    });
    const settings = parseReceiptSettings(row?.value);

    if (!settings.approver.name) {
      const profile = await fetchIamSchoolProfile(organizationId);
      if (profile?.principalName) {
        settings.approver = {
          name: profile.principalName,
          title: 'Head Teacher / Principal',
          signatureUrl: profile.signatureUrl ?? '',
        };
      }
    }

    return settings;
  }

  async updateReceiptSettings(
    organizationId: string,
    settings: ProcurementReceiptSettings,
  ): Promise<ProcurementReceiptSettings> {
    await prisma.setting.upsert({
      where: { organizationId_key: { organizationId, key: SETTINGS_KEY } },
      create: { organizationId, key: SETTINGS_KEY, value: JSON.stringify(settings) },
      update: { value: JSON.stringify(settings) },
    });
    return settings;
  }

  async getAcademicSettings(organizationId: string): Promise<AcademicSettings> {
    const fromIam = await fetchIamAcademicSettings(organizationId);
    return (
      fromIam ?? {
        academicYears: [],
        terms: [],
        currentAcademicYear: null,
        currentTerm: null,
      }
    );
  }

  async updateAcademicSettings(
    organizationId: string,
    settings: AcademicSettings,
  ): Promise<AcademicSettings> {
    const updated = await updateIamAcademicSettings(organizationId, settings);
    return (
      updated ?? {
        academicYears: settings.academicYears ?? [],
        terms: settings.terms ?? [],
        currentAcademicYear: settings.currentAcademicYear ?? null,
        currentTerm: settings.currentTerm ?? null,
      }
    );
  }

  async getOrgProfile(organizationId: string) {
    return fetchIamSchoolProfile(organizationId);
  }
}

export const settingsService = new SettingsService();
