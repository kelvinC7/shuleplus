'use client';

import { useEffect, useState } from 'react';
import { Bell, Languages, Radio } from 'lucide-react';
import { TransportSectionShell } from '@/components/transport/transport-section-shell';
import { useTransportLocale } from '@/contexts/transport-locale-context';
import { useTransportWebPush } from '@/hooks/use-transport-web-push';
import { api } from '@/services/api';
import type { TransportLocale } from '@/lib/transport-i18n';
import { Switch } from '@/components/ui/switch';

type Prefs = {
  transportNotifications: { sms: boolean; push: boolean; inApp: boolean };
  preferredLanguage: string;
};

export default function TransportSettingsPage() {
  const { t, locale, setLocale } = useTransportLocale();
  const { pushActive, busy, enablePush, prefs, updateTransportPrefs } = useTransportWebPush();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api.get('/notification-preferences');
  }, []);

  async function saveLanguage(code: TransportLocale) {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch('/notification-preferences', { preferredLanguage: code });
      setLocale(code);
      setMessage(t('settings.saved'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <TransportSectionShell title={t('settings.title')}>
      <div className="mx-auto max-w-lg space-y-4 pb-[env(safe-area-inset-bottom)]">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="flex items-center gap-2 font-semibold text-navy">
            <Languages className="size-4 text-primary" />
            {t('settings.language')}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(['en', 'rw', 'fr'] as TransportLocale[]).map((code) => (
              <button
                key={code}
                type="button"
                disabled={saving}
                onClick={() => void saveLanguage(code)}
                className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${
                  locale === code ? 'bg-navy text-primary' : 'border border-slate-200 text-navy'
                }`}
              >
                {code === 'rw' ? 'Kinyarwanda' : code === 'en' ? 'English' : 'Français'}
              </button>
            ))}
          </div>
          {message ? <p className="mt-2 text-sm text-navy">{message}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="flex items-center gap-2 font-semibold text-navy">
            <Bell className="size-4 text-primary" />
            {t('settings.transportChannels')}
          </p>
          <div className="mt-3 space-y-2">
            {(['inApp', 'push', 'sms'] as const).map((key) => (
              <label
                key={key}
                className="flex min-h-12 items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <span className="text-sm font-medium text-navy">
                  {key === 'inApp' ? t('notifications.inApp') : t(`notifications.${key}`)}
                </span>
                <Switch
                  checked={prefs?.transportNotifications[key] ?? true}
                  disabled={busy || !prefs}
                  onCheckedChange={(checked) => void updateTransportPrefs({ [key]: checked })}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
          <p className="flex items-center gap-2 font-semibold text-navy">
            <Radio className="size-4 text-primary" />
            {t('settings.pushBrowser')}
          </p>
          <p className="mt-1 text-sm text-muted">
            {pushActive ? 'Enabled on this browser.' : 'Allow alerts when the portal is closed.'}
          </p>
          {!pushActive ? (
            <button type="button" className="btn-primary mt-3 min-h-11 w-full" disabled={busy} onClick={() => void enablePush()}>
              {t('settings.pushEnable')}
            </button>
          ) : null}
        </div>
      </div>
    </TransportSectionShell>
  );
}
