import { groups, P } from '../data/modules';
import { I } from '../utils/icons';

export function ConsoleView({ showToast, onOpenBlast, onOpenQuick, onOpenSOS }) {
  return (
    <section className="view active" id="v-console">
      <div className="ph">
        <div className="toprow">
          <div className="school">
            <div className="crest">SM</div>
            <div>
              <small>SHULE+ ERP</small>
              <b>Console</b>
            </div>
          </div>
          <button className="iconbtn" onClick={() => showToast('Settings')}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
        <button className="scopechip">All 6 schools ▾</button>
        <h2>Every module, one console</h2>
        <p>Open any part of Shule+ with full director rights</p>
        <div className="search">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          Search students, staff, receipts…
        </div>
      </div>
      <div className="bcast">
        <button onClick={() => onOpenBlast?.()}>
          <span className="bi">
            <svg viewBox="0 0 24 24">
              <path d="m3 11 18-8-8 18-2-8z" />
            </svg>
          </span>
          <span className="bt">
            <b>Broadcast</b>
            <small>Message parents, students or staff by app and SMS</small>
          </span>
          <span className="bg">›</span>
        </button>
      </div>
      <div id="modules">
        {groups.map(([g, ms]) => (
          <div key={g}>
            <div className="modsec">{g}</div>
            <div className="mods">
              {ms.map((m) => (
                <button
                  key={m.n}
                  className="mod"
                  onClick={() => onOpenQuick?.(m.n)}
                >
                  <span className={`st ${m.w ? 'w' : ''}`} />
                  <span className="mi">
                    <svg viewBox="0 0 24 24">{P[m.p] || I.user}</svg>
                  </span>
                  <div>
                    <b>{m.n}</b>
                    <br />
                    <small>{m.s}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ height: 20 }} />
      </div>
    </section>
  );
}
