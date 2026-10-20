import { z } from 'zod';

/** Accepts number, numeric string, or empty → undefined (for JSON form bodies). */
export const optionalNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : val;
}, z.number().optional());

export const optionalMinZeroNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : val;
}, z.number().min(0).optional());
