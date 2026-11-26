import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, forwardRef } from 'react';
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
import CircularProgress from '@mui/material/CircularProgress';
import Autocomplete from '@mui/material/Autocomplete';
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
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import api from '../services/api';
import {
    fetchTeacherSchedule,
    flattenScheduleByDay,
    startLesson,
    fetchLessonAttendance,
    saveLessonAttendance,
} from '../services/teacherPortalApi';
import useTpAcademic from '../hooks/useTpAcademic';
import { normalizeGradebookLabel } from '../utils/teacherGradebookUi';
import { getSchoolDateIso } from '../utils/schoolTime';
import { brand } from '../theme/theme';
import { NavyStats, PageTitleRow, SectionPaper } from '../components/ListPageKit';
import { PeriodStartModal, ClassPickModal } from '../components/AttendanceModals';

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CUSTOM_VALUE = '__custom__';

const validDateParam = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const dayNameOf = (iso) => DAY_NAMES[new Date(`${iso}T12:00:00`).getDay()];
const addDays = (iso, n) => {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
};
const mondayOf = (iso) => {
    const d = new Date(`${iso}T12:00:00`);
    const dow = (d.getDay() + 6) % 7; // Mon=0
    return addDays(iso, -dow);
};
const fmtShort = (iso) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const toUiStatus = (s) => {
    const v = String(s || '').toLowerCase();
    if (v === 'absent') return 'absent';
    if (v === 'excused' || v === 'permission') return 'excused';
    if (v === 'late') return 'late';
    return 'present';
};
const toApiStatus = (s) => ({ present: 'PRESENT', absent: 'ABSENT', late: 'LATE', excused: 'EXCUSED' }[s] || 'PRESENT');

function lessonLabel(l) {
    return [l.subject, l.class_name, l.periodLabel, l.time && `${l.time}${l.end_time ? `–${l.end_time}` : ''}`]
        .filter(Boolean)
        .join(' · ');
}

/* Autocomplete paper with a pinned "Custom…" footer that never scrolls */
const PickerCtx = createContext({ onCustom: () => {} });
const SubjectPaper = forwardRef(function SubjectPaper({ children, ...rest }, ref) {
    const { onCustom } = useContext(PickerCtx);
    return (
        <Paper ref={ref} {...rest} sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</Box>
            <Divider />
            <ButtonBase
                onMouseDown={(e) => e.preventDefault()}
                onClick={onCustom}
                sx={{
                    justifyContent: 'flex-start',
                    gap: 1,
                    px: 2,
                    py: 1.1,
                    fontSize: 13,
                    fontWeight: 700,
                    color: brand.navy,
                    bgcolor: '#F8F9FC',
                    '&:hover': { bgcolor: '#EEF1F7' },
                }}
            >
                <EditOutlinedIcon sx={{ fontSize: 16 }} />
                Custom — type your own…
            </ButtonBase>
        </Paper>
    );
});

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

export default function PeriodAttendance() {
    const [searchParams] = useSearchParams();
    const { ready, term, academicYear } = useTpAcademic();

    const reqClass = searchParams.get('className') || searchParams.get('class_name') || '';
    const reqSubject = searchParams.get('subject') || '';
    const reqDate = validDateParam(searchParams.get('date'));

    const [tab, setTab] = useState('take');
    const [selectedDate, setSelectedDate] = useState(() => reqDate || getSchoolDateIso());

    // timetable
    const [lessons, setLessons] = useState([]);
    const [classes, setClasses] = useState([]);

    // subject picker
    const [lesson, setLesson] = useState(null); // timetable lesson
    const [customMode, setCustomMode] = useState(false);
    const [customText, setCustomText] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState('');

    // roster
    const [roster, setRoster] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [loadNote, setLoadNote] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // modals
    const [startOpen, setStartOpen] = useState(() => !reqSubject && !reqClass);
    const [classModalOpen, setClassModalOpen] = useState(false);

    // history
    const [hClass, setHClass] = useState('');
    const [hFrom, setHFrom] = useState(() => mondayOf(reqDate || getSchoolDateIso()));
    const [hTo, setHTo] = useState(() => addDays(mondayOf(reqDate || getSchoolDateIso()), 4));
    const [hLoading, setHLoading] = useState(false);
    const [hStudents, setHStudents] = useState([]);
    const [hMap, setHMap] = useState({}); // `${uid}|${date}` -> status
    const [hError, setHError] = useState('');

    /* nothing chosen yet -> prompt (take) / ask for a class (history) */
    const nothingPicked = !lesson && !customMode;
    useEffect(() => {
        if (tab === 'take' && nothingPicked && !reqSubject) setStartOpen(true);
        if (tab === 'history' && !hClass) setClassModalOpen(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    /* ---------- load timetable + classes ---------- */
    useEffect(() => {
        if (!ready) return;
        (async () => {
            try {
                const data = await fetchTeacherSchedule('weekly', { term: term || undefined, academicYear: academicYear || undefined });
                setLessons(flattenScheduleByDay(data));
            } catch (e) {
                console.error(e);
                setLessons([]);
            }
        })();
    }, [ready, term, academicYear]);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/teacher-portal/classes', { params: { scope: 'school' } });
                setClasses(res.data?.success ? res.data.data || [] : []);
            } catch {
                setClasses([]);
            }
        })();
    }, []);

    /* options: lessons of the selected weekday first, then the rest */
    const todayName = dayNameOf(selectedDate);
    const lessonOptions = useMemo(() => {
        const sorted = [...lessons].sort((a, b) => {
            const aT = a.day === todayName ? 0 : 1;
            const bT = b.day === todayName ? 0 : 1;
            return aT - bT || String(a.time).localeCompare(String(b.time));
        });
        return sorted;
    }, [lessons, todayName]);

    /* preselect from deep link (?subject=&className=) */
    useEffect(() => {
        if (!lessons.length || lesson || customMode || !reqSubject) return;
        const match = lessons.find(
            (l) =>
                String(l.subject || '').toLowerCase() === reqSubject.toLowerCase() &&
                (!reqClass ||
                    normalizeGradebookLabel(l.class_name).toLowerCase() === normalizeGradebookLabel(reqClass).toLowerCase())
        );
        if (match) {
            setLesson(match);
            setSelectedClass(match.class_name);
        } else {
            setCustomMode(true);
            setCustomText(reqSubject);
            if (reqClass) setSelectedClass(reqClass);
        }
    }, [lessons, lesson, customMode, reqSubject, reqClass]);

    const subjectName = customMode ? customText.trim() : lesson?.subject || '';
    const canLoad = Boolean(selectedClass && (lesson || (customMode && subjectName)));

    /* ---------- load roster ---------- */
    const loadStudents = useCallback(
        async (cls, year) => {
            const res = await api.get('/teacher-portal/students', {
                params: { class_name: cls, className: cls, scope: 'attendance', date: selectedDate, academicYear: year },
            });
            const list = res.data?.success ? res.data.data || [] : [];
            return list.map((s) => ({
                id: s.row_id || s.id || s.student_code,
                adm: s.student_code,
                name: s.name,
                gender: s.gender || '-',
                status: 'present',
                remarks: '',
            }));
        },
        [selectedDate]
    );

    useEffect(() => {
        if (tab !== 'take') return;
        if (!canLoad) {
            setRoster([]);
            setSessionId(null);
            setLoadNote('');
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            setLoadNote('');
            setSessionId(null);
            const cls = normalizeGradebookLabel(selectedClass);
            const notes = [];
            const mapRoll = (r) => ({
                id: r.id || r.student_id || r.adm,
                adm: r.adm || r.student_code,
                name: r.name,
                gender: r.gender || '-',
                status: toUiStatus(r.status),
                remarks: r.remarks || '',
            });
            try {
                let rows = [];

                // 1) timetable lesson -> lesson session register (may be refused outside the lesson window)
                if (lesson?.id) {
                    try {
                        const started = await startLesson({ timetableId: lesson.id, skipQr: true });
                        const sid = started?.id || started?.sessionId;
                        if (cancelled) return;
                        setSessionId(sid || null);
                        const saved = sid ? await fetchLessonAttendance(sid) : null;
                        rows = (Array.isArray(saved?.rows) ? saved.rows : []).map((r) => ({
                            id: r.studentCode || r.id,
                            adm: r.studentCode || r.id,
                            name: r.fullName,
                            gender: r.gender || '-',
                            status: toUiStatus(r.status),
                            remarks: r.notes || r.reason || '',
                        }));
                    } catch (e) {
                        notes.push(e?.response?.data?.message || e?.message || 'Could not open this lesson session.');
                    }
                }

                // 2) student management roster
                if (!rows.length) {
                    try {
                        rows = await loadStudents(cls, lesson?.academic_year);
                    } catch (e) {
                        notes.push(e?.response?.data?.message || 'Student list request failed.');
                    }
                }

                // 3) the class roster the roll-call module already serves for this class
                if (!rows.length) {
                    try {
                        const res = await api.get('/teacher-portal/round-roll-call', {
                            params: { class_name: cls, date: selectedDate, roll_label: subjectName },
                        });
                        const list = res.data?.success && Array.isArray(res.data.data?.roster) ? res.data.data.roster : [];
                        rows = list.map(mapRoll);
                    } catch (e) {
                        notes.push(e?.response?.data?.message || 'Class roster request failed.');
                    }
                }

                if (cancelled) return;
                setRoster(rows);
                setLoadNote(rows.length ? '' : notes.join(' · ') || `No learners found for ${selectedClass}.`);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, canLoad, lesson, selectedClass, selectedDate, customMode, customText]);

    const setStatus = (id, status) => setRoster((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    const markAll = (status) => setRoster((p) => p.map((r) => ({ ...r, status })));

    const handleSave = async () => {
        if (!canLoad || !roster.length) return;
        try {
            setLoading(true);
            let sid = sessionId;
            if (lesson?.id && !sid) {
                try {
                    const started = await startLesson({ timetableId: lesson.id, skipQr: true });
                    sid = started?.id || started?.sessionId;
                    setSessionId(sid || null);
                } catch {
                    sid = null;
                }
            }
            if (lesson?.id && sid) {
                await saveLessonAttendance(
                    sid,
                    roster.map((r) => ({
                        studentCode: r.adm,
                        fullName: r.name,
                        gender: r.gender,
                        className: selectedClass,
                        status: toApiStatus(r.status),
                        notes: r.remarks || '',
                    })),
                    true
                );
            } else {
                // custom entry, or the lesson session could not be opened: store as a labelled register
                await api.post('/teacher-portal/round-roll-call', {
                    class_name: normalizeGradebookLabel(selectedClass),
                    date: selectedDate,
                    roll_label: subjectName,
                    records: roster.map((s) => ({
                        student_id: s.id,
                        name: s.name,
                        student_code: s.adm,
                        status: s.status === 'late' ? 'present' : s.status,
                        remarks: s.remarks || '',
                    })),
                });
            }
            alert(`Saved ${subjectName} attendance for ${selectedClass}.`);
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.message || err?.message || 'Failed to save. Check your connection.');
        } finally {
            setLoading(false);
        }
    };

    /* ---------- history matrix ---------- */
    const loadHistory = useCallback(async () => {
        if (!hClass) {
            setHError('Choose a class to see its attendance.');
            setHStudents([]);
            setHMap({});
            return;
        }
        if (!hFrom || !hTo || hTo < hFrom) {
            setHError('Choose a valid date range.');
            return;
        }
        setHError('');
        setHLoading(true);
        try {
            const cls = normalizeGradebookLabel(hClass);
            const students = await loadStudents(cls);
            setHStudents(students);
            // pull one weekly summary per week in range (max 10 weeks)
            const weekStarts = [];
            for (let w = mondayOf(hFrom); w <= hTo && weekStarts.length < 10; w = addDays(w, 7)) weekStarts.push(w);
            const results = await Promise.all(
                weekStarts.map((w) =>
                    api
                        .get('/teacher-portal/attendance-summary/weekly', { params: { date: w, class_name: cls } })
                        .then((r) => (r.data?.success ? r.data.data?.rows || [] : []))
                        .catch(() => [])
                )
            );
            const rank = { absent: 3, late: 2, excused: 1, present: 0 };
            const map = {};
            results.flat().forEach((r) => {
                const date = String(r.record_date || '').slice(0, 10);
                const key = `${r.student_uid}|${date}`;
                const st = toUiStatus(r.status);
                if (!(key in map) || rank[st] > rank[map[key]]) map[key] = st;
            });
            setHMap(map);
        } catch (e) {
            console.error(e);
            setHError('Could not load attendance history.');
        } finally {
            setHLoading(false);
        }
    }, [hClass, hFrom, hTo, loadStudents]);

    useEffect(() => {
        if (tab === 'history' && hClass) void loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, hClass]);

    // weekdays in range grouped by week
    const weeks = useMemo(() => {
        if (!hFrom || !hTo || hTo < hFrom) return [];
        const out = [];
        let guard = 0;
        for (let d = hFrom; d <= hTo && guard < 70; d = addDays(d, 1), guard++) {
            const dow = new Date(`${d}T12:00:00`).getDay();
            if (dow === 0 || dow === 6) continue;
            const wk = mondayOf(d);
            let w = out.find((x) => x.start === wk);
            if (!w) {
                w = { start: wk, days: [] };
                out.push(w);
            }
            w.days.push(d);
        }
        return out;
    }, [hFrom, hTo]);

    /* ---------- derived ---------- */
    const searchNorm = searchQuery.trim().toLowerCase();
    const filtered = roster.filter(
        (s) => !searchNorm || (s.name || '').toLowerCase().includes(searchNorm) || String(s.adm ?? '').toLowerCase().includes(searchNorm)
    );
    const stats = {
        total: roster.length,
        present: roster.filter((s) => s.status === 'present' || s.status === 'late').length,
        absent: roster.filter((s) => s.status === 'absent').length,
        excused: roster.filter((s) => s.status === 'excused').length,
    };

    /* ---------- styles ---------- */
    const barSelectSx = {
        fontSize: 12, fontWeight: 600, color: brand.navy,
        '&:before, &:after': { borderBottom: 'none !important' },
        '& .MuiSelect-select': { py: 0.75, pr: '24px !important', bgcolor: 'transparent !important' },
        '& .MuiSelect-icon': { fontSize: 18 },
    };
    const barInputSx = {
        '& .MuiOutlinedInput-root': {
            bgcolor: 'transparent', fontSize: 12, fontWeight: 600, color: brand.navy,
            '& fieldset': { border: 'none' },
            '&:hover fieldset': { border: 'none' },
            '&.Mui-focused fieldset': { border: 'none' },
        },
        '& .MuiInputBase-input': { py: 0.85, px: 0.25 },
    };
    const headCellSx = {
        py: 0.85, px: { xs: 1, sm: 1.5 }, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.04em', color: '#94A3B8', bgcolor: '#F8F9FC',
        borderBottom: '1px solid rgba(19,33,61,0.08)', whiteSpace: 'nowrap',
    };
    const cellSx = { py: 1, px: { xs: 1, sm: 1.5 }, fontSize: 13, borderBottom: '1px solid rgba(19,33,61,0.06)' };

    const tabs = [
        { id: 'take', label: 'Take attendance' },
        { id: 'history', label: 'Attendance history' },
    ];

    return (
        <Box sx={{ minHeight: '100%', pb: { xs: 12, md: 4 } }}>
            <Box sx={{ position: 'sticky', top: 0, zIndex: 20, bgcolor: '#fff', borderBottom: '1px solid rgba(19,33,61,0.08)', boxShadow: '0 2px 8px -4px rgba(19,33,61,0.12)' }}>
                <Box sx={{ display: 'flex', borderBottom: '1px solid rgba(19,33,61,0.08)' }}>
                    {tabs.map((t) => (
                        <ButtonBase
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            sx={{
                                flex: 1, py: 1.25, fontSize: 13, fontWeight: 700, borderRadius: 0,
                                color: tab === t.id ? brand.navy : '#64748B',
                                borderBottom: tab === t.id ? `2px solid ${brand.navy}` : '2px solid transparent',
                                bgcolor: tab === t.id ? 'rgba(19,33,61,0.03)' : 'transparent',
                            }}
                        >
                            {t.label}
                        </ButtonBase>
                    ))}
                </Box>

                <Box sx={{ px: { xs: 1.25, sm: 1.5 }, py: 0.35 }}>
                    {tab === 'take' ? (
                        <Stack spacing={0.25}>
                            <Stack direction="row" alignItems="center">
                                <Box sx={{ flex: 1.4, minWidth: 0 }}>
                                    {customMode ? (
                                        <TextField
                                            size="small"
                                            fullWidth
                                            autoFocus
                                            value={customText}
                                            onChange={(e) => setCustomText(e.target.value)}
                                            placeholder="Type subject / activity *"
                                            sx={barInputSx}
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            size="small"
                                                            aria-label="Back to timetable list"
                                                            onClick={() => { setCustomMode(false); setCustomText(''); }}
                                                        >
                                                            <CloseIcon sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                    ) : (
                                        <PickerCtx.Provider
                                            value={{
                                                onCustom: () => {
                                                    setPickerOpen(false);
                                                    setLesson(null);
                                                    setCustomMode(true);
                                                },
                                            }}
                                        >
                                            <Autocomplete
                                                size="small"
                                                fullWidth
                                                open={pickerOpen}
                                                onOpen={() => setPickerOpen(true)}
                                                onClose={() => setPickerOpen(false)}
                                                options={lessonOptions}
                                                value={lesson}
                                                onChange={(_, v) => {
                                                    setLesson(v);
                                                    if (v) setSelectedClass(v.class_name || '');
                                                }}
                                                groupBy={(o) => (o.day === todayName ? `${o.day} (selected date)` : o.day)}
                                                getOptionLabel={lessonLabel}
                                                isOptionEqualToValue={(a, b) => a.id === b.id}
                                                filterOptions={(opts, { inputValue }) => {
                                                    const q = inputValue.trim().toLowerCase();
                                                    return q ? opts.filter((o) => lessonLabel(o).toLowerCase().includes(q) || o.day.toLowerCase().includes(q)) : opts;
                                                }}
                                                noOptionsText="No timetable lesson matches"
                                                PaperComponent={SubjectPaper}
                                                ListboxProps={{ style: { maxHeight: 280 } }}
                                                renderInput={(params) => (
                                                    <TextField {...params} placeholder="Subject (from timetable) *" sx={barInputSx} />
                                                )}
                                            />
                                        </PickerCtx.Provider>
                                    )}
                                </Box>
                                <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <FormControl variant="standard" size="small" fullWidth disabled={Boolean(lesson)}>
                                        <Select
                                            variant="standard" disableUnderline displayEmpty
                                            value={selectedClass}
                                            onChange={(e) => setSelectedClass(e.target.value)}
                                            sx={barSelectSx}
                                            inputProps={{ 'aria-label': 'Class' }}
                                        >
                                            <MenuItem value="">Choose class</MenuItem>
                                            {[...new Set([selectedClass, ...classes].filter(Boolean))].map((c) => (
                                                <MenuItem key={c} value={c}>{c}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Stack>
                            <Stack direction="row" alignItems="center">
                                <IconButton size="small" onClick={() => setSelectedDate(addDays(selectedDate, -1))} aria-label="Previous day">
                                    <ChevronLeftIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <TextField size="small" type="date" fullWidth value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} sx={barInputSx} />
                                </Box>
                                <IconButton size="small" onClick={() => setSelectedDate(addDays(selectedDate, 1))} aria-label="Next day">
                                    <ChevronRightIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                                <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <TextField
                                        size="small" fullWidth placeholder="Search student…"
                                        value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                        InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: '#94A3B8' }} /></InputAdornment>) }}
                                        sx={barInputSx}
                                    />
                                </Box>
                            </Stack>
                        </Stack>
                    ) : (
                        <Stack direction="row" alignItems="center" flexWrap="wrap">
                            <Box sx={{ flex: 1, minWidth: 130 }}>
                                <FormControl variant="standard" size="small" fullWidth>
                                    <Select variant="standard" disableUnderline displayEmpty value={hClass} onChange={(e) => setHClass(e.target.value)} sx={barSelectSx} inputProps={{ 'aria-label': 'Class' }}>
                                        <MenuItem value="">Choose class</MenuItem>
                                        {classes.map((c) => (<MenuItem key={c} value={c}>{c}</MenuItem>))}
                                    </Select>
                                </FormControl>
                            </Box>
                            <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
                            <Box sx={{ flex: 1, minWidth: 120 }}>
                                <TextField size="small" type="date" fullWidth value={hFrom} onChange={(e) => setHFrom(e.target.value)} sx={barInputSx} inputProps={{ 'aria-label': 'From date' }} />
                            </Box>
                            <Divider orientation="vertical" flexItem sx={{ my: 1, mx: 1.25 }} />
                            <Box sx={{ flex: 1, minWidth: 120 }}>
                                <TextField size="small" type="date" fullWidth value={hTo} onChange={(e) => setHTo(e.target.value)} sx={barInputSx} inputProps={{ 'aria-label': 'To date' }} />
                            </Box>
                            <Button
                                size="small" variant="contained" onClick={() => void loadHistory()}
                                sx={{ textTransform: 'none', fontWeight: 700, ml: 1.25, minHeight: 34, px: 1.75, boxShadow: 'none', bgcolor: brand.primary, color: brand.navy, '&:hover': { bgcolor: brand.primaryStrong, boxShadow: 'none' } }}
                            >
                                Apply
                            </Button>
                        </Stack>
                    )}
                </Box>
            </Box>

            <Stack spacing={1.75} sx={{ p: { xs: 1.5, sm: 2 }, pt: 2, maxWidth: 1200, mx: 'auto' }}>
                {tab === 'take' && (
                    <>
                        <PageTitleRow
                            title={subjectName ? `${subjectName}${selectedClass ? ` · ${selectedClass}` : ''}` : 'Take attendance'}
                            subtitle={`${dayNameOf(selectedDate)}, ${fmtShort(selectedDate)}${lesson?.time ? ` · ${lesson.time}${lesson.end_time ? `–${lesson.end_time}` : ''}` : ''}`}
                            actions={
                                <Button variant="outlined" onClick={() => setStartOpen(true)} sx={{ borderColor: brand.border, fontWeight: 700, textTransform: 'none' }}>
                                    Change lesson
                                </Button>
                            }
                        />
                        <NavyStats
                            stats={[
                                { label: 'Class size', value: stats.total },
                                { label: 'Present', value: stats.present },
                                { label: 'Absent', value: stats.absent },
                                { label: 'Excused', value: stats.excused },
                            ]}
                        />

                        {canLoad && roster.length > 0 && (
                            <Stack direction="row" spacing={1}>
                                <Button size="small" variant="outlined" onClick={() => markAll('present')} sx={{ textTransform: 'none', fontWeight: 600, flex: 1, borderColor: '#A7F3D0', color: '#047857' }}>All present</Button>
                                <Button size="small" variant="outlined" onClick={() => markAll('absent')} sx={{ textTransform: 'none', fontWeight: 600, flex: 1, borderColor: '#FECACA', color: '#B91C1C' }}>All absent</Button>
                            </Stack>
                        )}

                        <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid rgba(19,33,61,0.08)', overflow: 'hidden' }}>
                            <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.25 }}>
                                <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.navy }}>Students</Typography>
                                <Box component="span" sx={{ ml: 'auto', borderRadius: 999, bgcolor: '#F1F5F9', px: 1, py: 0.25, fontSize: 10, fontWeight: 700, color: '#64748B' }}>
                                    {filtered.length}
                                </Box>
                            </Stack>
                            {loading ? (
                                <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={22} /></Stack>
                            ) : !canLoad ? (
                                <Typography sx={{ py: 5, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                                    Choose a subject from your timetable (or a custom one) to load learners.
                                </Typography>
                            ) : !filtered.length ? (
                                <Typography sx={{ py: 5, px: 2, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>
                                    {roster.length ? 'No learner matches your search.' : loadNote || 'No learners to show.'}
                                </Typography>
                            ) : (
                                <TableContainer>
                                    <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ ...headCellSx, width: 36 }}>#</TableCell>
                                                <TableCell sx={headCellSx}>Student</TableCell>
                                                <TableCell sx={{ ...headCellSx, width: { xs: 150, sm: 170 } }}>Status</TableCell>
                                                <TableCell sx={{ ...headCellSx, display: { xs: 'none', md: 'table-cell' }, width: 200 }}>Remarks</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {filtered.map((s, idx) => (
                                                <TableRow key={s.id} sx={{ bgcolor: idx % 2 ? '#F8F9FC' : '#fff', '&:last-child td': { borderBottom: 0 } }}>
                                                    <TableCell sx={{ ...cellSx, color: '#94A3B8', fontSize: 12 }}>{idx + 1}</TableCell>
                                                    <TableCell sx={{ ...cellSx, overflow: 'hidden' }}>
                                                        <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: brand.navy }}>{s.name}</Typography>
                                                        {s.adm ? <Typography noWrap sx={{ fontSize: 11, color: '#94A3B8', fontFamily: 'ui-monospace, monospace' }}>{s.adm}</Typography> : null}
                                                    </TableCell>
                                                    <TableCell sx={{ ...cellSx, px: { xs: 0.5, sm: 1 } }}>
                                                        <Stack direction="row" spacing={0.4}>
                                                            <StatusBtn active={s.status === 'present'} onClick={() => setStatus(s.id, 'present')} color="#047857" activeBg="#10B981" label="P" title="Present" icon={<CheckIcon sx={{ fontSize: 14 }} />} />
                                                            <StatusBtn active={s.status === 'absent'} onClick={() => setStatus(s.id, 'absent')} color="#B91C1C" activeBg="#EF4444" label="A" title="Absent" icon={<CloseIcon sx={{ fontSize: 14 }} />} />
                                                            <StatusBtn active={s.status === 'late'} onClick={() => setStatus(s.id, 'late')} color="#B45309" activeBg="#F59E0B" label="L" title="Late" />
                                                            <StatusBtn active={s.status === 'excused'} onClick={() => setStatus(s.id, 'excused')} color="#1D4ED8" activeBg="#3B82F6" label="E" title="Excused" icon={<DescriptionOutlinedIcon sx={{ fontSize: 14 }} />} />
                                                        </Stack>
                                                    </TableCell>
                                                    <TableCell sx={{ ...cellSx, display: { xs: 'none', md: 'table-cell' } }}>
                                                        <TextField
                                                            size="small" fullWidth placeholder="Remarks" value={s.remarks || ''}
                                                            onChange={(e) => setRoster((p) => p.map((r) => (r.id === s.id ? { ...r, remarks: e.target.value } : r)))}
                                                            sx={{ '& .MuiOutlinedInput-root': { fontSize: 12, bgcolor: '#F8F9FC', '& fieldset': { borderColor: 'transparent' } } }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                            <Box sx={{ p: 1.5, borderTop: '1px solid rgba(19,33,61,0.08)', display: { xs: 'none', md: 'block' } }}>
                                <Button fullWidth variant="contained" disabled={!canLoad || !roster.length || loading} onClick={() => void handleSave()} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: brand.primary, color: brand.navy, '&:hover': { bgcolor: brand.primaryStrong } }}>
                                    Save attendance
                                </Button>
                            </Box>
                        </Paper>
                    </>
                )}

                {tab === 'history' && (
                    <SectionPaper
                        title={hClass ? `${hClass} · ${fmtShort(hFrom)} – ${fmtShort(hTo)}` : 'Attendance history'}
                        count={hClass ? hStudents.length : undefined}
                    >
                        {hError ? <Alert severity="info" sx={{ m: 1.5, borderRadius: 1 }}>{hError}</Alert> : null}
                        {hLoading ? (
                            <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={22} /></Stack>
                        ) : !hClass ? (
                            <Stack alignItems="center" spacing={1.25} sx={{ py: 5 }}>
                                <Typography sx={{ fontSize: 13, color: '#94A3B8' }}>Choose a class to see attendance by day.</Typography>
                                <Button size="small" variant="outlined" onClick={() => setClassModalOpen(true)} sx={{ textTransform: 'none', fontWeight: 700 }}>Choose class</Button>
                            </Stack>
                        ) : !hStudents.length ? (
                            <Typography sx={{ py: 5, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No learners found.</Typography>
                        ) : (
                            <HistoryMatrix students={hStudents} weeks={weeks} map={hMap} headCellSx={headCellSx} cellSx={cellSx} />
                        )}
                    </SectionPaper>
                )}
            </Stack>

            <PeriodStartModal
                open={startOpen && tab === 'take'}
                onClose={() => setStartOpen(false)}
                date={selectedDate}
                onDateChange={setSelectedDate}
                lessons={lessons}
                classes={classes}
                onPickLesson={(l) => {
                    setCustomMode(false);
                    setCustomText('');
                    setLesson(l);
                    setSelectedClass(l.class_name || '');
                    setStartOpen(false);
                }}
                onPickCustom={({ text, className }) => {
                    setLesson(null);
                    setCustomMode(true);
                    setCustomText(text);
                    setSelectedClass(className);
                    setStartOpen(false);
                }}
            />
            <ClassPickModal
                open={classModalOpen && tab === 'history'}
                onClose={() => setClassModalOpen(false)}
                classes={classes}
                value={hClass}
                onPick={(c) => {
                    setHClass(c);
                    setClassModalOpen(false);
                }}
            />

            {tab === 'take' && (
                <Box sx={{ display: { xs: 'block', md: 'none' }, position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 85, borderTop: '1px solid rgba(19,33,61,0.08)', bgcolor: 'rgba(255,255,255,0.96)', px: 2, py: 1.25, pb: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}>
                    <Button fullWidth variant="contained" disabled={!canLoad || !roster.length || loading} onClick={() => void handleSave()} sx={{ textTransform: 'none', fontWeight: 700, height: 48, bgcolor: brand.primary, color: brand.navy, '&:hover': { bgcolor: brand.primaryStrong } }}>
                        Save attendance
                    </Button>
                </Box>
            )}
        </Box>
    );
}

/* ------------------------------------------------------------------ */
/* History matrix: # | Student | days… (grouped by week when >1 week)  */
/* ------------------------------------------------------------------ */

const CELL = {
    present: { t: 'P', c: '#047857', bg: '#D1FAE5' },
    absent: { t: 'A', c: '#B91C1C', bg: '#FEE2E2' },
    late: { t: 'L', c: '#B45309', bg: '#FEF3C7' },
    excused: { t: 'E', c: '#1D4ED8', bg: '#DBEAFE' },
};

function HistoryMatrix({ students, weeks, map, headCellSx, cellSx }) {
    const multi = weeks.length > 1;
    const rs = multi ? 2 : 1;
    const dayHead = { ...headCellSx, textAlign: 'center', px: 0.5, minWidth: 44 };
    const stickyHash = { position: 'sticky', left: 0, zIndex: 2, width: 40, minWidth: 40 };
    const stickyName = { position: 'sticky', left: 40, zIndex: 2, minWidth: 170 };
    const stickyCode = { position: 'sticky', left: 210, zIndex: 2, minWidth: 96, borderRight: '1px solid rgba(19,33,61,0.08)' };

    if (!weeks.length) {
        return <Typography sx={{ py: 5, textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No school days in this range.</Typography>;
    }

    return (
        <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 300 }}>
                <TableHead>
                    <TableRow>
                        <TableCell rowSpan={rs} sx={{ ...headCellSx, ...stickyHash }}>#</TableCell>
                        <TableCell rowSpan={rs} sx={{ ...headCellSx, ...stickyName }}>Student</TableCell>
                        <TableCell rowSpan={rs} sx={{ ...headCellSx, ...stickyCode }}>Code</TableCell>
                        {multi
                            ? weeks.map((w, i) => (
                                  <TableCell
                                      key={w.start}
                                      colSpan={w.days.length}
                                      align="center"
                                      sx={{ ...headCellSx, color: brand.navy, borderLeft: '1px solid rgba(19,33,61,0.08)' }}
                                  >
                                      Week {i + 1} · {fmtShort(w.days[0])}–{fmtShort(w.days[w.days.length - 1])}
                                  </TableCell>
                              ))
                            : weeks[0].days.map((d) => <DayHead key={d} d={d} sx={dayHead} />)}
                    </TableRow>
                    {multi && (
                        <TableRow>
                            {weeks.flatMap((w) => w.days.map((d, i) => <DayHead key={d} d={d} sx={{ ...dayHead, ...(i === 0 ? { borderLeft: '1px solid rgba(19,33,61,0.08)' } : {}) }} />))}
                        </TableRow>
                    )}
                </TableHead>
                <TableBody>
                    {students.map((s, idx) => {
                        const bg = idx % 2 ? '#F8F9FC' : '#fff';
                        return (
                            <TableRow key={s.id} sx={{ bgcolor: bg, '&:last-child td': { borderBottom: 0 } }}>
                                <TableCell sx={{ ...cellSx, ...stickyHash, bgcolor: bg, color: '#94A3B8', fontSize: 12 }}>{idx + 1}</TableCell>
                                <TableCell sx={{ ...cellSx, ...stickyName, bgcolor: bg }}>
                                    <Typography noWrap sx={{ fontSize: 13, fontWeight: 600, color: brand.navy }}>{s.name}</Typography>
                                </TableCell>
                                <TableCell sx={{ ...cellSx, ...stickyCode, bgcolor: bg, color: '#64748B', fontSize: 12, fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' }}>
                                    {s.adm || '—'}
                                </TableCell>
                                {weeks.flatMap((w) =>
                                    w.days.map((d, i) => {
                                        const st = map[`${s.adm}|${d}`];
                                        const m = st ? CELL[st] : null;
                                        return (
                                            <TableCell
                                                key={d}
                                                align="center"
                                                sx={{ ...cellSx, px: 0.5, ...(multi && i === 0 ? { borderLeft: '1px solid rgba(19,33,61,0.08)' } : {}) }}
                                            >
                                                {m ? (
                                                    <Box component="span" title={st} sx={{ display: 'inline-block', minWidth: 24, py: 0.25, borderRadius: 1, fontSize: 11, fontWeight: 800, color: m.c, bgcolor: m.bg }}>
                                                        {m.t}
                                                    </Box>
                                                ) : (
                                                    <Box component="span" sx={{ color: '#CBD5E1' }}>–</Box>
                                                )}
                                            </TableCell>
                                        );
                                    })
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function DayHead({ d, sx }) {
    return (
        <TableCell align="center" sx={sx}>
            <Box>{dayNameOf(d).slice(0, 3)}</Box>
            <Box sx={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>{fmtShort(d)}</Box>
        </TableCell>
    );
}

function StatusBtn({ active, onClick, color, activeBg, label, title, icon }) {
    return (
        <ButtonBase
            onClick={onClick}
            title={title}
            aria-label={title}
            sx={{
                minWidth: { xs: 30, sm: 34 }, width: { xs: 30, sm: 'auto' }, height: 30, px: { xs: 0, sm: 0.6 },
                borderRadius: 1, border: `1.5px solid ${active ? activeBg : `${color}33`}`,
                bgcolor: active ? activeBg : '#fff', color: active ? '#fff' : color,
                fontSize: 10, fontWeight: 800, gap: 0.2,
            }}
        >
            {icon}
            <Box component="span" sx={{ display: icon ? { xs: 'none', sm: 'inline' } : 'inline' }}>{label}</Box>
        </ButtonBase>
    );
}
