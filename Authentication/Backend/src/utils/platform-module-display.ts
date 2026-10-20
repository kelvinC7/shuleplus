/** Canonical labels for platform modules (API responses). */
export function applyPlatformModuleDisplay<
  T extends { slug: string; name: string; shortName?: string | null; description?: string | null },
>(module: T): T {
  if (module.slug !== 'attendance') return module;
  return {
    ...module,
    name: 'Digital Attendance',
    shortName: 'Digital',
    description: 'Entry and exit logs, devices, and live presence.',
  };
}

export function mapPlatformModuleDisplay<T extends { slug: string; name: string; shortName?: string | null }>(
  modules: T[],
): T[] {
  return modules.map((m) => applyPlatformModuleDisplay(m));
}
