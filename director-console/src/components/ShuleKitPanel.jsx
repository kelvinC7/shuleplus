import { useState } from 'react';
import { SK } from '../data/shulekit';

export function ShuleKitPanel({ onClose, showToast }) {
  const [tab, setTab] = useState('overview');
  const pct = Math.round((SK.sub / SK.learners) * 100);
  const tabs = ['overview', 'families', 'vouchers'];

  return (
    <>
      <div className="grab" />
      <h3>ShuleKit</h3>
      <p className="lead">Vouchers, savings and credit for every learner’s kit · closes {SK.cut}</p>
      <div className="seg" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {tabs.map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '8px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 12,
              background: tab === t ? 'var(--amber)' : '#f1f5f9', color: tab === t ? 'var(--navy)' : 'var(--muted)' }}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'overview' && (
        <>
          <div className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>{SK.sub} / {SK.learners} enrolled</b>
              <span className="chip green">{pct}%</span>
            </div>
            <div className="bar" style={{ height: 6, background: '#EEF0F4', borderRadius: 3, marginTop: 8 }}>
              <i style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--green)', borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Target {Math.round(SK.target * 100)}% · RWF {(SK.saved / 1e6).toFixed(1)}M saved · {(SK.order / 1e6).toFixed(1)}M ordered</div>
          </div>
          <div className="lbl2">Plans</div>
          {SK.plans.map(([n, c]) => (
            <div key={n} className="card" style={{ padding: 10, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>{n}</span><b>{c}</b>
            </div>
          ))}
          <div className="lbl2">By level</div>
          {SK.lvl.map(([l, a, tot]) => (
            <div key={l} className="hbar">
              <div className="r"><span>{l}</span><span>{a}/{tot}</span></div>
              <div className="t"><i style={{ width: `${(a / tot) * 100}%` }} /></div>
            </div>
          ))}
        </>
      )}
      {tab === 'families' && (
        <>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{SK.learners - SK.sub} families not yet enrolled for Term 1 2027</p>
          <button className="bigbtn amber" onClick={() => showToast('Blast to non-enrolled families')}>Message non-enrolled</button>
        </>
      )}
      {tab === 'vouchers' && (
        <>
          {SK.vouchers.map(([n, used, tot]) => (
            <div key={n} className="card" style={{ padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b>{n}</b>
                <span>{used}/{tot}</span>
              </div>
              <div className="bar" style={{ height: 4, background: '#EEF0F4', marginTop: 6, borderRadius: 2 }}>
                <i style={{ display: 'block', height: '100%', width: `${(used / tot) * 100}%`, background: 'var(--navy)', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </>
      )}
      <button className="bigbtn ghost" style={{ marginTop: 12 }} onClick={onClose}>Close</button>
    </>
  );
}
