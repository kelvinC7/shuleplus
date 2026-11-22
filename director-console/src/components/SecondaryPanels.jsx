import { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { GUARDS } from '../data/guards';
import { BUSES } from '../data/buses';
import { DET } from '../data/details';
import { BusMap } from './BusMap';
import { useAuth } from '../auth/AuthContext';
import { iam } from '../lib/api/iam';
import { director } from '../lib/api/director';
import { useData } from '../auth/DataContext';
import { openModuleInErp } from '../lib/moduleLaunch';

/* ---------- Notifications ---------- */
export function NotificationsPanel({ onClose, onAction, showToast }) {
  const { token } = useAuth();
  const [nf, setNf] = useState('All');
  const [items, setItems] = useState([]);
  const cats = ['All', 'Unread', 'Security', 'Finance', 'Academic'];
  const colors = { red: ['#FEE2E2', '#DC2626'], amber: ['#FEF3C7', '#D97706'], green: ['#DCFCE7', '#16A34A'], navy: ['#E0E7FF', '#1E3A8A'] };

  useEffect(() => {
    if (!token) { setItems([]); return; }
    let on = true;
    iam.notifications(token).then((data) => {
      if (!on) return;
      const arr = Array.isArray(data) ? data : data?.items || data?.notifications || data?.rows || [];
      const mapped = arr.map((n) => {
        const cat = n.category || n.module || n.type || 'General';
        const unread = n.read === false || n.isRead === false || n.unread === true || n.status === 'UNREAD';
        const sev = String(n.severity || n.level || n.priority || '').toLowerCase();
        const color = /critical|high|error|danger|red/.test(sev) ? 'red' : /warn|medium|amber/.test(sev) ? 'amber' : /success|green/.test(sev) ? 'green' : 'navy';
        const when = n.createdAt || n.timestamp || n.time || n.date || '';
        const time = when ? new Date(when).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : (n.relativeTime || '');
        return ['Recent', cat, color, n.icon || 'bell', n.title || n.subject || 'Notification', n.body || n.message || n.description || '', time, n.actionLabel || n.cta || '', n.action || n.actionUrl || '', unread ? 1 : 0, n.id || n._id];
      });
      setItems(mapped);
    }).catch(() => { if (on) setItems([]); });
    return () => { on = false; };
  }, [token]);

  const source = items || [];
  const list = source.filter((n) => {
    if (nf === 'All') return true;
    if (nf === 'Unread') return n[9];
    return n[1] === nf;
  });
  let g = '';
  return (
    <>
      <div className="grab" />
      <h3>Notifications</h3>
      <div className="ntabs">
        {cats.map((c) => (
          <button key={c} className={nf === c ? 'on' : ''} onClick={() => setNf(c)}>{c}</button>
        ))}
      </div>
      <div>
        {list.map((n, i) => {
          const showG = n[0] !== g;
          if (showG) g = n[0];
          const [bg, fg] = colors[n[2]] || colors.navy;
          return (
            <div key={i}>
              {showG && <div className="ngrp">{g}</div>}
              <div
                className={`ni ${n[9] ? 'unread' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  showToast(n[4]);
                  if (n[10] && token) iam.markRead(token, n[10]).catch(() => {});
                  if (String(n[8] || '').includes("go('live')")) onAction?.('live');
                  if (String(n[8] || '').includes("go('approve')")) onAction?.('approve');
                  onClose();
                }}
              >
                <div className="av" style={{ background: bg, color: fg, fontSize: 11, fontWeight: 700 }}>{String(n[1] || '').slice(0, 1)}</div>
                <div className="t">
                  <b>{n[4]}</b>
                  <p>{n[5]}</p>
                  <small>{n[1]} · {n[6]}</small>
                  {n[7] && <span className="cta">{n[7]}</span>}
                </div>
              </div>
            </div>
          );
        })}
        {!list.length && <p style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>No notifications.</p>}
      </div>
    </>
  );
}

/* ---------- Buses ---------- */
export function BusesPanel({ onClose, showToast }) {
  return (
    <>
      <div className="grab" />
      <h3>Buses on route</h3>
      <p className="lead">{BUSES.length} buses · {BUSES.filter((b) => b.st === 'route' || b.st === 'late').length} on route · students travelling</p>
      <div style={{ marginBottom: 12 }}>
        <BusMap height={200} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {BUSES.map((b) => (
          <div key={b.n} className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b>Bus {b.n} · {b.route}</b>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{b.plate} · {b.on}/{b.cap} on board</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Driver {b.drv?.[0]} · {b.drv?.[1]}
                </div>
              </div>
              <span className={`chip ${b.st === 'late' ? 'amber' : b.st === 'route' ? 'green' : 'navy'}`}>
                {b.st === 'late' ? 'Late' : b.st === 'route' ? 'On route' : b.st || 'OK'}
              </span>
            </div>
            <div style={{ marginTop: 8, height: 4, background: '#EEF0F4', borderRadius: 2 }}>
              <i style={{ display: 'block', height: '100%', width: `${Math.round((b.t || 0.5) * 100)}%`, background: 'var(--amber)', borderRadius: 2 }} />
            </div>
            <button className="chip navy" style={{ marginTop: 8, border: 'none' }} onClick={() => showToast(`Tracking Bus ${b.n}`)}>
              Track
            </button>
          </div>
        ))}
      </div>
      <button className="bigbtn amber" style={{ marginTop: 12 }} onClick={() => showToast('Delay alert sent to Bus 2 parents')}>Alert Bus 2 parents</button>
      <button className="bigbtn ghost" style={{ marginTop: 8 }} onClick={onClose}>Close</button>
    </>
  );
}

/* ---------- Guards ---------- */
export function GuardsPanel({ onClose, showToast, onOpenCam }) {
  return (
    <>
      <div className="grab" />
      <h3>Guard directory</h3>
      <p className="lead">{GUARDS.filter((g) => g.on).length} guards on duty · each linked to cameras of their area</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {GUARDS.map((g) => (
          <div key={g.id} className="card" style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="pic" style={{ width: 40, height: 40, borderRadius: 12, background: g.on ? 'var(--amber)' : '#e5e7eb', color: 'var(--navy)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
              {g.n.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 13 }}>{g.n}</b>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{g.post}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{g.shift}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <a href={`tel:${g.ph}`} className="chip navy" style={{ textDecoration: 'none' }}>Call</a>
              {g.cams?.[0] && (
                <button className="chip green" style={{ border: 'none' }} onClick={() => { onClose(); onOpenCam?.(g.cams[0]); }}>
                  Cam
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- Detail (attendance / fees / budget / academics) ---------- */
const DET_STATIC = {
  attendance: {
    title: 'Attendance',
    sub: 'Term 3 · Week 8 · students and staff',
    kpis: [
      ['95.1%', 'Student average', '▲ 1.4 pts vs Term 2'],
      ['93.5%', 'Staff average', '▼ 0.6 pts'],
      ['18', 'Late at gate today', '▼ 7 vs Monday'],
      ['7', 'Chronic absentees', 'Over 10% absence'],
    ],
  },
  academics: {
    title: 'Academics',
    sub: 'Mid-term · Term 3',
    kpis: [
      ['64.8%', 'School mean', '▲ 1.2 pts'],
      ['92%', 'Marks entered', ''],
      ['S3', 'Below target', '57.9% mean'],
      ['3', 'Students to watch', 'AI flags'],
    ],
  },
  fees: {
    title: 'School Fees',
    sub: 'Term 3 collection',
    kpis: [
      ['78%', 'Collected', ''],
      ['4.26M', 'Today RWF', ''],
      ['74', 'Families with balance', ''],
      ['MTN MoMo', 'Top channel', ''],
    ],
  },
  budget: {
    title: 'School Budget',
    sub: 'Term 3 vs plan',
    kpis: [
      ['71%', 'Of term budget used', ''],
      ['1', 'Line over plan', 'Boarding & food'],
      ['53.4M', 'Boarding spent', 'of 49.6M'],
      ['Within', 'Other lines', ''],
    ],
  },
};

export function DetailPanel({ kind, onClose, showToast }) {
  const d = DET_STATIC[kind] || { title: kind, sub: '', kpis: [] };
  const extra = {
    attendance: [
      ['Mon', '94.2%'], ['Tue', '95.8%'], ['Wed', '94.9%'], ['Thu', '96.1%'], ['Fri', '93.4%'], ['Today', '95.5%'],
    ],
    academics: [
      ['S1', '66.1%'], ['S2', '63.4%'], ['S3', '57.9%'], ['S4', '65.2%'], ['S5', '68.7%'], ['S6', '71.3%'],
    ],
    fees: [
      ['MTN MoMo', '62%'], ['Bank of Kigali', '28%'], ['Cash office', '10%'],
    ],
    budget: [
      ['Teaching materials', '62%'], ['Boarding & food', '100% over'], ['Staff welfare', '58%'], ['Maintenance', '47%'], ['Sports', '34%'],
    ],
  }[kind] || [];
  return (
    <>
      <div className="grab" />
      <h3>{d.title}</h3>
      <p className="lead">{d.sub}</p>
      <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {d.kpis.map(([a, b, c]) => (
          <div key={b} className="card kpi">
            <div className="num">{a}</div>
            <div className="sub">{b}</div>
            {c && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c}</div>}
          </div>
        ))}
      </div>
      {extra.length > 0 && (
        <div className="card" style={{ marginTop: 12, padding: 12 }}>
          <b style={{ fontSize: 13 }}>Breakdown</b>
          {extra.map(([a, b]) => (
            <div key={a} className="hbar" style={{ marginTop: 8 }}>
              <div className="r"><span>{a}</span><span>{b}</span></div>
              <div className="t"><i style={{ width: `${parseFloat(b) || 50}%` }} /></div>
            </div>
          ))}
        </div>
      )}
      <button className="bigbtn amber" style={{ marginTop: 16 }} onClick={() => { showToast(`${d.title} report exported as PDF`); onClose(); }}>
        Export PDF
      </button>
    </>
  );
}

/* ---------- Quick look (Console modules) ---------- */
function StudentManagementQuickLook({ onClose, showToast }) {
  const { branches, selectedOrgId, overview, context, loading } = useData();
  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const s = overview?.summary || {};
  const att = overview?.attendance?.summary || {};
  const perf = (overview?.schoolPerformance || [])[0] || {};
  const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');

  const students = s.totalStudents ?? school?.stu ?? 0;
  const staff = s.totalStaff ?? school?.staff ?? 0;
  const attendance = att.studentRate ?? s.averageAttendance ?? perf.attendanceRate ?? 0;
  const health = s.healthScore ?? school?.health ?? 0;

  return (
    <>
      <div className="grab" />
      <h3>Student Management</h3>
      <p className="lead">{loading ? 'Loading live data…' : `${school?.sh || school?.name || context?.user?.name || 'School'} · live from overview`}</p>
      <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
        <div className="card kpi"><div className="num">{fmt(students)}</div><div className="sub">Enrolled students</div></div>
        <div className="card kpi"><div className="num">{fmt(staff)}</div><div className="sub">Staff</div></div>
        <div className="card kpi"><div className="num">{attendance}%</div><div className="sub">Student attendance</div></div>
        <div className="card kpi"><div className="num">{fmt(health)}</div><div className="sub">Health score</div></div>
      </div>
      {perf && (perf.academicScore != null) && (
        <div className="card chartcard" style={{ marginBottom: 12 }}>
          <div className="row"><h4>School performance</h4><span className="chip navy">Overview</span></div>
          <div style={{ marginTop: 8 }}>
            {[['Academic score', perf.academicScore], ['Pass rate', perf.passRate], ['Attendance rate', perf.attendanceRate]].map(([label, val]) => (
              <div key={label} className="hbar">
                <div className="r"><span>{label}</span><span>{val ?? 0}%</span></div>
                <div className="t"><i style={{ width: `${Math.min(100, Number(val) || 0)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!overview && !loading && (
        <div className="card" style={{ padding: 12, marginBottom: 12, fontSize: 13, color: 'var(--muted)' }}>
          No overview data available for this school yet.
        </div>
      )}
      <ErpOpenButton name="Student Management" onClose={onClose} showToast={showToast} />
    </>
  );
}

function AcademicQuickLook({ onClose, showToast }) {
  const { token } = useAuth();
  const { branches, selectedOrgId, context, loading } = useData();
  const [acad, setAcad] = useState(null);
  const [acadLoading, setAcadLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let on = true;
    (async () => {
      setAcadLoading(true);
      try {
        const tries = [
          { organizationId: selectedOrgId },
          { organizationId: 'all' },
          {},
        ];
        let found = null;
        for (const p of tries) {
          try {
            const res = await director.academics(token, p).catch(() => null);
            if (!on) return;
            if (res) found = res;
            const rows = extractAcadRows(res);
            if (rows.length) { setAcad(res); return; }
          } catch {}
        }
        if (on) setAcad(found);
      } finally { if (on) setAcadLoading(false); }
    })();
    return () => { on = false; };
  }, [token, selectedOrgId]);

  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;

  const rows = extractAcadRows(acad);
  const sum = acad?.summary || {};
  const atRisk = Array.isArray(acad?.bySchool)
    ? acad.bySchool.reduce((a, b) => a + (Number(b.atRiskStudents) || 0), 0)
    : (sum.atRiskLearners ?? acad?.atRiskLearners);
  const watchlist = Array.isArray(acad?.watchlist) ? acad.watchlist : Array.isArray(acad?.learnerWatchlist) ? acad.learnerWatchlist : [];

  return (
    <Shell title="Academic" lead={`${sName(school, context)} · live`} loading={loading || acadLoading} onClose={onClose} showToast={showToast}>
      <KpiGrid items={[
        { value: sum.averageMarks != null ? `${fmtN(sum.averageMarks)}%` : '—', label: 'Average marks' },
        { value: sum.passRate != null ? `${fmtN(sum.passRate)}%` : '—', label: 'Pass rate' },
        { value: sum.examsPending != null ? fmtN(sum.examsPending) : '—', label: 'Exams pending' },
        { value: atRisk != null ? fmtN(atRisk) : '—', label: 'At-risk learners' },
      ]} />
      {rows.length > 0 ? (
        <HBarChart title="Performance by class" chip="Live" rows={rows} />
      ) : (!acadLoading && <Empty text="No class performance data available." />)}
      {watchlist.length > 0 && (
        <div className="card" style={{ marginBottom: 12, padding: 12 }}>
          <div className="row" style={{ marginBottom: 8 }}><h4>Learner watchlist</h4><span className="chip navy">{watchlist.length}</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {watchlist.slice(0, 8).map((w, i) => {
              const sev = String(w.severity || '').toLowerCase();
              const tone = sev === 'urgent' || sev === 'high' || sev === 'critical' ? 'red' : sev === 'warning' || sev === 'medium' ? 'amber' : 'navy';
              return (
                <div key={w.id || i} style={{ padding: 10, border: '1px solid #eef2f7', borderRadius: 10, borderLeft: `3px solid var(--${tone})` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontSize: 13 }}>{w.name || 'Learner'}</b>
                    {w.severity ? <span className={`chip ${tone}`}>{w.severity}</span> : null}
                  </div>
                  {w.detail ? <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{w.detail}</div> : null}
                  {w.action ? <div style={{ fontSize: 12, marginTop: 4 }}><b>Action:</b> {w.action}</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Shell>
  );
}

function extractAcadRows(acad) {
  if (!acad) return [];
  const asArr = (v) => Array.isArray(v) ? v : null;
  let arr = asArr(acad);
  if (!arr && typeof acad === 'object') {
    const keys = ['byClass', 'classes', 'performanceByClass', 'rows', 'byLevel', 'levels', 'bySchool', 'subjects', 'performance', 'items', 'data', 'results', 'schools'];
    for (const k of keys) { if (asArr(acad[k])) { arr = acad[k]; break; } }
    if (!arr) {
      const nests = [acad.data, acad.result, acad.academics, acad.payload, acad.report].filter(v => v && typeof v === 'object');
      for (const n of nests) {
        if (asArr(n)) { arr = n; break; }
        for (const k of keys) { if (asArr(n[k])) { arr = n[k]; break; } }
        if (arr) break;
      }
    }
    if (!arr) {
      for (const v of Object.values(acad)) { if (asArr(v) && v.length && typeof v[0] === 'object') { arr = v; break; } }
    }
  }
  if (!arr) return [];
  return arr.map((r) => {
    if (!r || typeof r !== 'object') return null;
    const label = r.className || r.class || r.name || r.label || r.level || r.subject || r.schoolName || r.organizationName || r.branch || r.group || '';
    const valRaw = r.average ?? r.academicScore ?? r.averageMarks ?? r.score ?? r.mean ?? r.passRate ?? r.rate ?? r.value ?? r.pct ?? r.percentage ?? r.mark;
    const val = Number(valRaw);
    if (!label) return null;
    return { label: String(label), value: Number.isFinite(val) ? val : 0, right: Number.isFinite(val) ? `${Math.round(val * 10) / 10}%` : '—' };
  }).filter(Boolean);
}

function TimetableQuickLook({ onClose, showToast }) {
  const { token } = useAuth();
  const { branches, selectedOrgId, overview, context, loading } = useData();
  const [tt, setTt] = useState(null);
  const [ttLoading, setTtLoading] = useState(false);

  useEffect(() => {
    if (!token || !selectedOrgId) return;
    let on = true;
    (async () => {
      setTtLoading(true);
      try {
        const data = await director.timetable(token, { organizationId: selectedOrgId }).catch(() => null);
        if (on) setTt(data);
      } finally { if (on) setTtLoading(false); }
    })();
    return () => { on = false; };
  }, [token, selectedOrgId]);

  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const t = overview?.teaching || {};
  const teaching = Number(t.teaching ?? 0);
  const sessions = Number(t.sessions ?? 0);
  const cover = Number(t.cover ?? 0);
  const gaps = Number(t.gaps ?? 0);
  const pct = sessions ? Math.round((teaching / sessions) * 100) : null;

  const sum = tt?.summary || {};
  const entries = Array.isArray(tt?.entries) ? tt.entries : Array.isArray(tt) ? tt : [];
  const totalLessons = sum.entries ?? entries.length;
  const classCount = sum.classes ?? new Set(entries.map(e => e.className || e.classId)).size;
  const teacherCount = sum.teachers ?? new Set(entries.map(e => e.teacherId || e.teacher)).size;

  const DAY_ORDER = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
  const dayKey = (d) => String(d || '').toUpperCase();
  const days = Array.isArray(tt?.days) && tt.days.length ? tt.days : [...new Set(entries.map(e => dayKey(e.day || e.dayOfWeek)))].filter(Boolean).sort((a,b) => (DAY_ORDER.indexOf(a)+1 || 99) - (DAY_ORDER.indexOf(b)+1 || 99));
  const normTime = (v) => { if (!v) return ''; const s = String(v); return s.length >= 5 ? s.slice(0,5) : s; };
  const slotTimes = Array.isArray(tt?.slots) && tt.slots.length
    ? tt.slots.map(s => ({ start: normTime(s.start || s.startTime), end: normTime(s.end || s.endTime) }))
    : [...new Set(entries.map(e => `${normTime(e.startTime)}|${normTime(e.endTime)}`))].filter(x => x !== '|').sort().map(x => { const [start,end]=x.split('|'); return {start,end}; });

  const cellsFor = (day, start) => entries.filter(e => dayKey(e.day || e.dayOfWeek) === dayKey(day) && normTime(e.startTime) === normTime(start));
  const tones = ['#e6f7f2','#e8f1ff','#fff7e6','#f3e8ff','#ffe8ed','#e6fbff'];
  const toneFor = (s) => { let h=0; const str=String(s||''); for (let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))>>>0; return tones[h%tones.length]; };
  const showGrid = entries.length > 0 && (days.length > 0 || slotTimes.length > 0);
  const gridDays = days.length ? days : ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY'];

  return (
    <>
      <div className="grab" />
      <h3>Timetable &amp; Lessons</h3>
      <p className="lead">{(loading || ttLoading) ? 'Loading live timetable…' : `${school?.sh || school?.name || context?.user?.name || 'School'} · ${t.period || 'Current period'} · live`}</p>
      <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
        <div className="card kpi"><div className="num">{teaching} / {sessions}</div><div className="sub">Teaching now</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{pct != null ? `${pct}% of sessions` : 'from overview'}</div></div>
        <div className="card kpi"><div className="num">{cover}</div><div className="sub">Cover lessons</div>{gaps ? <div className="chip red" style={{ marginTop: 4 }}>{gaps} gaps</div> : <div className="chip green" style={{ marginTop: 4 }}>Covered</div>}</div>
        <div className="card kpi"><div className="num">{totalLessons || '—'}</div><div className="sub">Lessons scheduled</div></div>
        <div className="card kpi"><div className="num">{classCount || '—'}</div><div className="sub">Classes</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>{teacherCount ? `${teacherCount} teachers` : ''}</div></div>
      </div>

      {showGrid ? (
        <div className="card chartcard" style={{ marginBottom: 12, padding: 10 }}>
          <div className="row" style={{ marginBottom: 8 }}><h4>Weekly timetable</h4><span className="chip navy">{totalLessons} lessons</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 520, borderCollapse: 'separate', borderSpacing: 0, fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 6px', color: 'var(--muted)', fontSize: 10, position: 'sticky', left: 0, background: '#fff' }}>Time</th>
                  {gridDays.map(d => <th key={d} style={{ textAlign: 'left', padding: '6px 4px', color: 'var(--muted)', fontSize: 10 }}>{String(d).slice(0,3)}</th>)}
                </tr>
              </thead>
              <tbody>
                {(slotTimes.length ? slotTimes : [{ start: '', end: '' }]).map((slot, si) => (
                  <tr key={slot.start || si}>
                    <td style={{ padding: '6px 6px', verticalAlign: 'top', whiteSpace: 'nowrap', fontWeight: 600, position: 'sticky', left: 0, background: '#fff', borderTop: '1px solid #f1f5f9' }}>
                      <div>{slot.start || '—'}</div><div style={{ color: 'var(--muted)', fontWeight: 500 }}>{slot.end || ''}</div>
                    </td>
                    {gridDays.map(day => {
                      const cells = slot.start ? cellsFor(day, slot.start) : entries.filter(e => dayKey(e.day || e.dayOfWeek) === dayKey(day));
                      const list = slot.start ? cells : (si === 0 ? cells : []);
                      return (
                        <td key={day} style={{ padding: 4, verticalAlign: 'top', borderTop: '1px solid #f1f5f9', minWidth: 86 }}>
                          {list.length ? list.slice(0, 2).map((e, i) => (
                            <div key={e.id || i} style={{ background: toneFor(e.subject || e.subjectName), borderRadius: 8, padding: '5px 6px', marginBottom: 3 }}>
                              <div style={{ fontWeight: 700, lineHeight: 1.2 }}>{e.subject || e.subjectName || 'Lesson'}</div>
                              <div style={{ color: 'var(--muted)' }}>{e.className || e.class || ''}</div>
                              <div style={{ color: 'var(--muted)' }}>{e.teacher || e.teacherName || ''}</div>
                            </div>
                          )) : <span style={{ color: '#cbd5e1' }}>—</span>}
                          {list.length > 2 && <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>+{list.length - 2} more</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !ttLoading && <div className="card" style={{ padding: 12, marginBottom: 12, fontSize: 13, color: 'var(--muted)' }}>
          {tt ? 'No timetable entries available to display as a grid.' : 'No timetable data available for this school yet.'}
        </div>
      )}

      <button className="bigbtn amber" onClick={() => { showToast('Open Timetable in Shule+ ERP'); onClose(); }}>
        Open in Shule+ ERP
      </button>
    </>
  );
}


function useDirectorModule(pathKey, altKeys = []) {
  const { token } = useAuth();
  const { selectedOrgId } = useData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!token || !selectedOrgId) return;
    let on = true;
    setLoading(true);
    const keys = [pathKey, ...(altKeys || [])].filter(Boolean);
    (async () => {
      for (const k of keys) {
        try {
          const fn = director[k];
          const res = fn ? await fn(token, { organizationId: selectedOrgId }) : await director.fetch(token, k, { organizationId: selectedOrgId });
          if (on) { setData(res ?? null); return; }
        } catch {}
      }
      if (on) setData(null);
    })().finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, [token, selectedOrgId, pathKey]);
  return { data, loading };
}
const sName = (school, context) => school?.sh || school?.name || context?.user?.name || 'School';
const fmtN = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return n == null || n === '' ? '�' : String(n);
  if (Math.abs(x) >= 1000) return Math.round(x).toLocaleString('en-US');
  return String(Math.round(x * 10) / 10).replace(/\.0$/, '');
};
const fmtMoney = (n) => {
  const x = Number(n); if (!Number.isFinite(x)) return '�';
  const a = Math.abs(x);
  if (a >= 1e9) return `RWF ${(x/1e9).toFixed(1)}B`;
  if (a >= 1e6) return `RWF ${(x/1e6).toFixed(1)}M`;
  if (a >= 1e3) return `RWF ${(x/1e3).toFixed(0)}K`;
  return `RWF ${Math.round(x)}`;
};
function ErpOpenButton({ name, onClose, showToast, style }) {
  const { token, session } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <button className="bigbtn amber" style={style} disabled={busy} onClick={async () => {
      setBusy(true);
      await openModuleInErp(name, { token, refreshToken: session?.refreshToken, showToast });
      setBusy(false);
    }}>
      {busy ? 'Opening…' : 'Open in Shule+ ERP'}
    </button>
  );
}
function Shell({ title, lead, loading, children, onClose, showToast }) {
  return (<>
    <div className="grab" />
    <h3>{title}</h3>
    <p className="lead">{loading ? 'Loading live data�' : (lead || 'Live')}</p>
    {children}
    <ErpOpenButton name={title} onClose={onClose} showToast={showToast} />
  </>);
}
function Empty({ text }) { return <div className="card" style={{ padding: 12, marginBottom: 12, fontSize: 13, color: 'var(--muted)' }}>{text}</div>; }
function KpiGrid({ items }) {
  const list = (items || []).filter(Boolean).slice(0, 6);
  if (!list.length) return null;
  return (
    <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 12 }}>
      {list.map((k, i) => (
        <div key={i} className="card kpi">
          <div className="num">{k.value ?? k[0] ?? '�'}</div>
          <div className="sub">{k.label ?? k[1]}</div>
          {k.chip ? <div className={`chip ${k.chip}`} style={{ marginTop: 4 }}>{k.hint || ''}</div>
            : (k.hint ?? k[2]) ? <div style={{ fontSize: 11, color: 'var(--muted)' }}>{k.hint ?? k[2]}</div> : null}
        </div>
      ))}
    </div>
  );
}
function HBarChart({ title, chip, rows }) {
  if (!rows?.length) return null;
  const max = Math.max(1, ...rows.map(r => Number(r.value) || 0));
  return (
    <div className="card chartcard" style={{ marginBottom: 12 }}>
      <div className="row"><h4>{title}</h4>{chip ? <span className="chip navy">{chip}</span> : null}</div>
      <div style={{ marginTop: 8 }}>
        {rows.slice(0, 8).map((r, i) => (
          <div key={i} className="hbar">
            <div className="r"><span>{r.label}</span><span>{r.right != null ? r.right : fmtN(r.value)}</span></div>
            <div className="t"><i style={{ width: `${Math.min(100, ((Number(r.value)||0)/max)*100)}%`, background: r.color ? `var(--${r.color})` : undefined }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
function AttnList({ items }) {
  const list = (items || []).filter(Boolean).slice(0, 6);
  if (!list.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
      {list.map((a, i) => {
        const sev = a.severity || a.level || a[0] || 'navy';
        const text = a.title || a.body || a.message || a.text || a[1] || '';
        return <div key={i} className="card" style={{ padding: 10, fontSize: 12 }}><span className={`chip ${sev}`}>{sev}</span> {text}{a.detail ? <div style={{ color: 'var(--muted)', marginTop: 2 }}>{a.detail}</div> : null}</div>;
      })}
    </div>
  );
}

function GenericLiveQuickLook({ name, path, alt = [], build, onClose, showToast }) {
  const { data, loading } = useDirectorModule(path, alt);
  const { branches, selectedOrgId, overview, context } = useData();
  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const b = build ? build({ data, overview, school, context }) : {};
  const hasLive = ((b.kpis || []).filter(Boolean).length) || b.chart || (b.attention || []).length || b.extra;
  return (
    <Shell title={name} lead={b.lead || `${sName(school, context)} � live`} loading={loading} onClose={onClose} showToast={showToast}>
      {hasLive ? (<>
        {b.kpis?.length ? <KpiGrid items={b.kpis} /> : null}
        {b.chart}
        {b.attention?.length ? <AttnList items={b.attention} /> : null}
        {b.extra}
      </>) : (!loading && <Empty text="No live data available for this module yet." />)}
    </Shell>
  );
}
function DisciplineQuickLook({ onClose, showToast }) {
  const { data, loading } = useDirectorModule('discipline');
  const { branches, selectedOrgId, context } = useData();
  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const sum = data?.summary || {};
  const cases = Array.isArray(data?.cases) ? data.cases : Array.isArray(data?.incidents) ? data.incidents : [];
  const positive = data?.positive || {};
  const has = data && typeof data === 'object';
  const kpis = [
    { value: fmtN(sum.open ?? 0), label: 'Open cases' },
    { value: fmtN(sum.resolvedThisTerm ?? 0), label: 'Resolved this term' },
    { value: fmtN(sum.serious ?? 0), label: 'Serious incidents', chip: Number(sum.serious) > 0 ? 'red' : null },
    { value: fmtN(sum.positiveNotes ?? positive.notesThisTerm ?? 0), label: 'Positive notes' },
  ];
  const fmtDate = (v) => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString(); };
  return (
    <Shell title="Discipline" lead={`${sName(school, context)} · live`} loading={loading} onClose={onClose} showToast={showToast}>
      {has ? (<>
        <KpiGrid items={kpis} />
        <div className="card chartcard" style={{ marginBottom: 12 }}>
          <div className="row"><h4>Conduct cases</h4><span className="chip navy">{cases.length} shown</span></div>
          {cases.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {cases.slice(0, 8).map((row, i) => (
                <div key={row.id || i} style={{ padding: '8px 0', borderTop: i ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                    <span className={`chip ${String(row.severity || 'amber').toLowerCase()}`}>{row.severity || 'case'}</span>
                    <b style={{ fontSize: 13 }}>{row.title || row.category || 'Case'}</b>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{[row.branch, row.category, row.status].filter(Boolean).join(' · ')}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{[row.owner, fmtDate(row.reportedAt)].filter(Boolean).join(' · ')}{row.id ? ` · ${row.id}` : ''}</div>
                </div>
              ))}
            </div>
          ) : <Empty text="No conduct cases." />}
        </div>
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <b style={{ fontSize: 13 }}>Positive behaviour</b>
          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>{fmtN(positive.notesThisTerm ?? sum.positiveNotes ?? 0)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>positive notes recorded</div>
          {Array.isArray(positive.topClasses) && positive.topClasses.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {positive.topClasses.map((klass, idx) => (
                <div key={klass || idx} style={{ fontSize: 12, padding: '6px 8px', background: '#f8fafc', borderRadius: 8 }}>{idx + 1}. {klass}</div>
              ))}
            </div>
          ) : null}
        </div>
      </>) : (!loading && <Empty text="No live data available for this module yet." />)}
    </Shell>
  );
}

function AttendanceQuickLook({ onClose, showToast }) {
  const { token } = useAuth();
  const { branches, selectedOrgId, context } = useData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !selectedOrgId) return;
    let on = true;
    const to = new Date();
    const from = new Date(); from.setDate(to.getDate() - 6);
    const iso = (d) => d.toISOString().slice(0, 10);
    (async () => {
      setLoading(true);
      try {
        const res = await director.attendanceReport(token, { organizationId: selectedOrgId, from: iso(from), to: iso(to) }).catch(() => null);
        if (on) setData(res);
      } finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [token, selectedOrgId]);

  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const k = data?.kpis || {};
  const daily = Array.isArray(data?.daily) ? data.daily : [];
  const byClass = Array.isArray(data?.byClass) ? data.byClass : [];
  const has = data && typeof data === 'object';
  const short = (iso) => { if (!iso) return ''; const d = new Date(`${iso}T00:00:00`); return isNaN(d) ? String(iso).slice(5) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); };

  return (
    <Shell title="Attendance" lead={`${sName(school, context)} · live attendance report`} loading={loading} onClose={onClose} showToast={showToast}>
      {has ? (<>
        <KpiGrid items={[
          { value: k.studentRate != null ? `${fmtN(k.studentRate)}%` : '—', label: 'Student attendance' },
          { value: k.staffRate != null ? `${fmtN(k.staffRate)}%` : '—', label: 'Staff attendance' },
          { value: (k.studentsPresent != null && k.studentsTotal != null) ? `${fmtN(k.studentsPresent)} / ${fmtN(k.studentsTotal)}` : '—', label: 'Students present' },
          { value: (k.staffPresent != null && k.staffTotal != null) ? `${fmtN(k.staffPresent)} / ${fmtN(k.staffTotal)}` : '—', label: 'Staff present' },
          k.late != null ? { value: fmtN(k.late), label: 'Late' } : null,
          k.absent != null ? { value: fmtN(k.absent), label: 'Absent' } : null,
        ].filter(Boolean)} />

        {daily.length > 0 && (
          <div className="card chartcard" style={{ marginBottom: 12 }}>
            <div className="row"><h4>Attendance trend</h4><span className="chip navy">Daily rate</span></div>
            <div style={{ height: 220, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily.map(d => ({ ...d, date: short(d.date), students: Number(d.studentRate ?? 0), staff: Number(d.staffRate ?? 0) }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, n) => [`${Number(v)}%`, n === 'students' ? 'Students' : 'Staff']} />
                  <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700 }} formatter={(v) => (v === 'students' ? 'Students' : 'Staff')} />
                  <Line type="monotone" dataKey="students" stroke="#13213D" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="staff" stroke="#FCB038" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {byClass.length > 0 && (
          <HBarChart title="By class" chip="Avg. rate" rows={byClass.map(c => ({
            label: c.className || c.klass || c.label || 'Class',
            value: Number(c.rate ?? c.attendanceRate ?? 0),
            right: `${fmtN(c.rate ?? c.attendanceRate ?? 0)}%`,
          }))} />
        )}

        {!daily.length && !byClass.length && !Object.keys(k).length && <Empty text="No attendance report data for this period." />}
      </>) : (!loading && <Empty text="No live data available for this module yet." />)}
    </Shell>
  );
}

function HrQuickLook({ onClose, showToast }) {
  const { token } = useAuth();
  const { branches, selectedOrgId, context, academicYear, term } = useData();
  const [hr, setHr] = useState(null);
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');

  useEffect(() => {
    if (!token) return;
    let on = true;
    const org = selectedOrgId || 'all';
    (async () => {
      setLoading(true);
      try {
        const params = { organizationId: org };
        if (academicYear) params.academicYear = academicYear;
        if (term) params.term = term;
        const res = await director.hr(token, params).catch(() => null);
        if (on) setHr(res);
      } finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [token, selectedOrgId, academicYear, term]);

  useEffect(() => {
    if (!token) return;
    let on = true;
    const org = selectedOrgId || 'all';
    (async () => {
      try {
        const params = { organizationId: org, page: 1, pageSize: 25 };
        if (search) params.search = search;
        if (dept) params.department = dept;
        const res = await director.staff(token, params).catch(() => null);
        if (on) setStaff(res);
      } catch { if (on) setStaff(null); }
    })();
    return () => { on = false; };
  }, [token, selectedOrgId, search, dept]);

  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const summary = hr?.summary || {};
  const bySchool = Array.isArray(hr?.bySchool) ? hr.bySchool : [];
  const leaves = Array.isArray(hr?.leaves) ? hr.leaves : [];
  const staffItems = Array.isArray(staff?.items) ? staff.items : Array.isArray(staff) ? staff : [];
  const depts = Array.isArray(staff?.filterOptions?.departments) ? staff.filterOptions.departments : [];
  const money = (n) => { const x = Number(n); if (!Number.isFinite(x)) return '—'; if (Math.abs(x)>=1e6) return `RWF ${(x/1e6).toFixed(1)}M`; if (Math.abs(x)>=1e3) return `RWF ${(x/1e3).toFixed(0)}K`; return `RWF ${Math.round(x)}`; };

  return (
    <Shell title="HR" lead={`${sName(school, context)} · live`} loading={loading} onClose={onClose} showToast={showToast}>
      <KpiGrid items={[
        { value: fmtN(summary.totalEmployees ?? 0), label: 'Total employees', hint: `${fmtN(summary.teachingStaff ?? 0)} teaching · ${fmtN(summary.supportStaff ?? 0)} support` },
        { value: summary.staffAttendanceRate != null ? `${fmtN(summary.staffAttendanceRate)}%` : '—', label: 'Staff attendance', hint: `${fmtN(summary.absentToday ?? 0)} absent today` },
        { value: fmtN(summary.onLeave ?? 0), label: 'On leave' },
        { value: money(summary.payrollTotal ?? 0), label: 'Monthly payroll', hint: hr?.payroll?.nextRun ? `next run ${hr.payroll.nextRun}` : '' },
      ]} />

      {bySchool.length > 0 && (
        <div className="card chartcard" style={{ marginBottom: 12 }}>
          <div className="row"><h4>Payroll & finance by school</h4></div>
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead><tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                <th style={{ padding: '6px 4px' }}>School</th><th style={{ padding: '6px 4px', textAlign:'right' }}>Collected</th><th style={{ padding: '6px 4px', textAlign:'right' }}>Outstanding</th><th style={{ padding: '6px 4px', textAlign:'right' }}>Payroll</th><th style={{ padding: '6px 4px', textAlign:'right' }}>Budget used</th>
              </tr></thead>
              <tbody>
                {bySchool.map((s, i) => (
                  <tr key={s.organizationId || i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 600 }}>{s.name || 'School'}</td>
                    <td style={{ padding: '8px 4px', textAlign:'right' }}>{money(s.feesCollected)}</td>
                    <td style={{ padding: '8px 4px', textAlign:'right', color: 'var(--red)' }}>{money(s.feesOutstanding)}</td>
                    <td style={{ padding: '8px 4px', textAlign:'right', fontWeight: 700 }}>{money(s.payrollTotal)}</td>
                    <td style={{ padding: '8px 4px', textAlign:'right', fontWeight: 700, color: Number(s.budgetUsedPct)>90 ? 'var(--red)' : undefined }}>{fmtN(s.budgetUsedPct)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="row" style={{ marginBottom: 8 }}><h4>Leave this week</h4><span className="chip navy">{leaves.length}</span></div>
        {leaves.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leaves.slice(0, 6).map((l, i) => (
              <div key={i} style={{ padding: 10, border: '1px solid #eef2f7', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><b style={{ fontSize: 13 }}>{l.name}</b><span className={`chip ${String(l.status||'').toLowerCase()==='approved'?'green':'amber'}`}>{l.status || 'leave'}</span></div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{l.role}</div>
                <div style={{ fontSize: 12 }}>{l.dates}{l.cover ? ` · covered by ${l.cover}` : ''}</div>
              </div>
            ))}
          </div>
        ) : <Empty text="No leave this week." />}
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="row" style={{ marginBottom: 8 }}><h4>Staff directory</h4><span className="chip navy">{staff?.pagination?.total ?? staffItems.length}</span></div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search name or staff code…" style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }} />
          {depts.length ? <select value={dept} onChange={(e)=>setDept(e.target.value)} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13 }}>
            <option value="">All depts</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select> : null}
        </div>
        {staffItems.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {staffItems.slice(0, 15).map((row, i) => (
              <div key={row.id || i} style={{ padding: '8px 0', borderTop: i ? '1px solid #f1f5f9' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div>
                    <b style={{ fontSize: 13 }}>{row.fullName || row.name}</b>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{[row.employeeCode, row.role, row.schoolName].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {row.attendanceToday ? <span className={`chip ${String(row.attendanceToday).toLowerCase()==='present'?'green':String(row.attendanceToday).toLowerCase()==='absent'?'red':'amber'}`}>{row.attendanceToday}</span> : null}
                    {row.attendanceRate != null ? <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fmtN(row.attendanceRate)}%</div> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty text="No staff records." />}
      </div>
    </Shell>
  );
}

function BudgetQuickLook({ onClose, showToast }) {
  const { token } = useAuth();
  const { branches, selectedOrgId, context } = useData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!token) return; let on = true;
    (async () => {
      setLoading(true);
      try {
        const org = selectedOrgId || 'all';
        let res = await director.budget(token, { organizationId: org }).catch(() => null);
        if (on && !res) res = await director.budget(token, { organizationId: 'all' }).catch(() => null);
        if (on) setData(res);
      } finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [token, selectedOrgId]);
  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const sum = data?.summary || {};
  const lines = Array.isArray(data?.lines) ? data.lines : [];
  const cash = Array.isArray(data?.cashFlow) ? data.cashFlow : [];
  const fmtFrw = (n, c) => { const x = Number(n); if (!Number.isFinite(x)) return '—'; const a = Math.abs(x); if (c) { if (a>=1e6) return `RWF ${(x/1e6).toFixed(1)}M`; if (a>=1e3) return `RWF ${(x/1e3).toFixed(0)}K`; } if (a>=1e6) return `RWF ${(x/1e6).toFixed(1)}M`; return `RWF ${Math.round(x).toLocaleString()}`; };
  const overLines = lines.filter(l => l.status && l.status !== 'ok');
  const voteChart = lines.map(l => ({ vote: String(l.vote||'').length>14 ? String(l.vote).slice(0,12)+'…' : (l.vote||'—'), planned: Number(l.planned)||0, actual: Number(l.actual)||0 }));
  return (
    <Shell title="School Budget" lead={`${sName(school, context)} · live`} loading={loading} onClose={onClose} showToast={showToast}>
      {data ? (<>
        <KpiGrid items={[
          { value: fmtFrw(sum.totalPlanned,1), label: 'Total planned' },
          { value: fmtFrw(sum.totalActual,1), label: 'Actual to date', hint: sum.utilizationPct!=null ? `${fmtN(sum.utilizationPct)}% used` : '' },
          { value: fmtFrw(sum.remaining,1), label: 'Remaining', chip: Number(sum.remaining)<0?'red':null },
          { value: fmtN(sum.overBudgetLines ?? overLines.length), label: 'Votes to watch', hint: data.pendingPurchaseOrders!=null?`+ ${fmtN(data.pendingPurchaseOrders)} pending PO`:'' },
        ]} />
        {voteChart.length > 0 && (
          <div className="card chartcard" style={{ marginBottom: 12 }}>
            <div className="row"><h4>Budget vs actual</h4><span className="chip navy">Vote lines</span></div>
            <div style={{ height: Math.max(220, voteChart.length * 36), marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={voteChart} layout="vertical" margin={{ top: 4, right: 12, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} tickFormatter={(v)=>`${Math.round(v/1e6)}M`} />
                  <YAxis type="category" dataKey="vote" width={90} tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v,n)=>[fmtFrw(v,1), n==='planned'?'Planned':'Actual']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="planned" name="Planned" fill="#e2e7f0" radius={[0,6,6,0]} maxBarSize={14} />
                  <Bar dataKey="actual" name="Actual" fill="#13213d" radius={[0,6,6,0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {cash.length > 0 && (
          <div className="card chartcard" style={{ marginBottom: 12 }}>
            <div className="row"><h4>Cash flow</h4><span className="chip navy">Monthly</span></div>
            <div style={{ height: 220, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cash} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="inflowG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#168a55" stopOpacity={0.35}/><stop offset="100%" stopColor="#168a55" stopOpacity={0.03}/></linearGradient>
                    <linearGradient id="outflowG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d64545" stopOpacity={0.3}/><stop offset="100%" stopColor="#d64545" stopOpacity={0.03}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} tickFormatter={(v)=>`${Math.round(v/1e6)}M`} />
                  <Tooltip formatter={(v,n)=>[fmtFrw(v,1), n==='inflow'?'Inflow':'Outflow']} />
                  <Area type="monotone" dataKey="inflow" stroke="#168a55" strokeWidth={2} fill="url(#inflowG)" />
                  <Area type="monotone" dataKey="outflow" stroke="#d64545" strokeWidth={2} fill="url(#outflowG)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {lines.length > 0 && (
          <div className="card" style={{ padding: 12, marginBottom: 12 }}>
            <div className="row" style={{ marginBottom: 8 }}><h4>Vote lines</h4><span className="chip navy">{fmtN(sum.utilizationPct)}% util.</span></div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {lines.slice(0,12).map((l,i)=>{ const pct = Math.min(100, Number(l.pct)||0); const st=l.status||'ok'; const col=st==='over'?'var(--red)':st==='watch'?'var(--amber)':'var(--green)'; return (
                <div key={l.vote||i}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, gap:8 }}><b>{l.vote}</b><span>{fmtFrw(l.actual,1)} / {fmtFrw(l.planned,1)} · {fmtN(pct)}%</span></div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{l.department}</div>
                  <div className="t" style={{ marginTop:4 }}><i style={{ width:`${pct}%`, background: col }} /></div>
                </div>
              ); })}
            </div>
          </div>
        )}
      </>) : (!loading && <Empty text="No live data available for this module yet." />)}
    </Shell>
  );
}

function FeesQuickLook({ onClose, showToast }) {
  const { token } = useAuth();
  const { branches, selectedOrgId, context, academicYear, term } = useData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!token) return; let on = true;
    (async () => {
      setLoading(true);
      try {
        const org = selectedOrgId || 'all';
        const params = { organizationId: org };
        if (academicYear) params.academicYear = academicYear; if (term) params.term = term;
        let res = await director.fees(token, params).catch(() => null);
        if (on && !res) res = await director.fees(token, { organizationId: 'all' }).catch(() => null);
        if (on) setData(res);
      } finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [token, selectedOrgId, academicYear, term]);
  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const sum = data?.summary || {}; const st = sum.studentStatus || {};
  const bySchool = Array.isArray(data?.bySchool) ? data.bySchool : [];
  const trend = Array.isArray(data?.collectionTrend) ? data.collectionTrend : [];
  const cats = Array.isArray(data?.collectionByCategory) ? data.collectionByCategory : [];
  const fmtFrw = (n, c) => { const x = Number(n); if (!Number.isFinite(x)) return '—'; const a = Math.abs(x); if (c) { if (a>=1e6) return `RWF ${(x/1e6).toFixed(1)}M`; if (a>=1e3) return `RWF ${(x/1e3).toFixed(0)}K`; } if (a>=1e6) return `RWF ${(x/1e6).toFixed(1)}M`; return `RWF ${Math.round(x).toLocaleString()}`; };
  const pie = [
    { name:'Paid in full', value: Number(st.paid)||0, color:'#168a55' },
    { name:'Partial', value: Number(st.partial)||0, color:'#d99013' },
    { name:'Unpaid', value: Number(st.unpaid)||0, color:'#d64545' },
    { name:'Overdue', value: Number(st.overdue)||0, color:'#8ea2c6' },
  ].filter(d=>d.value>0);
  const schoolChart = bySchool.map(s=>({ name: String(s.name||'').length>14?String(s.name).slice(0,12)+'…':(s.name||'—'), collected:Number(s.collected)||0, outstanding:Number(s.outstanding)||0, rate:Number(s.rate)||0 }));
  return (
    <Shell title="School Fees" lead={`${sName(school, context)} · live`} loading={loading} onClose={onClose} showToast={showToast}>
      {data ? (<>
        <KpiGrid items={[
          { value: fmtFrw(sum.totalExpected,1), label: 'Expected this term' },
          { value: fmtFrw(sum.totalCollected,1), label: 'Collected', hint: sum.collectionRate!=null?`${fmtN(sum.collectionRate)}%`:'' },
          { value: fmtFrw(sum.outstanding,1), label: 'Outstanding', chip: Number(sum.outstanding)>0?'red':null, hint: data.studentsWithOutstanding!=null?`${fmtN(data.studentsWithOutstanding)} learners`:'' },
          { value: fmtFrw(data.payrollTotal ?? 0,1), label: 'Monthly payroll' },
        ]} />
        {schoolChart.length > 0 && (
          <div className="card chartcard" style={{ marginBottom: 12 }}>
            <div className="row"><h4>Collections by school</h4><span className="chip navy">Collected vs outstanding</span></div>
            <div style={{ height: 240, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={schoolChart} margin={{ top: 8, right: 8, left: -4, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} tickFormatter={(v)=>`${Math.round(v/1e6)}M`} />
                  <Tooltip formatter={(v,n)=>[fmtFrw(v,1), n==='collected'?'Collected':'Outstanding']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="collected" name="Collected" stackId="a" fill="#fcb038" maxBarSize={36} />
                  <Bar dataKey="outstanding" name="Outstanding" stackId="a" fill="#e2e7f0" radius={[6,6,0,0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {pie.length > 0 && (
          <div className="card chartcard" style={{ marginBottom: 12 }}>
            <div className="row"><h4>Student fee status</h4><span className="chip navy">{fmtN(data.studentsWithOutstanding||0)} with balances</span></div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={3} strokeWidth={0}>
                    {pie.map((e,i)=><Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v)=>fmtN(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {trend.length > 0 && (
          <div className="card chartcard" style={{ marginBottom: 12 }}>
            <div className="row"><h4>Collection trend</h4><span className="chip navy">Deposits</span></div>
            <div style={{ height: 220, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} tickFormatter={(v)=>`${Math.round(v/1e6)}M`} />
                  <Tooltip formatter={(v)=>[fmtFrw(v,1), 'Collected']} />
                  <Bar dataKey="amount" fill="#fcb038" radius={[8,8,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {cats.length > 0 && (
          <div className="card" style={{ padding: 12, marginBottom: 12 }}>
            <div className="row" style={{ marginBottom: 8 }}><h4>By fee category</h4></div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {cats.map((c,i)=>{ const p = Number(c.expected)? (Number(c.collected)/Number(c.expected))*100 : 0; return (
                <div key={c.category||i}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><b>{c.category}</b><span>{fmtFrw(c.collected,1)} / {fmtFrw(c.expected,1)}</span></div>
                  <div className="t" style={{ marginTop:4 }}><i style={{ width:`${Math.min(100,p)}%`, background:'var(--amber)' }} /></div>
                  {Number(c.outstanding)>0 ? <div style={{ fontSize:11, color:'var(--red)', marginTop:2 }}>{fmtFrw(c.outstanding,1)} outstanding</div> : null}
                </div>
              ); })}
            </div>
          </div>
        )}
        {bySchool.length > 0 && (
          <div className="card" style={{ padding: 12, marginBottom: 12 }}>
            <div className="row" style={{ marginBottom: 8 }}><h4>Collection by school</h4></div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {bySchool.map((s,i)=>(
                <div key={s.organizationId||i} style={{ padding:'6px 0', borderTop:i?'1px solid #f1f5f9':'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><b>{s.name}</b><span>{fmtN(s.rate)}%</span></div>
                  <div style={{ fontSize:11, color:'var(--muted)' }}>{fmtFrw(s.collected,1)} of {fmtFrw(s.expected,1)} · outstanding {fmtFrw(s.outstanding,1)}</div>
                  <div className="t" style={{ marginTop:4 }}><i style={{ width:`${Math.min(100,Number(s.rate)||0)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>) : (!loading && <Empty text="No live data available for this module yet." />)}
    </Shell>
  );
}

function PayrollQuickLook({ onClose, showToast }) {
  const { token } = useAuth();
  const { branches, selectedOrgId, context, academicYear, term } = useData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!token) return; let on = true;
    (async () => {
      setLoading(true);
      try {
        const org = selectedOrgId || 'all';
        const params = { organizationId: org };
        if (academicYear) params.academicYear = academicYear; if (term) params.term = term;
        const [pr, hr] = await Promise.all([
          director.payroll(token, params).catch(() => null),
          director.hr(token, params).catch(() => null),
        ]);
        let res = pr || null;
        const hrData = hr ? { summary: { payrollTotal: hr.summary?.payrollTotal, ...(hr.payroll || {}) }, bySchool: hr.bySchool, _from: 'hr' } : null;
        if (res && hrData) {
          res = { ...hrData, ...res, bySchool: res.bySchool || hrData.bySchool, summary: { ...hrData.summary, ...(res.summary || res) } };
        } else if (!res) {
          res = hrData;
        }
        if (on && !res) {
          const [alt, hrAlt] = await Promise.all([
            director.payroll(token, { organizationId: 'all' }).catch(() => null),
            director.hr(token, { organizationId: 'all' }).catch(() => null),
          ]);
          const hrAltData = hrAlt ? { summary: { payrollTotal: hrAlt.summary?.payrollTotal, ...(hrAlt.payroll || {}) }, bySchool: hrAlt.bySchool, _from: 'hr' } : null;
          res = alt ? (hrAltData ? { ...hrAltData, ...alt, bySchool: alt.bySchool || hrAltData.bySchool, summary: { ...hrAltData.summary, ...(alt.summary || alt) } } : alt) : hrAltData;
        }
        if (on) setData(res);
      } finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [token, selectedOrgId, academicYear, term]);

  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const raw = data || {};
  const sum = raw.summary || raw.payroll || raw;
  const bySchool = Array.isArray(raw.bySchool) ? raw.bySchool : [];
  const trend = Array.isArray(raw.trend) ? raw.trend : Array.isArray(raw.monthly) ? raw.monthly : Array.isArray(raw.history) ? raw.history : [];
  const fmtFrw = (n, c) => { const x = Number(n); if (!Number.isFinite(x)) return '�'; const a = Math.abs(x); if (c) { if (a>=1e6) return `RWF ${(x/1e6).toFixed(1)}M`; if (a>=1e3) return `RWF ${(x/1e3).toFixed(0)}K`; } if (a>=1e6) return `RWF ${(x/1e6).toFixed(1)}M`; return `RWF ${Math.round(x).toLocaleString()}`; };
  const total = sum.payrollTotal ?? sum.total ?? sum.grossPay ?? sum.monthlyTotal ?? sum.amount;
  const nextRun = sum.nextRun ?? sum.nextPayrollRun ?? sum.nextDate;
  const staffCount = sum.staffCount ?? sum.totalStaff ?? sum.employees;
  const chart = bySchool.filter(s => Number(s.payrollTotal ?? s.total ?? s.amount) > 0).map(s => ({ name: String(s.name||'').length>14?String(s.name).slice(0,12)+'�':(s.name||'�'), payroll: Number(s.payrollTotal ?? s.total ?? s.amount)||0 }));
  const has = total != null || nextRun || staffCount != null || chart.length || trend.length || raw._from === 'hr';

  return (
    <Shell title="Payroll" lead={`${sName(school, context)} � live`} loading={loading} onClose={onClose} showToast={showToast}>
      {has ? (<>
        <KpiGrid items={[
          { value: total != null ? fmtFrw(total,1) : '�', label: 'Monthly payroll' },
          { value: nextRun || '�', label: 'Next run' },
          { value: staffCount != null ? fmtN(staffCount) : '�', label: 'Staff count' },
          { value: sum.visibility || (sum.netPay!=null ? fmtFrw(sum.netPay,1) : '�'), label: sum.netPay!=null ? 'Net pay' : 'Visibility' },
        ]} />
        {chart.length > 0 && (
          <div className="card chartcard" style={{ marginBottom: 12 }}>
            <div className="row"><h4>Payroll by school</h4><span className="chip navy">Monthly</span></div>
            <div style={{ height: Math.max(220, chart.length * 40), marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 12, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} tickFormatter={(v)=>`${Math.round(v/1e6)}M`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v)=>[fmtFrw(v,1), 'Payroll']} />
                  <Bar dataKey="payroll" name="Payroll" fill="#13213d" radius={[0,6,6,0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {trend.length > 0 && (
          <div className="card chartcard" style={{ marginBottom: 12 }}>
            <div className="row"><h4>Payroll trend</h4><span className="chip navy">Monthly</span></div>
            <div style={{ height: 220, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend.map(t=>({ month: t.month || t.label || t.date, amount: Number(t.amount ?? t.total ?? t.payroll ?? 0) }))} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#667085' }} axisLine={false} tickLine={false} tickFormatter={(v)=>`${Math.round(v/1e6)}M`} />
                  <Tooltip formatter={(v)=>[fmtFrw(v,1), 'Payroll']} />
                  <Bar dataKey="amount" fill="#fcb038" radius={[8,8,0,0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {raw._from === 'hr' && <div className="card" style={{ padding: 10, marginBottom: 12, fontSize: 12, color: 'var(--muted)' }}>Showing payroll summary from HR data.</div>}
      </>) : (!loading && <Empty text="No live data available for this module yet." />)}
    </Shell>
  );
}
function ActionPlanQuickLook({ onClose, showToast }) {
  const { token } = useAuth();
  const { branches, selectedOrgId, context } = useData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (!token) return; let on = true;
    (async () => {
      setLoading(true);
      try {
        const org = selectedOrgId || 'all';
        const params = { organizationId: org, page: 1, pageSize: 25 };
        if (status) params.status = status;
        let res = await director.tasks(token, params).catch(() => null);
        if (on && !res) res = await director.tasks(token, { organizationId: 'all', page: 1, pageSize: 25, ...(status ? { status } : {}) }).catch(() => null);
        if (on) setData(res);
      } finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [token, selectedOrgId, status]);

  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.tasks) ? data.tasks : Array.isArray(data) ? data : [];
  const stats = data?.stats || data?.summary || {};
  const total = stats.total ?? data?.pagination?.total ?? items.length;
  const open = stats.open ?? items.filter(t => String(t.status).toUpperCase()==='OPEN').length;
  const inProg = stats.inProgress ?? stats.in_progress ?? items.filter(t => String(t.status).toUpperCase()==='IN_PROGRESS').length;
  const completed = stats.completed ?? items.filter(t => String(t.status).toUpperCase()==='COMPLETED').length;
  const overdue = stats.overdue ?? items.filter(t => t.dueDate && String(t.status).toUpperCase()!=='COMPLETED' && new Date(t.dueDate) < Date.now()).length;
  const has = data != null || items.length;
  const tabs = [['','All'],['OPEN','Open'],['IN_PROGRESS','In progress'],['COMPLETED','Completed']];
  const fmtDate = (v) => { if (!v) return '—'; const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString(); };

  return (
    <Shell title="Action Plan" lead={`${sName(school, context)} · live`} loading={loading} onClose={onClose} showToast={showToast}>
      {has ? (<>
        <KpiGrid items={[
          { value: fmtN(open), label: 'Open' },
          { value: fmtN(inProg), label: 'In progress' },
          { value: fmtN(completed), label: 'Completed' },
          { value: fmtN(overdue), label: 'Overdue', chip: Number(overdue)>0?'red':null },
          { value: fmtN(total), label: 'Total' },
        ].slice(0,4)} />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom: 12 }}>
          {tabs.map(([id,label]) => (
            <button key={id||'all'} onClick={()=>setStatus(id)} className={`chip ${status===id?'navy':''}`} style={{ border:'1px solid #e5e7eb', cursor:'pointer', background: status===id?'var(--navy)':undefined, color: status===id?'#fff':undefined }}>{label}</button>
          ))}
        </div>
        {items.length ? (
          <div className="card" style={{ padding: 12, marginBottom: 12 }}>
            <div className="row" style={{ marginBottom: 8 }}><h4>Action plan</h4><span className="chip navy">{total} commitments</span></div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {items.slice(0,20).map((t,i) => {
                const st = String(t.status||'').toUpperCase();
                const isOver = t.dueDate && st!=='COMPLETED' && new Date(t.dueDate) < Date.now();
                const prog = Math.max(0, Math.min(100, Number(t.progress)||0));
                return (
                  <div key={t.id||i} style={{ padding: 10, border: '1px solid #eef2f7', borderRadius: 10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'flex-start' }}>
                      <div style={{ minWidth:0 }}>
                        <b style={{ fontSize: 13 }}>{t.title || 'Task'}</b>
                        <div style={{ fontSize: 11, color:'var(--muted)' }}>{[t.category, t.id].filter(Boolean).join(' · ')}</div>
                      </div>
                      <span className={`chip ${st==='COMPLETED'?'green':st==='IN_PROGRESS'?'amber':'navy'}`}>{st.replace('_',' ') || 'OPEN'}</span>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>{t.owner}{t.ownerRole ? ` · ${t.ownerRole}` : ''}</div>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginTop: 6, fontSize: 11, color: isOver?'var(--red)':'var(--muted)' }}>
                      <span>Due {fmtDate(t.dueDate)}</span>{t.priority ? <span className="chip" style={{ fontSize:10 }}>{t.priority}</span> : null}
                    </div>
                    <div className="t" style={{ marginTop: 6 }}><i style={{ width: `${prog}%`, background: prog>=100?'var(--green)':prog>=50?'var(--amber)':'var(--navy)' }} /></div>
                    <div style={{ fontSize: 11, color:'var(--muted)', marginTop: 2 }}>{prog}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (!loading && <Empty text="No action items found." />)}
      </>) : (!loading && <Empty text="No live data available for this module yet." />)}
    </Shell>
  );
}

function ParentMISQuickLook({ onClose, showToast }) {
  const { token } = useAuth();
  const { branches, selectedOrgId, context } = useData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    if (!token) return; let on = true;
    (async () => {
      setLoading(true);
      try {
        const org = selectedOrgId || 'all';
        let res = await director.parents(token, { organizationId: org }).catch(() => null);
        if (on && !res) res = await director.parents(token, { organizationId: 'all' }).catch(() => null);
        if (on) setData(res);
      } finally { if (on) setLoading(false); }
    })();
    return () => { on = false; };
  }, [token, selectedOrgId]);

  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const summary = data?.summary || {};
  const enquiriesAll = Array.isArray(data?.enquiries) ? data.enquiries : [];
  const enquiries = filter === 'all' ? enquiriesAll : enquiriesAll.filter(e => String(e.status || '').toLowerCase() === filter);
  const openCount = enquiriesAll.filter(e => String(e.status || '').toLowerCase() !== 'resolved').length;
  const has = data != null;
  const eng = Number(summary.engagementPct) || 0;
  const tabs = ['all', 'open', 'in progress', 'resolved'];

  return (
    <Shell title="Parent MIS" lead={`${sName(school, context)} · live`} loading={loading} onClose={onClose} showToast={showToast}>
      {has ? (<>
        <KpiGrid items={[
          { value: fmtN(summary.total ?? 0), label: 'Parent accounts', hint: `${fmtN(summary.linkedStudents ?? 0)} linked students` },
          { value: summary.verifiedPct != null ? `${fmtN(summary.verifiedPct)}%` : fmtN(summary.verified ?? 0), label: 'Verified', hint: `${fmtN(summary.verified ?? 0)} accounts` },
          { value: fmtN(summary.activeThisWeek ?? 0), label: 'Active this week', hint: `${fmtN(eng)}% engagement` },
          { value: fmtN(openCount), label: 'Open enquiries' },
        ]} />

        <div className="card chartcard" style={{ marginBottom: 12 }}>
          <div className="row"><h4>Engagement</h4><span className="chip navy">This week</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <div style={{ position: 'relative', width: 110, height: 110, flex: '0 0 auto' }}>
              <svg viewBox="0 0 120 120" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="52" fill="none" stroke="#eef0f5" strokeWidth="12" />
                <circle cx="60" cy="60" r="52" fill="none" stroke="#fcb038" strokeWidth="12" strokeLinecap="round"
                  strokeDasharray={`${(Math.min(100, Math.max(0, eng)) / 100) * 326.7} 326.7`} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 800 }}>{fmtN(eng)}%</span>
                <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>ACTIVE</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', borderRadius: 8, padding: '6px 10px' }}><span style={{ color: 'var(--muted)', fontWeight: 600 }}>Total accounts</span><b>{fmtN(summary.total ?? 0)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', borderRadius: 8, padding: '6px 10px' }}><span style={{ color: 'var(--muted)', fontWeight: 600 }}>Verified</span><b>{fmtN(summary.verified ?? 0)}</b></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', borderRadius: 8, padding: '6px 10px' }}><span style={{ color: 'var(--muted)', fontWeight: 600 }}>Active this week</span><b>{fmtN(summary.activeThisWeek ?? 0)}</b></div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <div className="row" style={{ marginBottom: 8 }}><h4>Parent enquiries</h4><span className="chip navy">{enquiries.length}</span></div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {tabs.map(tab => (
              <button key={tab} onClick={() => setFilter(tab)} className={`chip ${filter === tab ? 'navy' : ''}`} style={{ border: '1px solid #e5e7eb', cursor: 'pointer', background: filter === tab ? 'var(--navy)' : undefined, color: filter === tab ? '#fff' : undefined }}>
                {tab === 'all' ? 'All' : tab.replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>
          {enquiries.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {enquiries.slice(0, 12).map((e, i) => (
                <div key={e.id || i} style={{ padding: 10, border: '1px solid #eef2f7', borderRadius: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <b style={{ fontSize: 13 }}>{e.topic || 'Enquiry'}</b>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{[e.parent, e.received].filter(Boolean).join(' · ')}</div>
                    </div>
                    <span className={`chip ${String(e.status || '').toLowerCase() === 'resolved' ? 'green' : String(e.status || '').toLowerCase() === 'open' ? 'amber' : 'navy'}`}>{e.status || 'open'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty text="No enquiries." />}
        </div>
      </>) : (!loading && <Empty text="No live data available for this module yet." />)}
    </Shell>
  );
}

function ShuleKitQuickLook({ onClose, showToast }) {
  const { data, loading } = useDirectorModule('services');
  const { branches, selectedOrgId, context } = useData();
  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const kit = data?.shuleKit || {};
  const has = data && kit && (kit.enrolledPct != null || (kit.plans||[]).length || (kit.bySchool||[]).length);
  const fmtDate = (v) => { if (!v) return '�'; const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString(); };
  return (
    <Shell title="ShuleKit" lead={`${sName(school, context)} � live`} loading={loading} onClose={onClose} showToast={showToast}>
      {has ? (<>
        <KpiGrid items={[
          { value: kit.enrolledPct != null ? `${fmtN(kit.enrolledPct)}%` : '�', label: 'Enrolled' },
          { value: fmtN(kit.subscribers ?? 0), label: 'Subscribers', hint: kit.learners!=null?`of ${fmtN(kit.learners)} learners`:'' },
          { value: fmtDate(kit.deadline), label: 'Deadline' },
        ]} />
        {kit.enrolledPct != null && (
          <div className="card" style={{ padding:12, marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}><b>Enrolment progress</b><span>{fmtN(kit.enrolledPct)}%</span></div>
            <div className="t"><i style={{ width:`${Math.min(100,Number(kit.enrolledPct)||0)}%`, background:'var(--amber)' }} /></div>
            {kit.learners!=null && kit.subscribers!=null ? <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{fmtN(Math.max(0, kit.learners-kit.subscribers))} learners still to subscribe.</div> : null}
          </div>
        )}
        {(kit.plans||[]).length > 0 && (
          <div className="card" style={{ padding:12, marginBottom:12 }}>
            <div className="row" style={{ marginBottom:8 }}><h4>Plan mix</h4></div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {kit.plans.map((p,i)=>(
                <div key={p.name||i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, padding:'6px 8px', background:'#f8fafc', borderRadius:8 }}>
                  <span>{p.name}</span><b>{fmtN(p.count)}</b>
                </div>
              ))}
            </div>
          </div>
        )}
        {(kit.bySchool||[]).length > 0 && (
          <div className="card" style={{ padding:12, marginBottom:12 }}>
            <div className="row" style={{ marginBottom:8 }}><h4>Enrolment by branch</h4></div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {kit.bySchool.map((r,i)=>(
                <div key={r.organizationId||i}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><b>{r.name}</b><span>{fmtN(r.enrolledPct)}%</span></div>
                  <div className="t" style={{ marginTop:4 }}><i style={{ width:`${Math.min(100,Number(r.enrolledPct)||0)}%`, background:Number(r.enrolledPct)>=80?'var(--green)':Number(r.enrolledPct)>=60?'var(--amber)':'var(--red)' }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>) : (!loading && <Empty text="No live data available for this module yet." />)}
    </Shell>
  );
}

function ShuleMartQuickLook({ onClose, showToast }) {
  const { data, loading } = useDirectorModule('services');
  const { branches, selectedOrgId, context } = useData();
  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const mart = data?.shuleMart || {};
  const has = data && (mart.creditLimit!=null || (mart.accounts||[]).length || (mart.applications||[]).length);
  const fmtFrw = (n) => { const x=Number(n); if(!Number.isFinite(x)) return '�'; const a=Math.abs(x); if(a>=1e6) return `RWF ${(x/1e6).toFixed(1)}M`; if(a>=1e3) return `RWF ${(x/1e3).toFixed(0)}K`; return `RWF ${Math.round(x)}`; };
  const usedPct = mart.creditLimit ? Math.min(100, (Number(mart.used)||0)/Number(mart.creditLimit)*100) : 0;
  return (
    <Shell title="ShuleMart" lead={`${sName(school, context)} � live`} loading={loading} onClose={onClose} showToast={showToast}>
      {has ? (<>
        <KpiGrid items={[
          { value: fmtFrw(mart.used), label: 'Credit used', hint: mart.creditLimit!=null?`of ${fmtFrw(mart.creditLimit)}`:'' },
          { value: fmtFrw(mart.monthlyDue), label: 'Monthly due' },
          { value: `${fmtN(usedPct)}%`, label: 'Utilization' },
        ]} />
        <div className="card" style={{ padding:12, marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}><b>Credit facility</b><span>{fmtN(usedPct)}% used</span></div>
          <div className="t"><i style={{ width:`${usedPct}%`, background: usedPct>=85?'var(--red)':'var(--amber)' }} /></div>
        </div>
        {(mart.accounts||[]).length > 0 && (
          <div className="card" style={{ padding:12, marginBottom:12 }}>
            <div className="row" style={{ marginBottom:8 }}><h4>Credit accounts</h4></div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {mart.accounts.map((a,i)=>(
                <div key={a.id||i} style={{ padding:10, border:'1px solid #eef2f7', borderRadius:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}><b style={{ fontSize:13 }}>{a.name}</b><span className="chip navy">{a.status||'�'}</span></div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{fmtFrw(a.principal)} � {fmtFrw(a.monthly)}/mo � paid {fmtN(a.paid)}/{fmtN(a.months)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {(mart.applications||[]).length > 0 && (
          <div className="card" style={{ padding:12, marginBottom:12 }}>
            <div className="row" style={{ marginBottom:8 }}><h4>Pending applications</h4></div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {mart.applications.map((a,i)=>(
                <div key={a.id||i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:10, border:'1px solid #eef2f7', borderRadius:10 }}>
                  <div><b style={{ fontSize:13 }}>{a.name}</b><div style={{ fontSize:12, color:'var(--muted)' }}>{fmtFrw(a.amount)} � {fmtN(a.tenureMonths)} months</div></div>
                  <span className="chip amber">{a.stage||'pending'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </>) : (!loading && <Empty text="No live data available for this module yet." />)}
    </Shell>
  );
}

function UniformsQuickLook({ onClose, showToast }) {
  const { data, loading } = useDirectorModule('services');
  const { branches, selectedOrgId, context } = useData();
  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const u = data?.uniforms || {};
  const orders = Array.isArray(u.recentOrders) ? u.recentOrders : [];
  const has = data && (u.openOrders!=null || u.readyForPickup!=null || u.stockItems!=null || orders.length);
  const fmtFrw = (n) => { const x=Number(n); if(!Number.isFinite(x)) return '�'; const a=Math.abs(x); if(a>=1e6) return `RWF ${(x/1e6).toFixed(1)}M`; if(a>=1e3) return `RWF ${(x/1e3).toFixed(0)}K`; return `RWF ${Math.round(x)}`; };
  return (
    <Shell title="Uniforms" lead={`${sName(school, context)} � live`} loading={loading} onClose={onClose} showToast={showToast}>
      {has ? (<>
        <KpiGrid items={[
          { value: fmtN(u.openOrders ?? 0), label: 'Open orders' },
          { value: fmtN(u.readyForPickup ?? 0), label: 'Ready for pickup' },
          { value: fmtN(u.stockItems ?? 0), label: 'Stock items' },
        ]} />
        {orders.length > 0 && (
          <div className="card" style={{ padding:12, marginBottom:12 }}>
            <div className="row" style={{ marginBottom:8 }}><h4>Recent uniform orders</h4></div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {orders.map((o,i)=>(
                <div key={o.id||i} style={{ padding:10, border:'1px solid #eef2f7', borderRadius:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}><b style={{ fontSize:13 }}>{o.student||o.id}</b><span className={`chip ${String(o.status||'').toLowerCase().includes('ready')?'green':'amber'}`}>{o.status||'�'}</span></div>
                  <div style={{ fontSize:12, color:'var(--muted)' }}>{o.class} � {fmtN(o.items)} items � {fmtFrw(o.total)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>) : (!loading && <Empty text="No live data available for this module yet." />)}
    </Shell>
  );
}

function DiningQuickLook({ onClose, showToast }) {
  const { data, loading } = useDirectorModule('services');
  const { branches, selectedOrgId, context } = useData();
  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const d = data?.dining || {};
  const weekly = Array.isArray(d.weeklyMeals) ? d.weeklyMeals : [];
  const menu = Array.isArray(d.menu) ? d.menu : [];
  const has = data && (d.mealsToday!=null || d.boarders!=null || weekly.length || menu.length);
  const maxMeals = Math.max(1, ...weekly.map(x=>Number(x.meals)||0));
  return (
    <Shell title="Dining/Cafeteria" lead={`${sName(school, context)} � live`} loading={loading} onClose={onClose} showToast={showToast}>
      {has ? (<>
        <KpiGrid items={[
          { value: fmtN(d.mealsToday ?? 0), label: 'Meals today' },
          { value: fmtN(d.boarders ?? 0), label: 'Boarders' },
        ]} />
        {menu.length > 0 && (
          <div className="card" style={{ padding:12, marginBottom:12 }}>
            <div className="row" style={{ marginBottom:8 }}><h4>Today&apos;s menu</h4></div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {menu.map((m,i)=>(<div key={i} style={{ padding:'6px 8px', background:'#f8fafc', borderRadius:8, fontSize:13 }}>{i+1}. {m}</div>))}
            </div>
          </div>
        )}
        {weekly.length > 0 && (
          <div className="card chartcard" style={{ marginBottom:12 }}>
            <div className="row"><h4>Meals this week</h4></div>
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:160, marginTop:12 }}>
              {weekly.map((w,i)=>{ const h = Math.max(6, ((Number(w.meals)||0)/maxMeals)*120); return (
                <div key={w.day||i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, fontWeight:700 }}>{fmtN(w.meals)}</span>
                  <div style={{ width:'100%', maxWidth:28, height:h, borderRadius:8, background:'linear-gradient(to top,#fcb038,#f5a623)' }} />
                  <span style={{ fontSize:10, color:'var(--muted)' }}>{w.day}</span>
                </div>
              ); })}
            </div>
          </div>
        )}
      </>) : (!loading && <Empty text="No live data available for this module yet." />)}
    </Shell>
  );
}

function ShuleChatQuickLook({ onClose, showToast }) {
  const { data, loading } = useDirectorModule('messages');
  const { branches, selectedOrgId, context } = useData();
  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const [sel, setSel] = useState(0);
  const list = Array.isArray(data) ? data : Array.isArray(data?.chats) ? data.chats : Array.isArray(data?.conversations) ? data.conversations : Array.isArray(data?.items) ? data.items : [];
  const unread = list.filter(c => Number(c.unread ?? c.unreadCount ?? 0) > 0).length || (data?.unread ?? 0);
  const escalated = list.filter(c => c.escalated || c.status === 'escalated' || c.escalatedToYou).length || (data?.escalated ?? 0);
  const cur = list[sel] || null;
  const msgs = Array.isArray(cur?.messages) ? cur.messages : Array.isArray(cur?.thread) ? cur.thread : [];
  return (
    <Shell title="ShuleChat" lead={`${sName(school, context)} � live`} loading={loading} onClose={onClose} showToast={showToast}>
      {!loading && !list.length ? <Empty text="No live conversations available." /> : (<>
        <KpiGrid items={[{ value: fmtN(unread), label: 'Unread' }, { value: fmtN(escalated), label: 'Escalated' }, { value: fmtN(list.length), label: 'Conversations' }]} />
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {list.slice(0,30).map((c,i) => {
            const name = c.parentName || c.name || c.contact || c.studentName || 'Conversation';
            const last = c.lastMessage || c.preview || c.snippet || (Array.isArray(c.messages)&&c.messages[0]?.text) || '';
            const u = Number(c.unread ?? c.unreadCount ?? 0);
            return (
              <div key={c.id||i} onClick={() => setSel(i)} style={{ padding:10, border: sel===i?'2px solid var(--navy)':'1px solid #eef2f7', borderRadius:12, cursor:'pointer', background:'#fff' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                  <b style={{ fontSize:13 }}>{name}</b>
                  {u>0 ? <span className="chip amber">{u} new</span> : (c.escalated ? <span className="chip red">Escalated</span> : null)}
                </div>
                {last ? <div style={{ fontSize:12, color:'var(--muted)', marginTop:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{String(last)}</div> : null}
              </div>
            );
          })}
        </div>
        {cur && msgs.length > 0 ? (
          <div className="card" style={{ padding:12, marginTop:12 }}>
            <div className="row" style={{ marginBottom:8 }}><h4>Thread</h4></div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:220, overflow:'auto' }}>
              {msgs.slice(-20).map((m,i)=>(
                <div key={m.id||i} style={{ padding:'8px 10px', borderRadius:10, background: (m.from==='school'||m.direction==='out'?'#f1f5f9':'#fff7ed'), fontSize:13 }}>
                  <div style={{ fontSize:11, color:'var(--muted)', marginBottom:2 }}>{m.from || m.sender || m.author || ''} {m.at||m.time||m.createdAt ? `� ${new Date(m.at||m.time||m.createdAt).toLocaleString()}` : ''}</div>
                  <div>{m.text || m.body || m.message || ''}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </>)}
    </Shell>
  );
}

function CircularsQuickLook({ onClose, showToast }) {
  const { token } = useAuth();
  const { selectedOrgId, branches, context } = useData();
  const school = (branches || []).find(b => b.id === selectedOrgId) || branches?.[0] || null;
  const [tab, setTab] = useState('broadcasts');
  const [circ, setCirc] = useState(null);
  const [bc, setBc] = useState(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    if (!token) return; setLoading(true);
    const org = selectedOrgId && selectedOrgId !== 'all' ? selectedOrgId : undefined;
    try { const r = await director.circulars(token, org ? { organizationId: org } : {}); setCirc(r); } catch { try { setCirc(await director.circulars(token, { organizationId: 'all' })); } catch { setCirc(null); } }
    try { const r = await director.broadcasts(token, org ? { organizationId: org } : {}); setBc(r); } catch { try { setBc(await director.broadcasts(token, { organizationId: 'all' })); } catch { setBc(null); } }
    setLoading(false);
  };
  useEffect(() => { load(); }, [token, selectedOrgId]);
  const cList = Array.isArray(circ) ? circ : Array.isArray(circ?.circulars) ? circ.circulars : Array.isArray(circ?.items) ? circ.items : [];
  const bList = Array.isArray(bc) ? bc : Array.isArray(bc?.broadcasts) ? bc.broadcasts : Array.isArray(bc?.items) ? bc.items : [];
  const sent = bList.length || circ?.stats?.sent || 0;
  const recipients = bList.reduce((a,b)=>a+Number(b.recipients||b.recipientCount||0),0) || circ?.stats?.recipients || 0;
  const readRate = circ?.stats?.readRate ?? circ?.stats?.readPct ?? null;
  return (
    <Shell title="Circulars & Broadcasts" lead={`${sName(school, context)} � live`} loading={loading} onClose={onClose} showToast={showToast}>
      {!loading && !cList.length && !bList.length ? <Empty text="No live circulars or broadcasts available." /> : (<>
        <KpiGrid items={[{ value: fmtN(sent), label: 'Broadcasts' }, { value: fmtN(recipients), label: 'Recipients' }, { value: readRate!=null?`${fmtN(readRate)}%`:'�', label: 'Read rate' }]} />
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {['broadcasts','circulars'].map(t => (
            <button key={t} className="chip" onClick={() => setTab(t)} style={{ padding:'6px 12px', borderRadius:999, border:'1px solid #e5e7eb', background: tab===t?'var(--navy)':'#fff', color: tab===t?'#fff':'var(--navy)', fontWeight:700, cursor:'pointer', textTransform:'capitalize' }}>{t}</button>
          ))}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {(tab==='broadcasts'?bList:cList).slice(0,40).map((x,i)=>(
            <div key={x.id||i} className="card" style={{ padding:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'flex-start' }}>
                <b style={{ fontSize:13 }}>{x.title || x.subject || x.name || 'Untitled'}</b>
                <span className="chip navy">{x.status || x.channel || (tab==='broadcasts'?'sent':'circular')}</span>
              </div>
              {x.body || x.message ? <div style={{ fontSize:12, color:'var(--muted)', marginTop:6 }}>{String(x.body||x.message).slice(0,160)}</div> : null}
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:6 }}>{[x.audience, x.createdAt||x.sentAt||x.date, x.recipients!=null?`${fmtN(x.recipients)} recipients`:null].filter(Boolean).join(' � ')}</div>
            </div>
          ))}
        </div>
      </>)}
    </Shell>
  );
}

export function QuickLookPanel({ name, onClose, showToast }) {
  if (name === 'Student Management') {
    return <StudentManagementQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'Academic') {
    return <AcademicQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'Timetable') {
    return <TimetableQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'Discipline') {
    return <DisciplineQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'Attendance') {
    return <AttendanceQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'HR') {
    return <HrQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'School Budget') {
    return <BudgetQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'School Fees') {
    return <FeesQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'Payroll') {
    return <PayrollQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'Action Plan') {
    return <ActionPlanQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'Parent MIS') {
    return <ParentMISQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'ShuleChat') {
    return <ShuleChatQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'Circulars') {
    return <CircularsQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'ShuleKit') {
    return <ShuleKitQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'Uniforms') {
    return <UniformsQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'Dining/Cafeteria') {
    return <DiningQuickLook onClose={onClose} showToast={showToast} />;
  }
  if (name === 'ShuleMart') {
    return <ShuleMartQuickLook onClose={onClose} showToast={showToast} />;
  }
  return <Shell title={name} lead="Live" loading={false} onClose={onClose} showToast={showToast}><Empty text="No live data available for this module yet." /></Shell>;
}

/* ---------- SOS ---------- */
export function SOSPanel({ onClose, showToast }) {
  const [sel, setSel] = useState(0);
  const opts = ['Lockdown · keep everyone inside', 'Evacuate to assembly point', 'Medical emergency on campus'];
  return (
    <>
      <div className="grab" />
      <h3>Emergency alert</h3>
      <p className="lead">Use only in a real emergency. The alert reaches all staff, security and parents at once and is logged for the district.</p>
      {opts.map((o, i) => (
        <div
          key={o}
          className={`opt ${sel === i ? 'on' : ''}`}
          style={{ padding: 14, borderRadius: 14, border: sel === i ? '2px solid var(--red)' : '1px solid #e5e7eb', marginBottom: 8, cursor: 'pointer', fontWeight: 600 }}
          onClick={() => setSel(i)}
        >
          {o}
        </div>
      ))}
      <button
        className="bigbtn"
        style={{ background: 'var(--red)', color: '#fff', marginTop: 8 }}
        onClick={() => { showToast('Emergency alert sent'); onClose(); }}
      >
        Send emergency alert
      </button>
      <button className="bigbtn ghost" style={{ marginTop: 8 }} onClick={onClose}>Cancel</button>
    </>
  );
}
