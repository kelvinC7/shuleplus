'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { TransportPortalShell } from '@/components/transport/transport-portal-shell';
import { useTransportLocale } from '@/contexts/transport-locale-context';
import { ISSUE_TYPE_KEYS } from '@/lib/transport-i18n';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/auth-context';

type IssueReport = {
  id: string;
  issueType: string;
  details: string;
  status: string;
  schoolNote: string | null;
  createdAt: string;
};

export default function TransportReportPage() {
  const { t } = useTransportLocale();
  const { studentParams } = useAuth();
  const [history, setHistory] = useState<IssueReport[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const { data: res } = await api.get('/transport/issue-reports', { params: studentParams });
      setHistory(res.data ?? []);
    } catch {
      setHistory([]);
    }
  }, [studentParams]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setMessage(null);
    try {
      await api.post('/transport/issue-reports', {
        issueType: fd.get('issueType'),
        details: fd.get('details'),
        ...studentParams,
      });
      setMessage(t('report.thanks'));
      e.currentTarget.reset();
      await loadHistory();
    } catch {
      setMessage('Could not send report. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <TransportPortalShell title={t('report.title')}>
      {() => (
        <div className="grid gap-4 lg:grid-cols-2">
          <form className="hr-card mx-auto w-full max-w-lg space-y-3 p-5 lg:max-w-none" onSubmit={(e) => void onSubmit(e)}>
            <p className="text-sm text-muted">{t('report.intro')}</p>
            <label className="block text-sm">
              <span className="text-muted">{t('report.type')}</span>
              <select className="input mt-1 w-full" name="issueType" required>
                {ISSUE_TYPE_KEYS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.key)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted">{t('report.details')}</span>
              <textarea className="input mt-1 min-h-[120px] w-full" name="details" required />
            </label>
            {message ? <p className="text-sm font-semibold text-navy">{message}</p> : null}
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? '…' : t('report.send')}
            </button>
          </form>
          <div className="hr-card p-5">
            <p className="font-semibold text-navy">{t('report.history')}</p>
            <ul className="mt-3 space-y-2">
              {history.length === 0 ? (
                <li className="text-sm text-muted">{t('report.none')}</li>
              ) : (
                history.map((r) => (
                  <li key={r.id} className="rounded-xl border border-slate-100 px-3 py-2">
                    <p className="text-sm font-semibold text-navy">{r.issueType.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted">
                      {r.status} · {new Date(r.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs">{r.details}</p>
                    {r.schoolNote ? <p className="mt-1 text-xs text-sky-800">School: {r.schoolNote}</p> : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </TransportPortalShell>
  );
}
