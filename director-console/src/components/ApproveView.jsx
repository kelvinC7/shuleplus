import { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../auth/DataContext';
import { useAuth } from '../auth/AuthContext';
import { director } from '../lib/api/director';

const fmtAmt = (n) => n == null ? '' : `RWF ${Math.round(Number(n)).toLocaleString('en-US')}`;
const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return 'Due today';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export function ApproveView({ scope, showToast }) {
  const { branches } = useData();
  const { token } = useAuth();
  const BR = Array.isArray(branches) ? branches : [];
  const brOf = (id) => BR.find((b) => b.id === id);

  const [statusTab, setStatusTab] = useState('PENDING');
  const [data, setData] = useState({ items: [], stats: null, categories: [] });
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);

  const orgId = scope && scope !== 'all' ? scope : (BR[0]?.id || undefined);

  const load = useCallback(async () => {
    if (!token || !orgId) { setData({ items: [], stats: null, categories: [] }); return; }
    setLoading(true);
    try {
      const res = await director.approvals(token, { status: statusTab === 'ALL' ? undefined : statusTab, organizationId: orgId, page: 1, pageSize: 25 });
      setData({
        items: Array.isArray(res?.items) ? res.items : [],
        stats: res?.stats || null,
        categories: Array.isArray(res?.categories) ? res.categories : [],
      });
    } catch (e) {
      console.warn('approvals load failed', e);
      setData({ items: [], stats: null, categories: [] });
    } finally { setLoading(false); }
  }, [token, orgId, statusTab]);

  useEffect(() => { load(); }, [load]);

  const items = data.items;
  const stats = data.stats || {};
  const cats = useMemo(() => ['PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'ALL'], []);

  const decide = async (item, ok) => {
    if (!token) return;
    let body = { action: ok ? 'APPROVED' : 'REJECTED' };
    if (!ok) {
      const reason = window.prompt('Reason for rejection (required):', '');
      if (reason == null) return;
      if (!String(reason).trim()) { showToast('Rejection reason is required'); return; }
      body.reason = String(reason).trim();
    }
    setActing(item.id);
    try {
      await director.decideApproval(token, item.id, body);
      showToast(ok ? 'Approved' : 'Rejected');
      await load();
    } catch (e) {
      showToast(e?.message || 'Action failed');
    } finally { setActing(null); }
  };

  const schoolLabel = brOf(orgId)?.sh || brOf(orgId)?.name || (orgId ? 'School' : '');

  return (
    <section className="view active" id="v-approve">
      <div className="ph">
        <div className="toprow">
          <div className="school">
            <div className="crest">{(brOf(orgId)?.cr || 'AP').slice(0,2)}</div>
            <div>
              <small>DECISIONS</small>
              <b>Approvals</b>
            </div>
          </div>
          <button className="iconbtn" onClick={load} aria-label="Refresh">
            <svg viewBox="0 0 24 24">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5M12 7v5l3 2" />
            </svg>
          </button>
        </div>
        <button className="scopechip">{schoolLabel ? `${schoolLabel} ↗` : 'School ↗'}</button>
        <h2 id="apTitle">
          {loading ? 'Loading…' : (statusTab === 'PENDING' ? ((stats.pending ?? items.length) ? `${stats.pending ?? items.length} waiting for you` : 'All caught up') : `${items.length} ${statusTab.toLowerCase().replace('_',' ')}`)}
        </h2>
        <p>Requests routed to you for this school</p>
        <div className="apcount">
          <div>
            <b>{fmtAmt(stats.pendingAmount).replace('RWF ','') || '0'}</b>
            <small>RWF pending</small>
          </div>
          <div>
            <b>{stats.dueToday ?? 0}</b>
            <small>Due today</small>
          </div>
          <div>
            <b>{stats.approved ?? 0}</b>
            <small>Approved</small>
          </div>
        </div>
      </div>
      <div className="seg" id="apfilter">
        {cats.map((c) => (
          <button key={c} className={c === statusTab ? 'on' : ''} onClick={() => setStatusTab(c)}>
            {c === 'CHANGES_REQUESTED' ? 'Changes' : c === 'ALL' ? 'All' : c.charAt(0) + c.slice(1).toLowerCase()}
            {c === 'PENDING' ? ` (${stats.pending ?? 0})` : ''}
          </button>
        ))}
      </div>
      <div id="aplist">
        {items.map((a) => {
          const due = fmtDate(a.dueDate);
          const isDueToday = due === 'Due today';
          return (
            <div key={a.id || a.reference} className="card ap">
              <div className="h">
                <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <span className={`chip ${a.priority === 'HIGH' || a.priority === 'URGENT' ? 'red' : a.priority === 'LOW' ? 'green' : 'amber'}`}>{(a.category || 'Request').replace(/_/g,' ')}</span>
                  <span className="chip navy">{schoolLabel || a.organizationId || 'School'}</span>
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: isDueToday ? 'var(--red)' : 'var(--muted)' }}>{due || a.status}</span>
              </div>
              <h4>{a.title || a.reference || 'Approval request'}</h4>
              <p>{a.description || ''}</p>
              {a.amount != null && <div className="amt">{fmtAmt(a.amount)}</div>}
              {Array.isArray(a.workflowSteps) && a.workflowSteps.length > 0 && (
                <div className="steps">
                  {a.workflowSteps.map((s, i) => (
                    <span key={i} className={s.status === 'done' || s.status === 'ok' || s.status === 'approved' ? 'ok' : s.status === 'current' || s.status === 'me' ? 'me' : ''}>
                      {(s.status === 'done' || s.status === 'ok' || s.status === 'approved') ? '✓ ' : ''}{s.name || s.label || s}
                      {i < a.workflowSteps.length - 1 && (<span style={{ background: 'none', padding: 0 }}> → </span>)}
                    </span>
                  ))}
                </div>
              )}
              <div className="who">
                <span className="mini">{String(a.requester || '?').split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()}</span>
                {a.requester}{a.requesterRole ? `, ${a.requesterRole}` : ''}
              </div>
              {a.status === 'PENDING' && (
                <div className="btns">
                  <button className="no" disabled={acting === a.id} onClick={() => decide(a, false)}>Decline</button>
                  <button className="yes" disabled={acting === a.id} onClick={() => decide(a, true)}>{acting === a.id ? '…' : 'Approve'}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="empty" id="apempty" style={{ display: (!loading && items.length === 0) ? 'block' : 'none' }}>
        <div className="em">
          <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <b>{statusTab === 'PENDING' ? 'All caught up' : 'No requests'}</b>
        <p>{statusTab === 'PENDING' ? 'Nothing is waiting for your signature. New requests will appear here instantly.' : 'No requests in this state.'}</p>
      </div>
    </section>
  );
}
