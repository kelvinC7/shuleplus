import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { Send, History, DataUsageOutlined, SmsOutlined, CheckCircle, ErrorOutlineOutlined } from '@mui/icons-material';
import { useAuth } from '@/contexts/auth-context';
import { smsApi, type SmsUsage } from '@/services/sms-api';
import { SendSmsWizard } from '@/components/sms/send-sms-wizard';
import { SmsPageFrame } from '@/components/sms/sms-page-frame';
import { SmsStatCard } from '@/components/sms/sms-stat-card';
import { SmsNavTile } from '@/components/sms/sms-nav-tile';
import { SMS_AMBER, SMS_NAVY, quotaPeriodLabel } from '@/components/sms/sms-theme';

import { displayNumber } from '@/shared/display';

function formatNum(n: number | undefined) {
  return displayNumber(n);
}

export default function SmsCenterPage() {
  const { summary } = useAuth();
  const [usage, setUsage] = useState<SmsUsage | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([smsApi.usage(), smsApi.classes()])
      .then(([usageRes, classesRes]) => {
        setUsage(usageRes.data.data);
        setClasses(classesRes.data.data ?? []);
      })
      .catch((e: unknown) => {
        const msg =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Unable to load SMS data.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const periodShort = usage?.quotaPeriod ? quotaPeriodLabel[usage.quotaPeriod]?.split(' ')[0] ?? usage.quotaPeriod : '';

  return (
    <SmsPageFrame
      title="SMS Center"
      subtitle="Parent messaging · staff chat stays separate"
      loading={loading}
      error={error}
      actions={
        <Button
          variant="contained"
          startIcon={<Send />}
          disabled={!usage?.smsEnabled}
          onClick={() => setWizardOpen(true)}
          fullWidth
          sx={{
            bgcolor: SMS_AMBER,
            color: SMS_NAVY,
            fontWeight: 700,
            px: 2.5,
            py: 1,
            borderRadius: 1.5,
            textTransform: 'none',
            boxShadow: 'none',
            width: { xs: '100%', sm: 'auto' },
            '&:hover': { bgcolor: '#e5a032', boxShadow: 'none' },
          }}
        >
          Send SMS
        </Button>
      }
    >
      {!usage?.smsEnabled && usage ? (
        <Alert severity="warning" sx={{ mb: 2, py: 0, borderRadius: 1.5, fontSize: 13 }}>
          SMS is off for this school. Ask Shule+ to enable access and set a quota.
        </Alert>
      ) : null}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2.5 }}>
        <SmsStatCard label="Used" value={formatNum(usage?.segmentsUsed)} hint={periodShort || undefined} icon={<SmsOutlined />} />
        <SmsStatCard label="Remaining" value={formatNum(usage?.remaining)} accent icon={<DataUsageOutlined />} />
        <SmsStatCard label="Delivered" value={formatNum(usage?.delivered)} icon={<CheckCircle />} />
        <SmsStatCard label="Failed" value={formatNum(usage?.failed)} icon={<ErrorOutlineOutlined />} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        <SmsNavTile to="/sms/history" title="Campaign history" icon={<History sx={{ fontSize: 22 }} />} />
        <SmsNavTile to="/sms/usage" title="Usage & quota" icon={<DataUsageOutlined sx={{ fontSize: 22 }} />} />
      </Box>

      {usage?.smsEnabled ? (
        <Typography sx={{ fontSize: 11, color: 'rgba(0,4,53,0.35)', mt: 2.5, textAlign: 'center' }}>
          Counts are billable SMS segments, not recipient headcount.
        </Typography>
      ) : null}

      <SendSmsWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSent={load}
        classes={classes}
        schoolName={summary?.organizationName}
        usage={usage}
      />
    </SmsPageFrame>
  );
}
