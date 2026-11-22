import { TT } from '../data/timetable';

export function TeachingSheet({ onClose, showToast, onOpenClass }) {
  const list = Array.isArray(TT) ? TT : [];
  // Original TT rows: [class, subject, teacher, room, topic, status]
  const rows = list.map((x) => {
    if (Array.isArray(x)) {
      return { c: x[0], sub: x[1], t: x[2], room: x[3], topic: x[4], st: x[5] };
    }
    return x;
  });
  const cov = rows.filter((x) => x.st === 'cov');
  const late = rows.filter((x) => x.st === 'late');
  const live = rows.filter((x) => x.st === 'in' || x.st === 'ok' || !x.st).slice(0, 14);

  return (
    <>
      <div className="grab" />
      <h3>Teaching now</h3>
      <p className="lead">Live from Timetable · Period in session</p>
      {(cov.length > 0 || late.length > 0) && (
        <div className="card" style={{ marginBottom: 12 }}>
          {cov.length > 0 && (
            <div className="cover" style={{ marginTop: 0 }}>
              <span className="chip navy">Cover</span>
              <span>
                {cov.map((x) => (
                  <span key={x.c + x.sub}>
                    <b>{x.c}</b> {x.sub}{' '}
                  </span>
                ))}
                · arranged by the Director of Studies
              </span>
            </div>
          )}
          {late.length > 0 && (
            <div className="cover" style={{ marginTop: cov.length ? 8 : 0 }}>
              <span className="chip amber">Late start</span>
              <span>
                <b>{late.map((x) => x.c + ' ' + x.sub).join(', ')}</b> started late
              </span>
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
        {(live.length ? live : rows.slice(0, 12)).map((x, i) => (
          <div key={i} className="card" style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => onOpenClass?.(x.c)}>
            <div>
              <b>{x.c || 'Class'}</b>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {x.sub} · {x.t || '—'}
                {x.room ? ` · ${x.room}` : ''}
              </div>
              {x.topic && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{x.topic}</div>}
            </div>
            <span className={`chip ${x.st === 'cov' ? 'navy' : x.st === 'late' ? 'amber' : 'green'}`}>
              {x.st === 'cov' ? 'Cover' : x.st === 'late' ? 'Late' : 'In session'}
            </span>
          </div>
        ))}
      </div>
      <button
        className="bigbtn amber"
        style={{ marginTop: 16 }}
        onClick={() => {
          showToast('Full timetable');
          onClose();
        }}
      >
        Full timetable
      </button>
    </>
  );
}
