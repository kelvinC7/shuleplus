import { useState, useEffect } from 'react';
import api from '../services/api';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import Avatar from '@mui/material/Avatar';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TimelineIcon from '@mui/icons-material/Timeline';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import {
    buildSubjectsForClass,
    normalizeGradebookLabel,
} from '../utils/teacherGradebookUi';
import { brand } from '../theme/theme';

const GRADES = [
    { min: 90, label: 'A+', color: '#059669', bg: 'rgba(5,150,105,0.10)', ring: 'rgba(5,150,105,0.22)' },
    { min: 80, label: 'A', color: '#10B981', bg: 'rgba(16,185,129,0.10)', ring: 'rgba(16,185,129,0.18)' },
    { min: 70, label: 'B', color: '#3B82F6', bg: 'rgba(59,130,246,0.10)', ring: 'rgba(59,130,246,0.18)' },
    { min: 60, label: 'C', color: '#24396A', bg: '#F3F5FA', ring: 'rgba(36,57,106,0.16)' },
    { min: 50, label: 'D', color: '#D97706', bg: 'rgba(217,119,6,0.10)', ring: 'rgba(217,119,6,0.18)' },
    { min: -Infinity, label: 'E', color: '#EF4444', bg: 'rgba(239,68,68,0.10)', ring: 'rgba(239,68,68,0.18)' },
];

const gradeFor = (total) => GRADES.find((g) => total >= g.min);

const selectSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: '#fff', fontSize: 12 },
};

const headSx = {
    bgcolor: 'rgba(247,248,250,0.5)',
    borderRight: `1px solid ${brand.border}`,
    borderBottom: `1px solid ${brand.border}`,
    px: { xs: 1, sm: 2 },
    py: 2,
    fontSize: 10,
    fontWeight: 700,
    color: brand.muted,
};

const cellSx = {
    borderRight: `1px solid ${brand.border}`,
    borderBottom: `1px solid ${brand.border}`,
    px: { xs: 1, sm: 2 },
    py: 2,
};

export default function RecordMarks() {
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [isClassSelected, setIsClassSelected] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('Term 1');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [columns, setColumns] = useState([]);
    const [marks, setMarks] = useState([]);
    const [saveColumnSlug, setSaveColumnSlug] = useState('');
    const [matrixNotice, setMatrixNotice] = useState(null);
    const [registryClassHint, setRegistryClassHint] = useState(null);
    const [matrixLoadFailed, setMatrixLoadFailed] = useState(false);
    const [timetablePairs, setTimetablePairs] = useState([]);
    const [filterMode, setFilterMode] = useState('registry');

    useEffect(() => {
        fetchMetadata();
    }, []);

    const fetchMetadata = async () => {
        try {
            const fbRes = await api.get('/teacher-portal/gradebook-filters');
            const pairs =
                fbRes.data.success && Array.isArray(fbRes.data.data?.pairs)
                    ? fbRes.data.data.pairs
                    : [];

            if (pairs.length > 0) {
                setFilterMode('timetable');
                setTimetablePairs(pairs);
                const uniqClasses = [...new Set(pairs.map((p) => p.class_name))].sort((a, b) =>
                    a.localeCompare(b)
                );
                setClasses(uniqClasses);
                const firstClass = uniqClasses[0] || '';
                setSelectedClass(firstClass);
                const subs = await buildSubjectsForClass(api, firstClass, pairs);
                setSubjects(subs);
                setSelectedSubject(subs[0] || '');
                if (typeof window !== 'undefined' && window.innerWidth >= 1024) setIsClassSelected(true);
            } else {
                setFilterMode('registry');
                setTimetablePairs([]);
                const [classesRes, subjectsRes] = await Promise.all([
                    api.get('/dos/registry/classes'),
                    api.get('/dos/subjects'),
                ]);

                if (classesRes.data.success) {
                    const classList = classesRes.data.data.map((c) =>
                        `${c.group_name} ${c.stream_name} ${c.combination || ''}`.trim()
                    );
                    setClasses(classList);
                    if (classList.length > 0) {
                        setSelectedClass((prev) => prev || classList[0]);
                        if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                            setIsClassSelected(true);
                        }
                    }
                }

                if (subjectsRes.data.success) {
                    const subjectList = subjectsRes.data.data.map((s) => s.name);
                    setSubjects(subjectList);
                    setSelectedSubject((prev) => prev || subjectList[0] || '');
                }
            }
        } catch (err) {
            console.error('Failed to fetch metadata:', err);
        }
    };

    useEffect(() => {
        if (filterMode !== 'timetable' || !selectedClass || !timetablePairs.length) return;
        let cancelled = false;
        (async () => {
            const subs = await buildSubjectsForClass(api, selectedClass, timetablePairs);
            if (cancelled) return;
            setSubjects(subs);
            setSelectedSubject((prev) => (subs.includes(prev) ? prev : subs[0] || ''));
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedClass, filterMode, timetablePairs]);

    useEffect(() => {
        if (filterMode !== 'registry' || !selectedClass) return;
        let cancelled = false;
        (async () => {
            const configured = await buildSubjectsForClass(api, selectedClass, []);
            if (cancelled) return;
            if (configured.length) {
                setSubjects(configured);
                setSelectedSubject((prev) => (configured.includes(prev) ? prev : configured[0] || ''));
                return;
            }
            const res = await api.get('/dos/subjects');
            if (cancelled || !res.data.success) return;
            const all = (res.data.data || []).map((s) => s.name);
            setSubjects(all);
            setSelectedSubject((prev) => (all.includes(prev) ? prev : all[0] || ''));
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedClass, filterMode]);

    useEffect(() => {
        if (isClassSelected && selectedClass && selectedSubject) {
            loadGradebookMatrix();
        }
    }, [isClassSelected, selectedClass, selectedSubject]);

    useEffect(() => {
        if (columns.length && !saveColumnSlug) {
            setSaveColumnSlug(columns[0].slug);
        }
    }, [columns, saveColumnSlug]);

    const loadGradebookMatrix = async () => {
        setLoading(true);
        setMatrixNotice(null);
        setRegistryClassHint(null);
        setMatrixLoadFailed(false);
        const className = normalizeGradebookLabel(selectedClass);
        const subjectName = normalizeGradebookLabel(selectedSubject);
        try {
            const res = await api.get('/teacher-portal/gradebook-matrix', {
                params: { class_name: className, subject_name: subjectName },
            });
            if (!res.data.success) {
                setColumns([]);
                setMarks([]);
                setMatrixLoadFailed(true);
                setMatrixNotice(
                    res.data?.message || 'Could not load the gradebook. Check your connection or try again.'
                );
                return;
            }
            const payload = res.data.data || {};
            const cols = Array.isArray(payload.columns) ? payload.columns : [];
            const rawStudents = Array.isArray(payload.students) ? payload.students : [];
            setColumns(cols);
            // Always show students in ascending alphabetical order (A–Z).
            const sortedStudents = rawStudents
                .map((s) => ({
                    id: s.student_id,
                    adm: s.student_uid,
                    name: s.name,
                    gender: s.gender === 'Male' ? 'M' : 'F',
                    scores: { ...(s.scores || {}) },
                }))
                .sort((x, y) =>
                    String(x.name || '').localeCompare(String(y.name || ''), undefined, { sensitivity: 'base', numeric: true })
                );
            setMarks(sortedStudents);
            const regLabel = payload.student_class_name;
            setRegistryClassHint(
                rawStudents.length > 0 && regLabel
                    ? `Roster uses the registration label “${regLabel}” (your selection “${className}” still matches after spacing and capitals are normalized).`
                    : null
            );
            if (rawStudents.length === 0) {
                setMatrixNotice(
                    `No students matched class “${className}” for this subject. Spacing and letter case are already normalized, so the label must still be the same class (for example “S4 A” will not match “Senior 4 Arts”). Try another class, use the full directory if your timetable label is wrong, or ask your school manager to align the timetable and student registration.`
                );
            }
        } catch (err) {
            console.error('Failed to load gradebook:', err);
            setColumns([]);
            setMarks([]);
            setMatrixLoadFailed(true);
            setMatrixNotice(err.response?.data?.message || 'Failed to load gradebook.');
        } finally {
            setLoading(false);
        }
    };

    const maxForSlug = (slug) => {
        const c = columns.find((x) => x.slug === slug);
        const d = c?.default_max_score;
        return d != null && !Number.isNaN(Number(d)) ? Number(d) : 100;
    };

    const handleSaveColumn = async () => {
        const slug = saveColumnSlug || columns[0]?.slug;
        if (!slug) return alert('No gradebook columns are configured. Ask your school manager to add them under Gradebook columns.');
        const className = normalizeGradebookLabel(selectedClass);
        const subjectName = normalizeGradebookLabel(selectedSubject);
        const col = columns.find((c) => c.slug === slug);
        const defaultName = `${selectedTerm} ${col?.label || slug}`;
        const assessmentName = window.prompt(
            `Assessment title (e.g. “Week 4 quiz”, “CAT 1”). Counts toward: ${col?.label || slug}.`,
            defaultName
        );
        if (!assessmentName) return;

        const maxScore = maxForSlug(slug);
        const marksData = marks
            .map((m) => {
                const raw = m.scores?.[slug];
                const v = raw === '' || raw == null ? null : Number(raw);
                if (v == null || Number.isNaN(v)) return null;
                return { student_id: m.id, value: Math.min(v, maxScore) };
            })
            .filter(Boolean);
        if (!marksData.length) {
            return alert('Enter at least one score for this column before saving.');
        }

        try {
            const assessmentRes = await api.post('/teacher-portal/assessments', {
                class_name: className,
                subject_name: subjectName,
                assessment_name: assessmentName,
                max_score: maxScore,
                column_slug: slug,
            });

            if (!assessmentRes.data.success) {
                return alert('Failed to create assessment.');
            }
            const assessment_id = assessmentRes.data.assessment_id;

            const res = await api.post('/teacher-portal/marks', {
                assessment_id,
                marks: marksData,
            });
            if (res.data.success) {
                alert(`Saved ${marksData.length} marks for “${assessmentName}” → ${col?.label || slug}.`);
                loadGradebookMatrix();
            }
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to record marks.');
        }
    };

    const handleMarkChange = (id, slug, value) => {
        const cap = maxForSlug(slug);
        const numValue = value === '' ? '' : Math.min(Math.max(Number(value), 0), cap);
        setMarks((prev) =>
            prev.map((m) =>
                m.id === id ? { ...m, scores: { ...m.scores, [slug]: numValue } } : m
            )
        );
    };

    const calculateTotal = (m) =>
        columns.reduce((acc, c) => acc + (Number(m.scores?.[c.slug]) || 0), 0);

    const q = searchQuery.trim().toLowerCase();
    const filteredMarks = marks.filter((s) => {
        if (!q) return true;
        return (s.name || '').toLowerCase().includes(q) || String(s.adm || '').toLowerCase().includes(q);
    });

    const stats = {
        avg: marks.length
            ? Math.round(marks.reduce((acc, m) => acc + calculateTotal(m), 0) / marks.length)
            : 0,
        highest: marks.length ? Math.max(...marks.map(calculateTotal)) : 0,
        passRate: marks.length
            ? Math.round((marks.filter((m) => calculateTotal(m) >= 50).length / marks.length) * 100)
            : 0,
    };

    const statCards = [
        { label: 'Class Average', value: `${stats.avg}%`, icon: <TrendingUpIcon sx={{ fontSize: 14 }} /> },
        { label: 'Pass Ratio', value: `${stats.passRate}%`, icon: <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> },
        { label: 'Highest Mark', value: `${stats.highest}%`, icon: <TimelineIcon sx={{ fontSize: 14 }} /> },
    ];

    const statsDisplay = !isClassSelected ? { display: { xs: 'none', lg: 'grid' } } : { display: 'grid' };
    const toolbarDisplay = !isClassSelected ? { display: { xs: 'none', lg: 'flex' } } : { display: 'flex' };
    const tableDisplay = !isClassSelected ? { display: { xs: 'none', lg: 'block' } } : { display: 'block' };

    return (
        <Box sx={{ bgcolor: brand.background, minHeight: '100vh', pb: 6 }}>
            <Box sx={{ position: 'relative', width: '100%', minHeight: 300, overflow: 'hidden' }}>
                <Box
                    component="img"
                    src="/teacher.jpg"
                    alt=""
                    sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.05)' }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        background:
                            'linear-gradient(135deg, rgba(8,17,31,0.92), rgba(18,35,58,0.84), rgba(33,49,74,0.78))',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        background:
                            'radial-gradient(circle at top right, rgba(19,33,61,0.20), transparent 28%), radial-gradient(circle at bottom left, rgba(255,184,0,0.10), transparent 24%)',
                    }}
                />
                <Box sx={{ position: 'relative', zIndex: 2, maxWidth: 1600, mx: 'auto', px: { xs: 3, md: 6 }, pt: 8, pb: 12 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <Box sx={{ width: 24, height: 4, borderRadius: 99, bgcolor: brand.primary }} />
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                            Academic Grading
                        </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: { xs: 30, md: 48 }, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                        Students Marks
                    </Typography>
                    <Typography sx={{ mt: 1, fontSize: { xs: 12, md: 13 }, fontWeight: 500, color: 'rgba(255,255,255,0.7)', maxWidth: 560 }}>
                        {selectedClass} · {selectedSubject}. Fill columns in any order; pick the column, Save, and name each round (quiz, CAT, exam-your wording).
                    </Typography>
                </Box>
            </Box>

            <Box sx={{ position: 'relative', zIndex: 3, maxWidth: 1600, mx: 'auto', px: { xs: 1, md: 3 }, mt: '-64px' }}>
                <Paper
                    elevation={0}
                    sx={{
                        borderRadius: '32px 32px 0 0',
                        boxShadow: '0 24px 48px rgba(15,23,42,0.16)',
                        border: `1px solid ${brand.border}`,
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            ...statsDisplay,
                            gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(3, 1fr)' },
                            borderBottom: `1px solid ${brand.border}`,
                            '& > *:not(:last-child)': { borderRight: `1px solid ${brand.border}` },
                        }}
                    >
                        {statCards.map((s) => (
                            <Box key={s.label} sx={{ p: { xs: 2, sm: 4 }, textAlign: 'center', '&:hover': { bgcolor: 'rgba(247,248,250,0.5)' } }}>
                                <Box sx={{ color: brand.navy, opacity: 0.4, mb: 0.75, display: 'inline-flex' }}>{s.icon}</Box>
                                <Typography sx={{ fontSize: { xs: 14, sm: 24 }, fontWeight: 700, color: brand.text }}>{s.value}</Typography>
                                <Typography sx={{ fontSize: 10, fontWeight: 600, color: brand.muted, mt: 0.25, opacity: 0.6 }}>
                                    {s.label}
                                </Typography>
                            </Box>
                        ))}
                    </Box>

                    <Box
                        sx={{
                            ...toolbarDisplay,
                            flexDirection: { xs: 'column', lg: 'row' },
                            alignItems: { lg: 'center' },
                            gap: { xs: 2, lg: 1 },
                            px: { xs: 2, lg: 1.5 },
                            py: { xs: 2, lg: 1 },
                            borderBottom: `1px solid ${brand.border}`,
                            bgcolor: 'rgba(247,248,250,0.4)',
                        }}
                    >
                        <Box sx={{ display: { xs: 'none', lg: 'block' }, width: 152, flexShrink: 0 }}>
                            <TextField
                                select
                                fullWidth
                                size="small"
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PeopleAltOutlinedIcon sx={{ fontSize: 14, color: brand.muted }} />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={selectSx}
                            >
                                {classes.map((cls) => (
                                    <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                                ))}
                            </TextField>
                        </Box>

                        <ButtonBase
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                            sx={{ display: { lg: 'none' }, width: '100%', justifyContent: 'space-between', px: 0.5, py: 1 }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center">
                                <FilterAltOutlinedIcon sx={{ fontSize: 16, color: brand.navy }} />
                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: brand.navy, textTransform: 'lowercase' }}>
                                    show filters
                                </Typography>
                            </Stack>
                            {showMobileFilters ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                        </ButtonBase>

                        <Collapse in={showMobileFilters} sx={{ display: { lg: 'none' }, width: '100%' }}>
                            <Stack spacing={1.5} sx={{ pb: 1 }}>
                                <TextField
                                    select fullWidth size="small" value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    InputProps={{ startAdornment: <InputAdornment position="start"><MenuBookOutlinedIcon sx={{ fontSize: 16, color: brand.muted }} /></InputAdornment> }}
                                    sx={selectSx}
                                >
                                    {subjects.map((sub) => <MenuItem key={sub} value={sub}>{sub}</MenuItem>)}
                                </TextField>
                                <TextField
                                    select fullWidth size="small" value={selectedTerm}
                                    onChange={(e) => setSelectedTerm(e.target.value)}
                                    InputProps={{ startAdornment: <InputAdornment position="start"><AccessTimeIcon sx={{ fontSize: 16, color: brand.muted }} /></InputAdornment> }}
                                    sx={selectSx}
                                >
                                    <MenuItem value="Term 1">Term 1</MenuItem>
                                    <MenuItem value="Term 2">Term 2</MenuItem>
                                </TextField>
                                <TextField
                                    fullWidth size="small" placeholder="Search student..." value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16, color: brand.muted }} /></InputAdornment> }}
                                    sx={selectSx}
                                />
                                <TextField
                                    select fullWidth size="small" value={saveColumnSlug}
                                    onChange={(e) => setSaveColumnSlug(e.target.value)}
                                    sx={selectSx}
                                >
                                    {columns.length === 0 ? <MenuItem value="">No columns</MenuItem> : null}
                                    {columns.map((c) => <MenuItem key={c.slug} value={c.slug}>{c.label}</MenuItem>)}
                                </TextField>
                                <Button variant="contained" color="secondary" fullWidth startIcon={<SaveOutlinedIcon />} onClick={handleSaveColumn} sx={{ py: 1.1 }}>
                                    Save
                                </Button>
                            </Stack>
                        </Collapse>

                        <Box sx={{ display: { xs: 'none', lg: 'flex' }, alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                            <Box sx={{ width: 168, flexShrink: 0 }}>
                                <TextField
                                    select fullWidth size="small" value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    InputProps={{ startAdornment: <InputAdornment position="start"><MenuBookOutlinedIcon sx={{ fontSize: 14, color: brand.muted }} /></InputAdornment> }}
                                    sx={selectSx}
                                >
                                    {subjects.map((sub) => <MenuItem key={sub} value={sub}>{sub}</MenuItem>)}
                                </TextField>
                            </Box>
                            <Box sx={{ width: 96, flexShrink: 0 }}>
                                <TextField
                                    select fullWidth size="small" value={selectedTerm}
                                    onChange={(e) => setSelectedTerm(e.target.value)}
                                    InputProps={{ startAdornment: <InputAdornment position="start"><AccessTimeIcon sx={{ fontSize: 14, color: brand.muted }} /></InputAdornment> }}
                                    sx={selectSx}
                                >
                                    <MenuItem value="Term 1">Term 1</MenuItem>
                                    <MenuItem value="Term 2">Term 2</MenuItem>
                                </TextField>
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 112, maxWidth: 176 }}>
                                <TextField
                                    fullWidth size="small" placeholder="Search student..." value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 14, color: brand.muted }} /></InputAdornment> }}
                                    sx={selectSx}
                                />
                            </Box>
                            <Box sx={{ width: 128, flexShrink: 0 }}>
                                <TextField
                                    select fullWidth size="small" value={saveColumnSlug}
                                    onChange={(e) => setSaveColumnSlug(e.target.value)}
                                    title="Save marks into this gradebook column; name the assessment when prompted."
                                    sx={selectSx}
                                >
                                    {columns.length === 0 ? <MenuItem value="">No columns</MenuItem> : null}
                                    {columns.map((c) => <MenuItem key={c.slug} value={c.slug}>{c.label}</MenuItem>)}
                                </TextField>
                            </Box>
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={handleSaveColumn}
                                startIcon={<SaveOutlinedIcon sx={{ fontSize: 14 }} />}
                                sx={{ height: 32, px: 1.5, flexShrink: 0, fontSize: 10, fontWeight: 700 }}
                            >
                                Save
                            </Button>
                        </Box>
                    </Box>

                    {registryClassHint && isClassSelected && !loading && !matrixLoadFailed ? (
                        <Alert severity="info" sx={{ mx: 2, mt: 1.5, py: 0.25, fontSize: 10, fontWeight: 700, borderRadius: 1.5 }}>
                            {registryClassHint}
                        </Alert>
                    ) : null}

                    {!isClassSelected ? (
                        <Box sx={{ display: { xs: 'flex', lg: 'none' }, flexDirection: 'column', px: 3, py: 6, textAlign: 'center', alignItems: 'center', bgcolor: 'rgba(247,248,250,0.4)' }}>
                            <Box sx={{ width: 64, height: 64, borderRadius: '32px', bgcolor: '#fff', boxShadow: 6, display: 'grid', placeItems: 'center', color: brand.navy, mb: 3, border: `1px solid ${brand.border}` }}>
                                <SchoolOutlinedIcon sx={{ fontSize: 32 }} />
                            </Box>
                            <Typography sx={{ fontSize: 20, fontWeight: 700, color: brand.text, mb: 0.75 }}>Select Class</Typography>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: brand.muted, mb: 4, maxWidth: 240 }}>
                                Choose a class to start recording academic marks.
                            </Typography>
                            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, width: '100%', maxWidth: 384 }}>
                                {classes.map((cls) => (
                                    <ButtonBase
                                        key={cls}
                                        onClick={() => {
                                            setSelectedClass(cls);
                                            setIsClassSelected(true);
                                        }}
                                        sx={{ height: 64, justifyContent: 'center', gap: 1, px: 2, bgcolor: '#fff', border: `1px solid ${brand.border}`, borderRadius: 2, boxShadow: 1, '&:hover': { borderColor: 'rgba(19,33,61,0.3)', bgcolor: 'rgba(19,33,61,0.05)' } }}
                                    >
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: brand.text }}>{cls}</Typography>
                                            <Typography sx={{ fontSize: 10, fontWeight: 500, color: brand.muted, fontStyle: 'italic' }}>Registry</Typography>
                                        </Box>
                                        <ExpandMoreIcon sx={{ fontSize: 14, color: brand.muted, transform: 'rotate(-90deg)' }} />
                                    </ButtonBase>
                                ))}
                            </Box>
                        </Box>
                    ) : null}

                    <Box sx={{ ...tableDisplay, width: '100%', overflow: 'hidden' }}>
                        {isClassSelected ? (
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ display: { lg: 'none' }, px: 3, py: 1.5, borderBottom: `1px solid ${brand.border}` }}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: brand.navy }} />
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: brand.text }}>{selectedClass} Registry</Typography>
                                </Stack>
                                <ButtonBase onClick={() => setIsClassSelected(false)}>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: brand.navy, '&:hover': { textDecoration: 'underline' } }}>
                                        Change Class
                                    </Typography>
                                </ButtonBase>
                            </Stack>
                        ) : null}

                        {!loading && isClassSelected && matrixNotice ? (
                            <Alert
                                severity={matrixLoadFailed ? 'error' : 'warning'}
                                icon={<CheckCircleOutlineIcon sx={{ display: 'none' }} />}
                                sx={{ mx: 2, my: 2, borderRadius: 1.5, '& .MuiAlert-message': { fontSize: 11, fontWeight: 700 } }}
                            >
                                <Typography sx={{ fontSize: 10, fontWeight: 700 }}>
                                    {matrixLoadFailed ? 'Gradebook could not load' : 'No students in this class'}
                                </Typography>
                                <Typography sx={{ fontSize: 11, fontWeight: 700, mt: 0.5 }}>{matrixNotice}</Typography>
                            </Alert>
                        ) : null}

                        <TableContainer sx={{ overflowX: 'auto' }}>
                            <Table sx={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell align="center" sx={{ ...headSx, width: 40 }}>#</TableCell>
                                        <TableCell sx={headSx}>Student Details</TableCell>
                                        {columns.map((c) => (
                                            <TableCell
                                                key={c.slug}
                                                align="center"
                                                title={c.default_max_score != null ? `Max ${c.default_max_score}` : undefined}
                                                sx={{ ...headSx, width: { xs: 64, sm: 96 } }}
                                            >
                                                <Box component="span" sx={{ display: 'block' }}>{c.label}</Box>
                                                {c.default_max_score != null ? (
                                                    <Box component="span" sx={{ display: 'block', fontSize: 10, fontWeight: 500, opacity: 0.5 }}>
                                                        max {c.default_max_score}
                                                    </Box>
                                                ) : null}
                                            </TableCell>
                                        ))}
                                        <TableCell align="center" sx={{ ...headSx, borderRight: `1px solid ${brand.border}`, width: { xs: 48, sm: 64 } }}>Total</TableCell>
                                        <TableCell align="center" sx={{ ...headSx, borderRight: 'none', width: { xs: 48, sm: 64 } }}>Grade</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={4 + columns.length} sx={{ p: 6, textAlign: 'center' }}>
                                                <CircularProgress size={32} sx={{ mb: 2, color: brand.navy }} />
                                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: brand.muted }}>
                                                    Fetching Central Records...
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : matrixLoadFailed ? (
                                        <TableRow>
                                            <TableCell colSpan={8} sx={{ p: 4, textAlign: 'center', fontSize: 10, fontWeight: 700, color: brand.muted }}>
                                                See the alert above - the gradebook did not load.
                                            </TableCell>
                                        </TableRow>
                                    ) : columns.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ p: 5, textAlign: 'center', fontSize: 10, fontWeight: 700, color: brand.muted }}>
                                                No gradebook columns yet. Your school manager can add them under Gradebook columns.
                                            </TableCell>
                                        </TableRow>
                                    ) : marks.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4 + columns.length} sx={{ p: 5, textAlign: 'center' }}>
                                                <Typography sx={{ fontSize: 11, fontWeight: 700, color: brand.text, mb: 0.5 }}>No students to display</Typography>
                                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: brand.muted, maxWidth: 512, mx: 'auto' }}>
                                                    Details are in the yellow notice above (class name must match the registry).
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredMarks.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4 + columns.length} sx={{ p: 5, textAlign: 'center', fontSize: 10, fontWeight: 700, color: brand.muted }}>
                                                No students match your search. Clear the search box to see everyone.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMarks.map((m, idx) => {
                                            const total = calculateTotal(m);
                                            const grade = gradeFor(total);
                                            return (
                                                <TableRow key={m.id} hover>
                                                    <TableCell align="center" sx={{ ...cellSx, fontSize: 10, fontWeight: 700, color: '#D1D5DB' }}>
                                                        {idx + 1}
                                                    </TableCell>
                                                    <TableCell sx={cellSx}>
                                                        <Stack direction="row" spacing={1.5} alignItems="center">
                                                            <Avatar sx={{ width: 32, height: 32, bgcolor: brand.background, color: brand.muted, border: `1px solid ${brand.border}` }}>
                                                                <PersonOutlineIcon sx={{ fontSize: 14 }} />
                                                            </Avatar>
                                                            <Box sx={{ minWidth: 0 }}>
                                                                <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: brand.text }}>{m.name}</Typography>
                                                                <Typography noWrap sx={{ fontSize: 10, fontWeight: 500, color: 'rgba(107,115,133,0.5)' }}>{m.adm}</Typography>
                                                            </Box>
                                                        </Stack>
                                                    </TableCell>
                                                    {columns.map((c) => (
                                                        <TableCell key={c.slug} sx={{ ...cellSx, px: { xs: 0.75, sm: 1.5 }, py: 1.5 }}>
                                                            <TextField
                                                                type="number"
                                                                size="small"
                                                                value={m.scores?.[c.slug] ?? ''}
                                                                onChange={(e) => handleMarkChange(m.id, c.slug, e.target.value)}
                                                                placeholder="-"
                                                                inputProps={{ inputMode: 'decimal' }}
                                                                sx={{
                                                                    width: '100%',
                                                                    '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: '#fff', fontSize: 12, fontWeight: 700 },
                                                                    '& input': { textAlign: 'center', px: 0.5, py: 0.75 },
                                                                }}
                                                            />
                                                        </TableCell>
                                                    ))}
                                                    <TableCell align="center" sx={{ ...cellSx }}>
                                                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: brand.text }}>{total}</Typography>
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ ...cellSx, borderRight: 'none' }}>
                                                        <Box
                                                            sx={{
                                                                display: 'inline-flex',
                                                                height: 28,
                                                                minWidth: 28,
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                borderRadius: 99,
                                                                fontSize: 10,
                                                                fontWeight: 700,
                                                                color: grade.color,
                                                                bgcolor: grade.bg,
                                                                boxShadow: `inset 0 0 0 1px ${grade.ring}`,
                                                            }}
                                                        >
                                                            {grade.label}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={2}
                            sx={{ px: 3, py: 2.5, bgcolor: 'rgba(247,248,250,0.1)', borderTop: `1px solid ${brand.border}` }}
                        >
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ order: { xs: 2, sm: 1 }, color: 'rgba(107,115,133,0.5)' }}>
                                <TimelineIcon sx={{ fontSize: 13 }} />
                                <Typography sx={{ fontSize: 10, fontWeight: 500, fontStyle: 'italic' }}>
                                    Scholastic Analytics Sync Active
                                </Typography>
                            </Stack>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' }, order: { xs: 1, sm: 2 } }}>
                                <Stack direction="row" spacing={1.5}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<PrintOutlinedIcon sx={{ fontSize: 14 }} />}
                                        sx={{ flex: { xs: 1, sm: 'none' }, height: { xs: 48, sm: 36 }, px: 2, borderRadius: 2, fontSize: 10, fontWeight: 700, color: brand.text, borderColor: brand.border, bgcolor: '#fff' }}
                                    >
                                        Print
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 14 }} />}
                                        sx={{ flex: { xs: 1, sm: 'none' }, height: { xs: 48, sm: 36 }, px: 2, borderRadius: 2, fontSize: 10, fontWeight: 700, color: brand.text, borderColor: brand.border, bgcolor: '#fff' }}
                                    >
                                        Export
                                    </Button>
                                </Stack>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={handleSaveColumn}
                                    startIcon={<SaveOutlinedIcon />}
                                    sx={{ display: { lg: 'none' }, width: '100%', height: 56, borderRadius: 2, fontSize: 14, fontWeight: 700 }}
                                >
                                    Save column marks
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
}
