import type { Request, Response, NextFunction } from 'express';
import { env } from '../config';

// Simple helper: try JSON, otherwise return text
async function fetchJson(url: string) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  let body: any = null;
  try {
    body = await res.json();
  } catch (e) {
    try {
      body = await res.text();
    } catch (e2) {
      body = null;
    }
  }
  return { status: res.status, ok: res.ok, body };
}

// Strip HTML tags and collapse whitespace for short summaries
function stripHtml(text: string | null | undefined) {
  if (!text) return '';
  const withoutTags = text.replace(/<[^>]*>/g, ' ');
  return withoutTags.replace(/\s+/g, ' ').trim().slice(0, 400);
}

// Simple in-memory cache for circular options: TTL 5 minutes
const circularOptionsCache = new Map<string, { ts: number; data: any }>();
const CIRC_TTL = 1000 * 60 * 5;

export async function renderLookupForm(_req: Request, res: Response) {
  res.render('babyeyi', { student: null, circulars: null, error: null });
}

export async function postLookup(req: Request, res: Response, next: NextFunction) {
  try {
    const code = (req.body?.code ?? req.query.code ?? '').toString().trim();
    if (!code) return res.render('babyeyi', { student: null, circulars: null, error: 'Provide a student code' });

    const studentUrl = `${env.STUDENT_MANAGEMENT_URL.replace(/\/$/, '')}/public/students/lookup?code=${encodeURIComponent(code)}`;
    console.log(`[babyeyi] fetching student -> ${studentUrl}`);
    const studentRes = await fetchJson(studentUrl);
    if (!studentRes.ok || !studentRes.body?.success) {
      const msg = studentRes.body?.message ?? `Student lookup failed (${studentRes.status})`;
      return res.render('babyeyi', { student: null, circulars: null, error: msg });
    }

    const student = studentRes.body.data;
    const orgId = student.organizationId;
    let circulars = null;
    if (orgId) {
      // check cache first
      const cached = circularOptionsCache.get(orgId);
      if (cached && Date.now() - cached.ts < CIRC_TTL) {
        circulars = cached.data;
        console.log(`[babyeyi] using cached circular options for ${orgId}`);
      } else {
        const circUrl = `${env.BABYEYI_WIZARD_URL.replace(/\/$/, '')}/public/circulars/options?organizationId=${encodeURIComponent(orgId)}`;
        console.log(`[babyeyi] fetching circular options -> ${circUrl}`);
        const circRes = await fetchJson(circUrl);
        if (!circRes.ok && typeof circRes.body === 'string') {
          console.warn('[babyeyi] circulars options returned non-json:', circRes.body?.toString?.());
        }
        if (circRes.ok && Array.isArray(circRes.body?.data)) circulars = circRes.body.data;
        // cache circular options
        if (Array.isArray(circulars)) {
          circularOptionsCache.set(orgId, { ts: Date.now(), data: circulars });
        }
      }
    }

    return res.render('babyeyi', { student, circulars, error: null });
  } catch (err) {
    return next(err);
  }
}

export async function apiLookup(req: Request, res: Response, next: NextFunction) {
  try {
    const code = (req.body?.code ?? req.query.code ?? '').toString().trim();
    if (!code) return res.status(400).json({ success: false, message: 'Provide a student code' });

    const expectedOrgId = (req.body?.organizationId ?? req.query.organizationId ?? '')
      .toString()
      .trim();

    const studentUrl = `${env.STUDENT_MANAGEMENT_URL.replace(/\/$/, '')}/public/students/lookup?code=${encodeURIComponent(code)}`;
    console.log(`[babyeyi] api fetching student -> ${studentUrl}`);
    const studentRes = await fetchJson(studentUrl);
    if (!studentRes.ok || !studentRes.body?.success) {
      const raw = typeof studentRes.body === 'string' ? studentRes.body : studentRes.body?.message ?? `Student lookup failed (${studentRes.status})`;
      const summary = stripHtml(raw?.toString?.());
      return res.status(502).json({ success: false, message: summary, errorSummary: summary });
    }

    const student = studentRes.body.data;
    if (
      expectedOrgId &&
      String(student.organizationId ?? '').trim() !== expectedOrgId
    ) {
      return res.status(404).json({
        success: false,
        message: 'Student not found. Check the code and try again.',
      });
    }
    const orgId = student.organizationId;
    let circulars = null;
    let currentAcademicYear = null;
    let currentTerm = null;
    let circularData = null;
    if (orgId) {
      const circUrl = `${env.BABYEYI_WIZARD_URL.replace(/\/$/, '')}/public/circulars/options?organizationId=${encodeURIComponent(orgId)}`;
      console.log(`[babyeyi] api fetching circular options -> ${circUrl}`);
      const circRes = await fetchJson(circUrl);
      if (circRes.ok && circRes.body?.data) {
        const opts = circRes.body.data;
        // New grouped shape: { grouped: [{ academicYear, terms }], currentAcademicYear, currentTerm, ... }
        if (Array.isArray(opts.grouped)) {
          circulars = opts.grouped;
          currentAcademicYear = opts.currentAcademicYear ?? null;
          currentTerm = opts.currentTerm ?? null;
        } else if (Array.isArray(opts)) {
          // Legacy shape: flat array of { academicYear, terms } — keep it working
          circulars = opts;
        }
        if (Array.isArray(circulars)) {
          circularOptionsCache.set(orgId, { ts: Date.now(), data: circulars });
        }
      } else if (typeof circRes.body === 'string') {
        // Upstream returned HTML/text explaining no circulars
        console.warn('[babyeyi] circulars options returned non-json:', circRes.body?.toString?.());
      }

      // Prefer the centrally-configured current period (org admin → Settings, same as BabyeyiWizard);
      // fall back to the first available circular option.
      const year = (req.body?.academicYear ?? req.query.academicYear ?? '') as string;
      const term = (req.body?.term ?? req.query.term ?? '') as string;
      const selYear =
        year ||
        currentAcademicYear ||
        (circulars && circulars.length ? circulars[0].academicYear : '');
      const selTerm =
        term ||
        currentTerm ||
        (circulars && circulars.length && circulars[0].terms?.length
          ? circulars[0].terms[0]
          : '');
      if (selYear && selTerm) {
        const detailsUrl = `${env.BABYEYI_WIZARD_URL.replace(/\/$/, '')}/public/circulars?organizationId=${encodeURIComponent(orgId)}&academicYear=${encodeURIComponent(selYear)}&term=${encodeURIComponent(selTerm)}${student.classLabel ? `&class=${encodeURIComponent(student.classLabel)}` : ''}`;
        console.log(`[babyeyi] api fetching circular details -> ${detailsUrl}`);
        const detailsRes = await fetchJson(detailsUrl);
        if (detailsRes.ok && detailsRes.body?.data) circularData = detailsRes.body.data;
        else if (!detailsRes.ok && typeof detailsRes.body === 'string') {
          // If upstream returned HTML/text, include a short summary
          const summary = stripHtml(detailsRes.body);
          return res.status(502).json({ success: false, message: summary, errorSummary: summary });
        }
      }
    }

    return res.json({
      success: true,
      data: { student, circulars, circular: circularData, currentAcademicYear, currentTerm },
    });
  } catch (err) {
    return next(err);
  }
}

export default { renderLookupForm, postLookup, apiLookup };
