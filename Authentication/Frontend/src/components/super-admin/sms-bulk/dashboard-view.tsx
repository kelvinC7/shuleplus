'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  Megaphone,
  Send,
  Users,
  Wallet,
} from 'lucide-react';
import { smsBulkApi, type SmsDashboard } from '@/lib/sms-bulk-api';
import { useToast } from '@/shared/notifications/toast/toast';
import {
  PlatformAreaChart,
  PlatformBarChart,
  PlatformDonutChart,
} from '@/components/platform/platform-charts';
import {
  SmsCard,
  SmsDataPanel,
  SmsPageShell,
  SmsSectionTitle,
  SmsStatCard,
  SmsStatusPill,
  SmsTable,
} from './sms-page-shell';

export function SmsBulkDashboardView() {
  const toast = useToast();
  const [data, setData] = useState<SmsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    smsBulkApi
      .dashboard()
      .then(setData)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading || !data) {
    return (
      <SmsPageShell title="Dashboard" description="Centralized student, parent & school communication center.">
        <SmsDataPanel loading loadingLabel="Loading SMS dashboard…" />
      </SmsPageShell>
    );
  }

  const { kpis, monthly } = data;

  return (
    <SmsPageShell
      title="SMS BULK"
      description="Centralized student, parent & school communication center."
      actions={
        <Link href="/super-admin/sms-bulk/send" className={SMS_BTN}>
          <Send className="h-4 w-4" /> Compose SMS
        </Link>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SmsStatCard icon={<Send className="h-4 w-4" />} label="SMS Sent Today" value={kpis.sentToday.toLocaleString()} hint="+4.8% vs yesterday" tone="navy" />
        <SmsStatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Delivered" value={kpis.delivered.toLocaleString()} hint={`${((kpis.delivered / kpis.sentToday) * 100).toFixed(1)}% delivery`} tone="emerald" />
        <SmsStatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={kpis.pending.toLocaleString()} hint="Queued for delivery" tone="amber" />
        <SmsStatCard icon={<AlertTriangle className="h-4 w-4" />} label="Failed" value={kpis.failed.toLocaleString()} hint="Needs attention" tone="rose" />
        <SmsStatCard icon={<Coins className="h-4 w-4" />} label="SMS Credits" value={kpis.credits.toLocaleString()} hint="≈ 5,388 messages left" tone="sky" />
        <SmsStatCard icon={<Users className="h-4 w-4" />} label="Parents Reached" value={kpis.parentsReached.toLocaleString()} hint="Unique contacts this month" tone="violet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SmsCard className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <SmsSectionTitle>SMS usage — this week</SmsSectionTitle>
            <span className="text-xs text-muted">{monthly.sent.toLocaleString()} this month</span>
          </div>
          <PlatformAreaChart
            labels={data.dailySeries.map((d) => d.date)}
            values={data.dailySeries.map((d) => d.sent)}
            height={220}
            name="Sent"
          />
        </SmsCard>

        <SmsCard>
          <SmsSectionTitle>SMS by purpose</SmsSectionTitle>
          <div className="mt-2 flex items-center gap-4">
            <PlatformDonutChart segments={data.byPurpose} size={150} />
            <div className="min-w-0 flex-1 space-y-1.5">
              {data.byPurpose.map((s) => (
                <div key={s.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                  <span className="font-semibold text-navy">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </SmsCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SmsCard>
          <SmsSectionTitle>Weekly delivery volume</SmsSectionTitle>
          <div className="mt-3">
            <PlatformBarChart labels={data.weeklySeries.map((w) => w.label)} values={data.weeklySeries.map((w) => w.sent)} height={200} name="Sent" />
          </div>
        </SmsCard>

        <SmsCard>
          <SmsSectionTitle>Monthly performance</SmsSectionTitle>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              { label: 'Delivery rate', value: `${monthly.deliveryRate}%`, tone: 'text-emerald-600' },
              { label: 'Failed rate', value: `${monthly.failedRate}%`, tone: 'text-rose-600' },
              { label: 'Credits consumed', value: monthly.creditsConsumed.toLocaleString(), tone: 'text-navy' },
              { label: 'Cost (FRW)', value: monthly.cost.toLocaleString(), tone: 'text-amber-600' },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{m.label}</p>
                <p className={`mt-1 text-lg font-bold ${m.tone}`}>{m.value}</p>
              </div>
            ))}
          </div>
          <Link href="/super-admin/sms-bulk/credits" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-primary">
            <Wallet className="h-3.5 w-3.5" /> Manage SMS credits
          </Link>
        </SmsCard>

        <SmsCard>
          <SmsSectionTitle>By school</SmsSectionTitle>
          <div className="mt-3 space-y-2.5">
            {data.bySchool.slice(0, 5).map((s) => {
              const max = Math.max(...data.bySchool.map((x) => x.sent));
              return (
                <div key={s.school}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="truncate text-navy">{s.school}</span>
                    <span className="font-semibold text-muted">{s.sent.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(s.sent / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SmsCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SmsCard className="lg:col-span-1">
          <div className="mb-2 flex items-center justify-between">
            <SmsSectionTitle>Recent campaigns</SmsSectionTitle>
            <Link href="/super-admin/sms-bulk/campaigns" className="text-xs font-semibold text-navy hover:text-primary">
              View all
            </Link>
          </div>
          <SmsDataPanel>
            <SmsTable headers={['Campaign', 'Status', 'Delivered', 'Failed']} empty={!data.recentCampaigns.length} emptyLabel="No campaigns yet.">
              {data.recentCampaigns.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-navy">{c.name}</p>
                    <p className="text-[11px] text-muted">{c.recipients.toLocaleString()} recipients</p>
                  </td>
                  <td className="px-4 py-3">
                    <SmsStatusPill status={c.status} />
                  </td>
                  <td className="px-4 py-3">{c.delivered.toLocaleString()}</td>
                  <td className="px-4 py-3 text-rose-600">{c.failed.toLocaleString()}</td>
                </tr>
              ))}
            </SmsTable>
          </SmsDataPanel>
        </SmsCard>

        <SmsCard>
          <div className="mb-2 flex items-center justify-between">
            <SmsSectionTitle>Scheduled SMS</SmsSectionTitle>
            <Link href="/super-admin/sms-bulk/scheduled" className="text-xs font-semibold text-navy hover:text-primary">
              View all
            </Link>
          </div>
          <SmsDataPanel>
            <SmsTable headers={['Name', 'Date', 'Recipients', 'Status']} empty={!data.scheduled.length} emptyLabel="Nothing scheduled.">
              {data.scheduled.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-navy">{s.name}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" /> {s.date} · {s.time}
                    </span>
                  </td>
                  <td className="px-4 py-3">{s.recipients.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <SmsStatusPill status={s.status} />
                  </td>
                </tr>
              ))}
            </SmsTable>
          </SmsDataPanel>
        </SmsCard>

        <SmsCard>
          <div className="mb-2 flex items-center justify-between">
            <SmsSectionTitle>Failed — needs attention</SmsSectionTitle>
            <Link href="/super-admin/sms-bulk/delivery" className="text-xs font-semibold text-navy hover:text-primary">
              Delivery reports
            </Link>
          </div>
          <SmsDataPanel>
            <SmsTable headers={['To', 'Reason', 'Type']} empty={!data.failedMessages.length} emptyLabel="No failures 🎉">
              {data.failedMessages.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-navy">{m.student}</p>
                    <p className="text-[11px] text-muted">{m.to}</p>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-rose-600">{m.failureReason}</td>
                  <td className="px-4 py-3 text-xs text-muted">{m.type}</td>
                </tr>
              ))}
            </SmsTable>
          </SmsDataPanel>
          <Link href="/super-admin/sms-bulk/send" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-primary">
            <Megaphone className="h-3.5 w-3.5" /> Create a new campaign
          </Link>
        </SmsCard>
      </div>
    </SmsPageShell>
  );
}

const SMS_BTN =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition hover:bg-primary-hover';
