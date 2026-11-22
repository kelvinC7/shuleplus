import { useEffect, useMemo, useState } from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { smsApi, type SmsUsage } from '@/services/sms-api';
import { SmsPageFrame } from '@/components/sms/sms-page-frame';
import { SmsStatCard } from '@/components/sms/sms-stat-card';
import { SMS_AMBER, SMS_NAVY, quotaPeriodLabel } from '@/components/sms/sms-theme';

export default function SmsUsagePage() {
  const [usage, setUsage] = useState<SmsUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    smsApi
      .usage()
      .then(({ data }) => setUsage(data.data))
      .catch((e: unknown) => {
        setError(
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Unable to load quota.'
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const pct = useMemo(() => {
    if (!usage || usage.maxSegments <= 0) return 0;
    return Math.min(100, Math.round((usage.segmentsUsed / usage.maxSegments) * 100));
  }, [usage]);

  const barColor =
    pct >= 100 ? '#b91c1c' : pct >= 90 ? '#c2410c' : pct >= 80 ? SMS_AMBER : SMS_NAVY;

  const periodLabel = usage?.quotaPeriod ? quotaPeriodLabel[usage.quotaPeriod] ?? usage.quotaPeriod : 'Allowance';

  const warn =
    pct >= 100
      ? 'Quota used up. Contact Shule+ for more segments.'
      : usage?.warnAt90 && pct >= 90
        ? 'Over 90%. New sends may block at the limit.'
        : usage?.warnAt80 && pct >= 80
          ? 'Over 80% of allowance.'
          : null;

  return (
    <SmsPageFrame title="Usage & quota" subtitle="Billable SMS segments" loading={loading} error={error}>
      {usage ? (
        <>
          <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: '#fff', border: '1px solid rgba(0,4,53,0.07)', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: SMS_NAVY }}>{periodLabel}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: SMS_NAVY }}>{pct}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(0,4,53,0.06)',
                '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 4 },
              }}
            />
            <Typography sx={{ fontSize: 12, color: 'rgba(0,4,53,0.45)', mt: 1 }}>
              {usage.segmentsUsed.toLocaleString()} / {usage.maxSegments.toLocaleString()} · {usage.remaining.toLocaleString()} left
            </Typography>
            {warn ? (
              <Typography sx={{ fontSize: 12, color: pct >= 90 ? '#b91c1c' : '#c2410c', mt: 1, fontWeight: 600 }}>{warn}</Typography>
            ) : null}
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <SmsStatCard label="Allowance" value={usage.maxSegments.toLocaleString()} />
            <SmsStatCard label="Used" value={usage.segmentsUsed.toLocaleString()} accent />
            <SmsStatCard label="Remaining" value={usage.remaining.toLocaleString()} />
            <SmsStatCard label="Delivered" value={usage.delivered.toLocaleString()} />
            <SmsStatCard label="Failed" value={usage.failed.toLocaleString()} />
          </Box>
        </>
      ) : null}
    </SmsPageFrame>
  );
}
