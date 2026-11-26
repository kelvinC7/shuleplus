import { AppError } from '../middleware/error.middleware';

export type ReportAnalysisBand = {
  label: string;
  /** Lowest average (inclusive) that falls in this band. */
  min: number;
  color: string;
};

export type ReportAnalysisSettings = {
  bands: ReportAnalysisBand[];
  /** Averages and course marks below this value are flagged as needing improvement. */
  atRiskBelow: number;
  /** Change in average (percentage points) that counts as improving or declining. */
  trendDelta: number;
};

export type ReportAnalysisStatusFilter = 'all' | 'in_progress' | 'submitted' | 'approved';

export const DEFAULT_REPORT_ANALYSIS_SETTINGS: ReportAnalysisSettings = {
  bands: [
    { label: 'Excellent', min: 80, color: '#059669' },
    { label: 'Very Good', min: 70, color: '#2563EB' },
    { label: 'Average', min: 50, color: '#D97706' },
    { label: 'Needs Improvement', min: 0, color: '#DC2626' },
  ],
  atRiskBelow: 50,
  trendDelta: 5,
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function parseReportAnalysisSettings(raw: unknown): ReportAnalysisSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_REPORT_ANALYSIS_SETTINGS;
  const o = raw as Record<string, unknown>;
  const bands = Array.isArray(o.bands)
    ? o.bands
        .map((b) => {
          const r = b as Record<string, unknown>;
          return {
            label: typeof r.label === 'string' ? r.label : '',
            min: Number(r.min),
            color: typeof r.color === 'string' && HEX_COLOR.test(r.color) ? r.color : '#64748B',
          };
        })
        .filter((b) => b.label && Number.isFinite(b.min))
        .sort((a, b) => b.min - a.min)
    : [];
  if (bands.length < 2) return DEFAULT_REPORT_ANALYSIS_SETTINGS;
  return {
    bands,
    atRiskBelow: Number.isFinite(Number(o.atRiskBelow)) ? Number(o.atRiskBelow) : 50,
    trendDelta: Number.isFinite(Number(o.trendDelta)) ? Number(o.trendDelta) : 5,
  };
}

export function validateReportAnalysisSettings(input: unknown): ReportAnalysisSettings {
  const parsed = parseReportAnalysisSettings(input);
  const bands = parsed.bands;
  if (bands.length < 2 || bands.length > 6) {
    throw new AppError(400, 'Use between 2 and 6 performance bands');
  }
  for (const b of bands) {
    if (!b.label.trim() || b.label.length > 40) throw new AppError(400, 'Each band needs a short label');
    if (b.min < 0 || b.min > 100) throw new AppError(400, 'Band thresholds must be between 0 and 100');
    if (!HEX_COLOR.test(b.color)) throw new AppError(400, 'Band colour must be a hex value like #059669');
  }
  if (new Set(bands.map((b) => b.min)).size !== bands.length) {
    throw new AppError(400, 'Each band needs a different lower threshold');
  }
  if (bands[bands.length - 1].min !== 0) {
    throw new AppError(400, 'The lowest band must start at 0');
  }
  if (parsed.atRiskBelow < 0 || parsed.atRiskBelow > 100) {
    throw new AppError(400, 'Students-below threshold must be between 0 and 100');
  }
  if (parsed.trendDelta < 1 || parsed.trendDelta > 50) {
    throw new AppError(400, 'Improvement threshold must be between 1 and 50 points');
  }
  return {
    bands: bands.map((b) => ({ label: b.label.trim(), min: b.min, color: b.color })),
    atRiskBelow: parsed.atRiskBelow,
    trendDelta: parsed.trendDelta,
  };
}

/** Band for an average: the first band (highest threshold first) whose minimum is reached. */
export function bandForAverage(avg: number, bands: ReportAnalysisBand[]): ReportAnalysisBand {
  return bands.find((b) => avg >= b.min) ?? bands[bands.length - 1];
}

export function roundPct(value: number): number {
  return Math.round(value * 100) / 100;
}

export function meanOf(values: number[]): number | null {
  if (!values.length) return null;
  return roundPct(values.reduce((sum, v) => sum + v, 0) / values.length);
}
