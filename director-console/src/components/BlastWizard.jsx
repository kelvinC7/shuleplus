import { useState } from 'react';
import { useData } from '../auth/DataContext';
import { director } from '../lib/api/director';

export function BlastWizard({ scope, onClose, showToast }) {
  const { branches, selectedOrgId, context } = useData();
  const [audience, setAudience] = useState('parents');
  const [channel, setChannel] = useState('in_app');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const school = (branches || []).find((b) => b.id === (scope && scope !== 'all' ? scope : selectedOrgId)) || (branches || [])[0] || null;
  const orgId = school?.id || (selectedOrgId && selectedOrgId !== 'all' ? selectedOrgId : null);

  async function send() {
    if (!title.trim() || !message.trim()) return;
    setSending(true);
    try {
      await director.sendBroadcast({ title: title.trim(), body: message.trim(), audience, channel, organizationId: orgId || undefined });
      showToast?.('Broadcast sent');
      onClose?.();
    } catch {
      showToast?.('Failed to send broadcast');
    } finally {
      setSending(false);
    }
  }

  const field = { marginBottom: 14 };
  const label = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--navy)', marginBottom: 6 };
  const input = { width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1px solid var(--line, #e5e7eb)', fontSize: 14, background: '#fff', color: 'var(--navy)', outline: 'none' };
  const area = { ...input, height: 'auto', minHeight: 120, padding: 12, resize: 'vertical', lineHeight: 1.5 };
  const canSend = !sending && title.trim() && message.trim();

  return (
    <>
      <div className="grab" />
      <h3 style={{ fontSize: 18, marginBottom: 2 }}>New broadcast</h3>
      <p className="lead" style={{ marginBottom: 18 }}>{school?.name || school?.sh || context?.organizationName || 'School'} · live</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={field}>
          <label style={label}>Audience</label>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} style={input}>
            {[['parents', 'Parents'], ['staff', 'Staff'], ['students', 'Students'], ['all', 'Everyone']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={field}>
          <label style={label}>Channel</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} style={input}>
            {[['in_app', 'In-app'], ['sms', 'SMS'], ['email', 'Email'], ['push', 'Push']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div style={field}>
        <label style={label}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Broadcast title" style={input} />
      </div>

      <div style={{ ...field, marginBottom: 20 }}>
        <label style={label}>Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message…" rows={5} style={area} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="bigbtn ghost" style={{ flex: 1, height: 46 }} onClick={onClose} disabled={sending}>Cancel</button>
        <button className="bigbtn" style={{ flex: 1, height: 46, background: canSend ? 'var(--navy)' : undefined, color: canSend ? '#fff' : undefined }} onClick={send} disabled={!canSend}>
          {sending ? 'Sending…' : 'Send broadcast'}
        </button>
      </div>
    </>
  );
}
