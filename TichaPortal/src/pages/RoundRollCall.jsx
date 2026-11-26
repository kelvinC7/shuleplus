import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../services/api';
import { normalizeGradebookLabel } from '../utils/teacherGradebookUi';
import { getSchoolDateIso } from '../utils/schoolTime';
import TablePagination from '../components/TablePagination';
import { brand } from '../theme/theme';
import { NavyStats, PageTitleRow } from '../components/ListPageKit';
import { RollStartModal } from '../components/AttendanceModals';

function normalizeRollLabel(s) {
    return String(s ?? '').trim().slice(0, 160);
}

function validDateParam(value) {
    const date = String(value || '');
    return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
}

export default function RoundRollCall() {
        const [searchParams] = useSearchParams();
    const requestedClass = searchParams.get('className') || searchParams.get('class_name') || '';
    const requestedDate = searchParams.get('date') || '';
    const requestedRollName = searchParams.get('rollName') || searchParams.get('roll_label') || '';
    const requestedSubject = searchParams.get('subject') || '';
    const requestedPeriod = searchParams.get('periodLabel') || searchParams.get('period') || '';
    const [tab, setTab] = useState('take');
    const [selectedDate, setSelectedDate] = useState(
        () => validDateParam(requestedDate) || getSchoolDateIso()
    );
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [rollName, setRollName] = useState(requestedRollName);
    const [sessions, setSessions] = useState([]);
    const [roster, setRoster] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [readOnly, setReadOnly] = useState(false);

    const [historyRows, setHistoryRows] = useState([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPerPage, setHistoryPerPage] = useState(10);
    const [historyQ, setHistoryQ] = useState('');
    const [historyClass, setHistoryClass] = useState('');
    const [historyFrom, setHistoryFrom] = useState('');
    const [historyTo, setHistoryTo] = useState('');
    const [historyLoading, setHistoryLoading] = useState(false);

    const [viewSession, setViewSession] = useState(null);
    const [startOpen, setStartOpen] = useState(() => !requestedClass && !requestedRollName);

    const shiftDateByDays = (delta) => {
        const d = new Date(selectedDate + 'T12:00:00');
        d.setDate(d.getDate() + delta);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const fetchClasses = useCallback(async () => {
        try {
            const res = await api.get('/teacher-portal/classes', { params: { scope: 'school' } });
            setClasses(res.data?.success ? res.data.data || [] : []);
        } catch (e) {
            console.error(e);
            setClasses([]);
        }
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    useEffect(() => {
        const nextDate = validDateParam(requestedDate);
        if (nextDate) setSelectedDate(nextDate);
        if (requestedRollName) setRollName(requestedRollName);
    }, [requestedDate, requestedRollName]);

    useEffect(() => {
        if (!requestedClass || !classes.length) return;
        const match = classes.find(
            (className) =>
                normalizeGradebookLabel(className).toLowerCase() ===
                normalizeGradebookLabel(requestedClass).toLowerCase()
        );
        setSelectedClass(match || '');
    }, [classes, requestedClass]);

    useEffect(() => {
        if (tab === 'take' && !selectedClass && !rollName.trim()) setStartOpen(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const lessonContext = [requestedSubject, requestedPeriod].filter(Boolean).join(' · ');
    const isPeriodAttendance = false; // this page is Round Roll Call only; period attendance lives in PeriodAttendance.jsx
    const attendanceName = isPeriodAttendance ? 'attendance' : 'roll';
    const requestedClassMissing =
        Boolean(requestedClass) &&
        classes.length > 0 &&
        !classes.some(
            (className) =>
                normalizeGradebookLabel(className).toLowerCase() ===
                normalizeGradebookLabel(requestedClass).toLowerCase()
        );

    useEffect(() => {
        if (tab !== 'take' || !selectedClass || !selectedDate) {
            if (tab === 'take') setSessions([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const cn = normalizeGradebookLabel(selectedClass);
                const res = await api.get('/teacher-portal/round-roll-call/sessions', {
                    params: { class_name: cn, date: selectedDate },
                });
                if (!cancelled && res.data?.success) {
                    setSessions(Array.isArray(res.data.data?.sessions) ? res.data.data.sessions : []);
                }
            } catch {
                if (!cancelled) setSessions([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedClass, selectedDate, tab]);

    const rollLabelNorm = normalizeRollLabel(rollName);
    const canLoadRoster = Boolean(selectedClass && rollLabelNorm.length >= 1 && tab === 'take');

    useEffect(() => {
        if (!canLoadRoster) {
            if (tab === 'take') {
                setRoster([]);
                setReadOnly(false);
            }
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const cn = normalizeGradebookLabel(selectedClass);
                const res = await api.get('/teacher-portal/round-roll-call', {
                    params: { class_name: cn, date: selectedDate, roll_label: rollLabelNorm },
                });
                if (cancelled) return;
                if (!res.data?.success) {
                    setRoster([]);
                    setReadOnly(false);
                    return;
                }
                const rows = Array.isArray(res.data.data?.roster) ? res.data.data.roster : [];
                setRoster(rows);
                setReadOnly(Boolean(res.data.data?.log_exists && !res.data.data?.owned_by_me));
            } catch (err) {
                console.error(err);
                if (!cancelled) {
                    setRoster([]);
                    setReadOnly(false);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedClass, selectedDate, rollLabelNorm, canLoadRoster, tab]);

    const loadHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await api.get('/teacher-portal/round-roll-call/history', {
                params: {
                    page: historyPage,
                    limit: historyPerPage,
                    q: historyQ.trim() || undefined,
                    class_name: historyClass ? normalizeGradebookLabel(historyClass) : undefined,
                    date_from: historyFrom || undefined,
                    date_to: historyTo || undefined,
                },
            });
            if (res.data?.success) {
                const d = res.data.data || {};
                setHistoryRows(Array.isArray(d.items) ? d.items : []);
                setHistoryTotal(Number(d.total) || 0);
            }
        } catch (e) {
            console.error(e);
            setHistoryRows([]);
            setHistoryTotal(0);
        } finally {
            setHistoryLoading(false);
        }
    }, [historyPage, historyPerPage, historyQ, historyClass, historyFrom, historyTo]);

    useEffect(() => {
        if (tab === 'history') loadHistory();
    }, [tab, loadHistory]);

    const openSessionView = async (sessionId) => {
        setLoading(true);
        try {
            const res = await api.get(`/teacher-portal/round-roll-call/sessions/${sessionId}`);
            if (res.data?.success) {
                setViewSession(res.data.data);
                setTab('view');
            }
        } catch (e) {
            console.error(e);
            alert(isPeriodAttendance ? 'Could not load this period attendance.' : 'Could not load this roll call.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (readOnly) return;
        if (!selectedClass) return alert('Choose a class.');
        if (!rollLabelNorm) {
            return alert(
                isPeriodAttendance
                    ? 'Enter an attendance name (e.g. Mathematics · P4).'
                    : 'Enter a roll name (e.g. Morning Prep).'
            );
        }
        if (!roster.length) return alert('No students loaded.');
        try {
            setLoading(true);
            const cn = normalizeGradebookLabel(selectedClass);
            const existingRes = await api.get('/teacher-portal/round-roll-call', {
                params: { class_name: cn, date: selectedDate, roll_label: rollLabelNorm },
            });
            if (existingRes.data?.success && existingRes.data?.data?.log_exists) {
                if (!existingRes.data.data.owned_by_me) {
                    alert(
                        isPeriodAttendance
                            ? 'Another teacher already saved this attendance. View it from history.'
                            : 'Another teacher already saved this roll. View it from history.'
                    );
                    return;
                }
                const ok = window.confirm(
                    `Replace saved "${rollLabelNorm}" ${attendanceName} for ${selectedClass} on ${selectedDate}?`
                );
                if (!ok) return;
            }
            const records = roster.map((s) => ({
                student_id: s.id,
                name: s.name,
                student_code: s.adm,
                status: s.status,
                remarks: s.remarks || '',
            }));
            const res = await api.post('/teacher-portal/round-roll-call', {
                class_name: cn,
                date: selectedDate,
                roll_label: rollLabelNorm,
                records,
            });
            if (res.data.success) {
                alert(`Saved “${rollLabelNorm}” ${attendanceName} for ${selectedClass}.`);
                const sr = await api.get('/teacher-portal/round-roll-call/sessions', {
                    params: { class_name: cn, date: selectedDate },
                });
                if (sr.data?.success) {
                    setSessions(Array.isArray(sr.data.data?.sessions) ? sr.data.data.sessions : []);
                }
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to save. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = (rowId, newStatus) => {
        if (readOnly) return;
        setRoster((prev) => prev.map((row) => (row.id === rowId ? { ...row, status: newStatus } : row)));
    };

    const handleMarkAll = (status) => {
        if (readOnly) return;
        setRoster((prev) => prev.map((s) => ({ ...s, status })));
    };

    const pickSession = (label) => setRollName(label);

    const activeRoster = tab === 'view' && viewSession ? viewSession.roster || [] : roster;
    const searchNorm = searchQuery.trim().toLowerCase();
    const filtered = activeRoster.filter((s) => {
        if (!searchNorm) return true;
        const name = (s.name || '').toLowerCase();
        const adm = String(s.adm ?? '').toLowerCase();
        return name.includes(searchNorm) || adm.includes(searchNorm);
    });

    const stats =
        tab === 'view' && viewSession?.stats
            ? viewSession.stats
            : {
                  total: roster.length,
                  present: roster.filter((s) => s.status === 'present').length,
                  absent: roster.filter((s) => s.status === 'absent').length,
                  excused: roster.filter((s) => s.status === 'excused').length,
              };

    const rosterReadOnly = readOnly || tab === 'view';


    const tabs = [
        { id: 'take', label: isPeriodAttendance ? 'Take attendance' : 'Take roll' },
        { id: 'history', label: isPeriodAttendance ? 'Attendance history' : 'All roll calls' },
    ];

    const barSelectSx = {
        fontSize: 12,
        fontWeight: 600,
        color: brand.navy,
        bgcolor: 'transparent',
        '&:before, &:after': { borderBottom: 'none !important' },
        '& .MuiSelect-select': { py: 0.75, pr: '24px !important', bgcolor: 'transparent !important' },
        '& .MuiSelect-icon': { fontSize: 18 },
    };
    const barInputSx = {
        fontSize: 12,
        fontWeight: 600,
        color: brand.navy,
        '& .MuiOutlinedInput-root': {
            bgcolor: 'transparent',
            fontSize: 12,
            fontWeight: 600,
            '& fieldset': { border: 'none' },
            '&:hover fieldset': { border: 'none' },
            '&.Mui-focused fieldset': { border: 'none' },
        },
        '& .MuiInputBase-input': { py: 0.85, px: 0.25 },
    };

    const headCellSx = {
        py: 0.85,
        px: { xs: 1, sm: 1.5 },
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: '#94A3B8',
        bgcolor: '#F8F9FC',
        borderBottom: '1px solid rgba(19,33,61,0.08)',
        whiteSpace: 'nowrap',
    };
    const cellSx = {
        py: 1,
        px: { xs: 1, sm: 1.5 },
        fontSize: 13,
        borderBottom: '1px solid rgba(19,33,61,0.06)',
    };

    const activeTabId = tab === 'view' ? 'history' : tab;

    return (
        <Box sx={{ minHeight: '100%', pb: { xs: 12, md: 4 } }}>
            {/* Sticky chrome: tabs + filters (marks / assessments language) */}
            <Box
                sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    width: '100%',
                    bgcolor: '#fff',
                    borderBottom: '1px solid rgba(19,33,61,0.08)',
                    boxShadow: '0 2px 8px -4px rgba(19,33,61,0.12)',
                }}
            >
                <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(19,33,61,0.08)' }}>
                    {tabs.map((tItem) => (
                        <ButtonBase
                            key={tItem.id}
                            onClick={() => {
                                setTab(tItem.id);
                                if (tItem.id === 'take') setViewSession(null);
                            }}
                            sx={{
                                flex: 1,
                                py: 1.25,
                                fontSize: 13,
                                fontWeight: 700,
                                color: activeTabId === tItem.id ? brand.navy : '#64748B',
                                borderBottom: activeTabId === tItem.id ? `2px solid ${brand.navy}` : '2px solid transparent',
                                borderRadius: 0,
                                bgcolor: activeTabId === tItem.id ? 'rgba(19,33,61,0.03)' : 'transparent',
                            }}
                        >
                            {tItem.label}
                        </ButtonBase>
                    ))}
                </Box>

                <Box sx={{ px: { xs: 1.25, sm: 1.5 }, py: 0.35 }}>
                    {tab === 'history' ? (
                        <Stack spacing={0.25}>
                            <Stack direction="row" alignItems="center">
                                <Box sx={{ flex: 1.2, minWidth: 0 }}>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        placeholder={isPeriodAttendance ? 'Search…' : 'Search…'}
                                        value={historyQ}
                                        onChange={(e) => setHistoryQ(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={barInputSx}
                                    />
                                </Box>
                                <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <FormControl variant="standard" size="small" fullWidth>
                                        <Select
                                            variant="standard"
                                            disableUnderline
                                            displayEmpty
                                            value={historyClass}
                                            onChange={(e) => setHistoryClass(e.target.value)}
                                            sx={barSelectSx}
                                            inputProps={{ 'aria-label': 'Class' }}
                                        >
                                            <MenuItem value="">All classes</MenuItem>
                                            {classes.map((c) => (
                                                <MenuItem key={c} value={c}>{c}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Stack>
                            <Stack direction="row" alignItems="center">
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <TextField
                                        size="small"
                                        type="date"
                                        fullWidth
                                        value={historyFrom}
                                        onChange={(e) => setHistoryFrom(e.target.value)}
                                        sx={barInputSx}
                                        inputProps={{ 'aria-label': 'From date' }}
                                    />
                                </Box>
                                <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <TextField
                                        size="small"
                                        type="date"
                                        fullWidth
                                        value={historyTo}
                                        onChange={(e) => setHistoryTo(e.target.value)}
                                        sx={barInputSx}
                                        inputProps={{ 'aria-label': 'To date' }}
                                    />
                                </Box>
                                <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => {
                                        setHistoryPage(1);
                                        void loadHistory();
                                    }}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        flexShrink: 0,
                                        bgcolor: brand.primary,
                                        color: brand.navy,
                                        minHeight: 34,
                                        px: 1.75,
                                        boxShadow: 'none',
                                        '&:hover': { bgcolor: brand.primaryStrong, boxShadow: 'none' },
                                    }}
                                >
                                    Apply
                                </Button>
                            </Stack>
                        </Stack>
                    ) : tab === 'view' ? (
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setTab('history');
                                    setViewSession(null);
                                }}
                                aria-label="Back"
                            >
                                <ArrowBackIcon fontSize="small" />
                            </IconButton>
                            <Box sx={{ minWidth: 0 }}>
                                <Typography noWrap sx={{ fontSize: 13, fontWeight: 700, color: brand.navy }}>
                                    {viewSession?.roll_label}
                                </Typography>
                                <Typography noWrap sx={{ fontSize: 11, color: '#64748B' }}>
                                    {[viewSession?.class_name, viewSession?.date, viewSession?.teacher_name].filter(Boolean).join(' · ')}
                                </Typography>
                            </Box>
                        </Stack>
                    ) : (
                        <Stack spacing={0.25}>
                            <Stack direction="row" alignItems="center">
                                <Box sx={{ flex: 1.2, minWidth: 0 }}>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        value={rollName}
                                        onChange={(e) => setRollName(e.target.value)}
                                        placeholder={isPeriodAttendance ? 'Subject / attendance *' : 'Roll name *'}
                                        disabled={readOnly}
                                        sx={barInputSx}
                                    />
                                </Box>
                                <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <FormControl variant="standard" size="small" fullWidth disabled={readOnly}>
                                        <Select
                                            variant="standard"
                                            disableUnderline
                                            displayEmpty
                                            value={selectedClass}
                                            onChange={(e) => setSelectedClass(e.target.value)}
                                            sx={barSelectSx}
                                            inputProps={{ 'aria-label': 'Class' }}
                                        >
                                            <MenuItem value="">Choose class</MenuItem>
                                            {classes.map((c) => (
                                                <MenuItem key={c} value={c}>{c}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Stack>
                            <Stack direction="row" alignItems="center">
                                <IconButton size="small" onClick={() => shiftDateByDays(-1)} disabled={readOnly} aria-label="Previous day">
                                    <ChevronLeftIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <TextField
                                        size="small"
                                        type="date"
                                        fullWidth
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        disabled={readOnly}
                                        sx={barInputSx}
                                    />
                                </Box>
                                <IconButton size="small" onClick={() => shiftDateByDays(1)} disabled={readOnly} aria-label="Next day">
                                    <ChevronRightIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                                <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <TextField
                                        size="small"
                                        fullWidth
                                        placeholder="Search student…"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <SearchIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={barInputSx}
                                    />
                                </Box>
                            </Stack>
                        </Stack>
                    )}
                </Box>
            </Box>

            <Stack spacing={1.75} sx={{ p: { xs: 1.5, sm: 2 }, pt: 2, maxWidth: 1200, mx: 'auto' }}>

                {lessonContext && tab === 'take' ? (
                    <Alert severity="info" sx={{ borderRadius: 1 }}>
                        Lesson: {lessonContext}
                        {requestedClass ? ` · ${requestedClass}` : ''}
                    </Alert>
                ) : null}
                {requestedClassMissing && tab === 'take' ? (
                    <Alert severity="warning" sx={{ borderRadius: 1 }}>
                        Could not match “{requestedClass}” to a class. Choose the correct class above.
                    </Alert>
                ) : null}
                {readOnly && tab === 'take' ? (
                    <Alert severity="warning" sx={{ borderRadius: 1 }}>
                        {isPeriodAttendance
                            ? 'This attendance was saved by another teacher (view only).'
                            : 'This roll was saved by another teacher (view only).'}
                    </Alert>
                ) : null}

                {tab === 'take' && (
                    <PageTitleRow
                        title={rollLabelNorm ? `${rollLabelNorm}${selectedClass ? ` · ${selectedClass}` : ''}` : 'Round roll call'}
                        subtitle={selectedDate}
                        actions={
                            <Button variant="outlined" onClick={() => setStartOpen(true)} disabled={readOnly} sx={{ borderColor: brand.border, fontWeight: 700, textTransform: 'none' }}>
                                Change roll
                            </Button>
                        }
                    />
                )}

                {(tab === 'take' || tab === 'view') && (
                    <NavyStats
                        stats={[
                            { label: 'Class size', value: stats.total },
                            { label: 'Present', value: stats.present },
                            { label: 'Absent', value: stats.absent },
                            { label: 'Excused', value: stats.excused },
                        ]}
                    />
                )}

                {tab === 'take' && sessions.length > 0 && (
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                        {sessions.map((s) => (
                            <Chip
                                key={s.id || s.roll_label}
                                size="small"
                                label={s.roll_label}
                                onClick={() => pickSession(s.roll_label)}
                                sx={{
                                    fontWeight: 600,
                                    bgcolor: rollLabelNorm === normalizeRollLabel(s.roll_label) ? brand.navy : '#F1F5F9',
                                    color: rollLabelNorm === normalizeRollLabel(s.roll_label) ? '#fff' : brand.navy,
                                }}
                            />
                        ))}
                    </Stack>
                )}

                {tab === 'take' && !rosterReadOnly && canLoadRoster && roster.length > 0 && (
                    <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => handleMarkAll('present')} sx={{ textTransform: 'none', fontWeight: 600, flex: 1, borderColor: '#A7F3D0', color: '#047857' }}>
                            All present
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => handleMarkAll('absent')} sx={{ textTransform: 'none', fontWeight: 600, flex: 1, borderColor: '#FECACA', color: '#B91C1C' }}>
                            All absent
                        </Button>
                    </Stack>
                )}

                {/* History table */}
                {tab === 'history' && (
                    <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(19,33,61,0.08)', overflow: 'hidden' }}>
                        <TableContainer sx={{ overflowX: 'auto' }}>
                            <Table size="small" sx={{ minWidth: 640 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={headCellSx}>Date</TableCell>
                                        <TableCell sx={headCellSx}>{isPeriodAttendance ? 'Attendance' : 'Roll'}</TableCell>
                                        <TableCell sx={headCellSx}>Class</TableCell>
                                        <TableCell sx={{ ...headCellSx, display: { xs: 'none', sm: 'table-cell' } }}>Teacher</TableCell>
                                        <TableCell sx={headCellSx} align="center">Present</TableCell>
                                        <TableCell sx={headCellSx} align="center">Absent</TableCell>
                                        <TableCell sx={headCellSx} align="right">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {historyLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center', borderBottom: 0 }}>
                                                <CircularProgress size={22} />
                                            </TableCell>
                                        </TableRow>
                                    ) : historyRows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} sx={{ py: 5, textAlign: 'center', color: '#94A3B8', borderBottom: 0, fontSize: 13 }}>
                                                No records yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        historyRows.map((row, idx) => (
                                            <TableRow
                                                key={row.id}
                                                hover
                                                sx={{ bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff', '&:last-child td': { borderBottom: 0 } }}
                                            >
                                                <TableCell sx={{ ...cellSx, whiteSpace: 'nowrap', fontWeight: 600, color: brand.navy }}>{row.date}</TableCell>
                                                <TableCell sx={cellSx}>{row.roll_label}</TableCell>
                                                <TableCell sx={cellSx}>{row.class_name}</TableCell>
                                                <TableCell sx={{ ...cellSx, display: { xs: 'none', sm: 'table-cell' }, color: '#64748B' }}>
                                                    {row.teacher_name || '—'}
                                                </TableCell>
                                                <TableCell sx={cellSx} align="center">{row.present}</TableCell>
                                                <TableCell sx={cellSx} align="center">{row.absent}</TableCell>
                                                <TableCell sx={cellSx} align="right">
                                                    <Button size="small" onClick={() => void openSessionView(row.id)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                                        View
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            page={historyPage}
                            totalPages={Math.max(1, Math.ceil(historyTotal / historyPerPage))}
                            total={historyTotal}
                            pageSize={historyPerPage}
                            itemCount={historyRows.length}
                            pageStartIndex={(historyPage - 1) * historyPerPage}
                            onPageChange={setHistoryPage}
                            onPageSizeChange={(n) => {
                                setHistoryPerPage(n);
                                setHistoryPage(1);
                            }}
                        />
                    </Paper>
                )}

                {/* Roster table */}
                {(tab === 'take' || tab === 'view') && (
                    <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(19,33,61,0.08)', overflow: 'hidden' }}>
                        <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.25 }}>
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.navy }}>Students</Typography>
                            <Box component="span" sx={{ ml: 'auto', borderRadius: 999, bgcolor: '#F1F5F9', px: 1, py: 0.25, fontSize: 10, fontWeight: 700, color: '#64748B' }}>
                                {filtered.length}
                            </Box>
                        </Stack>
                        <RosterTable
                            loading={loading}
                            selectedClass={selectedClass}
                            canLoadRoster={tab === 'view' ? true : canLoadRoster}
                            filtered={filtered}
                            rosterReadOnly={rosterReadOnly}
                            attendanceName={attendanceName}
                            onStatusChange={handleStatusChange}
                            setRoster={setRoster}
                            headCellSx={headCellSx}
                            cellSx={cellSx}
                        />
                        {tab === 'take' && !rosterReadOnly && (
                            <Box sx={{ p: 1.5, borderTop: '1px solid rgba(19,33,61,0.08)', display: { xs: 'none', md: 'block' } }}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    disabled={!canLoadRoster || !roster.length || loading}
                                    onClick={() => void handleSave()}
                                    sx={{ textTransform: 'none', fontWeight: 700, bgcolor: brand.primary, color: brand.navy, '&:hover': { bgcolor: brand.primaryStrong } }}
                                >
                                    Save {attendanceName}
                                </Button>
                            </Box>
                        )}
                    </Paper>
                )}
            </Stack>

            <RollStartModal
                open={startOpen && tab === 'take'}
                onClose={() => setStartOpen(false)}
                date={selectedDate}
                onDateChange={setSelectedDate}
                classes={classes}
                initialClass={selectedClass}
                onStart={({ className, rollName: name }) => {
                    setSelectedClass(className);
                    setRollName(name);
                    setStartOpen(false);
                }}
            />

            {tab === 'take' && !readOnly && (
                <Box
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 85,
                        borderTop: '1px solid rgba(19,33,61,0.08)',
                        bgcolor: 'rgba(255,255,255,0.96)',
                        px: 2,
                        py: 1.25,
                        pb: 'calc(10px + env(safe-area-inset-bottom, 0px))',
                    }}
                >
                    <Button
                        fullWidth
                        variant="contained"
                        disabled={!canLoadRoster || !roster.length || loading}
                        onClick={() => void handleSave()}
                        sx={{ textTransform: 'none', fontWeight: 700, height: 48, bgcolor: brand.primary, color: brand.navy, '&:hover': { bgcolor: brand.primaryStrong } }}
                    >
                        Save {attendanceName}
                    </Button>
                </Box>
            )}
        </Box>
    );
}

function RosterTable({
    loading,
    selectedClass,
    canLoadRoster,
    filtered,
    rosterReadOnly,
    attendanceName,
    onStatusChange,
    setRoster,
    headCellSx,
    cellSx,
}) {
    if (loading) {
        return (
            <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
                <CircularProgress size={22} />
            </Stack>
        );
    }
    if (!selectedClass || !canLoadRoster) {
        return (
            <Typography sx={{ py: 5, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                {canLoadRoster
                    ? `Choose a class and ${attendanceName === 'attendance' ? 'attendance' : 'roll'} name.`
                    : `Select a ${attendanceName} to view learners.`}
            </Typography>
        );
    }
    if (!filtered.length) {
        return (
            <Typography sx={{ py: 5, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                No learners to show.
            </Typography>
        );
    }

    return (
        <TableContainer sx={{ overflowX: 'visible' }}>
            <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ ...headCellSx, width: 36 }}>#</TableCell>
                        <TableCell sx={headCellSx}>Student</TableCell>
                        <TableCell sx={{ ...headCellSx, width: { xs: 118, sm: 140 } }}>Status</TableCell>
                        <TableCell sx={{ ...headCellSx, display: { xs: 'none', md: 'table-cell' }, width: 140 }}>Remarks</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filtered.map((student, idx) => (
                        <TableRow
                            key={student.id}
                            sx={{
                                bgcolor: idx % 2 === 1 ? '#F8F9FC' : '#fff',
                                '&:last-child td': { borderBottom: 0 },
                            }}
                        >
                            <TableCell sx={{ ...cellSx, color: '#94A3B8', fontSize: 12, width: 36 }}>{idx + 1}</TableCell>
                            <TableCell sx={{ ...cellSx, fontWeight: 600, color: brand.navy, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: brand.navy }}>
                                    {student.name}
                                </Typography>
                                {student.adm ? (
                                    <Typography noWrap sx={{ fontSize: 11, color: '#94A3B8', fontFamily: 'ui-monospace, monospace' }}>
                                        {student.adm}
                                    </Typography>
                                ) : null}
                            </TableCell>
                            <TableCell sx={{ ...cellSx, width: { xs: 118, sm: 140 }, px: { xs: 0.5, sm: 1 } }}>
                                <Stack direction="row" spacing={0.4} justifyContent="flex-start">
                                    <StatusBtn
                                        active={student.status === 'present'}
                                        disabled={rosterReadOnly}
                                        onClick={() => onStatusChange(student.id, 'present')}
                                        color="#047857"
                                        activeBg="#10B981"
                                        label="P"
                                        title="Present"
                                        icon={<CheckIcon sx={{ fontSize: 14 }} />}
                                    />
                                    <StatusBtn
                                        active={student.status === 'absent'}
                                        disabled={rosterReadOnly}
                                        onClick={() => onStatusChange(student.id, 'absent')}
                                        color="#B91C1C"
                                        activeBg="#EF4444"
                                        label="A"
                                        title="Absent"
                                        icon={<CloseIcon sx={{ fontSize: 14 }} />}
                                    />
                                    <StatusBtn
                                        active={student.status === 'excused'}
                                        disabled={rosterReadOnly}
                                        onClick={() => onStatusChange(student.id, 'excused')}
                                        color="#1D4ED8"
                                        activeBg="#3B82F6"
                                        label="E"
                                        title="Excused"
                                        icon={<DescriptionOutlinedIcon sx={{ fontSize: 14 }} />}
                                    />
                                </Stack>
                            </TableCell>
                            <TableCell sx={{ ...cellSx, display: { xs: 'none', md: 'table-cell' }, minWidth: 120 }}>
                                {rosterReadOnly ? (
                                    <Typography sx={{ fontSize: 12, color: '#64748B' }}>{student.remarks || '—'}</Typography>
                                ) : (
                                    <TextField
                                        size="small"
                                        fullWidth
                                        value={student.remarks || ''}
                                        placeholder="Remarks"
                                        onChange={(e) =>
                                            setRoster((prev) =>
                                                prev.map((row) =>
                                                    row.id === student.id ? { ...row, remarks: e.target.value } : row
                                                )
                                            )
                                        }
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                fontSize: 12,
                                                bgcolor: '#F8F9FC',
                                                '& fieldset': { borderColor: 'transparent' },
                                            },
                                        }}
                                    />
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function StatusBtn({ active, disabled, onClick, color, activeBg, label, title, icon }) {
    return (
        <ButtonBase
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={title}
            sx={{
                minWidth: { xs: 30, sm: 34 },
                width: { xs: 30, sm: 'auto' },
                height: 30,
                px: { xs: 0, sm: 0.6 },
                borderRadius: 1,
                border: `1.5px solid ${active ? activeBg : `${color}33`}`,
                bgcolor: active ? activeBg : '#fff',
                color: active ? '#fff' : color,
                fontSize: 10,
                fontWeight: 800,
                gap: 0.2,
                '&.Mui-disabled': { opacity: 0.45 },
            }}
        >
            {icon}
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{label}</Box>
        </ButtonBase>
    );
}
