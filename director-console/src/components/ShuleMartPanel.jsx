import { useState } from 'react';
import { SMA } from '../data/shulemart';
import { SMF } from '../data/smf';

export function ShuleMartPanel({ onClose, showToast }) {
  const [tab, setTab] = useState('overview');
  const tabs = ['overview', 'assets', 'credit'];
  const used = SMA.filter((a) => a.st !== 'closed').reduce((s, a) => s + (a.mon || 0) * (a.paid || 0), 0);
  const limit = SMF.limit;

  return (
    <>
      <div className="grab" />
      <h3>ShuleMart</h3>
      <p className="lead">Assets bought on credit through {SMF.lender}</p>
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
          <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="card kpi"><div className="num">{(limit / 1e6).toFixed(0)}M</div><div className="sub">Credit limit</div></div>
            <div className="card kpi"><div className="num">{SMF.score}</div><div className="sub">Score · Tier {SMF.tier}</div></div>
            <div className="card kpi"><div className="num">{SMA.filter((a) => a.st === 'current').length}</div><div className="sub">Active facilities</div></div>
            <div className="card kpi"><div className="num">{SMF.rate.split(',')[0]}</div><div className="sub">Rate</div></div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Review: {SMF.review}</p>
        </>
      )}
      {tab === 'assets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SMA.map((a) => (
            <div key={a.id} className="card" style={{ padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b style={{ fontSize: 13 }}>{a.n}</b>
                <span className={`chip ${a.st === 'current' ? 'green' : a.st === 'late' ? 'red' : 'navy'}`}>{a.st}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.cat} · {a.sup}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>RWF {(a.prin / 1e6).toFixed(1)}M · {a.paid}/{a.ten} months · {a.loc}</div>
            </div>
          ))}
        </div>
      )}
      {tab === 'credit' && (
        <>
          <div className="card" style={{ padding: 14 }}>
            <b>Available</b>
            <div className="num">RWF {((limit - used) / 1e6).toFixed(1)}M</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>of {(limit / 1e6).toFixed(0)}M limit</div>
          </div>
          <button className="bigbtn amber" style={{ marginTop: 12 }} onClick={() => showToast('New credit application')}>Apply for facility</button>
        </>
      )}
      <button className="bigbtn ghost" style={{ marginTop: 12 }} onClick={onClose}>Close</button>
    </>
  );
}
