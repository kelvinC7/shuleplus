import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { normalizeGradebookLabel, TEACHER_SELECT_CHEVRON } from '../utils/teacherGradebookUi';
import TablePagination from '../components/TablePagination';
import {
    Calendar,
    Users,
    CheckCircle,
    XCircle,
    FileText,
    Search,
    CheckSquare,
    Check,
    X,
    User,
    ChevronLeft,
    ChevronRight,
    Tag,
    List,
    ClipboardList,
    Eye,
    ArrowLeft,
} from 'lucide-react';

function normalizeRollLabel(s) {
    return String(s ?? '').trim().slice(0, 160);
}

const flatInput =
    'min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-re-text outline-none transition-colors placeholder:text-slate-400 focus:border-re-orange/45 focus:ring-2 focus:ring-re-orange/12 md:min-h-[40px]';
const flatSelect = `${TEACHER_SELECT_CHEVRON} pr-10 min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-10 text-sm font-medium text-re-text outline-none focus:border-re-orange/45 focus:ring-2 focus:ring-re-orange/12 md:min-h-[40px]`;

export default function RoundRollCall() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('take');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [rollName, setRollName] = useState('');
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
            alert('Could not load this roll call.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (readOnly) return;
        if (!selectedClass) return alert('Choose a class.');
        if (!rollLabelNorm) return alert('Enter a roll name (e.g. Morning Prep).');
        if (!roster.length) return alert('No students loaded.');
        try {
            setLoading(true);
            const cn = normalizeGradebookLabel(selectedClass);
            const existingRes = await api.get('/teacher-portal/round-roll-call', {
                params: { class_name: cn, date: selectedDate, roll_label: rollLabelNorm },
            });
            if (existingRes.data?.success && existingRes.data?.data?.log_exists) {
                if (!existingRes.data.data.owned_by_me) {
                    alert('Another teacher already saved this roll. View it from history.');
                    return;
                }
                const ok = window.confirm(
                    `Replace saved "${rollLabelNorm}" roll for ${selectedClass} on ${selectedDate}?`
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
                alert(`Saved “${rollLabelNorm}” for ${selectedClass}.`);
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

    return (
        <div className="animate-in fade-in duration-700 bg-[#f0f2f9] min-h-screen pb-28 md:pb-12">
            <section className="relative flex min-h-[160px] w-full items-end overflow-hidden bg-[#FF8C00] text-white md:min-h-[220px] md:items-center">
                <div className="absolute inset-0 z-[1]">
                    <img
                        src="/teacher.png"
                        alt=""
                        className="block h-full w-full object-cover object-top opacity-95 md:opacity-100"
                    />
                    <div
                        className="absolute inset-0 z-[2] bg-gradient-to-t from-black/50 via-black/20 to-black/10 md:bg-black/25"
                        aria-hidden
                    />
                </div>
                <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 pb-6 pt-10 md:px-10 md:pb-8 md:pt-12">
                    <div className="max-w-3xl space-y-1">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
                            Roll call module
                        </span>
                        <h1 className="font-sans text-xl font-black tracking-tight text-white md:text-4xl">
                            Round roll call
                        </h1>
                        <p className="text-[11px] font-semibold text-white/85 md:text-sm">
                            All school classes · history & attendance view
                        </p>
                    </div>
                </div>
            </section>

            <div className="relative z-30 mx-auto max-w-[1600px] px-3 md:px-6 -mt-6 md:-mt-8">
                <div className="mb-3 flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 md:w-fit">
                    <button
                        type="button"
                        onClick={() => navigate('/attendance')}
                        className="min-h-[44px] rounded-xl px-4 text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 md:h-10 md:min-h-0"
                    >
                        Period attendance
                    </button>
                    <button
                        type="button"
                        aria-current="page"
                        className="min-h-[44px] rounded-xl px-4 text-[10px] font-black uppercase tracking-widest bg-re-grad-orange text-white md:h-10 md:min-h-0"
                    >
                        Round roll call
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/teacher-attendance')}
                        className="min-h-[44px] rounded-xl px-4 text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 md:h-10 md:min-h-0"
                    >
                        Teacher attendance
                    </button>
                </div>

                <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-1.5">
                    {[
                        { id: 'take', label: 'Take roll', icon: ClipboardList },
                        { id: 'history', label: 'All roll calls', icon: List },
                    ].map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => {
                                setTab(id);
                                if (id === 'take') setViewSession(null);
                            }}
                            className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-3 text-[10px] font-black uppercase tracking-widest md:flex-none md:px-5 md:min-h-[40px] ${
                                tab === id || (tab === 'view' && id === 'history')
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-50 text-slate-600'
                            }`}
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'history' && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white md:rounded-3xl">
                        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-2 lg:grid-cols-5">
                            <input
                                type="text"
                                placeholder="Search roll, class, teacher…"
                                value={historyQ}
                                onChange={(e) => {
                                    setHistoryQ(e.target.value);
                                    setHistoryPage(1);
                                }}
                                className={flatInput}
                            />
                            <select
                                value={historyClass}
                                onChange={(e) => {
                                    setHistoryClass(e.target.value);
                                    setHistoryPage(1);
                                }}
                                className={flatSelect}
                            >
                                <option value="">All classes</option>
                                {classes.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={historyFrom}
                                onChange={(e) => {
                                    setHistoryFrom(e.target.value);
                                    setHistoryPage(1);
                                }}
                                className={flatInput}
                            />
                            <input
                                type="date"
                                value={historyTo}
                                onChange={(e) => {
                                    setHistoryTo(e.target.value);
                                    setHistoryPage(1);
                                }}
                                className={flatInput}
                            />
                            <button
                                type="button"
                                onClick={loadHistory}
                                className="min-h-[44px] rounded-xl bg-re-grad-orange text-[10px] font-black uppercase tracking-widest text-white md:min-h-[40px]"
                            >
                                Apply filters
                            </button>
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left text-sm">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Roll</th>
                                        <th className="px-4 py-3">Class</th>
                                        <th className="px-4 py-3">Teacher</th>
                                        <th className="px-4 py-3 text-center">Present</th>
                                        <th className="px-4 py-3 text-center">Absent</th>
                                        <th className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyLoading ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-500">
                                                Loading…
                                            </td>
                                        </tr>
                                    ) : historyRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-500">
                                                No roll calls yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        historyRows.map((row) => (
                                            <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium">{row.date}</td>
                                                <td className="px-4 py-3">{row.roll_label}</td>
                                                <td className="px-4 py-3">{row.class_name}</td>
                                                <td className="px-4 py-3 text-slate-600">{row.teacher_name || '-'}</td>
                                                <td className="px-4 py-3 text-center tabular-nums text-emerald-700">
                                                    {row.present ?? 0}/{row.total ?? 0}
                                                </td>
                                                <td className="px-4 py-3 text-center tabular-nums text-red-600">
                                                    {row.absent ?? 0}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => openSessionView(row.id)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-700 hover:border-re-orange/40"
                                                    >
                                                        <Eye size={14} /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="md:hidden divide-y divide-slate-100">
                            {historyLoading ? (
                                <p className="py-10 text-center text-sm text-slate-500">Loading…</p>
                            ) : (
                                historyRows.map((row) => (
                                    <div key={row.id} className="p-4">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            {row.date}
                                        </p>
                                        <p className="mt-1 font-bold text-re-text">{row.roll_label}</p>
                                        <p className="text-sm text-slate-600">
                                            {row.class_name} · {row.teacher_name || 'Teacher'}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Present {row.present}/{row.total} · Absent {row.absent}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => openSessionView(row.id)}
                                            className="mt-3 w-full min-h-[44px] rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest"
                                        >
                                            View attendance
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

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
                    </div>
                )}

                {(tab === 'take' || tab === 'view') && (
                    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white md:rounded-3xl">
                        {tab === 'view' && viewSession && (
                            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTab('history');
                                        setViewSession(null);
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-600"
                                >
                                    <ArrowLeft size={16} /> Back to list
                                </button>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-bold text-re-text">{viewSession.roll_label}</p>
                                    <p className="text-xs text-slate-500">
                                        {viewSession.class_name} · {viewSession.date} ·{' '}
                                        {viewSession.teacher_name || 'Teacher'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 md:grid-cols-4">
                            {[
                                { label: 'Class size', value: stats.total, icon: <Users size={14} className="text-re-orange/70" /> },
                                { label: 'Present', value: stats.present, icon: <CheckCircle size={14} className="text-emerald-500/80" /> },
                                { label: 'Absent', value: stats.absent, icon: <XCircle size={14} className="text-red-500/80" /> },
                                { label: 'Excused', value: stats.excused, icon: <FileText size={14} className="text-blue-500/80" /> },
                            ].map((s, i) => (
                                <div key={i} className="flex flex-col items-center justify-center px-2 py-4 text-center sm:p-6">
                                    <div className="mb-1 opacity-90">{s.icon}</div>
                                    <div className="text-2xl font-black tabular-nums text-re-text">{s.value}</div>
                                    <div className="mt-0.5 text-[8px] font-black uppercase tracking-[0.18em] text-re-text-muted">
                                        {s.label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {tab === 'take' && (
                            <div className="space-y-3 border-b border-slate-100 bg-slate-50/40 p-4 md:p-5">
                                {readOnly && (
                                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-900">
                                        This roll was saved by another teacher (view only). Choose a different roll name to
                                        create your own.
                                    </p>
                                )}
                                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12 lg:items-end lg:gap-4">
                                    <label className="block lg:col-span-4">
                                        <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-re-text-muted">
                                            <Tag size={12} className="text-re-orange" />
                                            Roll name <span className="text-red-500">*</span>
                                        </span>
                                        <input
                                            type="text"
                                            value={rollName}
                                            onChange={(e) => setRollName(e.target.value)}
                                            placeholder="e.g. Morning Prep, Registration"
                                            maxLength={160}
                                            disabled={readOnly}
                                            className={flatInput}
                                        />
                                    </label>
                                    <div className="relative lg:col-span-3">
                                        <Users
                                            size={14}
                                            className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-re-text-muted"
                                        />
                                        <select
                                            value={selectedClass}
                                            onChange={(e) => setSelectedClass(e.target.value)}
                                            disabled={readOnly}
                                            className={flatSelect}
                                        >
                                            <option value="">Choose class</option>
                                            {classes.map((c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 lg:col-span-5">
                                        <button
                                            type="button"
                                            onClick={() => shiftDateByDays(-1)}
                                            disabled={readOnly}
                                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-re-orange md:h-10 md:w-10"
                                            aria-label="Previous day"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <div className="relative min-w-0 flex-1">
                                            <Calendar
                                                size={14}
                                                className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-re-text-muted"
                                            />
                                            <input
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                disabled={readOnly}
                                                className={`${flatInput} !pl-11 font-bold`}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => shiftDateByDays(1)}
                                            disabled={readOnly}
                                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-re-orange md:h-10 md:w-10"
                                            aria-label="Next day"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>

                                {sessions.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        <span className="w-full text-[9px] font-black uppercase tracking-widest text-re-text-muted md:w-auto md:shrink-0 md:py-1.5">
                                            Saved rolls this day
                                        </span>
                                        {sessions.map((s) => (
                                            <button
                                                key={`${s.roll_label}-${s.log_id}`}
                                                type="button"
                                                onClick={() => pickSession(s.roll_label)}
                                                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                                                    normalizeRollLabel(rollName) === normalizeRollLabel(s.roll_label)
                                                        ? 'border-re-orange bg-orange-50 text-re-orange'
                                                        : 'border-slate-200 bg-white text-re-text'
                                                }`}
                                            >
                                                {s.roll_label || '(unnamed)'}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={readOnly || !canLoadRoster || !roster.length || loading}
                                    className="hidden w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-re-grad-orange text-[11px] font-black uppercase tracking-[0.15em] text-white disabled:opacity-45 md:inline-flex md:min-h-0 md:w-auto md:px-6 md:py-2.5"
                                >
                                    <CheckSquare size={18} /> Save roll
                                </button>
                            </div>
                        )}

                        <div className="relative border-b border-slate-100 px-4 py-3">
                            <Search
                                size={14}
                                className="pointer-events-none absolute left-7 top-1/2 z-[1] -translate-y-1/2 text-re-text-muted/60"
                            />
                            <input
                                type="text"
                                placeholder="Search learner…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`${flatInput} !pl-10`}
                            />
                        </div>

                        {tab === 'take' && selectedClass && canLoadRoster && !readOnly && (
                            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-re-text-muted">Bulk</span>
                                {['present', 'absent', 'excused'].map((st) => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => handleMarkAll(st)}
                                        className="min-h-[40px] rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700"
                                    >
                                        All {st}
                                    </button>
                                ))}
                            </div>
                        )}

                        <RosterPanels
                            loading={loading && (canLoadRoster || tab === 'view')}
                            selectedClass={tab === 'view' ? viewSession?.class_name : selectedClass}
                            canLoadRoster={tab === 'view' ? Boolean(viewSession) : canLoadRoster}
                            filtered={filtered}
                            roster={activeRoster}
                            readOnly={rosterReadOnly}
                            onStatusChange={handleStatusChange}
                            setRoster={setRoster}
                        />
                    </div>
                )}
            </div>

            {tab === 'take' && !readOnly && (
                <div className="fixed bottom-[4.5rem] left-0 right-0 z-[85] border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canLoadRoster || !roster.length || loading}
                        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-re-grad-orange text-[11px] font-black uppercase tracking-[0.2em] text-white disabled:opacity-45"
                    >
                        <CheckSquare size={20} /> Save roll
                    </button>
                </div>
            )}
        </div>
    );
}

function RosterPanels({ loading, selectedClass, canLoadRoster, filtered, roster, readOnly, onStatusChange, setRoster }) {
    return (
        <>
            <div className="md:hidden">
                {loading ? (
                    <div className="flex flex-col items-center gap-3 py-16">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-re-orange border-t-transparent" />
                    </div>
                ) : !selectedClass || !canLoadRoster ? (
                    <p className="py-14 text-center text-sm font-semibold text-re-text-muted">
                        {canLoadRoster ? 'Choose a class and roll name.' : 'Select a roll to view learners.'}
                    </p>
                ) : filtered.length === 0 ? (
                    <p className="py-14 text-center text-sm font-semibold text-re-text-muted">No learners to show.</p>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {filtered.map((student, idx) => (
                            <li key={student.id} className="bg-white px-4 py-4">
                                <div className="flex gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
                                        <User size={18} className="text-slate-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-[10px] font-black text-slate-400">#{idx + 1}</span>
                                            <span className="font-mono text-[10px] font-bold text-slate-500">{student.adm}</span>
                                        </div>
                                        <p className="mt-0.5 text-[14px] font-black leading-snug text-re-text">{student.name}</p>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    <RoundStatusBtn
                                        active={student.status === 'present'}
                                        onClick={() => onStatusChange(student.id, 'present')}
                                        base="emerald"
                                        icon={<Check size={16} strokeWidth={3} />}
                                        label="Present"
                                        showLabel
                                        disabled={readOnly}
                                    />
                                    <RoundStatusBtn
                                        active={student.status === 'absent'}
                                        onClick={() => onStatusChange(student.id, 'absent')}
                                        base="red"
                                        icon={<X size={16} strokeWidth={3} />}
                                        label="Absent"
                                        showLabel
                                        disabled={readOnly}
                                    />
                                    <RoundStatusBtn
                                        active={student.status === 'excused'}
                                        onClick={() => onStatusChange(student.id, 'excused')}
                                        base="blue"
                                        icon={<FileText size={15} />}
                                        label="Excused"
                                        showLabel
                                        disabled={readOnly}
                                    />
                                </div>
                                {!readOnly && (
                                    <input
                                        type="text"
                                        value={student.remarks || ''}
                                        onChange={(e) =>
                                            setRoster((prev) =>
                                                prev.map((row) =>
                                                    row.id === student.id ? { ...row, remarks: e.target.value } : row
                                                )
                                            )
                                        }
                                        placeholder="Remarks (optional)"
                                        className={`${flatInput} mt-3 text-[13px]`}
                                    />
                                )}
                                {readOnly && student.remarks ? (
                                    <p className="mt-2 text-xs text-slate-500">Remarks: {student.remarks}</p>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] border-collapse text-left">
                    <thead>
                        <tr>
                            <th className="w-11 border-b border-r border-slate-100 bg-slate-50/80 px-2 py-3 text-center text-[9px] font-black uppercase tracking-widest text-re-text-muted">
                                #
                            </th>
                            <th className="hidden border-b border-r border-slate-100 bg-slate-50/80 px-3 py-3 text-left text-[9px] font-black uppercase tracking-widest text-re-text-muted sm:table-cell">
                                ID
                            </th>
                            <th className="border-b border-r border-slate-100 bg-slate-50/80 px-3 py-3 text-left text-[9px] font-black uppercase tracking-widest text-re-text-muted">
                                Student
                            </th>
                            <th className="min-w-[260px] border-b border-slate-100 bg-slate-50/80 px-3 py-3 text-center text-[9px] font-black uppercase tracking-widest text-re-text-muted">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="p-12 text-center">
                                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-re-orange border-t-transparent" />
                                </td>
                            </tr>
                        ) : !selectedClass || !canLoadRoster ? (
                            <tr>
                                <td colSpan={4} className="p-10 text-center text-sm font-bold text-re-text-muted">
                                    No roster loaded.
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-10 text-center text-sm font-bold text-re-text-muted">
                                    No matches.
                                </td>
                            </tr>
                        ) : (
                            filtered.map((student, idx) => (
                                <tr key={student.id} className="hover:bg-slate-50/50">
                                    <td className="border-r border-b border-slate-100 px-2 py-3 text-center text-[11px] font-black text-slate-300">
                                        {idx + 1}
                                    </td>
                                    <td className="hidden border-r border-b border-slate-100 px-3 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 sm:table-cell">
                                        {student.adm}
                                    </td>
                                    <td className="border-r border-b border-slate-100 px-2 py-3 align-middle">
                                        <p className="truncate text-[12px] font-black text-re-text">{student.name}</p>
                                        <p className="font-mono text-[9px] font-bold text-re-text-muted sm:hidden">{student.adm}</p>
                                    </td>
                                    <td className="border-b border-slate-100 px-2 py-2">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex flex-wrap items-center justify-center gap-2">
                                                <RoundStatusBtn
                                                    active={student.status === 'present'}
                                                    onClick={() => onStatusChange(student.id, 'present')}
                                                    base="emerald"
                                                    icon={<Check size={14} strokeWidth={3} />}
                                                    label="Present"
                                                    disabled={readOnly}
                                                />
                                                <RoundStatusBtn
                                                    active={student.status === 'absent'}
                                                    onClick={() => onStatusChange(student.id, 'absent')}
                                                    base="red"
                                                    icon={<X size={14} strokeWidth={3} />}
                                                    label="Absent"
                                                    disabled={readOnly}
                                                />
                                                <RoundStatusBtn
                                                    active={student.status === 'excused'}
                                                    onClick={() => onStatusChange(student.id, 'excused')}
                                                    base="blue"
                                                    icon={<FileText size={13} />}
                                                    label="Excused"
                                                    disabled={readOnly}
                                                />
                                            </div>
                                            {!readOnly ? (
                                                <input
                                                    type="text"
                                                    value={student.remarks || ''}
                                                    onChange={(e) =>
                                                        setRoster((prev) =>
                                                            prev.map((row) =>
                                                                row.id === student.id
                                                                    ? { ...row, remarks: e.target.value }
                                                                    : row
                                                            )
                                                        )
                                                    }
                                                    placeholder="Remarks"
                                                    className="h-9 w-full rounded-lg border border-slate-200 px-2 text-[11px]"
                                                />
                                            ) : student.remarks ? (
                                                <p className="text-center text-[11px] text-slate-500">{student.remarks}</p>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}

function RoundStatusBtn({ active, onClick, base, icon, label, showLabel, disabled }) {
    const themes = {
        emerald: {
            on: 'border-emerald-600 bg-emerald-500 text-white',
            off: 'border-emerald-200 bg-white text-emerald-700',
        },
        red: {
            on: 'border-red-600 bg-red-500 text-white',
            off: 'border-red-200 bg-white text-red-700',
        },
        blue: {
            on: 'border-blue-600 bg-blue-500 text-white',
            off: 'border-blue-200 bg-white text-blue-700',
        },
    };
    const t = themes[base];
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={label}
            aria-label={label}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 py-2.5 text-[9px] font-black uppercase tracking-wide transition-all sm:flex-row sm:gap-1 sm:py-1.5 sm:text-[8px] disabled:opacity-50 ${
                showLabel ? 'min-h-[72px] flex-1 sm:min-h-0' : 'min-h-[40px] min-w-[40px] px-2 sm:min-h-0'
            } ${active ? t.on : t.off}`}
        >
            {icon}
            <span className={showLabel ? 'leading-tight' : 'hidden sm:inline'}>{label}</span>
        </button>
    );
}
