import { calcBankTotal } from '@/lib/circular-totals';
import type { Circular, WizardFormState } from '@/types';

/** Map wizard form → Circular shape for View & Print preview before publish. */
export function wizardFormToDraftCircular(
  form: WizardFormState,
  opts?: { id?: string | null; version?: number }
): Circular {
  const totalFee = calcBankTotal(form.payments);
  const now = new Date().toISOString();

  return {
    id: opts?.id || 'draft-preview',
    organizationId: '',
    academicYear: form.academicYear,
    term: form.term,
    className: form.classes[0] || form.className,
    classes: form.classes.length ? form.classes : form.className ? [form.className] : [],
    schoolCategory: form.schoolCategory,
    ownershipType: form.ownershipType,
    feeTargetStudents: form.feeTargetStudents,
    province: form.province,
    district: form.district,
    sector: form.sector,
    language: form.language,
    parentMessage: form.parentMessage,
    payments: form.payments,
    requirements: form.requirements,
    banks: form.banks,
    classReqs: form.classReqs,
    otherInfos: form.otherInfos,
    announcements: form.includeAnnouncements ? form.announcements : [],
    includeAnnouncements: form.includeAnnouncements,
    includeSchoolDescription: form.includeSchoolDescription,
    descriptionLines: form.descriptionLines,
    leaders: form.leaders,
    status: 'DRAFT',
    version: opts?.version ?? 1,
    totalFee,
    requestIncrease: form.requestIncrease,
    increaseReason: form.increaseReason,
    downloadCount: 0,
    viewCount: 0,
    qrScanCount: 0,
    shareCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}
