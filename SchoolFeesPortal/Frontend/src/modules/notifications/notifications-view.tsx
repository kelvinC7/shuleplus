'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Play,
  Pause,
  Plus,
  Pencil,
  RefreshCw,
  Send,
  BarChart3,
  History,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/shared/notifications';
import { StatCard, StatsGrid } from '@/components/stat-card';
import { FeesDataTable, type FeesTableColumn } from '@/components/fees-data-table';
import { FeesPageTitle } from '@/components/fees-page-title';
import { AutomationRuleModal, type AutomationDraft } from './automation-rule-modal';

type Tab = 'overview' | 'send' | 'automations' | 'templates' | 'history' | 'settings';

type Dashboard = {
  activeAutomations: number;
  sentToday: number;
  scheduled: number;
  deliveredRate: number;
  failed: number;
  parentsUsingSms: number;
  channelOverview: Array<{ channel: string; count: number }>;
  unpaidStudents?: number;
  partialStudents?: number;
  outstandingBalance?: number;
  remindersSent?: number;
  delivered?: number;
  opened?: number;
  failedTotal?: number;
};

type Recipient = {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  balance: number;
  status: string;
};

type Automation = {
  id: string;
  name: string;
  trigger: string;
  timingDays?: number;
  timingType?: string;
  audience?: string;
  status: string;
  lastRunAt: string | null;
  lastError: string | null;
  channels: Record<string, boolean>;
  templates?: AutomationDraft['templates'];
  maxSmsPerDay?: number;
  maxSmsPerWeek?: number;
  quietHoursStart?: number | null;
  quietHoursEnd?: number | null;
  combineSiblings?: boolean;
};

type DeliveryRow = {
  id: string;
  queuedAt: string;
  parentName: string | null;
  studentName: string | null;
  channel: string;
  event: string;
  status: string;
  automation?: { name: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-800',
  PAUSED: 'bg-amber-50 text-amber-800',
  DRAFT: 'bg-slate-100 text-navy',
  ERROR: 'bg-red-50 text-red-800',
};

export function NotificationsView({ initialTab = 'overview' }: { initialTab?: Tab }) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [history, setHistory] = useState<DeliveryRow[]>([]);
  const [analytics, setAnalytics] = useState<{
    deliveryPerformance: Array<{ channel: string; deliveryRate: number }>;
    reminderEffectiveness: { remindersSent: number; opened: number; paymentsRecorded: number; paymentConversion: number };
  } | null>(null);
  const [triggers, setTriggers] = useState<Record<string, string[]>>({});
  const [testPhone, setTestPhone] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [payStatus, setPayStatus] = useState('outstanding');
  const [year, setYear] = useState('');
  const [term, setTerm] = useState('');
  const [className, setClassName] = useState('ALL');
  const [classes, setClasses] = useState<Array<{ id: string; name: string; label?: string | null }>>([]);
  const [minBalance, setMinBalance] = useState('0');
  const [daysSince, setDaysSince] = useState('0');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [channels, setChannels] = useState({ inApp: true, push: true, email: true, sms: true });
  const [sending, setSending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationDraft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, auto, hist, anal, trig] = await Promise.all([
        api.get('/reminders/dashboard'),
        api.get('/reminders/automations'),
        api.get('/reminders/history', { params: { pageSize: 20 } }),
        api.get('/reminders/analytics'),
        api.get('/reminders/triggers'),
      ]);
      setDashboard(dash.data.data);
      setAutomations(auto.data.data ?? []);
      setHistory(hist.data.data ?? []);
      setAnalytics(anal.data.data);
      setTriggers(trig.data.data ?? {});
      const preview = await api.post('/reminders/preview', {});
      setPreviewText(preview.data.data?.rendered?.sms ?? '');
      try {
        const cls = await api.get('/reminders/classes');
        setClasses(cls.data.data ?? []);
      } catch {
        setClasses([]);
      }
    } catch {
      toast.error('Could not load reminders module');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAutomation(id: string) {
    try {
      await api.post(`/reminders/automations/${id}/run`);
      toast.success('Automation run started');
      void load();
    } catch {
      toast.error('Run failed');
    }
  }

  async function toggleStatus(id: string, status: string) {
    try {
      await api.patch(`/reminders/automations/${id}/status`, { status });
      void load();
    } catch {
      toast.error('Could not update status');
    }
  }

  async function sendTest(channel: string) {
    if (channel === 'SMS' && !testPhone.trim()) {
      toast.error('Enter test phone number');
      return;
    }
    try {
      const { data } = await api.post('/reminders/test', { channel, to: testPhone });
      if (data.data?.ok) toast.success(`Test ${channel} sent`);
      else toast.error('Test failed — check Notification API');
    } catch {
      toast.error('Test send failed');
    }
  }

  const autoColumns: FeesTableColumn<Automation>[] = [
    { key: 'name', header: 'Automation', render: (r) => <span className="font-semibold text-navy">{r.name}</span> },
    { key: 'trigger', header: 'Trigger', render: (r) => r.trigger.replace(/_/g, ' ') },
    {
      key: 'channels',
      header: 'Channels',
      render: (r) =>
        Object.entries(r.channels ?? {})
          .filter(([, v]) => v)
          .map(([k]) => k.toUpperCase())
          .join(' + ') || '—',
    },
    {
      key: 'last',
      header: 'Last run',
      render: (r) => (r.lastRunAt ? new Date(r.lastRunAt).toLocaleDateString() : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[r.status] ?? STATUS_STYLE.DRAFT}`}>
          {r.status}{r.lastError ? ' — Error' : ''}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex gap-1">
          <button type="button" className="rounded-lg p-1.5 hover:bg-slate-100" title="Run now" onClick={() => void runAutomation(r.id)}>
            <Play size={14} />
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-slate-100"
            title="Edit rule"
            onClick={() => {
              setEditingAutomation({
                id: r.id,
                name: r.name,
                trigger: r.trigger,
                timingDays: r.timingDays ?? 3,
                timingType: (r.timingType as AutomationDraft['timingType']) ?? 'before',
                audience: r.audience ?? 'parents_outstanding',
                channels: { sms: false, email: false, push: false, inApp: false, ...(r.channels ?? {}) },
                status: r.status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT',
                maxSmsPerDay: r.maxSmsPerDay ?? 1,
                maxSmsPerWeek: r.maxSmsPerWeek ?? 3,
                quietHoursStart: r.quietHoursStart ?? 22,
                quietHoursEnd: r.quietHoursEnd ?? 6,
                combineSiblings: r.combineSiblings ?? true,
                templates: r.templates ?? {},
              });
              setModalOpen(true);
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 hover:bg-slate-100"
            title={r.status === 'ACTIVE' ? 'Pause' : 'Activate'}
            onClick={() => void toggleStatus(r.id, r.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
          >
            {r.status === 'ACTIVE' ? <Pause size={14} /> : <Zap size={14} />}
          </button>
        </div>
      ),
    },
  ];

  const histColumns: FeesTableColumn<DeliveryRow>[] = [
    { key: 'time', header: 'Time', render: (r) => new Date(r.queuedAt).toLocaleString() },
    { key: 'parent', header: 'Parent', render: (r) => r.parentName ?? '—' },
    { key: 'student', header: 'Student', render: (r) => r.studentName ?? '—' },
    { key: 'channel', header: 'Channel', render: (r) => r.channel },
    { key: 'event', header: 'Event', render: (r) => r.event.replace(/_/g, ' ') },
    { key: 'status', header: 'Status', render: (r) => r.status },
  ];

  async function loadRecipients() {
    try {
      const { data } = await api.get('/reminders/recipients', {
        params: {
          paymentStatus: payStatus,
          academicYear: year || undefined,
          term: term || undefined,
          className: className !== 'ALL' ? className : undefined,
          minBalance,
          daysSince,
        },
      });
      setRecipients(data.data?.students ?? []);
      setSelectedIds([]);
    } catch {
      toast.error('Could not load matching students');
    }
  }

  async function sendSelected() {
    if (!selectedIds.length) {
      toast.error('Select students first');
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post('/reminders/send-now', {
        studentIds: selectedIds,
        channels,
        event: 'PAYMENT_OVERDUE',
        combineSiblings: true,
      });
      toast.success(`Reminder sent to ${data.data?.recipients ?? 0} parent(s)`);
      void load();
    } catch {
      toast.error('Could not send reminders');
    } finally {
      setSending(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Bell }[] = [
    { id: 'overview', label: 'Overview', icon: Bell },
    { id: 'send', label: 'Send Reminder', icon: Send },
    { id: 'automations', label: 'Automated Rules', icon: Zap },
    { id: 'templates', label: 'Templates', icon: MessageSquare },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: BarChart3 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <FeesPageTitle>Fee Reminders</FeesPageTitle>
          <p className="text-sm text-muted">Remind parents of unpaid or partial fees — in-app, web push, email, and SMS when allowed</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary text-xs" onClick={() => void load()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" className="btn-secondary text-xs" onClick={() => void api.post('/reminders/process').then(() => toast.success('Scheduled reminders processed'))}>
            <Play size={14} /> Process due
          </button>
          <button type="button" className="btn-primary text-xs" onClick={() => setTab('send')}>
            <Send size={14} /> Send Reminder
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-slate-50/80 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${
              tab === id ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && dashboard ? (
        <>
          <StatsGrid columns={3}>
            <StatCard label="Unpaid Students" value={dashboard.unpaidStudents ?? 0} />
            <StatCard label="Partially Paid" value={dashboard.partialStudents ?? 0} />
            <StatCard label="Outstanding Balance" value={`${(dashboard.outstandingBalance ?? 0).toLocaleString()} RWF`} />
            <StatCard label="Reminders Sent" value={dashboard.remindersSent ?? dashboard.sentToday} />
            <StatCard label="Delivered" value={dashboard.delivered ?? `${dashboard.deliveredRate}%`} />
            <StatCard label="Opened" value={dashboard.opened ?? 0} />
            <StatCard label="Failed" value={dashboard.failedTotal ?? dashboard.failed} />
            <StatCard label="Active Rules" value={dashboard.activeAutomations} />
            <StatCard label="SMS Allowed Parents" value={dashboard.parentsUsingSms} />
          </StatsGrid>
          <div className="hr-card p-4">
            <h3 className="text-sm font-bold text-navy">Delivery overview today</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              {dashboard.channelOverview.map((c) => (
                <div key={c.channel} className="rounded-xl border border-border px-3 py-2">
                  <p className="text-xs text-muted">{c.channel.replace('_', ' ')}</p>
                  <p className="text-lg font-bold text-navy">{c.count}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="hr-card p-4">
              <h3 className="text-sm font-bold text-navy">Smart escalation</h3>
              <p className="mt-2 text-sm text-muted">3 days before → In-App + Push → 1 day → Push + Email → Due → SMS + Push + In-App → Overdue → SMS + Email</p>
            </div>
            <div className="hr-card p-4">
              <h3 className="text-sm font-bold text-navy">Parent SMS permission</h3>
              <p className="mt-2 text-sm text-muted">SMS only sent when superadmin/parent profile allows SMS. Others receive email, push & in-app.</p>
            </div>
          </div>
        </>
      ) : null}

      {tab === 'automations' ? (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={() => {
                setEditingAutomation(null);
                setModalOpen(true);
              }}
            >
              <Plus size={14} /> Create automation
            </button>
          </div>
          <FeesDataTable
            columns={autoColumns}
            data={automations}
            rowKey={(r) => r.id}
            page={1}
            totalPages={1}
            total={automations.length}
            pageSize={50}
            onPageChange={() => undefined}
            loading={loading}
            emptyMessage="No automations — defaults seed on first load"
          />
          <div className="hr-card p-4">
            <h3 className="text-sm font-bold text-navy">Trigger types</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(triggers).map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs font-bold uppercase text-muted">{group}</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-navy">
                    {(items as string[]).slice(0, 5).map((t) => (
                      <li key={t}>{t.replace(/_/g, ' ')}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {tab === 'templates' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="hr-card space-y-3 p-4">
            <h3 className="text-sm font-bold text-navy">SMS template</h3>
            <textarea className="input min-h-[100px] w-full text-sm" readOnly value={previewText} />
            <p className="text-xs text-muted">
              Variables: {'{{parent_name}}'}, {'{{student_name}}'}, {'{{balance}}'}, {'{{due_date}}'}, {'{{payment_link}}'}
            </p>
            <div className="rounded-xl bg-slate-50 p-3 text-xs">
              <p>Characters: {previewText.length}</p>
              <p>SMS parts: {previewText.length <= 160 ? 1 : Math.ceil(previewText.length / 153)}</p>
              <p>Est. cost: {(previewText.length <= 160 ? 1 : Math.ceil(previewText.length / 153)) * 25} RWF</p>
            </div>
          </div>
          <div className="hr-card space-y-3 p-4">
            <h3 className="text-sm font-bold text-navy">Test before activating</h3>
            <input className="input w-full text-sm" placeholder="078XXXXXXX" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {['SMS', 'EMAIL', 'PUSH', 'IN_APP'].map((ch) => (
                <button key={ch} type="button" className="btn-secondary text-xs" onClick={() => void sendTest(ch)}>
                  <Send size={12} /> Test {ch}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-slate-50/80 p-3 text-sm">
              <p className="font-semibold text-navy">Preview</p>
              <p className="mt-1 text-muted">{previewText || 'Loading preview…'}</p>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'send' ? (
        <div className="space-y-4">
          <div className="hr-card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold uppercase text-muted">
              Payment status
              <select className="input mt-1 w-full text-sm" value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
                <option value="outstanding">Not paid / partial</option>
                <option value="unpaid">Not paid</option>
                <option value="partial">Partially paid</option>
                <option value="paid">Fully paid</option>
                <option value="all">All</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase text-muted">
              Class
              <select className="input mt-1 w-full text-sm" value={className} onChange={(e) => setClassName(e.target.value)}>
                <option value="ALL">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.label ?? c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-bold uppercase text-muted">
              Academic year
              <input className="input mt-1 w-full text-sm" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2025-2026" />
            </label>
            <label className="text-xs font-bold uppercase text-muted">
              Term
              <input className="input mt-1 w-full text-sm" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Term 1" />
            </label>
            <label className="text-xs font-bold uppercase text-muted">
              Min balance (RWF)
              <select className="input mt-1 w-full text-sm" value={minBalance} onChange={(e) => setMinBalance(e.target.value)}>
                <option value="0">Any balance</option>
                <option value="10000">More than 10,000</option>
                <option value="50000">More than 50,000</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase text-muted">
              Days since last payment
              <select className="input mt-1 w-full text-sm" value={daysSince} onChange={(e) => setDaysSince(e.target.value)}>
                <option value="0">Any</option>
                <option value="7">7+ days</option>
                <option value="14">14+ days</option>
                <option value="30">30+ days</option>
              </select>
            </label>
            <div className="flex items-end">
              <button type="button" className="btn-primary text-sm" onClick={() => void loadRecipients()}>View students</button>
            </div>
          </div>
          <div className="hr-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-navy">{recipients.length} students match your filters · {selectedIds.length} selected</p>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary text-xs" onClick={() => setSelectedIds(recipients.map((r) => r.studentId))}>Select all</button>
                <button type="button" className="btn-secondary text-xs" onClick={() => setSelectedIds([])}>Remove selection</button>
                <button type="button" className="btn-primary text-xs" disabled={sending || !selectedIds.length} onClick={() => void sendSelected()}>
                  <Send size={12} /> {sending ? 'Sending…' : 'Send reminder'}
                </button>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-3 text-sm">
              {(['inApp', 'push', 'email', 'sms'] as const).map((ch) => (
                <label key={ch} className="flex items-center gap-2">
                  <input type="checkbox" checked={channels[ch]} onChange={(e) => setChannels((c) => ({ ...c, [ch]: e.target.checked }))} />
                  {ch === 'inApp' ? 'In-App' : ch === 'push' ? 'Web Push' : ch === 'sms' ? 'SMS (allowed only)' : 'Email'}
                </label>
              ))}
            </div>
            <p className="mb-3 text-xs text-muted">SMS is skipped when the parent profile is not allowed to receive SMS. Automation also stops after a student becomes fully paid.</p>
            <div className="max-h-[420px] overflow-auto divide-y divide-border rounded-xl border border-border">
              {recipients.map((r) => (
                <label key={r.studentId} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <input type="checkbox" checked={selectedIds.includes(r.studentId)} onChange={(e) => setSelectedIds((ids) => e.target.checked ? [...ids, r.studentId] : ids.filter((id) => id !== r.studentId))} />
                  <span className="flex-1 font-semibold text-navy">{r.studentName}</span>
                  <span className="text-muted">{r.className}</span>
                  <span className="font-bold text-rose-700">{r.balance.toLocaleString()} RWF</span>
                </label>
              ))}
              {!recipients.length ? <p className="px-4 py-8 text-center text-sm text-muted">Apply filters and click View students.</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'history' ? (
        <FeesDataTable
          columns={histColumns}
          data={history}
          rowKey={(r) => r.id}
          page={1}
          totalPages={1}
          total={history.length}
          pageSize={50}
          onPageChange={() => undefined}
          loading={loading}
          emptyMessage="No delivery history yet"
        />
      ) : null}

      {tab === 'settings' && analytics ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="hr-card p-4">
            <h3 className="text-sm font-bold text-navy">Communication settings</h3>
            <p className="mt-2 text-sm text-muted">Quiet hours 18:00–07:00, max 4 reminders per student, and a 7-day minimum interval are enforced by automation rules. SMS only goes to parents with SMS allowed on their Student Management profile.</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>In-App — always created in Parent Portal</li>
              <li>Web Push — sent when the parent enabled push</li>
              <li>Email — sent when a parent email exists</li>
              <li>SMS — sent only if `smsEnabled` is allowed</li>
            </ul>
          </div>
          <div className="hr-card p-4">
            <h3 className="text-sm font-bold text-navy">Delivery performance (30 days)</h3>
            <ul className="mt-3 space-y-2">
              {analytics.deliveryPerformance.map((d) => (
                <li key={d.channel}>
                  <div className="flex justify-between text-sm">
                    <span>{d.channel}</span>
                    <span className="font-bold">{d.deliveryRate}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${d.deliveryRate}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Reminders sent</span><strong>{analytics.reminderEffectiveness.remindersSent}</strong></div>
              <div className="flex justify-between"><span>Opened / delivered</span><strong>{analytics.reminderEffectiveness.opened}</strong></div>
              <div className="flex justify-between"><span>Payments after reminder</span><strong>{analytics.reminderEffectiveness.paymentsRecorded}</strong></div>
            </div>
          </div>
        </div>
      ) : null}

      <AutomationRuleModal
        open={modalOpen}
        triggers={triggers}
        initial={editingAutomation}
        onClose={() => setModalOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  );
}
