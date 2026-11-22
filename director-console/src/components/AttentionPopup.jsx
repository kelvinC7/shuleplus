import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { iam } from '../lib/api/iam';

const FALLBACK = [
  { type: 'hot', title: 'Unknown visitor at Gate B', body: 'Not on the visitor list. Guard notified.', t: '2 min ago · Security', action: 'cam7' },
  { type: 'warm', title: 'Bus 2 running 12 min late', body: 'Nkanka route · 41 students on board', t: '6 min ago · Smart Transport', action: 'buses' },
  { type: 'cool', title: 'Babyeyi circular ready to sign', body: 'Term 1 2027 fees and requirements', t: '1 h ago · Circulars', action: 'approve' },
];

export function AttentionPopup({ open, onClose, onAction }) {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState(FALLBACK);

  useEffect(() => {
    if (!open || !token) return;
    let on = true;
    Promise.all([iam.repAlerts(token).catch(()=>null), iam.notifications(token).catch(()=>null)]).then(([a, n]) => {
      if (!on) return;
      const arrA = Array.isArray(a) ? a : a?.alerts || a?.items || a?.data || [];
      const arrN = Array.isArray(n) ? n : n?.notifications || n?.items || n?.data || [];
      const mapItem = (x, i) => {
        const sev = String(x.severity || x.level || x.priority || '').toLowerCase();
        const type = /critical|high|error|danger|red/.test(sev) ? 'hot' : /warn|medium|amber/.test(sev) ? 'warm' : 'cool';
        const when = x.createdAt || x.timestamp || x.time;
        const t = when ? new Date(when).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : (x.timeLabel || '');
        return { type, title: x.title || x.subject || x.name || 'Alert', body: x.body || x.message || x.description || '', t, action: x.action || (String(x.category||'').toLowerCase().includes('approv') ? 'approve' : null) };
      };
      const merged = [...arrA.map(mapItem), ...arrN.filter(x=>x.read===false||x.isRead===false||x.unread).map(mapItem)].slice(0,5);
      if (merged.length) setAlerts(merged);
    });
    return () => { on = false; };
  }, [open, token]);

  if (!open) return null;
  return (
    <div className="apop on" role="dialog" aria-modal="true" aria-label="Needs your attention" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ac">
        <div className="ah">
          <span className="cnt">{alerts.length}</span>
          <b>Needs your attention</b>
          <button onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="al">
          {alerts.map((a, idx) => (
            <div
              key={a.title + idx}
              className={`alert ${a.type}`}
              onClick={() => {
                onClose();
                onAction?.(a.action);
              }}
            >
              <div className="ai">
                <svg viewBox="0 0 24 24">
                  <path d="m10.29 3.86-8.47 14.7A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3l-8.47-14.7a2 2 0 0 0-3.42 0z" />
                  <path d="M12 9v4M12 17h.01" />
                </svg>
              </div>
              <div>
                <b>{a.title}</b>
                <p>{a.body}</p>
                <span className="t">{a.t}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="af">
          <button className="g" onClick={onClose}>Later</button>
          <button className="p" onClick={() => { onClose(); onAction?.('approve'); }}>See all approvals</button>
        </div>
      </div>
    </div>
  );
}

export function useAttentionOnce() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('attnSeen') === '1'; } catch {}
    if (!seen) {
      const t = setTimeout(() => {
        setOpen(true);
        try { sessionStorage.setItem('attnSeen', '1'); } catch {}
      }, 1400);
      return () => clearTimeout(t);
    }
  }, []);
  return [open, setOpen];
}
