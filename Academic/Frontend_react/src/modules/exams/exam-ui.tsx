import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Chip,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import type { ExamLifecycle, ExamSession } from './exam-types';
import { useExamWorkspace } from './use-exam-workspace';

export const NAVY = '#000435';
export const AMBER = '#FCB038';

export function Kpi({
  label,
  value,
  hint,
  tone = '#2563eb',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
}) {
  return (
    <Box sx={{ p: 2.1, border: '1px solid #e2e8f0', borderRadius: '16px', bgcolor: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.04)' }}>
      <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, color: NAVY, lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ mt: 0.55, fontSize: '0.68rem', color: tone, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      {hint ? <Typography sx={{ fontSize: '0.68rem', color: '#94a3b8' }}>{hint}</Typography> : null}
    </Box>
  );
}

const STATUS_COLOR: Record<ExamLifecycle, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  DRAFT: 'default',
  REVIEWED: 'info',
  APPROVED: 'warning',
  PUBLISHED: 'success',
  ARCHIVED: 'error',
};

export function StatusChip({ status }: { status: ExamLifecycle }) {
  return <Chip size="small" label={status.replace('_', ' ')} color={STATUS_COLOR[status]} sx={{ fontWeight: 700, fontSize: '0.68rem' }} />;
}

export function ExamToolbar({
  workspace,
  extra,
}: {
  workspace: ReturnType<typeof useExamWorkspace>;
  extra?: ReactNode;
}) {
  const { settings, academicYear, term, setAcademicYear, setTerm, sessions, sessionId, setSessionId, session } = workspace;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, px: 3, bgcolor: '#fff', borderBottom: '1px solid #e2e8f0', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Academic Year</InputLabel>
          <Select label="Academic Year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
            {(settings?.academicYears ?? []).map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Term</InputLabel>
          <Select label="Term" value={term} onChange={(e) => setTerm(e.target.value)}>
            {(settings?.terms ?? []).map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>Examination</InputLabel>
          <Select label="Examination" value={sessions.some((s) => s.id === sessionId) ? sessionId : ''} onChange={(e) => setSessionId(e.target.value)}>
            <MenuItem value="">Select examination</MenuItem>
            {sessions.map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {session ? <StatusChip status={session.status} /> : null}
      </Box>
      {extra}
    </Box>
  );
}

export function ReadinessBar({ session }: { session?: ExamSession | null }) {
  if (!session) return null;
  const score = session.readinessScore ?? 0;
  return (
    <Box sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: '16px', bgcolor: '#fff' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.9rem' }}>Exam Readiness</Typography>
        <Typography sx={{ fontWeight: 800, color: score >= 90 ? '#059669' : AMBER }}>{score}% Ready</Typography>
      </Box>
      <LinearProgress variant="determinate" value={score} sx={{ height: 8, borderRadius: 99, bgcolor: '#e2e8f0', '& .MuiLinearProgress-bar': { bgcolor: score >= 90 ? '#059669' : AMBER } }} />
    </Box>
  );
}

export function NeedSession() {
  return <Alert severity="info">Create or select an examination session to continue.</Alert>;
}

/** Use the calendar day from YYYY-MM-DD, never UTC midnight (that shifts a day in Rwanda / UTC+). */
export function calendarParts(value?: string) {
  const m = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function calendarDate(value?: string) {
  const p = calendarParts(value);
  if (!p) return null;
  return new Date(p.y, p.m - 1, p.d);
}

export function datesBetween(start: string, end: string) {
  const a = calendarDate(start);
  const b = calendarDate(end);
  if (!a || !b || b < a) return [];
  const days: string[] = [];
  const cur = new Date(a);
  while (cur <= b) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function dateLabel(value?: string, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return '—';
  const d = calendarDate(value) ?? new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(undefined, opts ?? { day: '2-digit', month: 'short', year: 'numeric' });
}

export function isoDate(value?: string) {
  if (!value) return '';
  return calendarParts(value) ? String(value).slice(0, 10) : value.slice(0, 10);
}
