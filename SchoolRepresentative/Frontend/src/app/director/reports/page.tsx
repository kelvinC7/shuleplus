'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import DownloadIcon from '@mui/icons-material/Download';
import { toast } from 'sonner';
import { DirectorPageHeader } from '@/components/director-page-header';
import { PanelCard } from '@/components/panel-card';
import { EmptyState, ErrorState, PageLoading } from '@/components/list-ui';
import { useConsole } from '@/contexts/console-context';
import { useConsoleFetch } from '@/hooks/use-console-fetch';
import { consoleApi } from '@/services/console-api';
import { brand } from '@/theme/theme';
import { pageSx } from '@/theme/sx';
import type { ReportsData } from '@/types';

const FORMAT_ICONS: Record<string, typeof DescriptionOutlinedIcon> = {
  Excel: GridOnOutlinedIcon,
  Print: PrintOutlinedIcon,
  PDF: DescriptionOutlinedIcon,
};

export default function ReportsPage() {
  const { scope, ctx, refreshKey } = useConsole();
  const { data, loading, error, reload } = useConsoleFetch<ReportsData>(() => consoleApi.reports(), [refreshKey]);

  const [category, setCategory] = useState('');
  const [organizationId, setOrganizationId] = useState(scope.organizationId || 'all');
  const [format, setFormat] = useState('PDF');
  const [academicYear, setAcademicYear] = useState(scope.academicYear || '');
  const [term, setTerm] = useState(scope.term || '');
  const [busy, setBusy] = useState(false);

  const selectedCategory = useMemo(
    () => data?.categories.find((c) => c.id === (category || data.categories[0]?.id)),
    [data, category]
  );

  if (loading && !data) return <PageLoading label="Loading report catalogue…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <EmptyState title="No reports available" />;

  const activeCategory = category || data.categories[0]?.id || '';
  const formats = data.formats ?? ['PDF', 'Excel', 'Print'];

  const generate = async () => {
    setBusy(true);
    try {
      await consoleApi.generateReport({
        category: activeCategory,
        organizationId,
        format,
        academicYear: academicYear || scope.academicYear,
        term: term || scope.term,
      });
      toast.success('Report queued — download will be available shortly');
      void reload();
    } catch {
      toast.error('Could not queue report');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={pageSx}>
      <DirectorPageHeader
        title="Reports & Exports"
        description="Build and export consolidated reports by branch, academic year and term. Exports honour your permissions and the active scope."
      />

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' } }}>
        <PanelCard title="Report builder" subtitle="Choose a dataset, format and scope">
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
              <TextField
                select
                fullWidth
                label="Report category"
                value={activeCategory}
                onChange={(e) => setCategory(e.target.value)}
              >
                {data.categories.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>
              {selectedCategory?.href ? (
                <Button
                  component={Link}
                  href={selectedCategory.href}
                  size="small"
                  endIcon={<NorthEastIcon sx={{ fontSize: 14 }} />}
                  sx={{ mt: 1, fontSize: 11, fontWeight: 700, color: '#b5771a' }}
                >
                  Open source page
                </Button>
              ) : null}
            </Box>

            <TextField select fullWidth label="Branch" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
              <MenuItem value="all">All branches</MenuItem>
              {(ctx?.branches ?? []).map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name}
                </MenuItem>
              ))}
            </TextField>

            <Box>
              <Typography sx={{ mb: 1, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                Format
              </Typography>
              <Stack direction="row" spacing={1}>
                {formats.map((option) => {
                  const Icon = FORMAT_ICONS[option] ?? DescriptionOutlinedIcon;
                  const active = format === option;
                  return (
                    <Button
                      key={option}
                      variant={active ? 'contained' : 'outlined'}
                      color={active ? 'primary' : 'inherit'}
                      onClick={() => setFormat(option)}
                      sx={{
                        flex: 1,
                        flexDirection: 'column',
                        py: 1.25,
                        borderColor: active ? brand.primary : brand.border,
                        fontSize: 11,
                        fontWeight: 700,
                        color: active ? brand.navy : 'text.secondary',
                      }}
                    >
                      <Icon sx={{ fontSize: 18, mb: 0.5 }} />
                      {option}
                    </Button>
                  );
                })}
              </Stack>
            </Box>

            <TextField
              select
              fullWidth
              label="Academic year"
              value={academicYear || scope.academicYear || ''}
              onChange={(e) => setAcademicYear(e.target.value)}
            >
              {(ctx?.academicYears ?? [scope.academicYear].filter(Boolean)).map((year) => {
                const y = typeof year === 'string' ? year : String((year as { id?: string; label?: string }).id ?? (year as { label?: string }).label ?? year);
                return (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                );
              })}
            </TextField>

            <TextField select fullWidth label="Term" value={term || scope.term || ''} onChange={(e) => setTerm(e.target.value)}>
              {(ctx?.terms ?? [scope.term].filter(Boolean)).map((t) => {
                const v = typeof t === 'string' ? t : String((t as { id?: string; label?: string }).id ?? (t as { label?: string }).label ?? t);
                return (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                );
              })}
            </TextField>
          </Box>

          <Button
            fullWidth
            variant="contained"
            color="secondary"
            startIcon={<AssessmentOutlinedIcon />}
            onClick={() => void generate()}
            disabled={busy}
            sx={{ mt: 3, fontWeight: 700 }}
          >
            {busy ? 'Queuing…' : 'Generate report'}
          </Button>
        </PanelCard>

        <PanelCard title="Recent exports" subtitle="Your download history" bodySx={{ px: 0, pt: 0 }}>
          {!(data.recent?.length) ? (
            <EmptyState title="No exports yet" hint="Generated reports will appear here." />
          ) : (
            <List disablePadding>
              {data.recent.map((item) => (
                <ListItem
                  key={item.id}
                  divider
                  secondaryAction={
                    item.url ? (
                      <Button size="small" href={item.url} startIcon={<DownloadIcon sx={{ fontSize: 14 }} />} sx={{ fontSize: 11, fontWeight: 700 }}>
                        Download
                      </Button>
                    ) : null
                  }
                >
                  <ListItemText
                    primary={<Typography sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>{item.title ?? item.name}</Typography>}
                    secondary={
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {item.format} · {item.createdAt ?? item.date}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </PanelCard>
      </Box>
    </Box>
  );
}
