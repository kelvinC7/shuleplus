import { useMemo, useState } from 'react';
import { Box, Typography, IconButton, Collapse, Skeleton, Button } from '@mui/material';
import { ChevronRight, Public, OpenInNew, Refresh } from '@mui/icons-material';
import { CARD, SECTION_LABEL, PAGE_TITLE, ACCENT, PRIMARY } from '../styles';
import type { Applicant, DashboardSummary, SchoolWebsite } from '@/types';

interface OverviewProps {
  summary: DashboardSummary | null;
  website: SchoolWebsite | null;
  applicants: Applicant[];
  loading: boolean;
  error: string | null;
  onEditWebsite: () => void;
  onViewApplicants: () => void;
  onFilterApplicants: (status: string) => void;
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: '#f59e0b',
  REVIEWED: '#3b82f6',
  CONTACTED: '#8b5cf6',
  ACCEPTED: '#10b981',
  REJECTED: '#ef4444',
};

export function Overview({
  summary,
  website,
  applicants,
  loading,
  error,
  onEditWebsite,
  onViewApplicants,
  onFilterApplicants,
  onRefresh,
}: OverviewProps) {
  const [collapsed, setCollapsed] = useState({ system: false, recent: false, distribution: false });
  const toggle = (key: 'system' | 'recent' | 'distribution') =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const distribution = useMemo(() => {
    const statuses = Object.keys(STATUS_COLORS);
    const counts = statuses.map((status) => ({
      status,
      count: applicants.filter((a) => a.status === status).length,
    }));
    const max = Math.max(1, ...counts.map((c) => c.count));
    return { counts, max };
  }, [applicants]);

  const recent = useMemo(
    () =>
      [...applicants]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [applicants]
  );

  const isLive = website?.status === 'PUBLISHED';

  const stats: Array<{ label: string; value: string; onClick: () => void }> = [
    { label: 'Applicants', value: String(summary?.applicantCount ?? applicants.length), onClick: onViewApplicants },
    { label: 'New', value: String(summary?.newCount ?? 0), onClick: () => onFilterApplicants('NEW') },
    { label: 'Accepted', value: String(summary?.acceptedCount ?? 0), onClick: () => onFilterApplicants('ACCEPTED') },
    { label: 'Pages', value: String(summary?.pageCount ?? 0), onClick: onEditWebsite },
  ];

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={PAGE_TITLE}>
            Dashboard
          </Typography>
          <Typography sx={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.8rem', mt: 0.5 }}>
            {summary?.organizationName ?? ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Refresh sx={{ fontSize: 16 }} />}
            onClick={onRefresh}
            sx={{
              color: PRIMARY,
              borderColor: 'rgba(0,17,33,0.3)',
              textTransform: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(0,17,33,0.05)' },
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={isLive ? <OpenInNew sx={{ fontSize: 16 }} /> : <Public sx={{ fontSize: 16 }} />}
            onClick={() => {
              if (isLive && website?.publicUrl) window.open(website.publicUrl, '_blank');
              else onEditWebsite();
            }}
            sx={{
              bgcolor: PRIMARY,
              color: '#fff',
              textTransform: 'none',
              fontSize: '0.8rem',
              fontWeight: 600,
              '&:hover': { bgcolor: '#0d2a44' },
            }}
          >
            {isLive ? 'Open Live Website' : 'Build Website'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Box sx={{ ...CARD, p: 2, mb: 3, borderColor: 'rgba(220,38,38,0.3)' }}>
          <Typography sx={{ color: '#dc2626', fontSize: '0.8rem' }}>{error}</Typography>
        </Box>
      )}

      {/* Top Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: '24px',
          mb: '24px',
        }}
      >
        {/* System Summary */}
        <Box sx={CARD}>
          <Box
            sx={{
              px: 2.5,
              py: 2,
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography sx={SECTION_LABEL}>System Summary</Typography>
            <IconButton size="small" onClick={() => toggle('system')} sx={{ color: 'rgba(0,0,0,0.3)' }}>
              <ChevronRight
                sx={{
                  transform: collapsed.system ? 'rotate(0deg)' : 'rotate(90deg)',
                  transition: 'transform 0.2s',
                  fontSize: 18,
                }}
              />
            </IconButton>
          </Box>
          <Collapse in={!collapsed.system} timeout="auto" unmountOnExit>
            <Box
              sx={{
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                rowGap: '24px',
                columnGap: '16px',
              }}
            >
              {loading
                ? [...Array(4)].map((_, i) => (
                    <Skeleton key={i} variant="text" width="70%" height={40} />
                  ))
                : stats.map((s) => (
                    <Box key={s.label} onClick={s.onClick} sx={{ cursor: 'pointer' }}>
                      <Typography
                        sx={{
                          color: 'rgba(0,0,0,0.5)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          mb: 0.5,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {s.label}
                      </Typography>
                      <Typography sx={{ color: PRIMARY, fontSize: '1.1rem', fontWeight: 600 }}>
                        {s.value}
                      </Typography>
                    </Box>
                  ))}
            </Box>
          </Collapse>
        </Box>

        {/* Website Status */}
        <Box sx={CARD}>
          <Box
            sx={{
              px: 2.5,
              py: 2,
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography sx={SECTION_LABEL}>Website Status</Typography>
            <IconButton size="small" onClick={() => toggle('recent')} sx={{ color: 'rgba(0,0,0,0.3)' }}>
              <ChevronRight
                sx={{
                  transform: collapsed.recent ? 'rotate(0deg)' : 'rotate(90deg)',
                  transition: 'transform 0.2s',
                  fontSize: 18,
                }}
              />
            </IconButton>
          </Box>
          <Collapse in={!collapsed.recent} timeout="auto" unmountOnExit>
            <Box sx={{ padding: '16px' }}>
              {loading ? (
                <Skeleton variant="text" width="60%" height={30} />
              ) : (
                <>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: isLive ? '#10b981' : '#f59e0b',
                        flexShrink: 0,
                      }}
                    />
                    <Typography sx={{ color: PRIMARY, fontSize: '0.95rem', fontWeight: 700 }}>
                      {isLive ? 'Website is live' : 'Website is a draft'}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.8rem', mb: 1 }}>
                    {website?.title ?? '—'} — /{website?.slug ?? '…'}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Public sx={{ fontSize: 15 }} />}
                    onClick={onEditWebsite}
                    sx={{
                      color: PRIMARY,
                      borderColor: 'rgba(0,17,33,0.3)',
                      textTransform: 'none',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      mr: 1,
                      '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(0,17,33,0.05)' },
                    }}
                  >
                    Edit Website
                  </Button>
                  {isLive && website?.publicUrl && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<OpenInNew sx={{ fontSize: 15 }} />}
                      onClick={() => window.open(website.publicUrl ?? '', '_blank')}
                      sx={{
                        color: PRIMARY,
                        borderColor: 'rgba(0,17,33,0.3)',
                        textTransform: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(0,17,33,0.05)' },
                      }}
                    >
                      View
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Collapse>
        </Box>
      </Box>

      {/* Bottom Row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: '24px',
          mb: '32px',
        }}
      >
        {/* Applicant Status Distribution */}
        <Box sx={CARD}>
          <Box
            sx={{
              px: 2.5,
              py: 2,
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography sx={SECTION_LABEL}>Applicant Status Distribution</Typography>
            <IconButton
              size="small"
              onClick={() => toggle('distribution')}
              sx={{ color: 'rgba(0,0,0,0.3)' }}
            >
              <ChevronRight
                sx={{
                  transform: collapsed.distribution ? 'rotate(0deg)' : 'rotate(90deg)',
                  transition: 'transform 0.2s',
                  fontSize: 18,
                }}
              />
            </IconButton>
          </Box>
          <Collapse in={!collapsed.distribution} timeout="auto" unmountOnExit>
            <Box sx={{ padding: '20px' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography sx={{ color: PRIMARY, fontSize: '1.25rem', fontWeight: 700, mb: 0.5 }}>
                    {applicants.length}
                  </Typography>
                  <Typography sx={SECTION_LABEL}>Total Applicants</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {distribution.counts.map(({ status, count }) => (
                  <Box
                    key={status}
                    onClick={() => onFilterApplicants(status)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography
                        sx={{
                          color: 'rgba(0,0,0,0.5)',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {status}
                      </Typography>
                      <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.7rem', fontWeight: 700 }}>
                        {count}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${Math.max(2, (count / distribution.max) * 100)}%`,
                          height: '100%',
                          bgcolor: STATUS_COLORS[status],
                          borderRadius: 3,
                          transition: 'width 0.3s',
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Collapse>
        </Box>

        {/* Recent Applicants */}
        <Box sx={CARD}>
          <Box
            sx={{
              px: 2.5,
              py: 2,
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography sx={SECTION_LABEL}>Recent Applicants</Typography>
            <IconButton
              size="small"
              onClick={() => toggle('recent')}
              sx={{ color: 'rgba(0,0,0,0.3)' }}
            >
              <ChevronRight
                sx={{
                  transform: collapsed.recent ? 'rotate(0deg)' : 'rotate(90deg)',
                  transition: 'transform 0.2s',
                  fontSize: 18,
                }}
              />
            </IconButton>
          </Box>
          <Collapse in={!collapsed.recent} timeout="auto" unmountOnExit>
            <Box sx={{ padding: '8px 16px' }}>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <Box key={i} sx={{ py: 1.25, borderBottom: i < 2 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                    <Skeleton variant="text" width="40%" height={10} sx={{ mb: 0.75 }} />
                    <Skeleton variant="text" width="70%" height={14} />
                  </Box>
                ))
              ) : recent.length > 0 ? (
                recent.map((a, i) => (
                  <Box
                    key={a.id}
                    onClick={() => onFilterApplicants(a.status)}
                    sx={{
                      py: 1.25,
                      borderBottom: i < recent.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Typography
                      sx={{
                        color: 'rgba(0,0,0,0.35)',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        mb: 0.75,
                      }}
                    >
                      {a.status}
                    </Typography>
                    <Typography sx={{ color: ACCENT, fontSize: '0.78rem', fontWeight: 700 }}>
                      {a.fullName}
                    </Typography>
                    <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.75rem' }}>
                      {a.gradeAppliedFor ?? '—'} • {a.phone}
                    </Typography>
                    <Typography sx={{ color: 'rgba(0,0,0,0.3)', fontSize: '0.65rem', mt: 0.25 }}>
                      {new Date(a.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography
                    sx={{
                      color: 'rgba(0,0,0,0.3)',
                      fontSize: '0.75rem',
                      fontStyle: 'italic',
                      mb: 1.5,
                    }}
                  >
                    No applicants yet — they will appear here from your website.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Public sx={{ fontSize: 15 }} />}
                    onClick={onEditWebsite}
                    sx={{
                      color: PRIMARY,
                      borderColor: 'rgba(0,17,33,0.3)',
                      textTransform: 'none',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(0,17,33,0.05)' },
                    }}
                  >
                    Go to Website Editor
                  </Button>
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      </Box>
    </>
  );
}
