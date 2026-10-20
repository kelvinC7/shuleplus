import type { ReactNode } from 'react';

export function AssetsDetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 text-sm last:border-0">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium text-navy">{value ?? '—'}</span>
    </div>
  );
}

export function parseAssignmentNotes(notes?: string | null) {
  const parts = notes?.split(' · ') ?? [];
  return {
    assigneeType: parts[0] ?? 'Teacher / Staff',
    conditionCode: parts[1] ?? 'Good',
    extraNotes: parts.slice(2).join(' · '),
  };
}

export function buildAssignmentNotes(assigneeType: string, conditionCode: string, notes: string) {
  return [assigneeType, conditionCode, notes].filter(Boolean).join(' · ') || undefined;
}
