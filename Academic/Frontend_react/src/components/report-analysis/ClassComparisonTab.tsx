import { Box, Paper, Typography } from '@mui/material';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import {
  AMBER,
  BORDER,
  BandChip,
  Flex,
  MUTED,
  NAVY,
  ProgressBar,
  Section,
  fmtPct,
} from './analysis-ui';
import type { ReportAnalysisClassRow } from '@/types/report-analysis';

type Props = {
  rows: ReportAnalysisClassRow[];
  loading: boolean;
  selectedClassId: string;
  groupLabel: string;
  stageLabel: string;
  threshold: number;
  onSelectClass: (classId: string) => void;
};

const RANK_COLORS = ['#D4A017', '#94A3B8', '#B45309'];

export default function ClassComparisonTab({
  rows,
  loading,
  selectedClassId,
  groupLabel,
  stageLabel,
  threshold,
  onSelectClass,
}: Props) {
  const ranked = [...rows].sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
  const best = ranked.find((r) => r.average != null)?.average ?? null;
  const weakest = [...ranked].reverse().find((r) => r.average != null)?.average ?? null;
  const spread = best != null && weakest != null ? Math.round((best - weakest) * 10) / 10 : null;
  const totalStudents = ranked.reduce((n, r) => n + r.students, 0);
  const totalAssessed = ranked.reduce((n, r) => n + r.assessed, 0);

  return (
    <Box sx={{ display: 'grid', gap: 2.5, minWidth: 0 }}>
      {ranked.length >= 2 ? (
        <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' } }}>
          <SummaryTile label="Classes compared" value={String(ranked.length)} hint={groupLabel} accent="#2563EB" />
          <SummaryTile label="Best average" value={fmtPct(best)} hint={ranked[0]?.classLabel ?? ''} accent="#059669" />
          <SummaryTile
            label="Gap to weakest"
            value={spread != null ? `${spread.toFixed(1)} pts` : '—'}
            hint={ranked[ranked.length - 1]?.classLabel ?? ''}
            accent="#DC2626"
          />
          <SummaryTile
            label="Students"
            value={`${totalAssessed}/${totalStudents}`}
            hint="assessed / enrolled"
            accent="#D97706"
          />
        </Box>
      ) : null}

      <Section
        title="Class comparison"
        subtitle={`${stageLabel} averages${groupLabel ? ` · ${groupLabel}` : ''}`}
      >
        {loading ? (
          <Typography sx={{ py: 3, textAlign: 'center', fontSize: '0.875rem', color: MUTED }}>
            Loading class comparison…
          </Typography>
        ) : ranked.length < 2 ? (
          <Box sx={{ py: 5, px: 2, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '1rem' }}>No parallel classes to compare</Typography>
            <Typography sx={{ mt: 0.75, fontSize: '0.875rem', color: MUTED, maxWidth: 460, mx: 'auto' }}>
              Comparison groups classes that share the same class name (different streams). Pick another class, or add
              streams with the same name to compare them side by side.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Mobile / tablet cards */}
            <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1.25 }}>
              {ranked.map((c, i) => {
                const selected = c.classId === selectedClassId;
                return (
                  <Paper
                    key={c.classId}
                    elevation={0}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectClass(c.classId)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelectClass(c.classId)}
                    sx={{
                      p: 1.75,
                      borderRadius: 2.5,
                      border: `1px solid ${selected ? AMBER : BORDER}`,
                      bgcolor: selected ? '#FFFBF0' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <Flex direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Flex direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                        <RankBadge rank={i + 1} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography noWrap sx={{ fontWeight: 800, color: NAVY, fontSize: '0.9375rem' }}>
                            {c.classLabel || 'Class'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.6875rem', color: MUTED }}>
                            {c.assessed} assessed of {c.students}
                            {selected ? ' · viewing' : ''}
                          </Typography>
                        </Box>
                      </Flex>
                      <BandChip band={c.band} />
                    </Flex>
                    <Flex direction="row" alignItems="center" spacing={1.25} sx={{ mt: 1.25 }}>
                      <Typography sx={{ width: 58, fontWeight: 800, color: NAVY, fontSize: '1rem', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtPct(c.average)}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <ProgressBar value={c.average} color={c.band?.color ?? '#94a3b8'} />
                      </Box>
                    </Flex>
                    <Flex direction="row" spacing={1.5} flexWrap="wrap" sx={{ mt: 1, fontSize: '0.7rem', color: MUTED }}>
                      <span>{c.good} in top two bands</span>
                      <span style={{ color: c.below ? '#b91c1c' : MUTED, fontWeight: c.below ? 700 : 400 }}>
                        {c.below} below {threshold}%
                      </span>
                      <span style={{ color: gapColor(gapTo(best, c.average)) }}>
                        {gapTo(best, c.average) != null ? `${gapTo(best, c.average)!.toFixed(1)} pts from best` : 'No marks'}
                      </span>
                    </Flex>
                  </Paper>
                );
              })}
            </Box>

            {/* Desktop table */}
            <Box sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.8125rem',
                  '& th': {
                    textAlign: 'left',
                    px: 1.25,
                    py: 1,
                    bgcolor: '#F8FAFC',
                    color: NAVY,
                    fontWeight: 800,
                    fontSize: '0.6875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: `1px solid ${BORDER}`,
                    whiteSpace: 'nowrap',
                  },
                  '& td': { px: 1.25, py: 1.1, borderBottom: `1px solid #EEF2F6`, color: '#0f172a' },
                  '& tbody tr': { cursor: 'pointer' },
                  '& tbody tr:hover': { bgcolor: '#FFFBF0' },
                }}
              >
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>Rank</th>
                    <th>Class</th>
                    <th>Average</th>
                    <th style={{ minWidth: 180 }}>Performance</th>
                    <th>Gap to best</th>
                    <th>Assessed</th>
                    <th>Top bands</th>
                    <th>Below {threshold}%</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((c, i) => {
                    const selected = c.classId === selectedClassId;
                    const gap = gapTo(best, c.average);
                    return (
                      <tr
                        key={c.classId}
                        onClick={() => onSelectClass(c.classId)}
                        style={selected ? { background: '#FFFBF0' } : undefined}
                      >
                        <td><RankBadge rank={i + 1} /></td>
                        <td>
                          <Typography sx={{ fontWeight: 800, color: NAVY, fontSize: '0.8125rem' }}>
                            {c.classLabel || 'Class'}
                          </Typography>
                          {selected ? (
                            <Typography sx={{ fontSize: '0.6875rem', color: '#B7791F', fontWeight: 800 }}>VIEWING</Typography>
                          ) : null}
                        </td>
                        <td style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{fmtPct(c.average)}</td>
                        <td>
                          <ProgressBar value={c.average} color={c.band?.color ?? '#94a3b8'} />
                        </td>
                        <td style={{ color: gapColor(gap), fontWeight: gap ? 700 : 400 }}>
                          {gap != null ? `${gap.toFixed(1)} pts` : '—'}
                        </td>
                        <td>{c.assessed} / {c.students}</td>
                        <td style={{ color: '#047857', fontWeight: 700 }}>{c.good}</td>
                        <td style={{ color: c.below ? '#b91c1c' : undefined, fontWeight: c.below ? 800 : 400 }}>{c.below}</td>
                        <td><BandChip band={c.band} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </Box>
            </Box>

            <Typography sx={{ mt: 1.5, fontSize: '0.75rem', color: MUTED }}>
              Tap a class to switch the analysis view. Averages use only {stageLabel} marks and never mix report types.
            </Typography>
          </>
        )}
      </Section>
    </Box>
  );
}

function gapColor(gap: number | null): string {
  if (gap == null || gap === 0) return MUTED;
  return '#b45309';
}

function gapTo(best: number | null, value: number | null): number | null {
  if (best == null || value == null) return null;
  return Math.round((best - value) * 10) / 10;
}

function RankBadge({ rank }: { rank: number }) {
  const color = RANK_COLORS[rank - 1];
  const crown = rank === 1;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        minWidth: 28,
        height: 28,
        px: 0.75,
        borderRadius: 999,
        bgcolor: color ? `${color}1F` : '#F1F5F9',
        color: color ?? MUTED,
        fontWeight: 800,
        fontSize: '0.75rem',
      }}
    >
      {crown ? <EmojiEventsRoundedIcon sx={{ fontSize: 15 }} /> : `#${rank}`}
      {crown ? rank : null}
    </Box>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: string;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        border: `1px solid ${BORDER}`,
        bgcolor: '#fff',
        p: { xs: 1.5, md: 2 },
        minWidth: 0,
      }}
    >
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: accent }} />
      <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: { xs: '1.25rem', md: '1.5rem' }, fontWeight: 800, color: NAVY, lineHeight: 1.1 }}>
        {value}
      </Typography>
      {hint ? <Typography noWrap sx={{ mt: 0.25, fontSize: '0.6875rem', color: MUTED }}>{hint}</Typography> : null}
    </Paper>
  );
}
