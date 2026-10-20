/** Scale a raw assessment score to the course default total (e.g. 18/20 → 36/40). */
export function convertScoreToCourseDefault(enteredScore, assessmentMax, courseDefaultMax) {
  const score = Number(enteredScore);
  const max = Number(assessmentMax);
  const target = Number(courseDefaultMax);
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0 || !Number.isFinite(target) || target <= 0) {
    return null;
  }
  return Math.round((score / max) * target * 10) / 10;
}

export function percentageFromScore(score, max) {
  const s = Number(score);
  const m = Number(max);
  if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) return null;
  return (s / m) * 100;
}
