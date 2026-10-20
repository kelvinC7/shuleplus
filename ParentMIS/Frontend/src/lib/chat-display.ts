/** Short, readable labels for teacher list and chat headers (no noisy slashes). */
export function formatTeacherSubjects(subjects: string[] | undefined | null): string {
  if (!subjects?.length) return '';
  const cleaned = subjects
    .map((s) =>
      String(s)
        .replace(/\s*[-–/\\|]\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean);
  const unique = [...new Set(cleaned)];
  if (unique.length <= 2) return unique.join(', ');
  return `${unique.slice(0, 2).join(', ')} +${unique.length - 2}`;
}

export function formatChatTimestamp(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function parseReplyBody(body: string) {
  const match = /^↩[^\n]*\n((?:> .*\n?)+)\n([\s\S]*)$/m.exec(body || '');
  if (!match) return { quote: null as string | null, text: body };
  const quote = match[1]
    .split('\n')
    .map((l) => l.replace(/^>\s?/, ''))
    .join('\n')
    .trim();
  return { quote, text: match[2].trim() || body };
}

export function buildReplyBody(quote: string, text: string) {
  const q = quote
    .split('\n')
    .slice(0, 4)
    .map((line) => `> ${line}`)
    .join('\n');
  return `↩ Reply\n${q}\n\n${text.trim()}`;
}
