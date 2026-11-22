import { useState, useMemo } from 'react';
import { CLS, SUBJ, SEC2, STAFF, VEN, classList, fmt } from '../data/wizardData';

const tg = (arr, v) => {
  const i = arr.indexOf(v);
  if (i > -1) return arr.filter((_, j) => j !== i);
  return [...arr, v];
};

export function MeetingWizard({ onClose, showToast }) {
  const [step, setStep] = useState(0);
  const [s, setS] = useState({
    mode: 'all',
    cls: [],
    subj: [],
    sec: [],
    ppl: [],
    day: 'Today',
    time: '16:00',
    dur: '1 h',
    venue: 'Staff room',
    title: 'Mid-term results review',
    agenda: '1. Mid-term results and S3 intervention plan\n2. Sports Day logistics\n3. AOB',
    rem: ['1 h before'],
    via: ['App', 'SMS'],
    rsvp: true,
    q: '',
    done: false,
  });
  const upd = (p) => setS((prev) => ({ ...prev, ...p }));

  const staffCount = useMemo(() => {
    if (s.mode === 'all') return 92;
    if (s.mode === 'class') return s.cls.length ? Math.min(78, Math.round(9 + (s.cls.length - 1) * 5.5)) : 0;
    if (s.mode === 'subject') return SUBJ.filter((x) => s.subj.includes(x[0])).reduce((a, x) => a + x[1], 0);
    if (s.mode === 'section') return SEC2.filter((x) => s.sec.includes(x[0])).reduce((a, x) => a + x[1], 0);
    return s.ppl.length;
  }, [s]);

  const steps = ['Invite', 'When', 'Venue', 'Send'];
  const titles = ['Who should attend?', 'Pick a date and time', 'Where will it take place?', 'Agenda and reminders'];
  const canNext = step === 0 ? staffCount > 0 : step === 3 ? s.title.trim().length > 0 : true;

  if (s.done) {
    return (
      <div className="wz-body">
        <div className="wdone">
          <div className="em"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg></div>
          <h3>Invites sent</h3>
          <p>{fmt(staffCount)} staff invited for {s.day} at {s.time} · {s.venue}</p>
        </div>
        <div className="wz-foot">
          <button className="next" style={{ flex: 1 }} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }

  const n = staffCount;
  const busy = s.time === '10:00' || s.time === '13:00' ? Math.round(n * 0.7) : s.time === '14:00' ? Math.round(n * 0.45) : Math.min(2, n);

  return (
    <>
      <div className="grab" />
      <div className="wz-head">
        <div className="wz-top">
          <small>Staff Meeting · Step {step + 1} of {steps.length}</small>
          <button onClick={onClose}><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>
        <h3>{titles[step]}</h3>
        <div className="wz-prog">{steps.map((_, i) => <i key={i} className={i < step ? 'on' : i === step ? 'cur' : ''} />)}</div>
        <div className="wz-steps">{steps.map((x, i) => <span key={x} className={i <= step ? 'on' : ''}>{x}</span>)}</div>
      </div>
      <div className="wz-body">
        {step === 0 && (
          <>
            <div className="src">Live from HR and Timetable · 92 staff · 86 on duty today</div>
            <div className="lbl2">Invite by</div>
            <div className="tabs2 five">
              {[['all', 'All'], ['class', 'Class'], ['subject', 'Subject'], ['section', 'Section'], ['people', 'People']].map(([k, l]) => (
                <button key={k} className={s.mode === k ? 'on' : ''} onClick={() => upd({ mode: k })}>{l}</button>
              ))}
            </div>
            {s.mode === 'all' && (
              <div className="chips">{SEC2.map(([n, c]) => <button key={n} className="on">{n} <small>{c}</small></button>)}</div>
            )}
            {s.mode === 'class' &&
              Object.keys(CLS).map((l) => (
                <div key={l}>
                  <div className="lvl">{l}</div>
                  <div className="grid3" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                    {classList.filter((c) => c.lvl === l).map((c) => (
                      <button key={c.id} className={s.cls.includes(c.id) ? 'on' : ''} onClick={() => upd({ cls: tg(s.cls, c.id) })}>
                        {c.id}<small>9 teachers</small>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            {s.mode === 'subject' && (
              <div className="chips">
                {SUBJ.map(([n, c]) => (
                  <button key={n} className={s.subj.includes(n) ? 'on' : ''} onClick={() => upd({ subj: tg(s.subj, n) })}>
                    {n} <small>{c}</small>
                  </button>
                ))}
              </div>
            )}
            {s.mode === 'section' && (
              <div className="chips">
                {SEC2.map(([n, c]) => (
                  <button key={n} className={s.sec.includes(n) ? 'on' : ''} onClick={() => upd({ sec: tg(s.sec, n) })}>
                    {n} <small>{c}</small>
                  </button>
                ))}
              </div>
            )}
            {s.mode === 'people' && (
              <>
                <div className="lbl2">Pick staff <small>{s.ppl.length} selected</small></div>
                <div className="searchin">
                  <input placeholder="Search name or role" value={s.q} onChange={(e) => upd({ q: e.target.value })} />
                </div>
                <div className="plist">
                  {STAFF.filter((x) => (x[0] + x[1]).toLowerCase().includes((s.q || '').toLowerCase())).map(([n, r, a]) => (
                    <div key={n} className={`pr ${s.ppl.includes(n) ? 'on' : ''}`} onClick={() => upd({ ppl: tg(s.ppl, n) })}>
                      <span className="pic">{a}</span>
                      <div><b>{n}</b><small>{r}</small></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {step === 1 && (
          <>
            <div className="lbl2">Date</div>
            <div className="grid3" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {[['Today', 'Wed 21'], ['Tomorrow', 'Thu 22'], ['Friday', 'Fri 23'], ['Monday', 'Mon 26']].map(([d, l]) => (
                <button key={d} className={s.day === d ? 'on' : ''} onClick={() => upd({ day: d })}>{d}<small>{l}</small></button>
              ))}
            </div>
            <div className="lbl2">Start time <small>checked against Timetable</small></div>
            <div className="grid3">
              {[['07:30', 'Before class'], ['10:00', 'Break'], ['13:00', 'Lunch'], ['14:00', 'Periods 6–7'], ['16:00', 'After class'], ['17:00', 'Evening']].map(([t, l]) => (
                <button key={t} className={s.time === t ? 'on' : ''} onClick={() => upd({ time: t })}>{t}<small>{l}</small></button>
              ))}
            </div>
            <div className="src" style={busy > 2 ? { background: '#FDE7E8', color: '#B4262B' } : {}}>
              {busy > 2 ? `${busy} of ${n} invitees are teaching at ${s.time}. Choose another time.` : `${n - busy} of ${n} invitees are free at ${s.time}.`}
            </div>
            <div className="lbl2">Duration</div>
            <div className="chips">
              {['30 min', '1 h', '1 h 30', '2 h'].map((d) => (
                <button key={d} className={s.dur === d ? 'on' : ''} onClick={() => upd({ dur: d })}>{d}</button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            {VEN.map(([v, sub, , cap]) => {
              const small = cap < n;
              const booked = v === 'Main hall' && s.time === '14:00';
              const dis = small || booked;
              return (
                <div
                  key={v}
                  className={`venue ${s.venue === v ? 'on' : ''} ${dis ? 'busy' : ''}`}
                  onClick={() => !dis && upd({ venue: v })}
                >
                  <div>
                    <b>{v}</b>
                    <small>{booked ? 'Booked 14:00–15:00 · S6 mock exam' : small ? `Too small for ${n} people` : sub}</small>
                  </div>
                  <span className="radio" />
                </div>
              );
            })}
            <div className="src">{s.venue} is free {s.day.toLowerCase()} at {s.time} and will be booked for you.</div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="lbl2">Title</div>
            <input className="txt" value={s.title} onChange={(e) => upd({ title: e.target.value })} />
            <div className="lbl2">Agenda</div>
            <textarea
              value={s.agenda}
              onChange={(e) => upd({ agenda: e.target.value })}
              rows={4}
              style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid var(--line)' }}
            />
            <div className="lbl2">Remind via</div>
            <div className="chips">
              {['App', 'SMS', 'Email'].map((v) => (
                <button key={v} className={s.via.includes(v) ? 'on' : ''} onClick={() => upd({ via: tg(s.via, v) })}>{v}</button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="wz-foot">
        {step > 0 && <button className="back" onClick={() => setStep((x) => x - 1)}>Back</button>}
        <div className="sum"><b>{staffCount}</b> staff invited{step > 0 ? ` · ${s.day}, ${s.time}` : ''}</div>
        <button
          className="next"
          disabled={!canNext}
          onClick={() => {
            if (step === steps.length - 1) {
              upd({ done: true });
              showToast('Invites sent');
            } else setStep((x) => x + 1);
          }}
        >
          {step === steps.length - 1 ? 'Send invites' : 'Next'}
        </button>
      </div>
    </>
  );
}
