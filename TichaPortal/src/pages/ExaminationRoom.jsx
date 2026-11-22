import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import QrScanModal from '../components/QrScanModal';
import TeacherPageShell from '../components/TeacherPageShell';
import {
  fetchExamRoom,
  markExamEntry,
  markExamExit,
  tpApiDetails,
  tpApiError,
} from '../services/teacherPortalApi';
import { brand } from '../theme/theme';

function parseCode(raw) {
  const trimmed = String(raw || '').trim();
  if (trimmed.includes('|')) {
    const parts = trimmed.split('|');
    return (parts[3] || parts[parts.length - 1] || trimmed).trim();
  }
  return trimmed;
}

function allowedOf(s) {
  return s.examAllowed !== false;
}

export default function ExaminationRoom() {
  const { roomName: encodedRoom } = useParams();
  const [searchParams] = useSearchParams();
  const roomName = decodeURIComponent(encodedRoom || '');
  const sessionId = searchParams.get('sessionId') || undefined;
  const examDate = searchParams.get('examDate') || undefined;
  const slotCode = searchParams.get('slotCode') || undefined;

  const [room, setRoom] = useState(null);
  const [students, setStudents] = useState([]);
  const [mode, setMode] = useState('entry');
  const [scanOpen, setScanOpen] = useState(false);
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const data = await fetchExamRoom({ roomName, sessionId, examDate, slotCode });
    setRoom(data.room);
    setStudents(data.students || []);
  }, [roomName, sessionId, examDate, slotCode]);

  useEffect(() => {
    reload().catch((e) => setError(tpApiError(e, 'Could not load this exam room')));
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.fullName?.toLowerCase().includes(q) || s.studentCode?.toLowerCase().includes(q)
    );
  }, [students, query]);

  const kpis = {
    total: students.length,
    allowed: students.filter(allowedOf).length,
    blocked: students.filter((s) => !allowedOf(s)).length,
    present: students.filter((s) => s.checkInAt).length,
    exited: students.filter((s) => s.exitAt).length,
  };

  async function record(raw, method) {
    if (!String(raw || '').trim()) return;
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const body = {
        roomName,
        sessionId: room?.sessionId || sessionId,
        examDate: room?.examDate || examDate,
        slotCode: room?.slotCode || slotCode,
        studentCode: parseCode(raw),
        method,
      };
      if (mode === 'entry') {
        const result = await markExamEntry(body);
        setInfo(result.already ? result.message || 'Already marked present' : 'Examination attendance recorded');
      } else {
        await markExamExit(body);
        setInfo('Exit recorded');
      }
      setCode('');
      await reload();
    } catch (e) {
      const details = tpApiDetails(e);
      setError(details?.message || tpApiError(e, 'Could not record attendance'));
    } finally {
      setBusy(false);
      setScanOpen(false);
    }
  }

  const subtitle = [
    (room?.classNames || []).join(', '),
    room?.subjectName || room?.sessionName,
    room?.examDate && `${room.examDate} · ${room?.startTime || ''}–${room?.endTime || ''}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const shellStats = [
    { label: 'Total', value: kpis.total },
    { label: 'Allowed', value: kpis.allowed },
    { label: 'Blocked', value: kpis.blocked },
    { label: 'Present', value: kpis.present },
    { label: 'Exited', value: kpis.exited },
  ];

  const shellActions = (
    <Button component={Link} to="/examinations" variant="outlined" startIcon={<ArrowBackIcon />}>
      All rooms
    </Button>
  );

  return (
    <TeacherPageShell
      title="Examinations"
      subtitle={[room?.roomName || roomName, subtitle].filter(Boolean).join(' · ') || 'Examination room'}
      stats={shellStats}
      actions={shellActions}
    >
      {error ? <Alert severity="error">{error}</Alert> : null}
      {info ? <Alert severity="success">{info}</Alert> : null}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderColor: brand.border }}>
        <Stack direction="row" spacing={1}>
          {['entry', 'exit'].map((m) => (
            <Button
              key={m}
              onClick={() => setMode(m)}
              size="small"
              disableElevation
              sx={{
                borderRadius: 999,
                px: 2,
                textTransform: 'capitalize',
                bgcolor: mode === m ? brand.navy : '#F1F5F9',
                color: mode === m ? '#fff' : brand.muted,
                '&:hover': { bgcolor: mode === m ? brand.navy2 : '#E2E8F0' },
              }}
            >
              {m}
            </Button>
          ))}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Student code"
            onKeyDown={(e) => e.key === 'Enter' && void record(code, 'MANUAL')}
          />
          <Button
            variant="contained"
            color="primary"
            disabled={busy}
            onClick={() => void record(code, 'MANUAL')}
            sx={{ flexShrink: 0 }}
          >
            Record {mode}
          </Button>
          <Button variant="outlined" onClick={() => setScanOpen(true)} startIcon={<QrCodeScannerIcon />} sx={{ flexShrink: 0 }}>
            Scan
          </Button>
        </Stack>

        <TextField
          fullWidth
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roster…"
          sx={{ mt: 1.5 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: brand.muted }} />
              </InputAdornment>
            ),
          }}
        />

        <TableContainer sx={{ mt: 1.5 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Student', 'Code', 'Seat', 'Status'].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: brand.muted,
                      borderColor: brand.border,
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.studentId}>
                  <TableCell sx={{ color: brand.navy, borderColor: brand.border }}>{s.fullName}</TableCell>
                  <TableCell sx={{ color: brand.muted, borderColor: brand.border }}>{s.studentCode}</TableCell>
                  <TableCell sx={{ color: brand.muted, borderColor: brand.border }}>{s.seatCode || '-'}</TableCell>
                  <TableCell sx={{ borderColor: brand.border }}>
                    {s.checkInAt ? 'Present' : allowedOf(s) ? 'Allowed' : 'Not allowed'}
                    {s.exitAt ? ' · exited' : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {!filtered.length ? (
          <Typography sx={{ py: 3, textAlign: 'center', fontSize: 13, color: brand.muted }}>
            No students found.
          </Typography>
        ) : null}
      </Paper>

      {scanOpen ? (
        <QrScanModal
          title={mode === 'entry' ? 'Scan for entry' : 'Scan for exit'}
          onScan={(raw) => void record(raw, 'QR')}
          onClose={() => setScanOpen(false)}
          onManual={() => setScanOpen(false)}
        />
      ) : null}
    </TeacherPageShell>
  );
}
