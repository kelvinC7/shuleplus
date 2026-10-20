/** Client-side daily fee payment reminders (Web Push / browser notifications). */

const STORAGE_KEY = 'shuleplus.feeReminders.v1';
const SW_PATH = '/fee-reminder-sw.js';

export const FEE_REMINDER_PAY_EVENT = 'shuleplus:fee-reminder-pay';
export const FEE_REMINDER_SHOWN_EVENT = 'shuleplus:fee-reminder-shown';

export type FeeReminderPayDetail = {
  code?: string | null;
  planId?: string | null;
  url?: string;
};

export type FeeReminderPlan = {
  id: string;
  studentName: string;
  studentUid?: string;
  schoolName?: string;
  deadline: string; // YYYY-MM-DD
  remainingAmount: number;
  academicYear?: string;
  term?: string;
  channels: string[];
  paid: boolean;
  lastNotifiedDate?: string;
  createdAt: string;
};

export type FeeReminderShownDetail = {
  title: string;
  body: string;
  plan?: FeeReminderPlan;
};

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function loadPlans(): FeeReminderPlan[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FeeReminderPlan[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePlans(plans: FeeReminderPlan[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

function frw(n: number) {
  return `${Math.round(n).toLocaleString()} FRW`;
}

export function buildFeePayUrl(studentUid?: string, planId?: string) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({ pay: 'fees' });
  if (studentUid) params.set('code', studentUid);
  if (planId) params.set('reminder', planId);
  return `${origin}/?${params.toString()}`;
}

export function dispatchFeeReminderPay(detail: FeeReminderPayDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FEE_REMINDER_PAY_EVENT, { detail }));
}

function dailyMessage(plan: FeeReminderPlan): { title: string; body: string } {
  const today = todayLocal();
  if (today === plan.deadline) {
    return {
      title: 'Payment deadline today',
      body: `Today is the deadline for ${plan.studentName}. Outstanding ${frw(plan.remainingAmount)}. Tap Pay now to complete payment.`,
    };
  }
  return {
    title: 'Daily fee reminder',
    body: `Reminder: ${plan.studentName} has ${frw(plan.remainingAmount)} remaining (due ${plan.deadline}). Tap Pay now to pay.`,
  };
}

function overdueMessage(plan: FeeReminderPlan): { title: string; body: string } {
  return {
    title: 'Payment overdue — still unpaid',
    body: `${plan.studentName}'s fee was due on ${plan.deadline} and is still unpaid (${frw(plan.remainingAmount)}). Tap Pay now to clear the balance.`,
  };
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function registerFeeReminderServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

type NotifyOpts = {
  title: string;
  body: string;
  plan?: FeeReminderPlan;
};

async function showBrowserNotification({ title, body, plan }: NotifyOpts) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const code = plan?.studentUid || '';
  const url = buildFeePayUrl(code || undefined, plan?.id);
  const data = {
    url,
    code: code || null,
    planId: plan?.id || null,
  };

  const options: NotificationOptions & {
    actions?: Array<{ action: string; title: string }>;
    data?: typeof data;
    renotify?: boolean;
  } = {
    body,
    icon: '/logo.png',
    badge: '/logo.png',
    tag: plan?.id ? `shuleplus-fee-reminder-${plan.id}` : 'shuleplus-fee-reminder',
    requireInteraction: true,
    renotify: true,
    data,
    actions: [{ action: 'pay-now', title: 'Pay now' }],
  };

  try {
    let registration = await navigator.serviceWorker?.getRegistration?.();
    if (!registration) {
      registration = (await registerFeeReminderServiceWorker()) ?? undefined;
    }
    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(FEE_REMINDER_SHOWN_EVENT, {
            detail: { title, body, plan } satisfies FeeReminderShownDetail,
          })
        );
      }
      return;
    }
  } catch {
    /* fall through to plain Notification */
  }

  const n = new Notification(title, {
    body,
    icon: '/logo.png',
    tag: options.tag,
    requireInteraction: true,
    data,
  });
  n.onclick = () => {
    try {
      window.focus();
    } catch {
      /* ignore */
    }
    dispatchFeeReminderPay({ code: code || null, planId: plan?.id || null, url });
    window.location.assign(url);
    n.close();
  };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(FEE_REMINDER_SHOWN_EVENT, {
        detail: { title, body, plan } satisfies FeeReminderShownDetail,
      })
    );
  }
}

/** Register or refresh a daily reminder until `deadline` (inclusive). */
export async function scheduleFeeReminder(input: {
  studentName: string;
  studentUid?: string;
  schoolName?: string;
  deadline: string;
  remainingAmount: number;
  academicYear?: string;
  term?: string;
  channels: string[];
}): Promise<FeeReminderPlan | null> {
  if (!input.deadline || input.remainingAmount <= 0) return null;

  const wantsPush =
    input.channels.includes('webpush') ||
    input.channels.includes('sms') ||
    input.channels.includes('email') ||
    input.channels.includes('whatsapp');
  if (!wantsPush) return null;

  if (input.channels.includes('webpush')) {
    await ensureNotificationPermission();
    await registerFeeReminderServiceWorker();
  }

  const plans = loadPlans().filter(
    (p) =>
      !(
        !p.paid &&
        p.studentName === input.studentName &&
        (p.studentUid ?? '') === (input.studentUid ?? '') &&
        p.deadline === input.deadline
      )
  );

  const plan: FeeReminderPlan = {
    id: `rem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    studentName: input.studentName,
    studentUid: input.studentUid,
    schoolName: input.schoolName,
    deadline: input.deadline,
    remainingAmount: input.remainingAmount,
    academicYear: input.academicYear,
    term: input.term,
    channels: [...new Set([...input.channels, 'webpush'])],
    paid: false,
    createdAt: new Date().toISOString(),
  };
  plans.push(plan);
  savePlans(plans);
  await showBrowserNotification({
    title: 'Daily reminders enabled',
    body: `You will get a reminder every day until ${input.deadline} for ${input.studentName} (${frw(input.remainingAmount)} remaining). Tap Pay now anytime to pay.`,
    plan,
  });
  return plan;
}

export function markFeeReminderPaid(opts: {
  studentName: string;
  studentUid?: string;
  reference?: string;
}) {
  const plans = loadPlans().map((p) => {
    if (p.paid) return p;
    const sameStudent =
      p.studentName === opts.studentName &&
      (opts.studentUid ? p.studentUid === opts.studentUid : true);
    return sameStudent ? { ...p, paid: true } : p;
  });
  savePlans(plans);
}

/** Fire at most one reminder per plan per calendar day. */
export async function tickFeeReminders(): Promise<number> {
  if (typeof window === 'undefined') return 0;
  const today = todayLocal();
  const plans = loadPlans();
  let sent = 0;

  for (const plan of plans) {
    if (plan.paid) continue;
    if (plan.lastNotifiedDate === today) continue;
    if (!plan.channels.includes('webpush') && plan.channels.length === 0) continue;

    const overdue = today > plan.deadline;
    const msg = overdue ? overdueMessage(plan) : dailyMessage(plan);

    if (Notification.permission === 'granted') {
      await showBrowserNotification({ title: msg.title, body: msg.body, plan });
      plan.lastNotifiedDate = today;
      sent += 1;
    }
  }

  savePlans(plans);
  return sent;
}

export function initFeeReminders(): () => void {
  if (typeof window === 'undefined') return () => {};

  void registerFeeReminderServiceWorker().then(() => tickFeeReminders());

  const onFocus = () => {
    void tickFeeReminders();
  };
  window.addEventListener('focus', onFocus);
  const interval = window.setInterval(() => {
    void tickFeeReminders();
  }, 60 * 60 * 1000);

  return () => {
    window.removeEventListener('focus', onFocus);
    window.clearInterval(interval);
  };
}

export function describeReminderSchedule(deadline: string): string {
  if (!deadline) return 'Pick a deadline to enable daily reminders.';
  const today = todayLocal();
  if (deadline < today) {
    return 'Deadline has passed — overdue unpaid reminders will keep sending until payment is completed.';
  }
  return `Daily reminder every day until ${deadline}. Each reminder includes Pay now. If still unpaid after that date, you will get an overdue message until you pay.`;
}
