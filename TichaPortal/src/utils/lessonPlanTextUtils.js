/** Split semicolon blobs or bullet lines into display items. */
export function splitToItems(text) {
  if (!text) return [];
  if (Array.isArray(text)) return text.filter(Boolean).map(String);
  return String(text)
    .split(/\n|(?<=[.;!?])\s+/)
    .map((s) => s.replace(/^[\u2022•\-–—]\s*/, '').trim())
    .filter((s) => s.length > 8);
}

export function joinItems(items) {
  if (!items?.length) return '';
  return items.map((s) => `• ${s}`).join('\n');
}
