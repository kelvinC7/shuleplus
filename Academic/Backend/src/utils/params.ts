/** Express route/query param (string or string[]). */
export function paramOne(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
