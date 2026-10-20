import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import {
  defaultAcademicSettings,
  fetchIamAcademicSettings,
  updateIamAcademicSettings,
  type AcademicSettings,
} from '../clients/iam.client';

const YEAR_PATTERN = /^\d{4}-\d{4}$/;

function orgId(req: AuthenticatedRequest) {
  const id = req.organizationRef ?? req.user?.organizationId;
  if (!id) throw new AppError(401, 'Missing organization context');
  return id;
}

function validateYear(value: string): boolean {
  if (!YEAR_PATTERN.test(value)) return false;
  const [a, b] = value.split('-').map(Number);
  return b === a + 1;
}

function normalizeSettings(input: Partial<AcademicSettings>, fallback: AcademicSettings): AcademicSettings {
  const academicYears = [
    ...new Set(
      (input.academicYears ?? fallback.academicYears).filter(
        (y): y is string => typeof y === 'string' && validateYear(y)
      )
    ),
  ].sort();
  const terms = [
    ...new Set(
      (input.terms ?? fallback.terms)
        .map((t) => String(t ?? '').trim())
        .filter(Boolean)
    ),
  ];
  if (!academicYears.length) throw new AppError(400, 'At least one academic year is required (format 2026-2027)');
  if (!terms.length) throw new AppError(400, 'At least one term is required');

  const currentAcademicYear =
    input.currentAcademicYear && academicYears.includes(input.currentAcademicYear)
      ? input.currentAcademicYear
      : academicYears[0]!;
  const currentTerm =
    input.currentTerm && terms.includes(input.currentTerm) ? input.currentTerm : terms[0]!;

  const termDates: NonNullable<AcademicSettings['termDates']> = {};
  const rawDates = input.termDates ?? fallback.termDates;
  if (rawDates) {
    for (const term of terms) {
      const range = rawDates[term];
      if (range?.start && range?.end && range.start <= range.end) {
        termDates[term] = { start: range.start, end: range.end };
      }
    }
  }

  return {
    academicYears,
    terms,
    currentAcademicYear,
    currentTerm,
    termDates: Object.keys(termDates).length ? termDates : undefined,
  };
}

export const settingsController = {
  async academicGet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      try {
        const data = await fetchIamAcademicSettings(orgId(req));
        res.json({ success: true, data, meta: { source: 'organization-admin' } });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.json({
          success: true,
          data: defaultAcademicSettings(),
          meta: { source: 'fallback', warning: message },
        });
      }
    } catch (e) {
      next(e);
    }
  },

  async academicPut(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      let current: AcademicSettings;
      try {
        current = await fetchIamAcademicSettings(orgId(req));
      } catch {
        current = defaultAcademicSettings();
      }

      const nextSettings = normalizeSettings(req.body as Partial<AcademicSettings>, current);

      try {
        const saved = await updateIamAcademicSettings(orgId(req), nextSettings);
        res.json({ success: true, data: saved, meta: { source: 'organization-admin' } });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new AppError(
          503,
          `Could not save to Organization Admin academic settings. ${message}`
        );
      }
    } catch (e) {
      next(e);
    }
  },
};
