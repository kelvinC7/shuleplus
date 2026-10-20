import { parseMarkScore } from '../pages/coursesMarks/statusUtils.js';

const FALLBACK_BANDS = [
  { label: '80–100%', min: 80, max: 100 },
  { label: '70–79%', min: 70, max: 79.99 },
  { label: '60–69%', min: 60, max: 69.99 },
  { label: '50–59%', min: 50, max: 59.99 },
  { label: 'Below 50%', min: 0, max: 49.99 },
];

function countInBand(pct, min, max) {
  return pct >= min && pct <= max;
}

export function distributionBandsFromScale(scales) {
  if (!scales?.length) {
    return FALLBACK_BANDS.map((b) => ({ ...b, count: 0 }));
  }
  return [...scales]
    .sort((a, b) => Number(b.minPercentage ?? b.min_percentage) - Number(a.minPercentage ?? a.min_percentage))
    .map((s) => ({
      label: `${Number(s.minPercentage ?? s.min_percentage)}–${Number(s.maxPercentage ?? s.max_percentage)}%`,
      min: Number(s.minPercentage ?? s.min_percentage),
      max: Number(s.maxPercentage ?? s.max_percentage),
      count: 0,
    }));
}

/** Present students with valid numeric scores, highest first. */
export function collectScoredRows(students, entries, maxMark, invalidStudentIds = new Set()) {
  const rows = [];
  for (const s of students) {
    const e = entries[s.id];
    if (e?.markStatus !== 'PRESENT') continue;
    const score = parseMarkScore(e?.score);
    if (score == null || invalidStudentIds.has(s.id)) continue;
    const pct = maxMark > 0 ? (score / maxMark) * 100 : 0;
    rows.push({ student: s, score, pct });
  }
  rows.sort((a, b) => b.pct - a.pct || b.score - a.score);
  return rows;
}

export function buildPerformanceStats(scoredRows, gradingScale) {
  if (!scoredRows.length) return null;

  const pcts = scoredRows.map((r) => r.pct);
  const average = pcts.reduce((a, b) => a + b, 0) / pcts.length;
  const highest = Math.max(...pcts);
  const lowest = Math.min(...pcts);

  const distribution = distributionBandsFromScale(gradingScale);
  for (const pct of pcts) {
    for (const range of distribution) {
      if (countInBand(pct, range.min, range.max)) {
        range.count += 1;
        break;
      }
    }
  }

  const passCount = pcts.filter((p) => p >= 50).length;

  return {
    average: Math.round(average * 100) / 100,
    highest: Math.round(highest * 100) / 100,
    lowest: Math.round(lowest * 100) / 100,
    passRate: Math.round((passCount / pcts.length) * 10000) / 100,
    distribution,
    ranked: scoredRows,
    top: scoredRows.slice(0, 5),
    weak: [...scoredRows].reverse().slice(0, 5),
  };
}
