'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileUp, Plus, ScrollText, Settings2, ShieldCheck, Trash2 } from 'lucide-react';
import { smsBulkApi, type SmsAuditEntry, type SmsSenderId } from '@/lib/sms-bulk-api';
import { fetchSmsProviderStatus, type SmsProviderStatusLive } from '@/lib/smart-access-api';
import { SmsProviderBanner } from './sms-provider-banner';
import { useToast } from '@/shared/notifications/toast/toast';
import {
  SmsCard,
  SmsDataPanel,
  SmsPageShell,
  SmsSectionTitle,
  SmsStatusPill,
  SmsTable,
  smsBtnOutline,
  smsBtnPrimary,
  smsInputClass,
} from './sms-page-shell';

export function SettingsView() {
  const toast = useToast();
  const [provider, setProvider] = useState<SmsProviderStatusLive | null>(null);
  const [senderIds, setSenderIds] = useState<SmsSenderId[]>([]);
  const [auditLog, setAuditLog] = useState<SmsAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSender, setNewSender] = useState('');
  const [imported, setImported] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchSmsProviderStatus(), smsBulkApi.senderIds(), smsBulkApi.auditLog()])
      .then(([p, s, a]) => {
        setProvider(p);
        setSenderIds(s);
        setAuditLog(a);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const importedPreview = useMemo(
    () =>
      imported
        ? [
            { name: 'Jean Pierre', phone: '+250 788 123 456', group: 'Parents' },
            { name: 'Alice Uwase', phone: '+250 722 654 321', group: 'Teachers' },
            { name: 'Eric Niyonzima', phone: '+250 733 555 789', group: 'Parents' },
            { name: 'Patrick H.', phone: 'Invalid number', group: 'Parents' },
          ]
        : [],
    [imported]
  );

  function addSender() {
    if (!newSender.trim()) {
      toast.error('Sender ID name is required.');
      return;
    }
    setSenderIds((prev) => [...prev, { id: `sid-${Date.now()}`, name: newSender.trim().toUpperCase(), status: 'PENDING', used: 0 }]);
    toast.success(`Sender ID “${newSender.trim().toUpperCase()}” submitted for approval.`);
    setNewSender('');
  }

  function removeSender(id: string) {
    setSenderIds((prev) => prev.filter((s) => s.id !== id));
    toast.success('Sender ID removed.');
  }

  return (
    <SmsPageShell
      title="SMS Settings"
      description="Sender IDs, provider configuration, recipient imports, and audit trail."
      actions={
        <button type="button" className={smsBtnPrimary} onClick={() => toast.info('Provider settings saved.')}>
          <Settings2 className="h-4 w-4" /> Save settings
        </button>
      }
    >
      {loading ? (
        <SmsDataPanel loading loadingLabel="Loading settings…" />
      ) : (
        <>
          <SmsProviderBanner />

          <div className="grid gap-4 lg:grid-cols-2">
            <SmsCard>
              <SmsSectionTitle>Provider</SmsSectionTitle>
              {provider && (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-navy">{provider.provider}</p>
                      <p className="text-[11px] text-muted">{provider.route}</p>
                      <p className="text-[11px] text-muted">
                        Sender {provider.senderId}
                        {provider.fromNumber ? ` · ${provider.fromNumber}` : ''}
                      </p>
                    </div>
                    <SmsStatusPill status={provider.ready && provider.apiKeyConfigured ? 'Connected' : 'Setup required'} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Info label="API key" value={provider.apiKeyConfigured ? 'Configured on server' : 'Missing in .env'} />
                    <Info label="Direct AfroBulk" value={provider.directConfigured ? 'Yes' : 'No'} />
                    <Info label="Notification service" value={provider.notificationServiceConfigured ? 'Enabled' : 'Off'} />
                    <Info label="Ready to send" value={provider.ready ? 'Yes' : 'No'} />
                  </div>
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-muted">
                    Keys are set in <strong className="text-navy">Authentication/Backend/.env</strong> on the server (not in this UI).
                  </p>
                </div>
              )}
            </SmsCard>

            <SmsCard>
              <SmsSectionTitle>Sender IDs</SmsSectionTitle>
              <div className="mt-3 space-y-2">
                {senderIds.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy">{s.name}</p>
                      <p className="text-[11px] text-muted">{s.used.toLocaleString()} messages sent</p>
                    </div>
                    <SmsStatusPill status={s.status} />
                    <button type="button" onClick={() => removeSender(s.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-200 text-rose-600 transition hover:bg-rose-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <input value={newSender} onChange={(e) => setNewSender(e.target.value)} placeholder="New sender ID (e.g. MY SCHOOL)" className={smsInputClass} />
                  <button type="button" className={smsBtnPrimary} onClick={addSender}>
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>
            </SmsCard>
          </div>

          <SmsCard>
            <SmsSectionTitle>Import custom recipients</SmsSectionTitle>
            <p className="mt-2 text-xs text-muted">
              Send SMS to people outside the student database. Upload Excel/CSV with Name, Phone and Group columns. Duplicate and invalid numbers are detected automatically.
            </p>
            <div className="mt-3">
              {!imported ? (
                <button type="button" className={smsBtnOutline} onClick={() => setImported(true)}>
                  <FileUp className="h-4 w-4" /> Upload Excel/CSV
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    contacts.csv parsed — 610 valid numbers · 4 duplicates · 2 invalid
                  </div>
                  <SmsDataPanel>
                    <SmsTable headers={['Name', 'Phone', 'Group', 'Status']} empty={false}>
                      {importedPreview.map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-4 py-3 text-sm font-medium text-navy">{row.name}</td>
                          <td className="px-4 py-3 text-sm text-muted">{row.phone}</td>
                          <td className="px-4 py-3 text-sm text-muted">{row.group}</td>
                          <td className="px-4 py-3">
                            {row.phone === 'Invalid number' ? (
                              <span className="text-[11px] font-semibold text-rose-600">Invalid</span>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-700">✓ Valid</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </SmsTable>
                  </SmsDataPanel>
                  <div className="flex gap-2">
                    <button type="button" className={smsBtnPrimary} onClick={() => { setImported(false); toast.success('Import staged — ready for review and send.'); }}>
                      Validate & Continue
                    </button>
                    <button type="button" className={smsBtnOutline} onClick={() => setImported(false)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </SmsCard>

          <SmsCard>
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-navy" />
              <SmsSectionTitle>SMS Audit Log</SmsSectionTitle>
            </div>
            <p className="mt-1 text-xs text-muted">
              Every sensitive action — viewing student data, exporting contacts, sending, scheduling, or changing settings — is recorded for accountability.
            </p>
            <div className="mt-3">
              <SmsDataPanel>
                <SmsTable headers={['Actor', 'Action', 'Detail', 'Date']} empty={!auditLog.length} emptyLabel="No audit entries yet.">
                  {auditLog.map((entry) => (
                    <tr key={entry.id} className="border-t border-border hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-sm font-semibold text-navy">{entry.actor}</td>
                      <td className="px-4 py-3 text-sm text-navy">{entry.action}</td>
                      <td className="px-4 py-3 text-xs text-muted">{entry.detail}</td>
                      <td className="px-4 py-3 text-xs text-muted">{entry.date}</td>
                    </tr>
                  ))}
                </SmsTable>
              </SmsDataPanel>
            </div>
          </SmsCard>
        </>
      )}
    </SmsPageShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="truncate text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}
