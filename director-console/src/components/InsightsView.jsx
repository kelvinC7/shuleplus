import { useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { useData } from '../auth/DataContext';

const fmtRwf = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1_000_000) return `RWF ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `RWF ${(v / 1_000).toFixed(0)}K`;
  return `RWF ${Math.round(v)}`;
};

export function InsightsView({ showToast }) {
  const { overview, branches, context, loading } = useData();
  const s = overview?.summary || {};
  const att = overview?.attendance || {};
  const attS = att.summary || {};
  const trend = att.weeklyTrend || [];
  const perf = overview?.schoolPerformance || [];
  const fin = overview?.financial || [];
  const feesDist = overview?.feesStatusDistribution || [];
  const teaching = overview?.teaching || {};
  const tasks = overview?.tasks || {};
  const attention = overview?.attention || [];

  const school = (Array.isArray(branches) && branches[0]) ? (branches.find(b => b.id === (overview?.meta?.organizationId || context?.branches?.[0]?.id)) || branches[0]) : null;
  const crest = (school?.cr || 'IN').slice(0, 2);
  const schoolName = school?.sh || school?.name || context?.user?.name || 'School';
  const period = overview?.greeting?.period ? `${overview.greeting.period}${overview.greeting.week ? ', ' + overview.greeting.week : ''}` : null;

  // attendance bars data
  const attVals = trend.map(d => Number(d.student) || 0);
  const attMin = attVals.length ? Math.max(0, Math.min(...attVals) - 5) : 0;
  const attMax = attVals.length ? Math.max(...attVals, 100) : 100;
  const attH = (x) => attVals.length ? Math.max(6, ((x - attMin) / Math.max(1, attMax - attMin)) * 100) : 6;

  // academic bars (score/pass/attendance per school)
  const acadRows = perf.length ? [
    ['Acad. score', perf[0].academicScore ?? 0],
    ['Pass rate', perf[0].passRate ?? 0],
    ['Attendance', perf[0].attendanceRate ?? 0],
  ] : [];

  // fee hbars
  const feeRows = [
    ['Collected', s.feesBilled ? (Number(s.feesCollected) / Math.max(1, Number(s.feesBilled))) * 100 : 0, fmtRwf(s.feesCollected)],
    ['Outstanding', s.feesBilled ? (Number(s.feesOutstanding) / Math.max(1, Number(s.feesBilled))) * 100 : 0, fmtRwf(s.feesOutstanding)],
  ];

  useEffect(() => {
    const timers = [];
    document.querySelectorAll('.bars i').forEach((el) => {
      const h = el.dataset.h;
      if (h) { el.style.height = '0'; timers.push(setTimeout(() => { el.style.height = h + '%'; }, 60)); }
    });
    return () => timers.forEach(clearTimeout);
  }, [overview]);

  return (
    <section className="view active" id="v-insights">
      <div className="ph">
        <div className="toprow">
          <div className="school">
            <div className="crest">{crest}</div>
            <div>
              <small>PERFORMANCE</small>
              <b>Insights</b>
            </div>
          </div>
          <button className="iconbtn" onClick={() => showToast('Board report exported as PDF')}>
            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          </button>
        </div>
        <button className="scopechip">{schoolName}</button>
        <h2 id="ititle">{period || 'Live performance'}</h2>
        <p>{loading ? 'Loading live insights…' : (overview?.lastUpdated ? `Updated ${new Date(overview.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · live from Director API` : 'Live from Director overview')}</p>
      </div>

      <div className="wrap">
        <div className="sec" style={{ marginTop: 18 }}><h3>Explore by area</h3></div>

        <div className="card chartcard">
          <div className="row">
            <div>
              <h4>Attendance this week</h4>
              <div className="big">{attS.studentRate ?? s.averageAttendance ?? 0}% <span>students today</span></div>
            </div>
            <span className="chip navy">{attS.lateArrivals ?? 0} late</span>
          </div>
          {trend.length ? (
            <div style={{ height: 220, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend.map(d => ({ ...d, day: d.day || d.date, students: Number(d.student ?? d.studentRate ?? 0), staff: Number(d.staff ?? d.staffRate ?? 0) }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, n) => [`${Number(v)}%`, n === 'students' ? 'Students' : 'Staff']} />
                  <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700 }} formatter={(v) => (v === 'students' ? 'Students' : 'Staff')} />
                  <Line type="monotone" dataKey="students" stroke="#13213D" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="staff" stroke="#C9D1E3" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p style={{ margin: '12px 0 0', color: 'var(--muted)', fontSize: 13 }}>No attendance trend data.</p>}
        </div>

        <div className="card chartcard" style={{ marginTop: 12 }}>
          <div className="row">
            <div>
              <h4>Academic performance</h4>
              <div className="big">{perf[0]?.academicScore ?? '—'}% <span>academic score</span></div>
            </div>
            <span className="chip green">Pass {perf[0]?.passRate ?? 0}%</span>
          </div>
          {acadRows.length ? (
            <div>
              {acadRows.map(([name, val]) => (
                <div key={name} className="hbar">
                  <div className="r"><span>{name}</span><span>{val}%</span></div>
                  <div className="t"><i style={{ width: `${val}%`, background: name === 'Pass rate' ? 'var(--green)' : name === 'Attendance' ? 'var(--amber)' : undefined }} /></div>
                </div>
              ))}
            </div>
          ) : <p style={{ margin: '12px 0 0', color: 'var(--muted)', fontSize: 13 }}>No performance data.</p>}
          <div className="legend"><span><i style={{ background: 'var(--navy)' }} />Academic</span><span><i style={{ background: 'var(--green)' }} />Pass rate</span><span><i style={{ background: 'var(--amber)' }} />Attendance</span></div>
        </div>

        <div className="card chartcard" style={{ marginTop: 12 }}>
          <div className="row">
            <div>
              <h4>Fees & finance</h4>
              <div className="big">{s.feesCollectionRate ?? 0}% <span>collected of {fmtRwf(s.feesBilled)}</span></div>
            </div>
            <span className={`chip ${(s.feesCollectionRate ?? 0) >= 70 ? 'green' : 'amber'}`}>{fmtRwf(s.feesOutstanding)} due</span>
          </div>
          <div>
            {feeRows.map(([name, pct, label]) => (
              <div key={name} className="hbar">
                <div className="r"><span>{name}</span><span>{label}</span></div>
                <div className="t"><i style={{ width: `${Math.min(100, pct)}%`, background: name === 'Outstanding' ? 'var(--amber)' : undefined }} /></div>
              </div>
            ))}
            {feesDist.map((d) => (
              <div key={d.status} className="hbar">
                <div className="r"><span>{d.status}</span><span>{Number(d.count) || 0}</span></div>
                <div className="t"><i style={{ width: `${feesDist.length ? (Number(d.count) / Math.max(1, ...feesDist.map(x => Number(x.count)||0))) * 100 : 0}%`, background: d.status === 'Paid' ? 'var(--green)' : d.status === 'Overdue' ? 'var(--red)' : 'var(--amber)' }} /></div>
              </div>
            ))}
            {fin.map((f) => (
              <div key={f.organizationId || f.name} className="hbar">
                <div className="r"><span>{f.name}</span><span>{fmtRwf(f.feesCollected)} collected · {fmtRwf(f.payrollTotal)} payroll</span></div>
                <div className="t"><i style={{ width: `${f.feesCollected + f.feesOutstanding ? (f.feesCollected / (f.feesCollected + f.feesOutstanding)) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="legend"><span><i style={{ background: 'var(--navy)' }} />Collected</span><span><i style={{ background: 'var(--amber)' }} />Outstanding/partial</span><span><i style={{ background: 'var(--red)' }} />Overdue</span></div>
        </div>

        <div className="card chartcard" style={{ marginTop: 12 }}>
          <div className="row">
            <div>
              <h4>Teaching & tasks</h4>
              <div className="big">{teaching.teaching ?? 0}/{teaching.sessions ?? 0} <span>teaching now</span></div>
            </div>
            <span className={`chip ${teaching.gaps ? 'red' : 'green'}`}>{teaching.period || 'Period'}</span>
          </div>
          <div>
            {[['Teaching', teaching.teaching ?? 0, teaching.sessions ? (teaching.teaching / teaching.sessions) * 100 : 0, 'var(--green)'],
              ['Cover', teaching.cover ?? 0, teaching.sessions ? (teaching.cover / teaching.sessions) * 100 : 0, 'var(--amber)'],
              ['Gaps', teaching.gaps ?? 0, teaching.sessions ? (teaching.gaps / teaching.sessions) * 100 : 0, 'var(--red)'],
              ['Late', teaching.late ?? 0, teaching.sessions ? (teaching.late / teaching.sessions) * 100 : 0, 'var(--amber)'],
            ].map(([name, val, pct, color]) => (
              <div key={name} className="hbar">
                <div className="r"><span>{name}</span><span>{val}</span></div>
                <div className="t"><i style={{ width: `${Math.min(100, pct)}%`, background: color }} /></div>
              </div>
            ))}
          </div>
          <div className="legend"><span>Tasks: Open {tasks.open ?? 0} · In progress {tasks.inProgress ?? 0} · Completed {tasks.completed ?? 0} · Overdue {tasks.overdue ?? 0}</span></div>
        </div>

        <div className="card chartcard" style={{ marginTop: 12 }}>
          <div className="row">
            <h4>Needs your attention</h4>
            <span className="chip navy">{s.openAlerts ?? attention.length} alerts</span>
          </div>
          <div style={{ marginTop: 6 }}>
            {attention.length ? attention.map((a, i) => {
              const sev = String(a.severity || '').toLowerCase();
              const c = sev === 'urgent' || sev === 'critical' ? 'red' : sev === 'warning' ? 'amber' : 'green';
              const ini = String(a.category || a.title || '?').slice(0, 2).toUpperCase();
              return (
                <div key={i} className="watch">
                  <span className="pic" style={{ background: c === 'green' ? 'var(--green)' : c === 'red' ? 'var(--red)' : 'var(--amber)', color: c === 'amber' ? 'var(--navy)' : undefined }}>{ini}</span>
                  <div><b>{a.title}</b><small>{a.body}</small></div>
                  <span className={`chip ${c}`}>{a.category || a.severity || 'Alert'}</span>
                </div>
              );
            }) : <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 13 }}>{overview ? 'Nothing needs attention.' : 'Select a school to load insights.'}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
