'use client';

import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { PageLoading, ErrorState, EmptyState } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { todayLabel } from '@/lib/format';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { BriefingData } from '@/types';

function severitySx(severity: string) {
  if (severity === 'urgent') {
    return {
      borderColor: 'rgba(214,69,69,0.3)',
      bgcolor: 'rgba(214,69,69,0.06)',
      iconBg: 'rgba(214,69,69,0.12)',
      iconColor: brand.danger,
    };
  }
  if (severity === 'warning') {
    return {
      borderColor: 'rgba(217,144,19,0.3)',
      bgcolor: 'rgba(217,144,19,0.06)',
      iconBg: 'rgba(217,144,19,0.14)',
      iconColor: brand.warning,
    };
  }
  return {
    borderColor: brand.border,
    bgcolor: 'rgba(248,249,252,0.8)',
    iconBg: '#fff',
    iconColor: brand.muted,
  };
}

export default function BriefingPage() {
  const router = useRouter();
  const { scope, refreshKey } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<BriefingData>(
    () => consoleApi.briefing(scope),
    [scope.organizationId, scope.academicYear, scope.term, refreshKey]
  );

  if (loading && !data) return <PageLoading label="Preparing today’s briefing…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No briefing available" />;

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Daily Briefing"
        description={`${todayLabel()} — what needs the Director’s attention from verified school records.`}
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
        }}
      >
        {data.sections.map((section) => (
          <PanelCard
            key={section.id}
            title={section.title}
            subtitle={`${section.items.length} item${section.items.length === 1 ? '' : 's'}`}
          >
            <List disablePadding>
              {section.items.map((item, index) => {
                const s = severitySx(item.severity);
                const Icon =
                  item.severity === 'urgent'
                    ? WarningAmberOutlinedIcon
                    : item.severity === 'warning'
                      ? AssignmentOutlinedIcon
                      : CheckCircleOutlineIcon;
                return (
                  <ListItemButton
                    key={index}
                    onClick={() => item.link && router.push(item.link)}
                    sx={{
                      borderRadius: 1.25,
                      mb: 1.25,
                      border: '1px solid',
                      borderColor: s.borderColor,
                      bgcolor: s.bgcolor,
                      alignItems: 'flex-start',
                      gap: 1.5,
                      p: 1.5,
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 },
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 2,
                          bgcolor: s.iconBg,
                          color: s.iconColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon sx={{ fontSize: 16 }} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{item.label}</Typography>
                      }
                      secondary={
                        <Typography component="span" sx={{ mt: 0.5, display: 'block', fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
                          {item.detail}
                        </Typography>
                      }
                    />
                    {item.link ? <NorthEastIcon sx={{ fontSize: 16, color: 'text.disabled', mt: 0.5, flexShrink: 0 }} /> : null}
                  </ListItemButton>
                );
              })}
            </List>
          </PanelCard>
        ))}
      </Box>
    </Box>
  );
}
