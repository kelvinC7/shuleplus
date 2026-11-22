import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Alert from '@mui/material/Alert';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import MeetingRoomOutlinedIcon from '@mui/icons-material/MeetingRoomOutlined';
import CloseIcon from '@mui/icons-material/Close';
import QrScanModal from '../components/QrScanModal';
import { PageLoading, EmptyState } from '../components/ui';
import {
  ListPage,
  StickyTabs,
  StickyFilterBar,
  BarSelect,
  ListPageBody,
  PageTitleRow,
  NavyStats,
  SectionPaper,
} from '../components/ListPageKit';
import {
  checkExamEligibility,
  fetchExamLists,
  fetchMyExamRooms,
  tpApiError,
} from '../services/teacherPortalApi';
import { brand } from '../theme/theme';

function roomHref(room) {
  const qs = new URLSearchParams({
    sessionId: room.sessionId || '',
    examDate: room.examDate || '',
    slotCode: room.slotCode || '',
  });
  return `/examinations/${encodeURIComponent(room.roomName)}?${qs}`;
}

function roomListKey(room) {
  return `${room.sessionId}|${room.examDate}|${room.slotCode}|${room.roomName}`;
}

const STATUS_STYLES = {
  allowed: { bgcolor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' },
  noList: { bgcolor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' },
  denied: { bgcolor: '#FEF2F2', color: '#9F1239', border: '1px solid #FECDD3' },
};

function listStatus(student) {
  if (student.examAllowed === false) return { text: 'Not allowed', tone: 'denied' };
  if (student.examDecision === 'NO_LIST') return { text: 'No list', tone: 'noList' };
  return { text: 'Allowed', tone: 'allowed' };
}

function resultFromStudent(student) {
  const noList = student.examDecision === 'NO_LIST';
  return {
    studentCode: student.studentCode,
    published: !noList,
    allowed: student.examAllowed !== false,
    status: student.examDecision || (student.examAllowed === false ? 'NOT_ALLOWED' : 'ALLOWED'),
    studentName: student.fullName,
    className: student.className,
    reason: student.exceptionReason,
    message: noList ? 'No published examination list for this class.' : undefined,
    balance: student.feeBalance ?? undefined,
  };
}

function EligibilityDialog({ result, onClose }) {
  const allowed = result.published && result.allowed;
  const noList = !result.published || result.status === 'NO_LIST';
  const tone = noList ? 'noList' : allowed ? 'allowed' : 'denied';
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogContent sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: brand.navy }}>Eligibility</Typography>
          <Button
            size="small"
            onClick={onClose}
            aria-label="Close"
            sx={{ minWidth: 0, p: 0.5, color: brand.muted }}
          >
            <CloseIcon fontSize="small" />
          </Button>
        </Stack>
        <Box sx={{ ...STATUS_STYLES[tone], borderRadius: 1.5, px: 2, py: 1.75 }}>
          <Typography sx={{ fontWeight: 600, color: brand.navy }}>
            {result.studentName || result.studentCode}
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13, color: 'text.secondary' }}>
            {noList ? 'No list' : allowed ? 'Allowed' : 'Not allowed'}
          </Typography>
          {result.message ? (
            <Typography sx={{ mt: 1, fontSize: 13, color: 'text.secondary' }}>{result.message}</Typography>
          ) : null}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default function Examinations() {
  const [rooms, setRooms] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listsLoading, setListsLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [tab, setTab] = useState('rooms');
  const [roomQuery, setRoomQuery] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [listQuery, setListQuery] = useState('');
  const [listRoomKey, setListRoomKey] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchMyExamRooms();
        if (!cancelled) {
          setRooms(data?.rooms ?? []);
          setError(data?.warning || '');
        }
      } catch (err) {
        if (!cancelled) setError(tpApiError(err, 'Could not load examination rooms'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadLists() {
    if (lists.length) return;
    setListsLoading(true);
    try {
      const data = await fetchExamLists();
      const rows = data?.rooms ?? [];
      setLists(rows);
      if (rows[0]) setListRoomKey(roomListKey(rows[0].room));
    } catch (err) {
      setError(tpApiError(err, 'Could not load exam lists'));
    } finally {
      setListsLoading(false);
    }
  }

  async function checkCode(raw) {
    const studentCode = String(raw || '').trim();
    if (!studentCode) return;
    setChecking(true);
    setError('');
    try {
      setResult(await checkExamEligibility({ studentCode }));
      setCodeOpen(false);
      setScanOpen(false);
      setManualCode('');
    } catch (err) {
      setError(tpApiError(err, 'Could not check list'));
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (tab === 'lists') void loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filteredRooms = useMemo(() => {
    const q = roomQuery.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) =>
      `${r.roomName || ''} ${r.subjectName || r.sessionName || ''} ${r.examDate || ''}`.toLowerCase().includes(q)
    );
  }, [rooms, roomQuery]);

  const selectedList = lists.find((row) => roomListKey(row.room) === listRoomKey) || lists[0];
  const filteredStudents = useMemo(() => {
    const students = selectedList?.students ?? [];
    const q = listQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(q) ||
        s.studentCode?.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q)
    );
  }, [selectedList, listQuery]);

  const totalStudents = rooms.reduce((s, r) => s + (r.studentCount || 0), 0);
  const subjectCount = new Set(rooms.map((r) => r.subjectName || r.sessionName).filter(Boolean)).size;

  const stats = [
    { label: 'Exam Rooms', value: loading ? '-' : rooms.length },
    { label: 'Students Seated', value: loading ? '-' : totalStudents },
    { label: 'Subjects', value: loading ? '-' : subjectCount },
    { label: 'Room Lists', value: lists.length || '-' },
  ];

  const alertSeverity = /not running|3003/i.test(error) ? 'warning' : 'error';

  const tabs = [
    { id: 'rooms', label: 'Your rooms' },
    { id: 'lists', label: 'Room lists' },
  ];

  return (
    <>
      <ListPage>
        <StickyTabs tabs={tabs} value={tab} onChange={setTab} />

        {tab === 'rooms' ? (
          <StickyFilterBar top={42} search={roomQuery} onSearch={setRoomQuery} searchPlaceholder="Search rooms…" />
        ) : (
          <StickyFilterBar top={42} search={listQuery} onSearch={setListQuery} searchPlaceholder="Search students…">
            {lists.length ? (
              <BarSelect
                label="Room"
                value={selectedList ? roomListKey(selectedList.room) : ''}
                onChange={setListRoomKey}
                options={lists.map((row) => ({ value: roomListKey(row.room), label: row.room.roomName }))}
              />
            ) : null}
          </StickyFilterBar>
        )}

        <ListPageBody>
          <PageTitleRow
            title="Examinations"
            subtitle="Invigilation and examination lists"
            actions={
              <>
                <Button
                  variant="contained"
                  onClick={() => setScanOpen(true)}
                  disabled={checking}
                  startIcon={<QrCodeScannerIcon />}
                  sx={{ textTransform: 'none', fontWeight: 700, bgcolor: brand.navy, color: '#fff', '&:hover': { bgcolor: '#1B2D52' } }}
                >
                  {checking ? 'Checking…' : 'Scan QR'}
                </Button>
                <Button variant="outlined" onClick={() => setCodeOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, borderColor: brand.border }}>
                  Enter code
                </Button>
              </>
            }
          />

          {error ? <Alert severity={alertSeverity} sx={{ borderRadius: 1 }}>{error}</Alert> : null}

          <NavyStats stats={stats} />

          {tab === 'rooms' ? (
            <SectionPaper title="Your rooms" count={filteredRooms.length}>
              {loading ? (
                <PageLoading label="Loading rooms…" />
              ) : !filteredRooms.length ? (
                <EmptyState title="No exam rooms found" description={rooms.length ? 'Try a different search.' : 'No exam rooms assigned.'} />
              ) : (
                filteredRooms.map((room, idx) => (
                  <ButtonBase
                    key={room.key || roomHref(room)}
                    component={Link}
                    to={roomHref(room)}
                    sx={{
                      display: 'flex',
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      px: 1.5,
                      py: 1.35,
                      textAlign: 'left',
                      bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                      borderBottom: idx < filteredRooms.length - 1 ? '1px solid rgba(19,33,61,0.06)' : 'none',
                      '&:hover': { bgcolor: 'rgba(245,166,35,0.06)' },
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{ fontWeight: 700, fontSize: 14, color: brand.navy }}>{room.roomName}</Typography>
                      <Typography noWrap sx={{ fontSize: 12, color: brand.muted }}>
                        {room.examDate} · {room.subjectName || room.sessionName} · {room.studentCount} students
                      </Typography>
                    </Box>
                    <MeetingRoomOutlinedIcon sx={{ fontSize: 18, color: brand.muted, flexShrink: 0 }} />
                  </ButtonBase>
                ))
              )}
            </SectionPaper>
          ) : (
            <SectionPaper title={selectedList?.room?.roomName || 'Room lists'} count={selectedList ? filteredStudents.length : undefined}>
              {listsLoading ? (
                <PageLoading label="Loading lists…" />
              ) : !lists.length ? (
                <EmptyState title="No lists yet" />
              ) : !filteredStudents.length ? (
                <EmptyState title="No students found" description="Try a different search." />
              ) : (
                <Box sx={{ maxHeight: 'min(560px, 60vh)', overflowY: 'auto' }}>
                  {filteredStudents.map((student, idx) => {
                    const badge = listStatus(student);
                    return (
                      <ButtonBase
                        key={student.studentId}
                        onClick={() => setResult(resultFromStudent(student))}
                        sx={{
                          display: 'flex',
                          width: '100%',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          px: 1.5,
                          py: 1.35,
                          textAlign: 'left',
                          bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                          borderBottom: idx < filteredStudents.length - 1 ? '1px solid rgba(19,33,61,0.06)' : 'none',
                          '&:hover': { bgcolor: 'rgba(245,166,35,0.06)' },
                        }}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography noWrap sx={{ fontSize: 14, fontWeight: 700, color: brand.navy }}>{student.fullName}</Typography>
                          <Typography noWrap sx={{ fontSize: 12, color: brand.muted }}>{student.studentCode}</Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={badge.text}
                          sx={{ flexShrink: 0, height: 22, fontSize: 10, fontWeight: 700, ...STATUS_STYLES[badge.tone] }}
                        />
                      </ButtonBase>
                    );
                  })}
                </Box>
              )}
            </SectionPaper>
          )}
        </ListPageBody>
      </ListPage>

      {scanOpen ? (
        <QrScanModal
          title="Scan student QR"
          hint="Check examination list"
          onScan={(code) => void checkCode(code)}
          onClose={() => setScanOpen(false)}
          onManual={() => {
            setScanOpen(false);
            setCodeOpen(true);
          }}
        />
      ) : null}

      <Dialog open={codeOpen} onClose={() => setCodeOpen(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogContent sx={{ p: 2.5 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: brand.navy, mb: 1 }}>Student code</Typography>
          <TextField
            autoFocus
            fullWidth
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void checkCode(manualCode)}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button fullWidth variant="outlined" onClick={() => setCodeOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth variant="contained" color="primary" onClick={() => void checkCode(manualCode)}>
              Check
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {result ? <EligibilityDialog result={result} onClose={() => setResult(null)} /> : null}
    </>
  );
}
