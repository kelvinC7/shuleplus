'use client';

import { useEffect, useState } from 'react';
import { Coins, History, Percent, Send, TrendingDown, Wallet } from 'lucide-react';
import { smsBulkApi, type SmsCreditHistory, type SmsProviderStatus } from '@/lib/sms-bulk-api';
import { useToast } from '@/shared/notifications/toast/toast';
import {
  SmsCard,
  SmsDataPanel,
  SmsPageShell,
  SmsSectionTitle,
  SmsStatCard,
  SmsTable,
  smsBtnOutline,
  smsBtnPrimary,
  smsInputClass,
} from './sms-page-shell';

export function CreditsView() {
  const toast = useToast();
  const [balance, setBalance] = useState(0);
  const [usedToday, setUsedToday] = useState(0);
  const [usedMonth, setUsedMonth] = useState(0);
  const [history, setHistory] = useState<SmsCreditHistory[]>([]);
  const [provider, setProvider] = useState<SmsProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [topup, setTopup] = useState('');

  useEffect(() => {
    Promise.all([smsBulkApi.credits(), smsBulkApi.provider()])
      .then(([c, p]) => {
        setBalance(c.balance);
        setUsedToday(c.usedToday);
        setUsedMonth(c.usedMonth);
        setHistory(c.history);
        setProvider(p);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  function requestTopup() {
    const qty = Number(topup);
    if (!qty || qty <= 0) {
      toast.error('Enter a valid credit amount.');
      return;
    }
    toast.success(`Top-up request for ${qty.toLocaleString()} credits submitted.`);
    setTopup('');
  }

  const delivered = 139900;
  const sent = 146800;
  const deliveryRate = ((delivered / sent) * 100).toFixed(1);
  const failedRate = (100 - Number(deliveryRate)).toFixed(1);
  const estimatedRemaining = provider ? Math.floor(balance / provider.costPerCredit) : 0;

  return (
    <SmsPageShell title="SMS Credits / Wallet" description="Monitor your SMS balance, usage, and provider status.">
      {loading ? (
        <SmsDataPanel loading loadingLabel="Loading credits…" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-navy/10 bg-navy p-5 text-white shadow-lg">
              <p className="flex items-center gap-1.5 text-xs font-medium text-white/70">
                <Wallet className="h-3.5 w-3.5" /> SMS Balance
              </p>
              <p className="mt-2 text-3xl font-bold text-primary">{balance.toLocaleString()}</p>
              <p className="mt-1 text-xs text-white/60">≈ {estimatedRemaining.toLocaleString()} messages</p>
              <div className="mt-4 flex gap-2">
                <button type="button" className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-navy transition hover:bg-primary-hover">Buy Credits</button>
                <button type="button" className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10">Usage History</button>
              </div>
            </div>
            <SmsStatCard icon={<Send className="h-4 w-4" />} label="Credits used today" value={usedToday.toLocaleString()} hint={`${(usedToday * (provider?.costPerCredit ?? 9)).toLocaleString()} FRW`} tone="navy" />
            <SmsStatCard icon={<TrendingDown className="h-4 w-4" />} label="Credits used this month" value={usedMonth.toLocaleString()} hint={`${(usedMonth * (provider?.costPerCredit ?? 9)).toLocaleString()} FRW`} tone="sky" />
            <SmsStatCard icon={<Percent className="h-4 w-4" />} label="Delivery rate" value={`${deliveryRate}%`} hint={`Failed ${failedRate}%`} tone="emerald" />
          </div>

          {provider && (
            <SmsCard>
              <SmsSectionTitle>Provider status</SmsSectionTitle>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  { label: 'Provider', value: provider.name },
                  { label: 'Status', value: '🟢 Connected' },
                  { label: 'API status', value: provider.apiStatus },
                  { label: 'Sender ID', value: provider.senderId },
                  { label: 'Delivery rate', value: `${provider.deliveryRate}%` },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-50 px-3 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{item.label}</p>
                    <p className="mt-0.5 text-sm font-bold text-navy">{item.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                <Coins className="h-3.5 w-3.5" /> Cost: {(provider.costPerCredit ?? 9).toLocaleString()} FRW per credit · Provider balance: {provider.balance.toLocaleString()} credits
              </p>
            </SmsCard>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <SmsCard className="lg:col-span-2">
              <SmsSectionTitle>Usage history</SmsSectionTitle>
              <div className="mt-3">
                <SmsDataPanel>
                  <SmsTable headers={['Date', 'Action', 'Credits', 'Balance']} empty={!history.length} emptyLabel="No usage yet.">
                    {history.map((h) => (
                      <tr key={h.id} className="border-t border-border hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-xs text-muted">{h.date}</td>
                        <td className="px-4 py-3 text-sm font-medium text-navy">{h.action}</td>
                        <td className={`px-4 py-3 font-semibold ${h.credits < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {h.credits > 0 ? '+' : ''}{h.credits.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted">{h.balanceAfter.toLocaleString()}</td>
                      </tr>
                    ))}
                  </SmsTable>
                </SmsDataPanel>
              </div>
            </SmsCard>

            <SmsCard>
              <SmsSectionTitle>Request top-up</SmsSectionTitle>
              <p className="mt-2 text-xs text-muted">Request additional SMS credits for the platform.</p>
              <div className="mt-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted">Credit amount</span>
                  <input value={topup} onChange={(e) => setTopup(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 50,000" className={`${smsInputClass} mt-1`} />
                </label>
                <button type="button" onClick={requestTopup} className={`${smsBtnPrimary} mt-3 w-full`}>
                  <Wallet className="h-4 w-4" /> Submit request
                </button>
                <button type="button" className={`${smsBtnOutline} mt-2 w-full`} onClick={() => toast.info('Opens usage analytics.')}>
                  <History className="h-4 w-4" /> View full analytics
                </button>
              </div>
              <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                Low balance alerts are sent to SuperAdmins when credits drop below 5,000.
              </div>
            </SmsCard>
          </div>
        </>
      )}
    </SmsPageShell>
  );
}
