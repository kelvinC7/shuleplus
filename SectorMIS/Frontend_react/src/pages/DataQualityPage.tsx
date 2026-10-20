import { useEffect, useState } from 'react';
import { StatCard, StatsGrid } from '@/components/stat-card';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { fetchDataQuality } from '@/services/sei-api';
import { PageLoading } from '@/modules/shared/page-loading';
import { SectionCard } from '@/modules/shared/section-card';

export default function DataQualityPage() {
  const [q, setQ] = useState<Record<string, number | string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDataQuality()
      .then(setQ)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !q) return <PageLoading />;

  return (
    <SectionCard title="Attendance data quality" subtitle="Trust layer for institutional reporting">
      <StatsGrid>
        <StatCard label="Schools reporting" value={String(q.schoolsReporting)} icon={<VerifiedOutlinedIcon />} />
        <StatCard label="Complete records" value={q.completeRecords as number} />
        <StatCard label="Delayed records" value={q.delayedRecords as number} />
        <StatCard label="Device offline" value={q.deviceOffline as number} />
        <StatCard label="Invalid scans" value={q.invalidScans as number} />
        <StatCard label="Duplicate scans" value={q.duplicateScans as number} />
        <StatCard label="Manual corrections" value={q.manualCorrections as number} />
      </StatsGrid>
    </SectionCard>
  );
}
