import type { Request, Response } from 'express';
import { env } from '../config';

type PublicMiniSite = { organizationId?: string; slug?: string };

/** IAM directory enriched with published MiniWebsite slugs (may differ from org slug). */
export async function getSchoolRegistrations(req: Request, res: Response) {
  const authBase = env.AUTH_URL.replace(/\/$/, '');
  const miniBase = env.MINIWEBSITE_API_URL.replace(/\/$/, '');

  const query = new URLSearchParams();
  for (const [key, val] of Object.entries(req.query)) {
    if (typeof val === 'string') query.set(key, val);
  }
  const authPath = `/public/school-registrations${query.size ? `?${query}` : ''}`;
  const authUrl = `${authBase}${authPath}`;

  console.log(`[webpage-backend] school-registrations -> ${authUrl}`);

  try {
    const [authRes, miniRes] = await Promise.all([
      fetch(authUrl, { headers: { Accept: 'application/json' } }),
      fetch(`${miniBase}/public/schools`, { headers: { Accept: 'application/json' } }).catch(
        () => null,
      ),
    ]);

    const authBody = (await authRes.json().catch(() => null)) as {
      success?: boolean;
      data?: Array<{ id: string } & Record<string, unknown>>;
      message?: string;
    } | null;

    if (!authRes.ok) {
      res.status(authRes.status).json(authBody ?? { success: false, message: 'IAM unreachable' });
      return;
    }

    const slugByOrg = new Map<string, string>();
    if (miniRes?.ok) {
      const miniBody = (await miniRes.json().catch(() => null)) as {
        data?: PublicMiniSite[];
      } | null;
      for (const site of miniBody?.data ?? []) {
        const orgId = site.organizationId?.trim();
        const slug = site.slug?.trim();
        if (orgId && slug) slugByOrg.set(orgId, slug);
      }
    } else if (miniRes) {
      console.warn(
        `[webpage-backend] MiniWebsite public schools returned ${miniRes.status}; org slugs only`,
      );
    }

    const schools = Array.isArray(authBody?.data) ? authBody.data : [];
    const data = schools.map((school) => ({
      ...school,
      miniWebsiteSlug: slugByOrg.get(school.id) ?? null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream unreachable';
    res.status(502).json({ success: false, message: `Upstream error: ${message}` });
  }
}
