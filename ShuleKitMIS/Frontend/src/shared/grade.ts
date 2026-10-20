export function mapGradeLevel(classLabel: string | null | undefined): string | null {
  const label = (classLabel ?? '').trim().toUpperCase();
  const prefix = label.match(/^([NPS])\d+/)?.[1];
  const num = parseInt(label.match(/^[NPS](\d+)/)?.[1] ?? '', 10);
  if (!prefix || Number.isNaN(num)) return null;
  if (prefix === 'N') return 'Nursery';
  if (prefix === 'P') return 'Primary';
  if (prefix === 'S') return num <= 3 ? 'O-Level' : 'A-Level';
  return null;
}
