import { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Button,
  Skeleton,
  Menu,
  MenuItem,
  IconButton,
} from '@mui/material';
import { ArrowDropDown, ArrowBack, Refresh } from '@mui/icons-material';
import { TABLE_HEAD_CELL, PAGE_TITLE, PRIMARY, ACCENT_BORDER } from '../styles';
import { SearchInput } from '../components';
import { updateApplicantStatus } from '@/services/api';
import type { Applicant, ApplicantStatus } from '@/types';

const STATUS_STYLES: Record<ApplicantStatus, { color: string; bg: string }> = {
  NEW: { color: '#b45309', bg: '#fef3c7' },
  REVIEWED: { color: '#1d4ed8', bg: '#dbeafe' },
  CONTACTED: { color: '#6d28d9', bg: '#ede9fe' },
  ACCEPTED: { color: '#047857', bg: '#d1fae5' },
  REJECTED: { color: '#b91c1c', bg: '#fee2e2' },
};

export function StatusChip({ status }: { status: ApplicantStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.NEW;
  return (
    <Box
      sx={{
        display: 'inline-block',
        px: 1,
        py: 0.25,
        borderRadius: '2px',
        fontSize: '0.68rem',
        fontWeight: 700,
        color: s.color,
        bgcolor: s.bg,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
      }}
    >
      {status}
    </Box>
  );
}

interface ApplicantsModuleProps {
  applicants: Applicant[];
  loading: boolean;
  error: string | null;
  status: string;
  onStatusChange: (status: string) => void;
  onOpen: (id: string) => void;
  onRefresh: () => void;
}

export function ApplicantsModule({
  applicants,
  loading,
  error,
  status,
  onStatusChange,
  onOpen,
  onRefresh,
}: ApplicantsModuleProps) {
  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applicants.filter((a) => {
      if (status && a.status !== status) return false;
      if (!q) return true;
      return (
        a.fullName.toLowerCase().includes(q) ||
        (a.gradeAppliedFor ?? '').toLowerCase().includes(q) ||
        a.phone.includes(q) ||
        (a.parentName ?? '').toLowerCase().includes(q)
      );
    });
  }, [applicants, search, status]);

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={PAGE_TITLE}>Applicants</Typography>
          <Typography sx={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.8rem', mt: 0.5 }}>
            Applications submitted from your public school website.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <SearchInput
            placeholder="Search applicants..."
            value={search}
            onChange={setSearch}
            onFilterClick={(e) => setAnchorEl(e.currentTarget)}
          />
          <IconButton onClick={onRefresh} sx={{ color: PRIMARY, border: `1px solid ${ACCENT_BORDER}`, borderRadius: '2px' }}>
            <Refresh sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { minWidth: 160, borderRadius: 2 } } }}
      >
        <MenuItem onClick={() => { onStatusChange(''); setAnchorEl(null); }}>
          <Typography sx={{ fontSize: '0.82rem', fontWeight: status === '' ? 700 : 400 }}>All statuses</Typography>
        </MenuItem>
        {(Object.keys(STATUS_STYLES) as ApplicantStatus[]).map((s) => (
          <MenuItem key={s} onClick={() => { onStatusChange(s); setAnchorEl(null); }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: status === s ? 700 : 400 }}>{s}</Typography>
          </MenuItem>
        ))}
      </Menu>

      {error && (
        <Box sx={{ p: 2, mb: 2, border: '1px solid rgba(220,38,38,0.3)', borderRadius: '2px' }}>
          <Typography sx={{ color: '#dc2626', fontSize: '0.8rem' }}>{error}</Typography>
        </Box>
      )}

      <TableContainer
        sx={{
          border: `1px solid ${ACCENT_BORDER}`,
          borderRadius: '4px',
          bgcolor: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 16px rgba(245,158,11,0.08)',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={TABLE_HEAD_CELL}>Student</TableCell>
              <TableCell sx={TABLE_HEAD_CELL}>Grade</TableCell>
              <TableCell sx={TABLE_HEAD_CELL}>Parent</TableCell>
              <TableCell sx={TABLE_HEAD_CELL}>Phone</TableCell>
              <TableCell sx={TABLE_HEAD_CELL}>Date</TableCell>
              <TableCell sx={TABLE_HEAD_CELL}>Status</TableCell>
              <TableCell sx={TABLE_HEAD_CELL}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((__, j) => (
                    <TableCell key={j} sx={{ py: 1.5 }}>
                      <Skeleton variant="text" width="80%" height={16} />
                    </TableCell>
                  ))}
                  <TableCell sx={{ py: 1.5 }}><Skeleton variant="text" width={20} height={16} /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 5, textAlign: 'center' }}>
                  <Typography sx={{ color: 'rgba(0,0,0,0.35)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    No applicants{status ? ` with status ${status}` : ''} found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow
                  key={a.id}
                  onClick={() => onOpen(a.id)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(245,158,11,0.04)' } }}
                >
                  <TableCell sx={{ py: 1.25 }}>
                    <Typography sx={{ color: PRIMARY, fontSize: '0.8rem', fontWeight: 700 }}>{a.fullName}</Typography>
                    {a.email && <Typography sx={{ color: 'rgba(0,0,0,0.35)', fontSize: '0.65rem' }}>{a.email}</Typography>}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.6)' }}>{a.gradeAppliedFor ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.6)' }}>{a.parentName ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.6)' }}>{a.phone}</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem', color: 'rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>
                    {new Date(a.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell><StatusChip status={a.status} /></TableCell>
                  <TableCell><ArrowDropDown sx={{ color: 'rgba(0,0,0,0.25)' }} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

interface ApplicantDetailProps {
  applicant: Applicant | null;
  onBack: () => void;
  onUpdated: (applicant: Applicant) => void;
  onRefresh: () => void;
}

const STATUS_OPTIONS: ApplicantStatus[] = ['NEW', 'REVIEWED', 'CONTACTED', 'ACCEPTED', 'REJECTED'];

export function ApplicantDetail({ applicant, onBack, onUpdated, onRefresh }: ApplicantDetailProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const current = applicant;

  if (!current) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 6 }}>
        <Button startIcon={<ArrowBack sx={{ fontSize: 18 }} />} onClick={onBack} sx={{ color: PRIMARY, textTransform: 'none' }}>
          Back
        </Button>
        <Typography sx={{ color: 'rgba(0,0,0,0.4)', fontSize: '0.8rem' }}>Applicant not found.</Typography>
      </Box>
    );
  }

  const handleStatus = async (next: ApplicantStatus) => {
    setAnchorEl(null);
    try {
      const updated = await updateApplicantStatus(current.id, next);
      onUpdated(updated);
      onRefresh();
    } catch {
      // ignore
    }
  };

  const rows: Array<[string, string]> = [
    ['Full name', current.fullName],
    ['Email', current.email ?? '—'],
    ['Phone', current.phone],
    ['Grade applying for', current.gradeAppliedFor ?? '—'],
    ['Date of birth', current.birthDate ?? '—'],
    ['Parent / guardian', current.parentName ?? '—'],
    ['Previous school', current.previousSchool ?? '—'],
    ['Submitted', new Date(current.createdAt).toLocaleString()],
  ];

  const extraRows: Array<[string, string]> = [];
  if (current.formData && typeof current.formData === 'object') {
    for (const [key, value] of Object.entries(current.formData)) {
      if (['fullName', 'email', 'phone', 'gradeAppliedFor', 'birthDate', 'parentName', 'previousSchool', 'message'].includes(key)) {
        continue;
      }
      const display =
        typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))
          ? value
          : String(value ?? '—');
      extraRows.push([key.replace(/_/g, ' '), display]);
    }
  }

  return (
    <Box sx={{ maxWidth: 860 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button startIcon={<ArrowBack sx={{ fontSize: 18 }} />} onClick={onBack} sx={{ color: PRIMARY, textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 }}>
            Back
          </Button>
          <Typography variant="h5" sx={PAGE_TITLE}>{current.fullName}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StatusChip status={current.status} />
          <Button
            variant="contained"
            size="small"
            onClick={async () => {
              await handleStatus('ACCEPTED');
              const payload = [
                current.fullName,
                current.email ?? '',
                current.phone,
                current.gradeAppliedFor ?? '',
                current.birthDate ?? '',
                current.parentName ?? '',
              ].join('\t');
              try {
                await navigator.clipboard.writeText(payload);
              } catch {
                /* ignore */
              }
              window.alert('Applicant accepted. Name and contacts were copied. Open Student Management → Add New Student to enroll them.');
            }}
            sx={{
              bgcolor: PRIMARY,
              textTransform: 'none',
              fontSize: '0.72rem',
              fontWeight: 700,
              '&:hover': { bgcolor: PRIMARY },
            }}
          >
            Accept & enroll
          </Button>
          <Button
            variant="outlined"
            size="small"
            endIcon={<ArrowDropDown sx={{ fontSize: 16 }} />}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              color: PRIMARY,
              borderColor: 'rgba(0,17,33,0.3)',
              textTransform: 'none',
              fontSize: '0.72rem',
              fontWeight: 600,
              '&:hover': { borderColor: PRIMARY, bgcolor: 'rgba(0,17,33,0.05)' },
            }}
          >
            Update Status
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{ paper: { sx: { minWidth: 150, borderRadius: 2 } } }}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} onClick={() => void handleStatus(s)}>
                <Typography sx={{ fontSize: '0.82rem', fontWeight: current.status === s ? 700 : 400 }}>{s}</Typography>
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Box>

      <Box
        sx={{
          border: `1px solid ${ACCENT_BORDER}`,
          borderRadius: '4px',
          bgcolor: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 16px rgba(245,158,11,0.08)',
          overflow: 'hidden',
        }}
      >
        {[...rows, ...extraRows].map(([label, value], i, all) => (
          <Box
            key={label}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' },
              gap: 1,
              px: 2.5,
              py: 1.5,
              borderBottom: i < all.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
              bgcolor: i % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent',
            }}
          >
            <Typography sx={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {label}
            </Typography>
            {value.startsWith('http://') || value.startsWith('https://') ? (
              <Typography component="a" href={value} target="_blank" rel="noopener noreferrer" sx={{ color: PRIMARY, fontSize: '0.85rem', wordBreak: 'break-all' }}>
                {value}
              </Typography>
            ) : (
              <Typography sx={{ color: PRIMARY, fontSize: '0.85rem' }}>{value}</Typography>
            )}
          </Box>
        ))}
        {current.message && (
          <Box sx={{ px: 2.5, py: 2, bgcolor: 'rgba(245,158,11,0.04)' }}>
            <Typography sx={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', mb: 0.75 }}>
              Message
            </Typography>
            <Typography sx={{ color: 'rgba(0,0,0,0.7)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
              {current.message}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
