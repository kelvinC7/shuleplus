import type { Request, Response } from 'express';

/**
 * CSP for trusted raw-HTML responses (print view). The renderer inlines tiny
 * scripts/handlers and loads cross-origin uploads, so the default helmet CSP
 * (script-src 'self'; script-src-attr 'none'; img-src 'self' data:) would
 * silently kill the toolbar buttons and hide the school logos.
 */
const RAW_HTML_CSP =
  "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';" +
  "frame-ancestors 'self';img-src 'self' data: blob: https: http:;object-src 'none';" +
  "script-src 'self' 'unsafe-inline';script-src-attr 'unsafe-inline';" +
  "style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests";

/**
 * Proxy a request to an upstream microservice.
 * Returns JSON { success, data } or forwards the upstream error.
 */
export async function proxyGet(
  upstreamBase: string,
  path: string,
  req: Request,
  res: Response,
) {
  const base = upstreamBase.replace(/\/$/, '');
  const pathPart = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(base + pathPart);
  for (const [key, val] of Object.entries(req.query)) {
    if (typeof val === 'string') url.searchParams.set(key, val);
    else if (Array.isArray(val) && typeof val[0] === 'string') url.searchParams.set(key, val[0]);
  }

  console.log(`[webpage-backend] proxy GET -> ${url.toString()}`);

  try {
    const upstream = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
      const body = await upstream.json().catch(() => null);
      if (!upstream.ok) {
        console.warn(`[webpage-backend] upstream GET ${url.toString()} returned ${upstream.status}`);
      }
      res.status(upstream.status).json(body ?? { success: false, message: 'No upstream body' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream unreachable';
    res.status(502).json({ success: false, message: `Upstream error: ${message}` });
  }
}

/**
 * Proxy a GET request to an upstream microservice and stream the raw body
 * back untouched (content-type, status, headers) — for HTML/print/PDF routes
 * where `proxyGet`'s JSON-decoding would corrupt the payload.
 */
export async function proxyGetRaw(
  upstreamBase: string,
  path: string,
  req: Request,
  res: Response,
) {
  const base = upstreamBase.replace(/\/$/, '');
  const pathPart = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(base + pathPart);
  for (const [key, val] of Object.entries(req.query)) {
    if (typeof val === 'string') url.searchParams.set(key, val);
    else if (Array.isArray(val) && typeof val[0] === 'string') url.searchParams.set(key, val[0]);
  }

  console.log(`[webpage-backend] proxy GET (raw) -> ${url.toString()}`);

  try {
    const upstream = await fetch(url.toString());
    const buffer = Buffer.from(await upstream.arrayBuffer());
    const contentType =
      upstream.headers.get('content-type') ?? 'text/html; charset=utf-8';
    for (const name of ['cache-control', 'content-disposition', 'content-type']) {
      const val = upstream.headers.get(name);
      if (val) res.setHeader(name, val);
    }
    // Trusted raw HTML: allow inline scripts/handlers + external/data/blob images.
    res.setHeader('Content-Security-Policy', RAW_HTML_CSP);
    // Keep the popup in the opener's browsing group so window.close() works on it.
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.status(upstream.status).setHeader('Content-Type', contentType);
    res.send(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream unreachable';
    res.status(502).send(`Upstream error: ${message}`);
  }
}

/**
 * Proxy a POST request to an upstream microservice.
 */
export async function proxyPost(
  upstreamBase: string,
  path: string,
  req: Request,
  res: Response,
) {
  const base = upstreamBase.replace(/\/$/, '');
  const pathPart = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(base + pathPart);

  console.log(`[webpage-backend] proxy POST -> ${url.toString()}`);

  try {
    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const idempotencyKey = req.headers['idempotency-key'];
    if (typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
      forwardHeaders['Idempotency-Key'] = idempotencyKey.trim();
    }

    const upstream = await fetch(url.toString(), {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(req.body),
    });
    const body = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      console.warn(`[webpage-backend] upstream POST ${url.toString()} returned ${upstream.status}`);
    }
    res.status(upstream.status).json(body ?? { success: false, message: 'No upstream body' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream unreachable';
    res.status(502).json({ success: false, message: `Upstream error: ${message}` });
  }
}
