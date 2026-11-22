import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { smsApi, type DeliveryReportRow } from '@/services/sms-api';
import { SMS_AMBER, SMS_NAVY } from './sms-theme';
import { displayText, formatKigaliDateTime } from '@/shared/display';
import { getMainScrollEl } from '@/shared/main-scroll';

const STATUS_COLOR: Record<string, string> = {
  DELIVERED: '#047857',
  FAILED: '#b91c1c',
  QUEUED: SMS_NAVY,
  PENDING: '#0369a1',
  SENT: '#0369a1',
};

type Props = {
  open: boolean;
  row: DeliveryReportRow | null;
  onClose: () => void;
};

function parseStudents(summary: string | null | undefined): string[] {
  if (!summary?.trim()) return [];
  return summary
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function PanelBody({
  row,
  messages,
  loading,
  students,
  onClose,
}: {
  row: DeliveryReportRow;
  messages: DeliveryReportRow[];
  loading: boolean;
  students: string[];
  onClose: () => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
      <Box
        sx={{
          px: 2,
          py: 1.75,
          bgcolor: SMS_NAVY,
          color: '#fff',
          borderBottom: `3px solid ${SMS_AMBER}`,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', color: SMS_AMBER }}>
              PARENT SMS
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: 17, sm: 20 },
                fontWeight: 800,
                mt: 0.5,
                lineHeight: 1.25,
                wordBreak: 'break-word',
              }}
            >
              {displayText(row.parentName, 'Parent')}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', mt: 0.5 }}>{row.phoneMasked}</Typography>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', flexShrink: 0 }}
            aria-label="Close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          px: 2,
          py: 2,
          minWidth: 0,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Box sx={{ mb: 2, p: 1.75, borderRadius: 2, bgcolor: '#fff', border: '1px solid rgba(0,4,53,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SchoolOutlinedIcon sx={{ fontSize: 18, color: SMS_AMBER }} />
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: SMS_NAVY }}>Students linked</Typography>
          </Box>
          {students.length ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {students.map((s) => (
                <Typography
                  key={s}
                  sx={{ fontSize: 13, color: 'rgba(0,4,53,0.85)', lineHeight: 1.45, wordBreak: 'break-word' }}
                >
                  {s}
                </Typography>
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No student details on record.</Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <SmsOutlinedIcon sx={{ fontSize: 18, color: SMS_AMBER }} />
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: SMS_NAVY }}>
            Messages sent ({messages.length})
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={22} sx={{ color: SMS_AMBER }} />
          </Box>
        ) : null}

        {!loading &&
          messages.map((m) => {
            const when = formatKigaliDateTime(m.createdAt);
            const color = STATUS_COLOR[m.status] ?? SMS_NAVY;
            return (
              <Box
                key={m.id}
                sx={{
                  mb: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: '#fff',
                  border: '1px solid rgba(0,4,53,0.08)',
                  boxShadow: '0 2px 12px rgba(0,4,53,0.04)',
                  minWidth: 0,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'rgba(0,4,53,0.55)' }}>
                    {when.date} · {when.time}
                  </Typography>
                  <Chip
                    size="small"
                    label={m.status}
                    sx={{ fontWeight: 700, fontSize: 10, bgcolor: `${color}14`, color }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontSize: 13,
                    color: SMS_NAVY,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {m.messageBody}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1, wordBreak: 'break-word' }}>
                  {m.segments} segment{m.segments === 1 ? '' : 's'}
                  {m.studentSummary?.trim() ? ` · ${m.studentSummary}` : ''}
                </Typography>
              </Box>
            );
          })}
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderTop: '1px solid rgba(0,4,53,0.08)',
          bgcolor: '#fff',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <PersonOutlineOutlinedIcon sx={{ fontSize: 16, color: SMS_AMBER, mt: 0.2 }} />
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.4 }}>
            Swipe or scroll to read long messages. Tap outside to close.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function SmsHistoryParentDrawer({ open, row, onClose }: Props) {
  const [messages, setMessages] = useState<DeliveryReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [mountEl, setMountEl] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setMountEl(null);
      return;
    }
    setMountEl(getMainScrollEl() ?? null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !mountEl) return;
    const prev = mountEl.style.overflow;
    mountEl.style.overflow = 'hidden';
    return () => {
      mountEl.style.overflow = prev;
    };
  }, [open, mountEl]);

  useEffect(() => {
    if (!open || !row?.phoneNormalized) {
      setMessages(row ? [row] : []);
      return;
    }
    setLoading(true);
    smsApi
      .parentHistory(row.phoneNormalized)
      .then(({ data }) => {
        const list = (data.data ?? []) as DeliveryReportRow[];
        setMessages(list.length ? list : [row]);
      })
      .catch(() => setMessages([row]))
      .finally(() => setLoading(false));
  }, [open, row]);

  const students = useMemo(() => {
    const fromRow = parseStudents(row?.studentSummary);
    const fromAll = messages.flatMap((m) => parseStudents(m.studentSummary));
    return [...new Set([...fromRow, ...fromAll])];
  }, [row, messages]);

  if (!open || !row || !mountEl) return null;

  return createPortal(
    <>
      <Box
        role="presentation"
        onClick={onClose}
        sx={{
          position: 'absolute',
          inset: 0,
          bgcolor: 'rgba(0, 4, 53, 0.55)',
          zIndex: 1300,
          animation: 'shulechatHistoryFadeIn 0.2s ease-out',
          '@keyframes shulechatHistoryFadeIn': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
        }}
      />
      <Box
        role="dialog"
        aria-modal="true"
        aria-label="Parent SMS history"
        onClick={(e) => e.stopPropagation()}
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: { xs: 0, lg: 'auto' },
          width: { xs: '100%', lg: 'min(440px, 100%)' },
          maxWidth: '100%',
          zIndex: 1310,
          bgcolor: '#f8fafc',
          borderLeft: { lg: `3px solid ${SMS_AMBER}` },
          boxShadow: { lg: '-12px 0 40px rgba(0,4,53,0.15)' },
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          pb: 'env(safe-area-inset-bottom, 0px)',
          animation: 'shulechatHistorySlideIn 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
          '@keyframes shulechatHistorySlideIn': {
            from: { transform: 'translateX(100%)' },
            to: { transform: 'translateX(0)' },
          },
        }}
      >
        <PanelBody row={row} messages={messages} loading={loading} students={students} onClose={onClose} />
      </Box>
    </>,
    mountEl
  );
}
