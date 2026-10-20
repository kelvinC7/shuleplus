export type GradingScaleRow = {
  minPercentage: unknown;
  maxPercentage: unknown;
  grade: string;
  description?: string | null;
  sortOrder?: number | null;
};

const FALLBACK_BANDS = [
  { label: '80–100%', min: 80, max: 100, grade: 'A' },
  { label: '70–79%', min: 70, max: 79.99, grade: 'B' },
  { label: '60–69%', min: 60, max: 69.99, grade: 'C' },
  { label: '50–59%', min: 50, max: 59.99, grade: 'D' },
  { label: 'Below 50%', min: 0, max: 49.99, grade: 'F' },
];

export function matchGradeOnScale(
  percentage: number,
  scales: GradingScaleRow[]
): GradingScaleRow | null {
  if (!scales.length || percentage == null || Number.isNaN(percentage)) return null;
  const p = Math.round(Number(percentage) * 100) / 100;
  if (p < 0) return null;

  const sorted = [...scales].sort((a, b) => Number(b.minPercentage) - Number(a.minPercentage));
  for (const g of sorted) {
    const min = Number(g.minPercentage);
    const max = Number(g.maxPercentage);
    if (p + 0.001 >= min && p - 0.001 <= max) return g;
  }
  const lowest = sorted[sorted.length - 1];
  if (lowest && p >= Number(lowest.minPercentage)) return lowest;
  return null;
}

export function gradeLetterFromScale(percentage: number, scales: GradingScaleRow[]): string | null {
  return matchGradeOnScale(percentage, scales)?.grade ?? null;
}

/** Percentage bands for charts — from org grading scale when configured. */
export function distributionBandsFromScale(scales: GradingScaleRow[]) {
  if (!scales?.length) {
    return FALLBACK_BANDS.map((b) => ({ ...b, count: 0 }));
  }
  return [...scales]
    .sort((a, b) => Number(b.minPercentage) - Number(a.minPercentage))
    .map((s) => ({
      label: `${Number(s.minPercentage)}–${Number(s.maxPercentage)}%`,
      min: Number(s.minPercentage),
      max: Number(s.maxPercentage),
      grade: s.grade,
      count: 0,
    }));
}

export function countInBand(pct: number, min: number, max: number) {
  return pct >= min && pct <= max;
}
