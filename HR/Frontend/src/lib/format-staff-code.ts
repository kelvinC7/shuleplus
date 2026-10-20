export function formatStaffCodeDisplay(value: string | null | undefined): string {
  const id = (value ?? '').replace(/\s+/g, '').trim().toUpperCase();
  const modern = id.match(/^([A-Z0-9]{2,4})(\d{2})(\d{3})(\d{3})$/);
  if (modern) {
    return `${modern[1]} ${modern[2]} ${modern[3]} ${modern[4]}`;
  }
  if (/^\d{8}$/.test(id)) {
    return `${id.slice(0, 2)} ${id.slice(2, 5)} ${id.slice(5, 8)}`;
  }
  return (value ?? '').trim();
}
