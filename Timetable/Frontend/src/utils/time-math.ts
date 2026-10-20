export function normalizeTime(time: string): string {
  const parts = time.trim().split(':').map((p) => p.padStart(2, '0'));
  return `${parts[0]}:${parts[1] ?? '00'}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = normalizeTime(time).split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
