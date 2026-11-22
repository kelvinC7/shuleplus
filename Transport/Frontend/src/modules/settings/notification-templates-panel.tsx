'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Languages, MessageSquare, Save } from 'lucide-react';
import { transportApi, type NotificationTemplate, type TransportEventType } from '@/services/transport-api';
import { getApiErrorMessage } from '@/utils/api-error';
import { useToast } from '@/shared/notifications';

const EVENT_LABELS: Record<TransportEventType, string> = {
  BOARDING_TO_SCHOOL: 'Morning bus boarding',
  ARRIVED_AT_SCHOOL: 'Arrival at school',
  BOARDING_TO_HOME: 'Afternoon bus boarding',
  DROPPED_OFF_HOME: 'Home drop-off',
  ROUTE_PICKUP_STARTED: 'Route pickup started (parent heads-up)',
  ROUTE_HOME_STARTED: 'Home route started (parent heads-up)',
  TRIP_DELAY: 'Trip delay',
  TRIP_CANCELLED: 'Trip cancelled',
  EXCEPTION: 'Exception / alert',
};

const LANG_LABELS = { RW: 'Kinyarwanda', EN: 'English', FR: 'French' } as const;

export function NotificationTemplatesPanel() {
  const toast = useToast();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [lang, setLang] = useState<'RW' | 'EN' | 'FR'>('RW');
  const [channel, setChannel] = useState('SMS');
  const [drafts, setDrafts] = useState<Record<string, { title: string; body: string; isActive: boolean }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await transportApi.notificationTemplates();
      const rows = data.data ?? [];
      setTemplates(rows);
      setDrafts(
        Object.fromEntries(rows.map((t) => [t.id, { title: t.title, body: t.body, isActive: t.isActive }]))
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load templates'));
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      templates.filter(
        (t) => t.language === lang && (channel === 'ALL' ? true : t.channel === channel)
      ),
    [templates, lang, channel]
  );

  async function saveTemplate(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    try {
      await transportApi.updateNotificationTemplate(id, draft);
      toast.success('Template saved');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Save failed'));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="hr-card space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-navy">
          <MessageSquare size={16} className="text-primary" /> SMS & in-app templates
        </h2>
        <p className="mt-1 text-xs text-muted">
          Placeholders: {'{{studentName}}'}, {'{{busCode}}'}, {'{{time}}'}, {'{{routeName}}'}, {'{{schoolName}}'},{' '}
          {'{{stopName}}'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-1 text-xs font-semibold text-muted">
          <Languages size={14} /> Language
        </span>
        {(['RW', 'EN', 'FR'] as const).map((l) => (
          <button
            key={l}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              lang === l ? 'bg-navy text-primary' : 'bg-slate-100 text-navy'
            }`}
            onClick={() => setLang(l)}
          >
            {LANG_LABELS[l]}
          </button>
        ))}
        <select
          className="input ml-auto max-w-[140px] py-1.5 text-xs"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
        >
          <option value="SMS">SMS</option>
          <option value="APP">In-app</option>
          <option value="ALL">All channels</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted">No templates for this filter. Open Transport settings and save once to load defaults.</p>
        ) : (
          filtered.map((t) => {
            const draft = drafts[t.id] ?? { title: t.title, body: t.body, isActive: t.isActive };
            return (
              <div key={t.id} className="rounded-xl border border-border bg-white p-3 sm:p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-navy">
                      {EVENT_LABELS[t.eventType as TransportEventType] ?? t.eventType}
                    </p>
                    <p className="text-[10px] uppercase text-muted">
                      {t.channel} · {t.language}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={draft.isActive}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [t.id]: { ...draft, isActive: e.target.checked } }))
                      }
                    />
                    Active
                  </label>
                </div>
                <input
                  className="input mb-2 text-sm"
                  value={draft.title}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [t.id]: { ...draft, title: e.target.value } }))
                  }
                />
                <textarea
                  className="input min-h-[88px] resize-y text-sm"
                  value={draft.body}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [t.id]: { ...draft, body: e.target.value } }))
                  }
                />
                <button
                  type="button"
                  className="btn-secondary mt-2 text-xs"
                  disabled={savingId === t.id}
                  onClick={() => void saveTemplate(t.id)}
                >
                  <Save size={14} /> {savingId === t.id ? 'Saving…' : 'Save template'}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
