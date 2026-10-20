import type { ConversationSummary, Message } from '@/types';

export function conversationTitle(conv: ConversationSummary): string {
  if (conv.type === 'DIRECT') return conv.peer?.name ?? 'Direct Message';
  if (conv.type === 'ANNOUNCEMENT') return conv.name ?? 'Announcements';
  if (conv.type === 'DEPARTMENT') return conv.name ?? conv.department ?? 'Department';
  return conv.name ?? 'Group';
}

export function conversationSubtitle(conv: ConversationSummary): string {
  const m = conv.lastMessage;
  if (!m) return 'No messages yet';
  const preview = m.type === 'IMAGE' ? '📷 Photo' : m.type === 'FILE' ? '📎 ' + (m.attachmentName ?? 'File') : m.body ?? '';
  return preview;
}

export function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function messagePreview(m: Message): string {
  if (m.type === 'IMAGE') return 'Photo';
  if (m.type === 'FILE') return m.attachmentName ?? 'File';
  return m.body ?? '';
}
