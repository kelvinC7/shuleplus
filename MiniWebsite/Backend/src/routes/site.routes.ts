import { Router, Request, Response, NextFunction } from 'express';
import { websiteService } from '../services/website.service';

const router = Router();

function serveSite(req: Request, res: Response, next: NextFunction): void {
  const pathname = req.path.replace(/\/+$/, '');
  if (pathname === '' || pathname.startsWith('/api') || pathname.startsWith('/uploads')) {
    return next();
  }

  const slug = pathname.split('/')[1] ?? '';
  if (!slug || slug === 'health' || slug === 'api' || slug === 'uploads') {
    return next();
  }

  // Serve the pre-generated file when available (no DB hit per request).
  const html = websiteService.getPublicHtml(slug);
  if (html) {
    res.type('text/html').send(html);
    return;
  }

  // Fall back to a live render for unpublished-but-stored sites.
  void (async () => {
    try {
      const site = await websiteService.findPublicBySlug(slug);
      if (!site || site.status !== 'PUBLISHED') {
        res.status(404).type('text/html').send(notFoundPage(slug));
        return;
      }
      const { html: rendered } = await websiteService.regenerate(site.id);
      res.type('text/html').send(rendered);
    } catch (err) {
      next(err);
    }
  })();
}

function notFoundPage(slug: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>School website not found</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
body { font-family: 'Inter', system-ui, sans-serif; background: #f8fafc; color: #111827; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
.card { text-align: center; padding: 2rem; background: #fff; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.06); max-width: 420px; }
h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
p { color: #6b7280; font-size: 0.95rem; }
</style>
</head>
<body>
<div class="card"><h1>Website not found</h1><p>The school website "<strong>${slug.replace(/[^a-z0-9-]/gi, '')}</strong>" is not available yet. Please check the address or contact the school.</p></div>
</body>
</html>`;
}

/** Public site routes mounted at the app root (before /api). */
router.get('/school/:slug', serveSite);
router.get('/:slug', serveSite);

export default router;
