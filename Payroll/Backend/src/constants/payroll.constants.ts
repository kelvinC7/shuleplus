export function formatStaffNumber(seq: number): string {
  return `PAY-${String(seq).padStart(4, '0')}`;
}
