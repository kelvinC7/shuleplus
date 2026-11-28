import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';

const NAVY = '#000435';
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3003/api';

type PublicRoomData = {
  list: {
    id: string;
    listCode?: string | null;
    examinationCode?: string | null;
    examinationName?: string | null;
    academicYear: string;
    term: string;
    startDate?: string | null;
    endDate?: string | null;
    status: string;
  };
  room: {
    id: string;
    roomName: string;
    roomNumber?: string | null;
    capacity: number;
    allocations: Array<{
      id: string;
      studentId: string;
      studentCode?: string | null;
      studentName: string;
      className: string;
      classLevel?: string | null;
      gender?: string | null;
      isException?: boolean;
    }>;
  };
};

function fmtDate(v?: string | null) {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PublicExamRoomPage() {
  const { listId, roomId } = useParams();
  const [search] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicRoomData | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!listId || !roomId) { setError('Invalid examination room link.'); setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/examination-lists/public/${encodeURIComponent(listId)}/rooms/${encodeURIComponent(roomId)}`);
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.message || 'Could not load examination room.');
        if (alive) setData(json?.data ?? null);
      } catch (e: any) {
        if (alive) setError(e?.message || 'Could not load examination room.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [listId, roomId]);

  const allocations = data?.room.allocations ?? [];
  const classes = [...new Set(allocations.map((a) => a.className).filter(Boolean))];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f7fb', py: { xs: 2, md: 4 } }}>
      <Container maxWidth="lg">
        <Paper elevation={0} sx={{ overflow: 'hidden', borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
          <Box sx={{ bgcolor: NAVY, color: '#fff', px: { xs: 2, md: 3 }, py: 2.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" alignItems={{ sm: 'center' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.12)', display: 'grid', placeItems: 'center' }}>
                  <MeetingRoomOutlinedIcon />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.1rem', md: '1.35rem' }, lineHeight: 1.2 }}>
                    {data?.list.examinationName || 'Examination Room List'}
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.78)', mt: 0.4 }}>
                    {data ? `${data.list.academicYear} · ${data.list.term}` : 'Loading room details...'}
                  </Typography>
                </Box>
              </Stack>
              {data && (
                <Chip
                  label={`${allocations.length} / ${data.room.capacity} students`}
                  sx={{ bgcolor: 'rgba(252,176,56,0.18)', color: '#FCB038', fontWeight: 700, border: '1px solid rgba(252,176,56,0.35)' }}
                />
              )}
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }} spacing={1.5}>
                <CircularProgress size={28} />
                <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>Loading room list...</Typography>
              </Stack>
            ) : error ? (
              <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
            ) : data ? (
              <Stack spacing={2.5}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 1.25 }}>
                  {[
                    ['Examination Room', `${data.room.roomName}${data.room.roomNumber ? ` (${data.room.roomNumber})` : ''}`],
                    ['List Code', data.list.listCode || search.get('code') || '—'],
                    ['Examination Code', data.list.examinationCode || '—'],
                    ['Period', `${fmtDate(data.list.startDate)} - ${fmtDate(data.list.endDate)}`],
                  ].map(([label, value]) => (
                    <Paper key={String(label)} elevation={0} sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
                      <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</Typography>
                      <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: NAVY, mt: 0.25, wordBreak: 'break-word' }}>{value as any}</Typography>
                    </Paper>
                  ))}
                </Box>

                <Paper elevation={0} sx={{ p: 1.5, border: '1px solid #e2e8f0', borderRadius: 2, bgcolor: '#f8fafc' }}>
                  <Typography sx={{ fontSize: '0.67rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Allocated Classes ({classes.length})
                  </Typography>
                  <Typography sx={{ fontSize: classes.length > 6 ? '0.95rem' : '1rem', fontWeight: 700, color: NAVY, mt: 0.35, lineHeight: 1.5 }}>
                    {classes.length ? classes.join(', ') : '—'}
                  </Typography>
                </Paper>

                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        {['No.', 'Student ID', 'Student Name', 'Class'].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 800, color: NAVY, fontSize: '0.76rem' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allocations.length ? allocations.map((a, i) => (
                        <TableRow key={a.id} hover>
                          <TableCell sx={{ fontSize: '0.82rem', color: '#475569', width: 56 }}>{i + 1}</TableCell>
                          <TableCell sx={{ fontSize: '0.82rem', color: '#334155', fontFamily: 'monospace' }}>{a.studentCode || a.studentId || '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a' }}>{a.studentName}</TableCell>
                          <TableCell sx={{ fontSize: '0.82rem', color: '#334155' }}>{a.className}</TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} sx={{ py: 4, textAlign: 'center', color: '#64748b' }}>No students allocated to this room.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            ) : null}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
