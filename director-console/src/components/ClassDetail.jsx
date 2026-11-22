import { useState } from 'react';
import { TT } from '../data/timetable';
import { COMB } from '../data/comb';
import { STAFF } from '../data/wizardData';

function rowsFromTT() {
  return (Array.isArray(TT) ? TT : []).map((x) =>
    Array.isArray(x)
      ? { c: x[0], sub: x[1], t: x[2], room: x[3], topic: x[4], st: x[5], n: 40, present: 38 }
      : x
  );
}

export function ClassDetail({ classId, onClose, showToast, onAssignCover }) {
  const rows = rowsFromTT();
  const x = rows.find((t) => t.c === classId) || rows[0] || { c: classId, sub: '—', t: '—', room: '—', topic: '', st: 'in', n: 40, present: 38 };
  const combo = COMB[classId];
  const [coverMode, setCoverMode] = useState(false);
  const [sel, setSel] = useState('');

  const freeStaff = STAFF.slice(0, 6);

  if (coverMode) {
    return (
      <>
        <div className="grab" />
        <h3>Assign cover · {x.c}</h3>
        <p className="lead">{x.sub} · was {x.t}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {freeStaff.map(([n, r]) => (
            <button
              key={n}
              className={`card ${sel === n ? 'on' : ''}`}
              style={{ padding: 12, textAlign: 'left', border: sel === n ? '2px solid var(--amber)' : '1px solid #e5e7eb', background: '#fff' }}
              onClick={() => setSel(n)}
            >
              <b>{n}</b>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r}</div>
            </button>
          ))}
        </div>
        <button
          className="bigbtn amber"
          style={{ marginTop: 12 }}
          disabled={!sel}
          onClick={() => {
            showToast(`${sel.split(' ')[0]} is covering ${x.c}`);
            onAssignCover?.(x.c, sel);
            onClose();
          }}
        >
          Confirm cover
        </button>
        <button className="bigbtn ghost" style={{ marginTop: 8 }} onClick={() => setCoverMode(false)}>Back</button>
      </>
    );
  }

  return (
    <>
      <div className="grab" />
      <h3>{x.c}{combo ? ` · ${combo}` : ''} · {x.room}</h3>
      <p className="lead">{x.sub} · {x.t}</p>
      <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card kpi"><div className="num">{x.present || 38}<span> / {x.n || 40}</span></div><div className="sub">Present</div></div>
        <div className="card kpi"><div className="num">{(x.n || 40) - (x.present || 38)}</div><div className="sub">Absent</div></div>
      </div>
      {x.topic && <div className="card" style={{ marginTop: 10, padding: 12, fontSize: 13 }}><b>Topic</b><div style={{ color: 'var(--muted)' }}>{x.topic}</div></div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="bigbtn amber" style={{ flex: 1 }} onClick={() => setCoverMode(true)}>Assign cover</button>
        <button className="bigbtn ghost" style={{ flex: 1 }} onClick={() => showToast('Auto-cover suggested')}>Auto cover</button>
      </div>
      <button className="bigbtn ghost" style={{ marginTop: 8 }} onClick={onClose}>Close</button>
    </>
  );
}
