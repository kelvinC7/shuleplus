const DOWN_TTL_MS = 60_000;
const downUntil = new Map<string, number>();
const warned = new Set<string>();

export function isModuleDown(name: string) {
  const until = downUntil.get(name) ?? 0;
  return Date.now() < until;
}

export function markModuleDown(name: string, err: unknown) {
  downUntil.set(name, Date.now() + DOWN_TTL_MS);
  if (warned.has(name)) return;
  warned.add(name);
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[${name}] unreachable (${message}); using local data until the module is back`);
}

export function markModuleUp(name: string) {
  downUntil.delete(name);
  warned.delete(name);
}
