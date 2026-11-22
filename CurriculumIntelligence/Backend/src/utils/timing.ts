/** REB-style stage keys used in generated lesson plans. */
export const REB_STAGE_KEYS = [
  'introduction',
  'discovery',
  'presentation',
  'exploitation',
  'summary',
  'assessment',
] as const;

export type RebStageKey = (typeof REB_STAGE_KEYS)[number];

/** Default proportions for a 40-minute CBC lesson (sum = 1). */
const DEFAULT_WEIGHTS: Record<RebStageKey, number> = {
  introduction: 0.125,
  discovery: 0.2,
  presentation: 0.175,
  exploitation: 0.3,
  summary: 0.075,
  assessment: 0.125,
};

export function allocateStageMinutes(totalMinutes: number): Record<RebStageKey, number> {
  const raw: Record<RebStageKey, number> = {} as Record<RebStageKey, number>;
  let assigned = 0;

  for (let i = 0; i < REB_STAGE_KEYS.length; i++) {
    const key = REB_STAGE_KEYS[i];
    if (i === REB_STAGE_KEYS.length - 1) {
      raw[key] = Math.max(1, totalMinutes - assigned);
    } else {
      const minutes = Math.max(1, Math.round(totalMinutes * DEFAULT_WEIGHTS[key]));
      raw[key] = minutes;
      assigned += minutes;
    }
  }

  const sum = REB_STAGE_KEYS.reduce((acc, k) => acc + raw[k], 0);
  if (sum !== totalMinutes) {
    raw.exploitation = Math.max(1, raw.exploitation + (totalMinutes - sum));
  }

  return raw;
}

export function validateStageTimings(
  stages: Array<{ key: string; minutes: number }>,
  totalMinutes: number
): { ok: boolean; sum: number; message?: string } {
  const sum = stages.reduce((acc, s) => acc + (Number(s.minutes) || 0), 0);
  if (sum !== totalMinutes) {
    return {
      ok: false,
      sum,
      message: `Stage durations total ${sum} minutes but lesson duration is ${totalMinutes} minutes.`,
    };
  }
  return { ok: true, sum };
}
