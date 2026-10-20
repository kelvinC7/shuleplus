'use client';

import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';

type Props = {
  open: boolean;
  onClose: () => void;
  studentIds: string[];
  studentLabels?: string[];
  onSent?: () => void;
};

export function SendReminderModal({ open, onClose, studentIds, studentLabels, onSent }: Props) {
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [channels, setChannels] = useState({ sms: true, email: true, push: true, inApp: true });
  const [customize, setCustomize] = useState(false);
  const [message, setMessage] = useState('');

  async function send() {
    setSending(true);
    try {
      const { data } = await api.post('/reminders/send-now', {
        studentIds,
        channels,
        event: 'PAYMENT_OVERDUE',
        message: customize ? message : undefined,
        combineSiblings: true,
      });
      toast.success(`Reminder queued for ${data.data?.recipients ?? 0} parent(s)`);
      onSent?.();
      onClose();
    } catch {
      toast.error('Could not send reminders');
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-navy/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-navy">Send Payment Reminder</h3>
            <p className="text-sm text-muted">{studentIds.length} student(s) selected</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-4 px-5 py-4">
          {studentLabels?.length ? (
            <ul className="max-h-24 overflow-y-auto rounded-xl border border-border bg-slate-50 p-3 text-sm">
              {studentLabels.map((l) => (
                <li key={l} className="text-navy">{l}</li>
              ))}
            </ul>
          ) : null}
          <div>
            <p className="mb-2 text-xs font-bold uppercase text-muted">Channels</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(['sms', 'email', 'push', 'inApp'] as const).map((ch) => (
                <label key={ch} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <input
                    type="checkbox"
                    checked={channels[ch]}
                    onChange={(e) => setChannels((c) => ({ ...c, [ch]: e.target.checked }))}
                  />
                  {ch === 'sms' ? 'SMS (eligible only)' : ch === 'inApp' ? 'In-App' : ch.charAt(0).toUpperCase() + ch.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={customize} onChange={(e) => setCustomize(e.target.checked)} />
            Customize message
          </label>
          {customize ? (
            <textarea className="input min-h-[80px] w-full text-sm" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Use {{student_name}}, {{balance}}, {{due_date}}, {{payment_link}}" />
          ) : (
            <p className="text-xs text-muted">Uses default overdue template with payment link</p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" disabled={sending || !studentIds.length} onClick={() => void send()}>
            <Send size={14} /> {sending ? 'Sending…' : 'Send reminder'}
          </button>
        </div>
      </div>
    </div>
  );
}
