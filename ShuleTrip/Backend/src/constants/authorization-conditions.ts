/** Default numbered conditions on the official trip authorization letter. */
export const DEFAULT_TRIP_AUTHORIZATION_CONDITIONS: string[] = [
  'The school retains full responsibility for learner supervision, welfare, and discipline for the entire journey.',
  'Transport must match the registered vehicle, driver, capacity, and route — no substitution without written approval.',
  'All learners on the manifest must have recorded guardian consent; no learner may travel without consent on file.',
  'The trip must depart and return within the approved dates and times; extensions require a new authorization.',
  'The school shall comply with applicable Ministry of Education and road-safety regulations and report incidents immediately.',
];

export function formatConditionsForStorage(conditions?: string[]): string {
  const list = conditions?.length ? conditions : DEFAULT_TRIP_AUTHORIZATION_CONDITIONS;
  return JSON.stringify(list);
}

export function parseConditionsFromStorage(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [...DEFAULT_TRIP_AUTHORIZATION_CONDITIONS];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) return parsed;
  } catch {
    /* legacy plain text */
  }
  return raw.split('\n').map((s) => s.trim()).filter(Boolean);
}
