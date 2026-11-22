import { I } from '../utils/icons';
import { useAuth } from '../auth/AuthContext';
import { useData } from '../auth/DataContext';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const sum = (arr, k) => arr.reduce((a, b) => a + (Number(b[k]) || 0), 0);
const pct = (a, b) => b ? ((a / b) * 100).toFixed(1) : '0.0';
const brOf = (arr, id) => arr.find((b) => b.id === id);

export function HomeView({
  scope,
  setScope,
  greeting,
  feesToday,
  setFeesToday,
  onGo,
  onOpenCam,
  onOpenSheet,
  showToast,
  onOpenMeeting,
  onOpenTeaching,
  onOpenAttn,
  onOpenNotif,
  onOpenDet,
  onOpenQuick,
}) {
  const { logout } = useAuth();
  const { branches, overview, context } = useData();
  const BR = Array.isArray(branches) ? branches : [];
  const b = brOf(BR, scope) || BR[0] || null;
  const g = false;
  const sumr = overview?.summary;
  const weeklyTrend = overview?.attendance?.weeklyTrend || [];
  const attention = overview?.attention || [];

  const stu = g ? (sumr?.totalStudents ?? sum(BR, 'stu')) : (b?.stu || 0);
  const inn = g
    ? (sumr?.averageAttendance != null ? Math.round((sumr.averageAttendance / 100) * (sumr.totalStudents ?? sum(BR, 'stu'))) : sum(BR, 'inn'))
    : (b?.inn || 0);
  const st = g ? (sumr?.totalStaff ?? sum(BR, 'staff')) : (b?.staff || 0);
  const on = g ? (overview?.attendance?.summary?.staffRate != null ? Math.round(((overview.attendance.summary.staffRate || 0) / 100) * st) : sum(BR, 'on')) : (b?.on || 0);
  const billed = g ? (sumr?.feesBilled ?? sum(BR, 'billed')) : (b?.billed || 0);
  const col = g
    ? (sumr?.feesCollected ?? BR.reduce((a, x) => a + ((Number(x.billed) || 0) * (Number(x.fees) || 0)) / 100, 0))
    : (b?._feesCollected ?? ((Number(b?.billed) || 0) * (Number(b?.fees) || 0)) / 100);
  const cp = billed ? Math.round((col / billed) * 100) : (sumr?.feesCollectionRate ?? 0);

  const health = g
    ? (sumr?.healthScore ?? (sum(BR,'stu') ? Math.round(BR.reduce((a, x) => a + (Number(x.health) || 0) * (Number(x.stu) || 0), 0) / sum(BR,'stu')) : 0))
    : (b?.health || 0);



  const openBranches = () => {
    const signedAs = context?.user?.email || token && 'current session';
    onOpenSheet(
      <div>
        <div className="grab" />
        <h3>Your schools</h3>
        <p className="lead">
          {BR.length ? `${BR.length} school${BR.length === 1 ? '' : 's'} assigned to your account.` : 'No schools assigned to this account yet.'}
        </p>
        {context?.user && (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 10px' }}>
            Signed in as <b>{context.user.name || context.user.email}</b>{context.user.email ? ` (${context.user.email})` : ''} · {context.user.role || ''}
          </p>
        )}
        {BR.map((br) => (
          <button
            key={br.id}
            className={`bropt ${scope === br.id ? 'on' : ''}`}
            onClick={() => { setScope(br.id); onOpenSheet(null); }}
          >
            <span className="cr">{br.cr}</span>
            <div>
              <b>{br.sh}</b>
              <small>
                {br.name}{br._raw?.organizationCode ? ` · code ${br._raw.organizationCode}` : ''}
                {br.loc ? <><br />{br.loc}</> : null}
              </small>
            </div>
            {br.al?.length ? <span className="chip red">{br.al.length}</span> : <span className="chip green">OK</span>}
          </button>
        ))}
        <button className="bigbtn amber" style={{ marginTop: 16 }} onClick={logout}>Log out</button>
      </div>
    );
  };

  return (
    <section className="view active" id="v-home">
      <div className="hero">
        <div className="toprow">
          <button className="school brsw" onClick={openBranches} aria-label="Switch school">
            <div className="crest">{(b?.cr || BR[0]?.cr || 'SC').slice(0,2)}</div>
            <div className="brsw-text">
              <small>{context?.user?.role || 'DIRECTOR CONSOLE'}</small>
              <b>
                <span id="brname" title={b?.sh || b?.name || 'School'}>{b?.sh || b?.name || 'School'}</span>
                <svg className="caret" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
              </b>
            </div>
          </button>
          <button className="iconbtn" onClick={() => onOpenNotif?.()} aria-label="Notifications">
            <svg viewBox="0 0 24 24">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="dot" />
          </button>
        </div>
        <div className="greet">
          <p id="dateline">{overview?.greeting ? `${overview.greeting.period || ''}${overview.greeting.week ? ', ' + overview.greeting.week : ''}`.replace(/^,\s*/, '') || new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h2 id="hello">{greeting}</h2>
        </div>
      </div>

      <div className="wrap">
        <div className="card score">
          <div className="ring">
            <svg width="84" height="84" viewBox="0 0 84 84">
              <circle cx="42" cy="42" r="35" stroke="#EEF0F4" strokeWidth="9" fill="none" />
              <circle id="ringarc" cx="42" cy="42" r="35" stroke="#F5A623" strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray="220" strokeDashoffset={220 * (1 - (health || 0) / 100)} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }} />
            </svg>
            <div className="val"><div><b id="hsc">{health || 0}</b><small>HEALTH</small></div></div>
          </div>
          <div>
            <h4 id="hsh">{g ? (health >= 88 ? 'Your schools are running smoothly' : 'Most of your schools are on track') : (health >= 90 ? 'School is running smoothly' : health >= 85 ? 'School is mostly on track' : 'This school needs attention')}</h4>
            <p id="hsp">{g ? `${BR.filter((x) => (x.health || 0) >= 88).length} of ${BR.length} schools on track.` : `${b?.lv || ''}${b?.loc ? ', ' + b.loc : ''}`}</p>
            <button className="attnpill" onClick={() => onOpenAttn?.()}>
              <i id="attnN">{sumr?.openAlerts ?? (overview?.attention?.length ?? BR.reduce((a, x) => a + (x.al?.length || 0), 0))}</i>
              Need your attention
              <span>↗</span>
            </button>
          </div>
        </div>

        <div className="sec"><h3>Today at a glance</h3><a onClick={() => onGo('insights')}>Insights</a></div>

        <div className="kpis" id="kpis">
          <div className="card kpi" onClick={() => onGo('insights')}>
            <div className="lbl"><span className="ic" style={{ background: '#E7ECF7' }}><svg viewBox="0 0 24 24" stroke="#13213D">{I.user}</svg></span>Students in</div>
            <div className="num">{fmt(inn)} <span>/ {fmt(stu)}</span></div>
            <div className="bar"><i style={{ width: `${stu ? (inn / stu) * 100 : 0}%`, background: 'var(--navy)' }} /></div>
            <div className="sub" style={{ color: 'var(--green)' }}>{pct(inn, stu)}%{g ? ` across ${BR.length} schools` : ' present today'}</div>
          </div>

          <div className="card kpi">
            <div className="lbl"><span className="ic" style={{ background: 'var(--amber-soft)' }}><svg viewBox="0 0 24 24" stroke="#9A5B00"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg></span>Staff on duty</div>
            <div className="num">{fmt(on)} <span>/ {fmt(st)}</span></div>
            <div className="bar"><i style={{ width: `${st ? (on / st) * 100 : 0}%`, background: 'var(--amber)' }} /></div>
            <div className="sub" style={{ color: '#9A5B00' }}>{Math.max(0, st - on)} on leave or absent</div>
          </div>

          <div className="card kpi">
            <div className="lbl"><span className="ic" style={{ background: '#E3F6EE' }}><svg viewBox="0 0 24 24" stroke="#12784F">{I.pay}</svg></span>Fees today</div>
            <div className="num"><span id="feesToday">{Number(feesToday || 0).toFixed(2)}M <span>RWF</span></span></div>
            <div className="sub" style={{ color: 'var(--green)' }}>{g ? `Payments across ${BR.length} schools` : 'Payments since 7:00'}</div>
          </div>

          <div className="card kpi" onClick={() => onGo('insights')}>
            <div className="lbl"><span className="ic" style={{ background: '#E7ECF7' }}><svg viewBox="0 0 24 24" stroke="#13213D"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg></span>Term collected</div>
            <div className="num">{cp}% <span>of {String(+(Number(billed||0).toFixed(1)))}M</span></div>
            <div className="bar"><i style={{ width: `${cp}%`, background: 'var(--green)' }} /></div>
            <div className="sub" style={{ color: 'var(--muted)' }}>{(Number(billed||0) - Number(col||0)).toFixed(1)}M RWF outstanding</div>
          </div>
        </div>

        {g && BR.length > 1 && (
          <details className="sch" id="schdd">
            <summary>
              <span className="stack">{BR.slice(0, 4).map((x) => (<i key={x.id || x.cr}>{x.cr}</i>))}</span>
              <span className="sm"><b>Your schools</b><small>{BR.length} schools · {BR.filter((x) => x.al?.length).length} need attention · tap to compare</small></span>
              <svg className="chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div className="schl">
              <div className="hd"><span>School</span><span>Attend.</span><span>Fees</span><span>Score</span></div>
              {BR.map((br) => {
                const v = br.stu ? +pct(br.inn, br.stu) : 0;
                const [bg, fg] = br.health >= 90 ? ['#E3F6EE', '#12784F'] : br.health >= 85 ? ['#FFF3DC', '#9A5B00'] : ['#FDE7E8', '#B4262B'];
                return (
                  <button key={br.id} onClick={() => setScope(br.id)}>
                    <span style={{ minWidth: 0 }}><b>{br.sh}</b><small><i style={{ background: `var(--${br.note?.[0] || 'green'})` }} />{br.al?.length ? `${br.al.length} to check` : 'On track'}</small></span>
                    <em>{Math.round(v)}%</em>
                    <em style={{ color: br.fees < 65 ? 'var(--red)' : 'var(--navy)' }}>{br.fees || 0}%</em>
                    <span className="h" style={{ background: bg, color: fg }}>{br.health || 0}</span>
                  </button>
                );
              })}
            </div>
          </details>
        )}

        <div className="sec"><h3>Quick actions</h3></div>
        <div className="actions">
          <button className="act" onClick={() => onOpenDet?.('attendance')}><span className="sq"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="m16 11 2 2 4-4" /></svg></span>Attendance</button>
          <button className="act" onClick={() => onOpenTeaching?.()}><span className="sq"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></svg></span>Teaching now</button>
          <button className="act" onClick={() => onOpenMeeting?.()}><span className="sq"><svg viewBox="0 0 24 24">{I.cal}</svg></span>Staff meeting</button>
          <button className="act" onClick={() => onOpenQuick?.('Academic')}><span className="sq"><svg viewBox="0 0 24 24">{I.book}</svg></span>Academic</button>
        </div>

        <div className="sec"><h3>Attendance trend</h3></div>
        <div className="card chartcard" style={{ padding: 14 }}>
          {weeklyTrend.length ? (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend.map(d => ({ ...d, day: d.day || d.date, students: Number(d.student ?? d.studentRate ?? 0), staff: Number(d.staff ?? d.staffRate ?? 0) }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#667085' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, n) => [`${Number(v)}%`, n === 'students' ? 'Students' : 'Staff']} />
                  <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700 }} formatter={(v) => (v === 'students' ? 'Students' : 'Staff')} />
                  <Line type="monotone" dataKey="students" stroke="#FCB038" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="staff" stroke="#13213D" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>No attendance trend data.</p>}
        </div>

        <div className="sec"><h3>Needs your attention</h3></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {attention.length ? attention.map((a, i) => {
            const sev = String(a.severity || '').toLowerCase();
            const tone = sev === 'urgent' || sev === 'critical' ? 'red' : sev === 'warning' ? 'amber' : 'navy';
            const bg = tone === 'red' ? '#FDE7E8' : tone === 'amber' ? '#FFF3DC' : '#E7ECF7';
            const fg = tone === 'red' ? '#B4262B' : tone === 'amber' ? '#9A5B00' : '#13213D';
            return (
              <div key={i} className="card" style={{ padding: 12, borderLeft: `4px solid ${fg}`, background: bg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <b style={{ fontSize: 13, color: '#13213D' }}>{a.title}</b>
                  {a.category && <span className={`chip ${tone}`}>{a.category}</span>}
                </div>
                {a.body && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569', lineHeight: 1.45 }}>{a.body}</p>}
              </div>
            );
          }) : <div className="card" style={{ padding: 14, fontSize: 13, color: 'var(--muted)' }}>Nothing needs attention.</div>}
        </div>
      </div>
    </section>
  );
}
