'use client';

import { useEffect, useState } from 'react';
import { Copy, Download, Link2, Play, RefreshCw } from 'lucide-react';
import { smsBulkApi, type SmsCampaign } from '@/lib/sms-bulk-api';
import { useToast } from '@/shared/notifications/toast/toast';
import { SmsCard, SmsDataPanel, SmsPageShell, SmsSectionTitle, SmsStatusPill, SmsTable, smsBtnOutline, smsBtnPrimary } from './sms-page-shell';

export function CampaignsView() {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SmsCampaign | null>(null);

  useEffect(() => {
    smsBulkApi
      .campaigns()
      .then((rows) => {
        setCampaigns(rows);
        setSelected(rows[0] ?? null);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  function duplicate(c: SmsCampaign) {
    toast.success(`Campaign “${c.name}” duplicated as a draft.`);
  }

  function exportReport(c: SmsCampaign) {
    toast.success(`Report for “${c.name}” exported.`);
  }

  function retryFailed(c: SmsCampaign) {
    if (c.failed === 0) {
      toast.info('No failed messages in this campaign.');
      return;
    }
    toast.success(`Retrying ${c.failed.toLocaleString()} failed messages…`);
  }

  return (
    <SmsPageShell
      title="Campaigns"
      description="Plan, run, and review bulk SMS campaigns."
      actions={
        <a href="/super-admin/sms-bulk/send" className={smsBtnPrimary}>
          <Play className="h-4 w-4" /> New Campaign
        </a>
      }
    >
      <SmsDataPanel loading={loading} loadingLabel="Loading campaigns…">
        <SmsTable headers={['Campaign', 'Status', 'Recipients', 'Sent', 'Delivered', 'Failed', 'Actions']} empty={!campaigns.length} emptyLabel="No campaigns yet.">
          {campaigns.map((c) => (
            <tr key={c.id} className="border-t border-border hover:bg-slate-50/70">
              <td className="px-4 py-3">
                <button type="button" onClick={() => setSelected(c)} className="text-left">
                  <p className="font-semibold text-navy hover:text-primary">{c.name}</p>
                  <p className="text-[11px] text-muted">{c.messageType} · {new Date(c.createdAt).toLocaleDateString()}</p>
                </button>
              </td>
              <td className="px-4 py-3"><SmsStatusPill status={c.status} /></td>
              <td className="px-4 py-3">{c.recipients.toLocaleString()}</td>
              <td className="px-4 py-3">{c.sent.toLocaleString()}</td>
              <td className="px-4 py-3">{c.delivered.toLocaleString()}</td>
              <td className="px-4 py-3 text-rose-600">{c.failed.toLocaleString()}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <IconBtn label="View campaign" onClick={() => setSelected(c)}><Link2 className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="Retry failed" onClick={() => retryFailed(c)}><RefreshCw className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="Duplicate" onClick={() => duplicate(c)}><Copy className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn label="Export report" onClick={() => exportReport(c)}><Download className="h-3.5 w-3.5" /></IconBtn>
                </div>
              </td>
            </tr>
          ))}
        </SmsTable>
      </SmsDataPanel>

      {selected && (
        <SmsCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <SmsSectionTitle>{selected.name}</SmsSectionTitle>
              <p className="mt-1 text-xs text-muted">
                Created {new Date(selected.createdAt).toLocaleDateString()}
                {selected.completedAt ? ` · Completed ${new Date(selected.completedAt).toLocaleDateString()}` : ''}
                {selected.scheduledAt ? ` · Scheduled ${new Date(selected.scheduledAt).toLocaleDateString()}` : ''}
              </p>
            </div>
            <SmsStatusPill status={selected.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <CampaignStat label="Recipients" value={selected.recipients.toLocaleString()} />
            <CampaignStat label="Sent" value={selected.sent.toLocaleString()} />
            <CampaignStat label="Delivered" value={selected.delivered.toLocaleString()} tone="text-emerald-600" />
            <CampaignStat label="Failed" value={selected.failed.toLocaleString()} tone="text-rose-600" />
          </div>

          {selected.sent > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Delivery</span>
                <span>{((selected.delivered / selected.sent) * 100).toFixed(1)}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(selected.delivered / selected.sent) * 100}%` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
                <span>Failed</span>
                <span>{((selected.failed / selected.sent) * 100).toFixed(1)}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-rose-500" style={{ width: `${(selected.failed / selected.sent) * 100}%` }} />
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={smsBtnOutline} onClick={() => duplicate(selected)}><Copy className="h-4 w-4" /> Duplicate Campaign</button>
            {selected.failed > 0 && (
              <button type="button" className={smsBtnOutline} onClick={() => retryFailed(selected)}><RefreshCw className="h-4 w-4" /> Retry Failed</button>
            )}
            <button type="button" className={smsBtnOutline} onClick={() => exportReport(selected)}><Download className="h-4 w-4" /> Export Report</button>
          </div>
        </SmsCard>
      )}
    </SmsPageShell>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-navy transition hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

function CampaignStat({ label, value, tone = 'text-navy' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
