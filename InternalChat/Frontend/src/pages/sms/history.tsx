import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  MenuItem,
  TextField,
  Typography,
  InputAdornment,
  Paper,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { smsApi, type DeliveryReportRow } from '@/services/sms-api';
import { fetchDeliveryReport } from '@/services/sms-delivery-report';
import { SmsPageFrame } from '@/components/sms/sms-page-frame';
import { SMS_NAVY } from '@/components/sms/sms-theme';
import { SmsHistoryParentDrawer } from '@/components/sms/sms-history-parent-drawer';
import { displayText, formatKigaliDateTime } from '@/shared/display';

type Campaign = {
  id: string;
  createdAt: string;
  status: string;
  recipientCount: number;
};

const STATUS_COLOR: Record<string, string> = {
  DELIVERED: '#047857',
  FAILED: '#b91c1c',
  QUEUED: SMS_NAVY,
  PENDING: '#0369a1',
  SENT: '#0369a1',
};

function formatFailure(raw: string | null) {
  if (!raw) return '';
  try {
    const j = JSON.parse(raw) as { message?: string };
    if (j.message) return j.message;
  } catch {
    /* plain */
  }
  return raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
}

function statusChip(status: string) {
  return (
    <Chip
      size="small"
      label={status}
      sx={{
        fontWeight: 700,
        fontSize: 10,
        bgcolor: `${STATUS_COLOR[status] ?? SMS_NAVY}14`,
        color: STATUS_COLOR[status] ?? SMS_NAVY,
      }}
    />
  );
}

function RecipientCard({ row, onOpen }: { row: DeliveryReportRow; onOpen: () => void }) {
  const when = formatKigaliDateTime(row.createdAt);
  return (
    <Paper
      elevation={0}
      onClick={onOpen}
      sx={{
        p: 2,
        mb: 1,
        border: '1px solid rgba(0,4,53,0.08)',
        borderRadius: 2,
        display: { xs: 'flex', lg: 'none' },
        cursor: 'pointer',
        alignItems: 'center',
        gap: 1,
        '&:hover': { borderColor: 'rgba(252,176,56,0.5)', bgcolor: 'rgba(252,176,56,0.04)' },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{displayText(row.parentName, 'Parent')}</Typography>
          {statusChip(row.status)}
        </Box>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{row.phoneMasked}</Typography>
        <Typography sx={{ fontSize: 13, mt: 0.75 }}>{displayText(row.studentSummary, 'No student linked')}</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
          {when.date} · {when.time} · {row.segments} seg
        </Typography>
      </Box>
      <ChevronRightIcon sx={{ color: 'rgba(0,4,53,0.35)' }} />
    </Paper>
  );
}

export default function SmsHistoryPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [rows, setRows] = useState<DeliveryReportRow[]>([]);
  const [summary, setSummary] = useState({ totalMessages: 0, delivered: 0, failed: 0, pending: 0, segments: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [legacyFallback, setLegacyFallback] = useState(false);
  const [drawerRow, setDrawerRow] = useState<DeliveryReportRow | null>(null);

  const [campaignId, setCampaignId] = useState('');
  const [status, setStatus] = useState('ALL');
  const [student, setStudent] = useState('');
  const [term, setTerm] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadReport = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchDeliveryReport({
      campaignId: campaignId || undefined,
      status,
      student: student.trim() || undefined,
      term,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((data) => {
        setLegacyFallback(Boolean(data.usedLegacyFallback));
        setRows(data.rows ?? []);
        setSummary(data.summary ?? { totalMessages: 0, delivered: 0, failed: 0, pending: 0, segments: 0 });
      })
      .catch((e: unknown) => {
        setError(
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Could not load delivery report.'
        );
      })
      .finally(() => setLoading(false));
  }, [campaignId, status, student, term, dateFrom, dateTo]);

  useEffect(() => {
    smsApi.campaigns().then(({ data }) => setCampaigns((data.data ?? []) as Campaign[]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadReport(), 300);
    return () => clearTimeout(t);
  }, [loadReport]);

  const deliveryRate = useMemo(() => {
    if (summary.totalMessages === 0) return 0;
    return Math.round((summary.delivered / summary.totalMessages) * 100);
  }, [summary]);

  function exportCsv() {
    if (!rows.length) return;
    const header = ['Date', 'Parent', 'Phone', 'Student(s)', 'Segments', 'Status', 'Failure'];
    const lines = rows.map((r) => [
      new Date(r.createdAt).toISOString(),
      r.parentName ?? '',
      r.phoneMasked,
      r.studentSummary ?? '',
      String(r.segments),
      r.status,
      formatFailure(r.failureReason),
    ]);
    const csv = [header, ...lines].map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sms-delivery-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <SmsPageFrame
        title="History"
        subtitle={`${summary.totalMessages} parent message(s) · ${summary.segments} segments`}
        loading={loading}
        error={error}
        actions={
          <Button
            variant="outlined"
            disabled={!rows.length}
            onClick={exportCsv}
            fullWidth
            sx={{
              fontWeight: 600,
              borderColor: 'rgba(0,4,53,0.2)',
              color: SMS_NAVY,
              textTransform: 'none',
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            Export CSV
          </Button>
        }
      >
        {legacyFallback ? (
          <Box
            sx={{
              mb: 2,
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: 'rgba(252,176,56,0.12)',
              border: '1px solid rgba(252,176,56,0.35)',
            }}
          >
            <Typography sx={{ fontSize: 12, color: SMS_NAVY, fontWeight: 600 }}>
              Showing history from campaign data. Update chat-api on the server for the full delivery report API.
            </Typography>
          </Box>
        ) : null}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
            gap: { xs: 0.75, sm: 1 },
            mb: 2,
          }}
        >
          {[
            { label: 'Messages', value: summary.totalMessages },
            { label: 'Delivered', value: summary.delivered },
            { label: 'Failed', value: summary.failed },
            { label: 'Pending', value: summary.pending },
            { label: 'Rate', value: `${deliveryRate}%` },
          ].map((s) => (
            <Box key={s.label} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#fff', border: '1px solid rgba(0,4,53,0.07)' }}>
              <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'rgba(0,4,53,0.45)' }}>{s.label}</Typography>
              <Typography sx={{ fontSize: 17, fontWeight: 800, color: SMS_NAVY }}>{s.value}</Typography>
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' },
            gap: 1.5,
            mb: 2,
          }}
        >
          <TextField
            size="small"
            label="Search student / class"
            value={student}
            onChange={(e) => setStudent(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField select size="small" label="Campaign" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <MenuItem value="">All campaigns</MenuItem>
            {campaigns.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {new Date(c.createdAt).toLocaleDateString()} · {c.recipientCount} parents
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {['ALL', 'DELIVERED', 'FAILED', 'QUEUED', 'PENDING', 'SENT'].map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Period" value={term} onChange={(e) => setTerm(e.target.value)}>
            <MenuItem value="ALL">All time</MenuItem>
            <MenuItem value="MONTH">This month</MenuItem>
            <MenuItem value="TERM">This term</MenuItem>
            <MenuItem value="YEAR">This year</MenuItem>
          </TextField>
          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </Box>

        {rows.map((r) => (
          <RecipientCard key={r.id} row={r} onOpen={() => setDrawerRow(r)} />
        ))}

        <Box
          sx={{
            display: { xs: 'none', lg: 'block' },
            border: '1px solid rgba(0,4,53,0.08)',
            borderRadius: 2,
            overflow: 'auto',
            bgcolor: '#fff',
            maxHeight: 'min(60vh, 520px)',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 0.9fr 1.2fr 0.5fr 0.7fr 1fr 32px',
              gap: 1,
              px: 2,
              py: 1.25,
              bgcolor: 'rgba(0,4,53,0.04)',
              fontSize: 11,
              fontWeight: 800,
              color: SMS_NAVY,
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
          >
            <span>Parent</span>
            <span>Phone</span>
            <span>Student(s)</span>
            <span>Seg</span>
            <span>Status</span>
            <span>Sent</span>
            <span />
          </Box>
          {!rows.length && !loading ? (
            <Typography sx={{ p: 3, fontSize: 13, color: 'text.secondary' }}>No messages match your filters.</Typography>
          ) : null}
          {rows.map((r) => {
            const when = formatKigaliDateTime(r.createdAt);
            return (
              <Box
                key={r.id}
                onClick={() => setDrawerRow(r)}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 0.9fr 1.2fr 0.5fr 0.7fr 1fr 32px',
                  gap: 1,
                  px: 2,
                  py: 1.25,
                  borderTop: '1px solid rgba(0,4,53,0.06)',
                  fontSize: 13,
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(252,176,56,0.06)' },
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>{displayText(r.parentName, 'Parent')}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{r.phoneMasked}</Typography>
                <Typography sx={{ fontSize: 12 }}>{displayText(r.studentSummary, 'No student linked')}</Typography>
                <Typography>{r.segments}</Typography>
                {statusChip(r.status)}
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {when.date} {when.time}
                </Typography>
                <ChevronRightIcon sx={{ fontSize: 18, color: 'rgba(0,4,53,0.35)' }} />
                {r.failureReason ? (
                  <Typography sx={{ gridColumn: '1 / -1', fontSize: 11, color: '#b91c1c' }}>
                    {formatFailure(r.failureReason)}
                  </Typography>
                ) : null}
              </Box>
            );
          })}
        </Box>
      </SmsPageFrame>

      <SmsHistoryParentDrawer open={Boolean(drawerRow)} row={drawerRow} onClose={() => setDrawerRow(null)} />
    </>
  );
}
