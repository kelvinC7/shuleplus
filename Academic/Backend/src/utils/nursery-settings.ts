import { AppError } from '../middleware/error.middleware';

export type NurseryPerformanceBand = {
  label: string;
  minPercentage: number;
  maxPercentage: number;
  color: string;
};

export const DEFAULT_NURSERY_PERFORMANCE_BANDS: NurseryPerformanceBand[] = [
  { label: 'Excellent', minPercentage: 85, maxPercentage: 100, color: '#16A34A' },
  { label: 'Very Good', minPercentage: 70, maxPercentage: 84, color: '#2563EB' },
  { label: 'Good', minPercentage: 50, maxPercentage: 69, color: '#EAB308' },
  { label: 'Fair', minPercentage: 0, maxPercentage: 49, color: '#DC4545' },
];

export const DEFAULT_NURSERY_LEARNING_AREAS = [
  'Numbers',
  'English',
  'Kinyarwanda',
  'French',
  'Social Development and Health Habits',
];

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function parseNurseryPerformanceBands(raw: unknown): NurseryPerformanceBand[] {
  if (!Array.isArray(raw) || !raw.length) return DEFAULT_NURSERY_PERFORMANCE_BANDS;
  const bands = raw
    .map((row) => {
      const r = (row ?? {}) as Record<string, unknown>;
      const min = Number(r.minPercentage ?? r.min);
      const max = Number(r.maxPercentage ?? r.max);
      return {
        label: typeof r.label === 'string' ? r.label.trim() : '',
        minPercentage: Number.isFinite(min) ? min : NaN,
        maxPercentage: Number.isFinite(max) ? max : NaN,
        color: typeof r.color === 'string' && HEX_COLOR.test(r.color) ? r.color.toUpperCase() : '#64748B',
      };
    })
    .filter((b) => b.label && Number.isFinite(b.minPercentage) && Number.isFinite(b.maxPercentage));
  return bands.length ? bands.sort((a, b) => b.minPercentage - a.minPercentage) : DEFAULT_NURSERY_PERFORMANCE_BANDS;
}

export function validateNurseryPerformanceBands(input: unknown): NurseryPerformanceBand[] {
  if (!Array.isArray(input)) throw new AppError(400, 'Performance bands are required');
  if (input.length < 2 || input.length > 8) {
    throw new AppError(400, 'Use between 2 and 8 performance levels');
  }

  const bands = parseNurseryPerformanceBands(input);
  if (bands.length !== input.length) {
    throw new AppError(400, 'Every performance level needs a label, minimum and maximum');
  }

  const seenLabels = new Set<string>();
  for (const band of bands) {
    if (!band.label || band.label.length > 40) {
      throw new AppError(400, 'Each performance level needs a short label (40 characters or fewer)');
    }
    const key = band.label.toLowerCase();
    if (seenLabels.has(key)) throw new AppError(400, 'Performance level labels must be different');
    seenLabels.add(key);
    if (!HEX_COLOR.test(band.color)) {
      throw new AppError(400, `Colour for “${band.label}” must be a hex value such as #16A34A`);
    }
    if (band.minPercentage < 0 || band.maxPercentage > 100 || band.minPercentage >= band.maxPercentage) {
      throw new AppError(400, `Range for “${band.label}” must satisfy 0 ≤ min < max ≤ 100`);
    }
  }

  const ascending = [...bands].sort((a, b) => a.minPercentage - b.minPercentage);
  if (ascending[0].minPercentage > 0.001) {
    throw new AppError(400, 'The lowest performance level must start at 0 so every mark is covered');
  }
  if (ascending[ascending.length - 1].maxPercentage < 99.999) {
    throw new AppError(400, 'The highest performance level must end at 100 so every mark is covered');
  }
  for (let i = 1; i < ascending.length; i += 1) {
    const prev = ascending[i - 1];
    const next = ascending[i];
    if (next.minPercentage < prev.maxPercentage - 0.001) {
      throw new AppError(400, `“${prev.label}” and “${next.label}” overlap. Adjust their ranges.`);
    }
    if (next.minPercentage > prev.maxPercentage + 1.01) {
      throw new AppError(
        400,
        `Marks between ${prev.maxPercentage} and ${next.minPercentage} are not covered. Close the gap.`
      );
    }
  }

  return bands.map((band) => ({ ...band, label: band.label.trim(), color: band.color.toUpperCase() }));
}

export function bandForNurseryPercentage(
  percentage: number | null | undefined,
  bands: NurseryPerformanceBand[]
) {
  if (percentage == null || !Number.isFinite(percentage)) return null;
  return (
    [...bands]
      .sort((a, b) => b.minPercentage - a.minPercentage)
      .find((band) => percentage >= band.minPercentage) ?? bands[bands.length - 1] ?? null
  );
}

export type NurseryTemplateSettings = {
  title: string;
  subtitle: string;
  showLogo: boolean;
  showHeaderLines: boolean;
  showStudentPhoto: boolean;
  showStudentDetails: boolean;
  showPerformanceLegend: boolean;
  showTotals: boolean;
  showClassAverage: boolean;
  showPosition: boolean;
  showQR: boolean;
  showTeacherSignature: boolean;
  showHeadTeacherSignature: boolean;
  showStamp: boolean;
  showParentSignature: boolean;
  teacherTitle: string;
  headTeacherName: string;
  headTeacherTitle: string;
  parentLabel: string;
  footerNote: string;
  accentColor: string;
};

export const DEFAULT_NURSERY_TEMPLATE_SETTINGS: NurseryTemplateSettings = {
  title: 'NURSERY REPORT CARD',
  subtitle: 'Learning areas and performance',
  showLogo: true,
  showHeaderLines: true,
  showStudentPhoto: true,
  showStudentDetails: true,
  showPerformanceLegend: true,
  showTotals: true,
  showClassAverage: true,
  showPosition: true,
  showQR: true,
  showTeacherSignature: true,
  showHeadTeacherSignature: true,
  showStamp: true,
  showParentSignature: true,
  teacherTitle: 'Class Teacher',
  headTeacherName: '',
  headTeacherTitle: 'Head Teacher',
  parentLabel: 'Parent / Guardian',
  footerNote: 'This report is issued by the school through Shule+. Verify it using the QR code.',
  accentColor: '#000435',
};

const BOOLEAN_KEYS: Array<keyof NurseryTemplateSettings> = [
  'showLogo',
  'showHeaderLines',
  'showStudentPhoto',
  'showStudentDetails',
  'showPerformanceLegend',
  'showTotals',
  'showClassAverage',
  'showPosition',
  'showQR',
  'showTeacherSignature',
  'showHeadTeacherSignature',
  'showStamp',
  'showParentSignature',
];

export function parseNurseryTemplateSettings(raw: unknown): NurseryTemplateSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_NURSERY_TEMPLATE_SETTINGS;
  const o = raw as Record<string, unknown>;
  const out: NurseryTemplateSettings = { ...DEFAULT_NURSERY_TEMPLATE_SETTINGS };
  for (const key of BOOLEAN_KEYS) {
    if (typeof o[key] === 'boolean') (out[key] as boolean) = o[key] as boolean;
  }
  const str = (key: keyof NurseryTemplateSettings, max = 200) => {
    const v = o[key];
    if (typeof v === 'string') (out[key] as string) = v.slice(0, max);
  };
  str('title', 80);
  str('subtitle', 120);
  str('teacherTitle', 60);
  str('headTeacherName', 120);
  str('headTeacherTitle', 60);
  str('parentLabel', 60);
  str('footerNote', 240);
  const accent = o.accentColor;
  if (typeof accent === 'string' && HEX_COLOR.test(accent)) out.accentColor = accent.toUpperCase();
  return out;
}

export function validateNurseryTemplateSettings(input: unknown): NurseryTemplateSettings {
  if (!input || typeof input !== 'object') throw new AppError(400, 'Report template settings are required');
  const settings = parseNurseryTemplateSettings(input);
  if (!settings.title.trim()) throw new AppError(400, 'Report title is required');
  if (!HEX_COLOR.test(settings.accentColor)) {
    throw new AppError(400, 'Accent colour must be a hex value such as #000435');
  }
  return settings;
}

export function inferLearningArea(subjectName: string): string {
  const name = subjectName.toLowerCase();
  if (/math|number|count|numeric|arithmetic/.test(name)) return 'Numbers';
  if (/english/.test(name)) return 'English';
  if (/kinyarwanda|ikinyarwanda/.test(name)) return 'Kinyarwanda';
  if (/french|fran[cç]ais/.test(name)) return 'French';
  return 'Social Development and Health Habits';
}

export function randomVerificationCode(academicYear: string): string {
  const year = String(academicYear || '').replace(/\D/g, '').slice(0, 4) || String(new Date().getFullYear());
  const random = Math.random().toString(36).slice(2, 10).toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(8, 'X');
  return `NRC-${year}-${random}`;
}
