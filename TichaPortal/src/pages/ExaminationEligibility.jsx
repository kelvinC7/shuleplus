import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SearchIcon from '@mui/icons-material/Search';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { brand } from '../theme/theme';

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Annual Review'];
const YEARS = ['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023'];

function formatMoneyRWF(value) {
    const n = Number(value) || 0;
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'RWF',
        maximumFractionDigits: 0,
    }).format(n);
}

/** Match first/last name, UID, or student code (partial, case-insensitive). */
function studentMatchesSearch(row, queryRaw) {
    const q = String(queryRaw || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
    if (!q) return true;
    const uid = String(row.student_uid ?? '').toLowerCase();
    const code = String(row.student_code ?? '').toLowerCase();
    const first = String(row.first_name ?? '').toLowerCase().trim();
    const last = String(row.last_name ?? '').toLowerCase().trim();
    const full = `${first} ${last}`.trim();
    const fullRev = `${last} ${first}`.trim();
    const idStr = String(row.student_id ?? '');
    return (
        full.includes(q) ||
        fullRev.includes(q) ||
        first.includes(q) ||
        last.includes(q) ||
        uid.includes(q) ||
        code.includes(q) ||
        idStr.includes(q)
    );
}

function feeStatusLabel(status) {
    const m = {
        full_pay: 'Full paid',
        full: 'Cleared',
        remain_pay: 'Partial',
        not_paid: 'Not paid',
        no_fee_card: 'No fee card',
        unknown: 'Unknown',
    };
    return m[String(status)] || status || '-';
}

const selectSx = { '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: '#fff', fontSize: 14, fontWeight: 700, color: brand.navy } };

const fieldLabelSx = { mb: 0.75, display: 'block', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' };

function AllowedChip({ allowed }) {
    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                borderRadius: 99,
                px: 1.25,
                py: 0.5,
                fontSize: 11,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: allowed ? '#065F46' : '#991B1B',
                bgcolor: allowed ? '#ECFDF5' : '#FEF2F2',
                boxShadow: `inset 0 0 0 1px ${allowed ? '#D1FAE5' : '#FEE2E2'}`,
            }}
        >
            {allowed ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> : <CancelOutlinedIcon sx={{ fontSize: 14 }} />}
            {allowed ? 'Allowed' : 'Not allowed'}
        </Box>
    );
}

export default function ExaminationEligibility() {
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedTerm, setSelectedTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);
    const [studentSearch, setStudentSearch] = useState('');

    const fetchClasses = useCallback(async () => {
        try {
            const res = await api.get('/teacher-portal/classes');
            setClasses(res.data?.success ? res.data.data || [] : []);
        } catch (e) {
            console.error(e);
            setClasses([]);
        }
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    const loadList = useCallback(async () => {
        if (!selectedClass || !selectedYear || !selectedTerm) return;
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/teacher-portal/examination-list', {
                params: {
                    class_name: selectedClass,
                    academic_year: selectedYear,
                    term: selectedTerm,
                },
            });
            if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load');
            setData(res.data.data || null);
        } catch (e) {
            console.error(e);
            setError(e.response?.data?.message || e.message || 'Could not load list');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [selectedClass, selectedYear, selectedTerm]);

    useEffect(() => {
        if (selectedClass && selectedYear && selectedTerm) loadList();
        else setData(null);
    }, [selectedClass, selectedYear, selectedTerm, loadList]);

    useEffect(() => {
        setStudentSearch('');
    }, [selectedClass, selectedYear, selectedTerm]);

    const published = data?.published === true;
    const students = data?.students || [];
    const message = data?.message || '';

    const sortedStudents = useMemo(() => {
        const arr = [...students];
        arr.sort((a, b) => {
            const allowedDiff = Number(b.allowed_for_exam) - Number(a.allowed_for_exam);
            if (allowedDiff !== 0) return allowedDiff;
            const na = `${a.last_name || ''} ${a.first_name || ''}`.toLowerCase();
            const nb = `${b.last_name || ''} ${b.first_name || ''}`.toLowerCase();
            return na.localeCompare(nb);
        });
        return arr;
    }, [students]);

    const filteredStudents = useMemo(
        () => sortedStudents.filter((row) => studentMatchesSearch(row, studentSearch)),
        [sortedStudents, studentSearch]
    );

    const canLoad = Boolean(selectedClass && selectedYear && selectedTerm);

    return (
        <Box sx={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #F8FAFC, #fff)', pb: { xs: 14, md: 5 } }}>
            <Box sx={{ position: 'relative', overflow: 'hidden', bgcolor: brand.navy, px: { xs: 2, sm: 3 }, pt: 4, pb: 8 }}>
                <Box sx={{ position: 'absolute', right: -80, top: -80, width: 224, height: 224, borderRadius: '50%', bgcolor: 'rgba(245,166,35,0.15)', filter: 'blur(48px)', pointerEvents: 'none' }} />
                <Box sx={{ position: 'relative', maxWidth: 768, mx: 'auto' }}>
                    <Stack direction="row" alignItems="flex-start" spacing={2}>
                        <Box sx={{ display: 'grid', placeItems: 'center', width: 56, height: 56, flexShrink: 0, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)' }}>
                            <SchoolOutlinedIcon sx={{ fontSize: 28, color: brand.primary }} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: brand.primary }}>Academic</Typography>
                            <Typography sx={{ mt: 0.5, fontSize: 24, fontWeight: 900, letterSpacing: '-0.01em', color: '#fff' }}>Examination list</Typography>
                            <Typography sx={{ mt: 1, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)' }}>
                                Published by finance - see who may sit exams for this class (fees + overrides).
                            </Typography>
                        </Box>
                    </Stack>
                </Box>
            </Box>

            <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1, maxWidth: 768, mx: 'auto', mt: '-48px', px: { xs: 2, sm: 3 } }}>
                <Paper elevation={0} sx={{ borderRadius: 2, p: 2, boxShadow: '0 20px 40px rgba(0,0,0,0.10)', border: `1px solid ${brand.border}` }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                        <Box>
                            <Box component="span" sx={fieldLabelSx}>Academic year</Box>
                            <TextField select fullWidth size="small" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} sx={selectSx}>
                                <MenuItem value="">Year</MenuItem>
                                {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                            </TextField>
                        </Box>
                        <Box>
                            <Box component="span" sx={fieldLabelSx}>Term</Box>
                            <TextField select fullWidth size="small" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} sx={selectSx}>
                                <MenuItem value="">Term</MenuItem>
                                {TERMS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                            </TextField>
                        </Box>
                        <Box>
                            <Box component="span" sx={fieldLabelSx}>Class</Box>
                            <TextField select fullWidth size="small" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} sx={selectSx}>
                                <MenuItem value="">Choose class</MenuItem>
                                {classes.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </TextField>
                        </Box>
                    </Box>

                    <Button
                        onClick={() => loadList()}
                        disabled={!canLoad || loading}
                        variant="contained"
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                        sx={{ mt: 2, width: { xs: '100%', sm: 'auto' }, px: { sm: 3 }, py: 1.25, bgcolor: brand.navy, color: '#fff', fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', boxShadow: '0 10px 20px rgba(19,33,61,0.25)', '&:hover': { bgcolor: brand.navy2 } }}
                    >
                        Refresh list
                    </Button>
                </Paper>

                {error ? (
                    <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ borderRadius: 2, bgcolor: '#FEF2F2', px: 2, py: 1.5, color: '#991B1B', boxShadow: 'inset 0 0 0 1px #FEE2E2' }}>
                        <WarningAmberIcon sx={{ fontSize: 20, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 14 }}>{error}</Typography>
                    </Stack>
                ) : null}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress size={40} sx={{ color: brand.primary }} />
                    </Box>
                ) : null}

                {!loading && data && !published ? (
                    <Box sx={{ borderRadius: 2, border: '1px dashed #E2E8F0', bgcolor: '#F8FAFC', p: 3, textAlign: 'center' }}>
                        <PeopleAltOutlinedIcon sx={{ fontSize: 40, color: '#CBD5E1' }} />
                        <Typography sx={{ mt: 1.5, fontSize: 14, fontWeight: 600, color: '#334155' }}>{message}</Typography>
                        <Typography sx={{ mt: 1, fontSize: 12, color: '#64748B' }}>
                            Ask finance to publish the examination list for this class and term.
                        </Typography>
                    </Box>
                ) : null}

                {!loading && published ? (
                    <>
                        <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} sx={{ borderRadius: 2, bgcolor: 'rgba(236,253,245,0.8)', px: 2, py: 1.5, boxShadow: 'inset 0 0 0 1px #D1FAE5' }}>
                            <CheckCircleOutlineIcon sx={{ fontSize: 20, color: '#059669' }} />
                            <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#064E3B' }}>
                                Published list · {data.counts?.allowed ?? 0} allowed · {data.counts?.blocked ?? 0} blocked
                            </Typography>
                        </Stack>

                        <Box>
                            <Box component="span" sx={fieldLabelSx}>Search student (name, UID, or code)</Box>
                            <TextField
                                type="search"
                                fullWidth
                                size="small"
                                value={studentSearch}
                                onChange={(e) => setStudentSearch(e.target.value)}
                                placeholder="Type to filter…"
                                autoComplete="off"
                                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, bgcolor: '#fff', fontSize: 14, fontWeight: 600, color: brand.navy } }}
                            />
                            {studentSearch.trim() ? (
                                <Typography sx={{ mt: 0.75, fontSize: 11, fontWeight: 500, color: '#64748B' }}>
                                    Showing {filteredStudents.length} of {sortedStudents.length} learners
                                </Typography>
                            ) : null}
                        </Box>

                        <Paper elevation={0} sx={{ display: { xs: 'none', md: 'block' }, overflow: 'hidden', borderRadius: 2, boxShadow: 1, border: `1px solid ${brand.border}` }}>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: '#F8FAFC', borderBottom: `1px solid ${brand.border}` }}>
                                            {['Student', 'Fees', 'Paid / Remain', 'Exam'].map((h) => (
                                                <TableCell key={h} sx={{ px: 2, py: 1.5, fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B', fontVariantNumeric: h === 'Paid / Remain' ? 'tabular-nums' : undefined }}>
                                                    {h}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {filteredStudents.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} sx={{ px: 2, py: 4, textAlign: 'center', fontSize: 14, color: '#64748B' }}>
                                                    No learners match “{studentSearch.trim()}”. Try another name or code.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredStudents.map((row) => (
                                                <TableRow key={row.student_id} hover sx={{ '&:hover': { bgcolor: 'rgba(248,250,252,0.8)' } }}>
                                                    <TableCell sx={{ px: 2, py: 1.5 }}>
                                                        <Typography sx={{ fontWeight: 700, color: brand.navy }}>
                                                            {`${row.first_name || ''} ${row.last_name || ''}`.trim()}
                                                        </Typography>
                                                        <Typography sx={{ fontSize: 11, color: '#64748B' }}>{row.student_uid || row.student_code}</Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ px: 2, py: 1.5, fontSize: 12, color: '#475569' }}>{feeStatusLabel(row.fee_status)}</TableCell>
                                                    <TableCell sx={{ px: 2, py: 1.5, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                                                        <Box component="span" sx={{ fontWeight: 600, color: '#1E293B' }}>{formatMoneyRWF(row.total_paid ?? 0)}</Box>
                                                        <Box component="span" sx={{ color: '#94A3B8' }}> · </Box>
                                                        <Box component="span" sx={{ color: '#475569' }}>{row.remaining == null ? '-' : formatMoneyRWF(row.remaining)}</Box>
                                                    </TableCell>
                                                    <TableCell sx={{ px: 2, py: 1.5 }}>
                                                        <AllowedChip allowed={row.allowed_for_exam} />
                                                        {row.override_mode !== 'auto' ? (
                                                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                                                                <ShieldOutlinedIcon sx={{ fontSize: 12, color: '#B45309' }} />
                                                                <Typography sx={{ fontSize: 10, fontWeight: 600, color: '#B45309' }}>
                                                                    Finance override ({row.override_mode})
                                                                </Typography>
                                                            </Stack>
                                                        ) : null}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>

                        <Stack spacing={1.5} sx={{ display: { md: 'none' } }}>
                            {filteredStudents.length === 0 ? (
                                <Box sx={{ borderRadius: 2, border: '1px dashed #E2E8F0', bgcolor: '#F8FAFC', px: 2, py: 4, textAlign: 'center', fontSize: 14, color: '#475569' }}>
                                    No learners match your search.
                                </Box>
                            ) : (
                                filteredStudents.map((row) => (
                                    <Box
                                        key={row.student_id}
                                        sx={{
                                            borderRadius: 2,
                                            p: 2,
                                            bgcolor: row.allowed_for_exam ? '#fff' : 'rgba(254,242,242,0.4)',
                                            boxShadow: `inset 0 0 0 1px ${row.allowed_for_exam ? '#D1FAE5' : '#FEE2E2'}`,
                                        }}
                                    >
                                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.5}>
                                            <Box>
                                                <Typography sx={{ fontWeight: 900, lineHeight: 1.3, color: brand.navy }}>
                                                    {`${row.first_name || ''} ${row.last_name || ''}`.trim()}
                                                </Typography>
                                                <Typography sx={{ mt: 0.25, fontSize: 11, fontWeight: 500, color: '#64748B' }}>
                                                    {row.student_uid || row.student_code}
                                                </Typography>
                                            </Box>
                                            <Box
                                                sx={{
                                                    flexShrink: 0,
                                                    borderRadius: 99,
                                                    px: 1.25,
                                                    py: 0.5,
                                                    fontSize: 10,
                                                    fontWeight: 900,
                                                    textTransform: 'uppercase',
                                                    color: row.allowed_for_exam ? '#064E3B' : '#991B1B',
                                                    bgcolor: row.allowed_for_exam ? '#D1FAE5' : '#FEE2E2',
                                                }}
                                            >
                                                {row.allowed_for_exam ? 'Allowed' : 'Blocked'}
                                            </Box>
                                        </Stack>
                                        <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                                            {[
                                                ['Paid', formatMoneyRWF(row.total_paid ?? 0)],
                                                ['Remain', row.remaining == null ? '-' : formatMoneyRWF(row.remaining)],
                                            ].map(([label, value]) => (
                                                <Box key={label} sx={{ borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.8)', px: 1.5, py: 1, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)' }}>
                                                    <Typography sx={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', color: '#94A3B8' }}>{label}</Typography>
                                                    <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                        <Typography sx={{ mt: 1, fontSize: 11, color: '#475569' }}>
                                            Fee: <Box component="span" sx={{ fontWeight: 600 }}>{feeStatusLabel(row.fee_status)}</Box>
                                            {row.override_mode !== 'auto' ? (
                                                <Box component="span" sx={{ ml: 1, fontWeight: 600, color: '#B45309' }}>
                                                    · Override: {row.override_mode}
                                                </Box>
                                            ) : null}
                                        </Typography>
                                    </Box>
                                ))
                            )}
                        </Stack>
                    </>
                ) : null}
            </Stack>
        </Box>
    );
}
