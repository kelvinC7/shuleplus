/** Shared class label matching (Timetable / SM / Academic). */
export function normalizeClassLabel(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s·_-]+/g, ' ');
}

export function compactClassLabel(s) {
  return normalizeClassLabel(s).replace(/\s+/g, '');
}

export function classLabelsMatch(a, b) {
  const left = String(a ?? '').trim();
  const right = String(b ?? '').trim();
  if (!left || !right) return false;
  const na = normalizeClassLabel(left);
  const nb = normalizeClassLabel(right);
  if (na === nb) return true;
  if (compactClassLabel(left) === compactClassLabel(right)) return true;
  return na.includes(nb) || nb.includes(na);
}
