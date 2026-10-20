import { useMemo, useState } from 'react';
import { Box, Typography, IconButton, Collapse, Skeleton } from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import { CARD, SECTION_LABEL, PAGE_TITLE, ACCENT, PRIMARY, CONTENT_BG } from '../styles';
import type { DashboardSummary, Kit, KitRequest } from '@/types';

interface OverviewProps {
  summary: DashboardSummary | null;
  kits: Kit[];
  requests: KitRequest[];
  loading: boolean;
  onOpenKits: () => void;
  onOpenOrders: () => void;
  onFilterOrders: (status: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#3b82f6',
  PAID: '#10b981',
  DELIVERED: '#6366f1',
  CANCELLED: '#ef4444',
};

export function Overview({
  summary,
  kits,
  requests,
  loading,
  onOpenKits,
  onOpenOrders,
  onFilterOrders,
}: OverviewProps) {
  const [collapsed, setCollapsed] = useState({ system: false, topKits: false, distribution: false });
  const toggle = (key: 'system' | 'topKits' | 'distribution') =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const kitUsage = useMemo(() => {
    const counts = new Map<string, number>();
    requests.forEach((r) => {
      const key = r.kitId;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([kitId, count]) => ({ kit: kits.find((k) => k.id === kitId), count }))
      .filter((x): x is { kit: Kit; count: number } => x.kit != null)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [kits, requests]);

  const distribution = useMemo(() => {
    const statuses = Object.keys(STATUS_COLORS);
    const counts = statuses.map((status) => ({
      status,
      count: requests.filter((r) => r.status === status).length,
    }));
    const max = Math.max(1, ...counts.map((c) => c.count));
    return { counts, max };
  }, [requests]);

  const stats: Array<{ label: string; value: string; onClick: () => void }> = [
    { label: 'Kits', value: String(summary?.kitCount ?? kits.length), onClick: onOpenKits },
    { label: 'Requests', value: String(summary?.requestCount ?? requests.length), onClick: onOpenOrders },
    { label: 'Pending', value: String(summary?.pendingCount ?? 0), onClick: () => onFilterOrders('PENDING') },
    { label: 'Collected', value: `${Number(summary?.collected ?? 0).toLocaleString()} RWF`, onClick: onOpenOrders },
  ];

  return (
    <>
      <Typography variant="h5" sx={{ ...PAGE_TITLE, mb: 4 }}>
        Dashboard
      </Typography>

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

        {/* Top Requested Kits */}
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
            <Typography sx={SECTION_LABEL}>Top Requested Kits</Typography>
            <IconButton size="small" onClick={() => toggle('topKits')} sx={{ color: 'rgba(0,0,0,0.3)' }}>
              <ChevronRight
                sx={{
                  transform: collapsed.topKits ? 'rotate(0deg)' : 'rotate(90deg)',
                  transition: 'transform 0.2s',
                  fontSize: 18,
                }}
              />
            </IconButton>
          </Box>
          <Collapse in={!collapsed.topKits} timeout="auto" unmountOnExit>
            <Box sx={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {loading
                ? [...Array(3)].map((_, i) => (
                    <Skeleton key={i} variant="rounded" width="46%" height={40} sx={{ borderRadius: '2px' }} />
                  ))
                : kitUsage.length > 0
                  ? kitUsage.map(({ kit, count }, idx) => (
                      <Box
                        key={kit.id}
                        onClick={onOpenKits}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          backgroundColor: 'rgba(0,0,0,0.04)',
                          padding: '8px 12px',
                          borderRadius: '2px',
                          border: '1px solid rgba(0,0,0,0.02)',
                          flex: '1 1 auto',
                          minWidth: '140px',
                          cursor: 'pointer',
                          '&:hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
                        }}
                      >
                        <Box
                          sx={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: CONTENT_BG,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: `1px solid ${PRIMARY}`,
                          }}
                        >
                          <Typography sx={{ color: PRIMARY, fontSize: '0.65rem', fontWeight: 700 }}>
                            {idx + 1}
                          </Typography>
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              color: 'rgba(0,0,0,0.7)',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {kit.name}
                          </Typography>
                          <Typography sx={{ color: ACCENT, fontSize: '0.62rem', fontWeight: 700 }}>
                            {count} request{count === 1 ? '' : 's'}
                          </Typography>
                        </Box>
                      </Box>
                    ))
                  : (
                      <Typography
                        sx={{
                          py: 2,
                          textAlign: 'center',
                          width: '100%',
                          color: 'rgba(0,0,0,0.3)',
                          fontSize: '0.75rem',
                          fontStyle: 'italic',
                        }}
                      >
                        No requests yet
                      </Typography>
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
        {/* Request Status Distribution */}
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
            <Typography sx={SECTION_LABEL}>Request Status Distribution</Typography>
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
                    {Number(summary?.collected ?? 0).toLocaleString()} RWF
                  </Typography>
                  <Typography sx={SECTION_LABEL}>Total Collected</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {distribution.counts.map(({ status, count }) => (
                  <Box
                    key={status}
                    onClick={() => onFilterOrders(status)}
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
      </Box>
    </>
  );
}
