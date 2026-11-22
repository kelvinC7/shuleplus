import { Box, Typography } from '@mui/material';
import type { ReportCardSchoolInfo } from '@/types/report-card';

const NAVY = '#000435';

type Props = {
  school?: ReportCardSchoolInfo | null;
  reportTitle: string;
  reportSubtitle?: string;
  /** Tighter header for mid-term / single-page reports */
  compact?: boolean;
};

/**
 * Report header used on every student report (Beginning Term, Mid-Term, Termly, standard).
 * School logo left, centered description and school name, optional second logo right.
 */
export default function ReportSchoolHeader({ school, reportTitle, reportSubtitle, compact }: Props) {
  const headerLines = (school?.reportHeaderLines ?? []).map((l) => l.trim()).filter(Boolean);

  const contactParts = [school?.phone, school?.email, school?.website].filter(Boolean);
  const legacyLines = [
    school?.motto?.trim() ? school.motto.trim() : null,
    school?.address?.trim() || null,
    contactParts.length ? contactParts.join(' · ') : null,
  ].filter(Boolean) as string[];

  const displayLines = headerLines.length ? headerLines : legacyLines;
  const logoSize = compact ? 84 : 104;

  return (
    <Box
      className="report-school-header"
      sx={{
        px: { xs: 2, md: compact ? 2 : 3 },
        pt: compact ? 0.75 : 2.5,
        pb: compact ? 0.65 : 2,
        borderBottom: compact ? '1px solid #e2e8f0' : `3px solid ${NAVY}`,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: `${logoSize}px 1fr ${logoSize}px`,
          alignItems: 'center',
          columnGap: 1.5,
        }}
      >
        <Box sx={{ width: logoSize, height: logoSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {school?.logoUrl ? (
            <Box component="img" src={school.logoUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : null}
        </Box>

        <Box sx={{ minWidth: 0, textAlign: 'center' }}>
          <Typography
            sx={{
              fontSize: { xs: '0.9375rem', md: '1.0625rem' },
              fontWeight: 800,
              color: NAVY,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            {school?.name || 'School'}
          </Typography>
          {displayLines.map((line, idx) => (
            <Typography
              key={`${idx}-${line.slice(0, 24)}`}
              sx={{
                fontSize: idx === 0 && headerLines.length ? '0.75rem' : '0.6875rem',
                color: idx === 0 && headerLines.length ? '#475569' : '#64748b',
                fontStyle: !headerLines.length && idx === 0 && school?.motto ? 'italic' : 'normal',
                mt: idx === 0 ? (compact ? 0.25 : 0.5) : 0.2,
                lineHeight: compact ? 1.35 : 1.45,
                maxWidth: 520,
                mx: 'auto',
              }}
            >
              {line}
            </Typography>
          ))}
        </Box>

        <Box sx={{ width: logoSize, height: logoSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {school?.rightLogoUrl ? (
            <Box component="img" src={school.rightLogoUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : null}
        </Box>
      </Box>

      <Box sx={{ mt: compact ? 0.5 : 2, pt: compact ? 0.5 : 1.5, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
        <Typography
          sx={{
            fontSize: compact ? '0.6875rem' : '0.75rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: NAVY,
          }}
        >
          {reportTitle}
        </Typography>
        {reportSubtitle ? (
          <Typography sx={{ fontSize: compact ? '0.6875rem' : '0.75rem', color: '#64748b', mt: 0.25 }}>
            {reportSubtitle}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
