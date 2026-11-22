/** Match sidebar links that include ?tab= on /academic (pathname ignores search). */
export function isPmNavHrefActive(href: string, pathname: string, tabParam: string | null): boolean {
  const [path, queryString] = href.split('?');
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
  if (!queryString) return pathname === path || pathname.startsWith(`${path}/`);
  const q = new URLSearchParams(queryString);
  const expected = q.get('tab') ?? 'overview';
  const current = tabParam?.trim() || 'overview';
  return expected === current;
}
