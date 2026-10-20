import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Chip, Typography } from '@mui/material';
import { fetchAttentionSchools } from '@/services/deo-api';
import { StatusChip } from '@/components/status-chip';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';

export default function AttentionPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchAttentionSchools>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttentionSchools()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography sx={{ fontWeight: 800, color: '#000435' }}>{items.length} schools require attention</Typography>
      {items.map((s) => (
        <SectionCard key={s.id} title={s.name} action={<StatusChip status={s.status} />}>
          <Typography sx={{ fontSize: '0.8125rem', mb: 1 }}>
            Student {s.studentAttendancePct}% · Staff {s.staffAttendancePct}%
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {s.reasons.map((r) => (
              <Chip key={r} size="small" label={r} sx={{ fontWeight: 600 }} />
            ))}
          </Box>
          <Typography component={Link} to={`/schools/${s.id}`} sx={{ display: 'inline-block', mt: 2, fontWeight: 700, color: '#000435' }}>
            View school profile →
          </Typography>
        </SectionCard>
      ))}
    </Box>
  );
}
