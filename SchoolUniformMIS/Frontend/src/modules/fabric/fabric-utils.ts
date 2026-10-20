export function fmtMoney(n: number) {
  return `RWF ${Math.round(n).toLocaleString("en-RW")}`;
}

export function fmtMeters(n: number) {
  return `${Number(n).toLocaleString("en-RW", { maximumFractionDigits: 1 })} m`;
}

export function fabricStatus(remaining: number, reorderLevel = 50) {
  if (remaining <= 0)
    return { label: "Out", tone: "rose" as const, emoji: "🔴" };
  if (remaining < reorderLevel)
    return { label: "Low", tone: "amber" as const, emoji: "🟡" };
  return { label: "Healthy", tone: "emerald" as const, emoji: "🟢" };
}

export function estimatePieces(meters: number, metersPerItem = 1.8) {
  if (metersPerItem <= 0) return 0;
  return Math.floor(meters / metersPerItem);
}

/** Academic-module format: "2025-2026" */
export function formatAcademicYear(startYear: number) {
  return `${startYear}-${startYear + 1}`;
}

/** Current academic year label in Academic format (e.g. 2026-2027). */
export function currentAcademicYear(date = new Date()) {
  const y = date.getFullYear();
  // School year spans calendar year → next year (same as Academic module).
  return formatAcademicYear(y);
}

/** Select options around the current year, Academic format. */
export function academicYearOptions(around = new Date().getFullYear()) {
  return [around - 2, around - 1, around, around + 1, around + 2].map(
    formatAcademicYear,
  );
}
