import type { ReactNode } from 'react';
import { Box, Typography, Button, IconButton, Skeleton, Collapse } from '@mui/material';
import {
  GridView,
  SyncAlt,
  Category,
  Assignment,
  ChevronRight,
} from '@mui/icons-material';
import { ACCENT, ACCENT_BORDER, GLASS, PRIMARY, SOFT, CUSTOM_SCROLLBAR } from './styles';
import type { Kit, KitRequest } from '@/types';

interface ShuleKitLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMobile: boolean;
  loading: boolean;
  collapsed: Record<string, boolean>;
  toggleCollapse: (section: string) => void;
  kits: Kit[];
  requests: KitRequest[];
  onNewKit: () => void;
  onNewRequest: () => void;
  onSelectStatus: (status: string) => void;
  children: ReactNode;
}

const TABS = [
  { name: 'Dashboard', icon: <GridView />, tabName: 'Overview' },
  { name: 'Kits', icon: <Category />, tabName: 'Kits' },
  { name: 'Orders', icon: <Assignment />, tabName: 'Orders' },
];

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  PENDING: { color: '#f59e0b', label: 'Pending' },
  APPROVED: { color: '#3b82f6', label: 'Approved' },
  PAID: { color: '#10b981', label: 'Paid' },
  DELIVERED: { color: '#6366f1', label: 'Delivered' },
  CANCELLED: { color: '#ef4444', label: 'Cancelled' },
};

export function ShuleKitLayout({
  activeTab,
  onTabChange,
  isMobile,
  loading,
  collapsed,
  toggleCollapse,
  kits,
  requests,
  onNewKit,
  onNewRequest,
  onSelectStatus,
  children,
}: ShuleKitLayoutProps) {
  const recentActivity = [...requests]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const statusCounts = Object.keys(STATUS_STYLES)
    .map((status) => ({
      status,
      count: requests.filter((r) => r.status === status).length,
    }))
    .filter((s) => s.count > 0 || s.status === 'PENDING');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, height: 0, overflow: 'hidden' }}>
      {/* Sub-Nav */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: isMobile ? 2 : 4,
          bgcolor: GLASS,
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${ACCENT_BORDER}`,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === (tab.tabName || tab.name);
          return (
            <Box
              key={tab.name}
              onClick={() => onTabChange(tab.tabName || tab.name)}
              sx={{
                px: 2,
                py: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? ACCENT : 'rgba(0,0,0,0.45)',
                borderBottom: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  color: PRIMARY,
                  '& .MuiSvgIcon-root': { color: ACCENT },
                },
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    '& .MuiSvgIcon-root': {
                      fontSize: 16,
                      color: isActive ? ACCENT : 'rgba(245,158,11,0.4)',
                      transition: 'all 0.2s',
                    },
                  }}
                >
                  {tab.icon}
                </Box>
              )}
              {tab.name}
            </Box>
          );
        })}
      </Box>

      {/* Body */}
      <Box sx={{ display: 'flex', flex: 1, height: 0, overflow: 'hidden', position: 'relative' }}>
        {/* Sidebar */}
        {!isMobile && (
          <Box
            sx={{
              width: 350,
              borderRight: `1px solid ${ACCENT_BORDER}`,
              backgroundColor: GLASS,
              backdropFilter: 'blur(20px)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              minHeight: 0,
              flexShrink: 0,
              boxShadow: '4px 0 24px rgba(245,158,11,0.06)',
              ...CUSTOM_SCROLLBAR,
            }}
          >
            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              {/* Card 1: Activity */}
              <Box
                sx={{
                  bgcolor: GLASS,
                  border: `1px solid ${ACCENT_BORDER}`,
                  borderRadius: '4px',
                  boxShadow: '0 4px 16px rgba(245,158,11,0.08)',
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${ACCENT_BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography
                    sx={{
                      color: 'rgba(0,0,0,0.5)',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Activity
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => toggleCollapse('activity')}
                    sx={{ p: 0, color: SOFT }}
                  >
                    <ChevronRight
                      sx={{
                        fontSize: 18,
                        transform: collapsed.activity ? 'rotate(0deg)' : 'rotate(90deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </IconButton>
                </Box>

                <Collapse in={!collapsed.activity} timeout="auto" unmountOnExit>
                  <Box sx={{ px: 2, py: 0.5 }}>
                    {loading ? (
                      [...Array(3)].map((_, i) => (
                        <Box
                          key={i}
                          sx={{
                            py: 1.25,
                            borderBottom: i < 2 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                          }}
                        >
                          <Skeleton variant="text" width="40%" height={10} sx={{ mb: 0.75 }} />
                          <Skeleton variant="text" width="70%" height={14} />
                        </Box>
                      ))
                    ) : recentActivity.length > 0 ? (
                      recentActivity.map((req, i) => (
                        <Box
                          key={req.id}
                          sx={{
                            py: 1.25,
                            borderBottom:
                              i < recentActivity.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
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
                            {STATUS_STYLES[req.status]?.label ?? req.status}
                          </Typography>
                          <Typography sx={{ color: ACCENT, fontSize: '0.78rem', fontWeight: 700 }}>
                            {req.requestNumber}
                          </Typography>
                          <Typography
                            sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.75rem' }}
                          >
                            {req.studentName}
                          </Typography>
                          <Typography sx={{ color: 'rgba(0,0,0,0.3)', fontSize: '0.65rem', mt: 0.25 }}>
                            {new Date(req.createdAt).toLocaleString()} • {req.parentName}
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Typography
                        sx={{
                          py: 2,
                          textAlign: 'center',
                          color: 'rgba(0,0,0,0.3)',
                          fontSize: '0.75rem',
                          fontStyle: 'italic',
                        }}
                      >
                        No recent activity
                      </Typography>
                    )}
                  </Box>
                </Collapse>

                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderTop: `1px solid ${ACCENT_BORDER}`,
                    display: 'flex',
                    gap: 1,
                  }}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SyncAlt sx={{ fontSize: 13 }} />}
                    onClick={onNewKit}
                    sx={{
                      flex: 1,
                      color: PRIMARY,
                      borderColor: 'rgba(0,17,33,0.3)',
                      textTransform: 'none',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(0,17,33,0.05)' },
                    }}
                  >
                    New Kit
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<SyncAlt sx={{ fontSize: 13 }} />}
                    onClick={onNewRequest}
                    sx={{
                      flex: 1,
                      color: PRIMARY,
                      borderColor: 'rgba(0,17,33,0.3)',
                      textTransform: 'none',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(0,17,33,0.05)' },
                    }}
                  >
                    New Order
                  </Button>
                </Box>
              </Box>

              {/* Card 2: Order Status */}
              <Box
                sx={{
                  bgcolor: GLASS,
                  border: `1px solid ${ACCENT_BORDER}`,
                  borderRadius: '4px',
                  boxShadow: '0 4px 16px rgba(245,158,11,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${ACCENT_BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography
                    sx={{
                      color: 'rgba(0,0,0,0.5)',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Order Status
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => toggleCollapse('orderStatus')}
                    sx={{ p: 0, color: SOFT }}
                  >
                    <ChevronRight
                      sx={{
                        fontSize: 18,
                        transform: collapsed.orderStatus ? 'rotate(0deg)' : 'rotate(90deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </IconButton>
                </Box>

                <Collapse in={!collapsed.orderStatus} timeout="auto" unmountOnExit>
                  <Box sx={{ px: 2, py: 1.25, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <Typography variant="caption" sx={{ color: 'rgba(0,0,0,0.45)', fontWeight: 900 }}>
                        {kits.length} Kits Configured
                      </Typography>
                    </Box>
                    {loading ? (
                      [...Array(4)].map((_, i) => (
                        <Skeleton key={i} variant="text" width="80%" height={20} sx={{ mb: 1 }} />
                      ))
                    ) : (
                      statusCounts.map(({ status, count }) => (
                        <Box
                          key={status}
                          onClick={() => onSelectStatus(status)}
                          sx={{
                            py: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(0,0,0,0.04)',
                            '&:hover': { bgcolor: 'rgba(245,158,11,0.05)' },
                            borderRadius: '2px',
                            px: 0.5,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: STATUS_STYLES[status].color,
                              }}
                            />
                            <Typography
                              sx={{ color: PRIMARY, fontSize: '0.78rem', fontWeight: 500 }}
                            >
                              {STATUS_STYLES[status].label}
                            </Typography>
                          </Box>
                          <Typography sx={{ color: 'rgba(0,0,0,0.5)', fontSize: '0.75rem', fontWeight: 600 }}>
                            {count}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                </Collapse>
              </Box>
            </Box>
          </Box>
        )}

        {/* Content Area */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            bgcolor: '#f8fafc',
            p: isMobile ? 2 : 4,
            ...CUSTOM_SCROLLBAR,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
