import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
   getTeacherPortalPushState,
   subscribeTeacherPortalPush,
   unsubscribeTeacherPortalPush,
   isWebPushEnvironmentSupported,
} from '../utils/webPushTeacherPortal';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  kaziGetCatalog,
  kaziGetDashboard,
  kaziGetDeals,
  kaziGetHistory,
  kaziUpdateRequest,
  kaziCancelRequest,
  eligibilityFromDashboard,
  payrollFromDashboard,
} from '../services/kaziApi';
import TichaAvanceRequestModal from '../components/TichaAvanceRequestModal';
import {
   Banknote,
   Loader2,
   X,
   Pencil,
   Trash2,
   Eye,
   EyeOff,
   ChevronRight,
   Send,
   XCircle,
   Plus,
   Clock,
   CheckCircle,
   CheckCircle2,
   Package,
   User,
   Bell,
} from 'lucide-react';

const REPAYMENT_OPTIONS = Array.from({ length: 18 }, (_, i) => i + 1);

const STATUS_MAP = {
   pending_accountant: {
      label: 'Waiting approval',
      short: 'Waiting',
      className: 'bg-amber-100 text-amber-900 border-amber-200',
   },
   sent_to_manager: {
      label: 'Waiting approval',
      short: 'Waiting',
      className: 'bg-sky-100 text-sky-900 border-sky-200',
   },
   approved: {
      label: 'Approved',
      short: 'Approved',
      className: 'bg-emerald-100 text-emerald-900 border-emerald-200',
   },
   rejected_by_accountant: {
      label: 'Rejected by Finance',
      short: 'Rejected',
      className: 'bg-red-100 text-red-700 border-red-200',
   },
   rejected_by_manager: {
      label: 'Rejected by Manager',
      short: 'Rejected',
      className: 'bg-red-100 text-red-700 border-red-200',
   },
};

function formatMoney(n) {
   const v = Number(n);
   if (!Number.isFinite(v)) return '-';
   return `${Math.round(v).toLocaleString()} RWF`;
}

const STATUS_SNAPSHOT_KEY_PREFIX = 'shule_avance_req_status';

function readStatusSnapshot(userId) {
   if (userId == null || userId === '') return {};
   try {
      const raw = sessionStorage.getItem(`${STATUS_SNAPSHOT_KEY_PREFIX}_${userId}`);
      return raw ? JSON.parse(raw) : {};
   } catch {
      return {};
   }
}

function writeStatusSnapshot(userId, map) {
   if (userId == null || userId === '') return;
   try {
      sessionStorage.setItem(`${STATUS_SNAPSHOT_KEY_PREFIX}_${userId}`, JSON.stringify(map));
   } catch { /* quota */ }
}

function computeStatusTransitionAlerts(prevMap, rows) {
   const alerts = [];
   for (const r of rows) {
      const id = String(r.id);
      const was = prevMap[id];
      const now = r.status;
      if (was === undefined || was === now) continue;
      if (was === 'pending_accountant' && now === 'sent_to_manager') {
         alerts.push({
            key: `${id}-pending_to_manager`,
            variant: 'info',
            title: 'Waiting approval',
            message: `Request #${id} is waiting for approval.`,
         });
      } else if (now === 'approved') {
         alerts.push({
            key: `${id}-approved`,
            variant: 'success',
            title: 'Request approved',
            message: `Your Ticha Avance request #${id} was approved.`,
         });
      } else if (now === 'rejected_by_manager' || now === 'rejected_by_accountant') {
         alerts.push({
            key: `${id}-rejected`,
            variant: 'reject',
            title: 'Request not approved',
            message: `Your Ticha Avance request #${id} was not approved.`,
         });
      }
   }
   return alerts;
}

export default function ShuleAvance() {
   const { teacher } = useAuth();
   const location = useLocation();
   const [rows, setRows] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   const [showApplyModal, setShowApplyModal] = useState(false);
   const [showBalances, setShowBalances] = useState(true);
   const [payrollSalary, setPayrollSalary] = useState(null);
   const [payrollLoading, setPayrollLoading] = useState(true);
   const [eligibility, setEligibility] = useState(null);

   const [amount, setAmount] = useState('');
   const [repayment, setRepayment] = useState(6);
   const [description, setDescription] = useState('');
   const [cashoutReason, setCashoutReason] = useState('');
   const [submitting, setSubmitting] = useState(false);

   const [detailRow, setDetailRow] = useState(null);
   const [editRow, setEditRow] = useState(null);
   const [statusAlerts, setStatusAlerts] = useState([]);
   const [activeTab, setActiveTab] = useState('cashout');
   const [pushUi, setPushUi] = useState({ supported: false, permission: 'default', subscribed: false });
   const [pushBusy, setPushBusy] = useState(false);
   const [pushHint, setPushHint] = useState(null);

   const advanceMaxPercent = Number(eligibility?.max_percent) > 0 ? Number(eligibility.max_percent) : 20;
   const autoApprovalRemainingRwf = Number(eligibility?.auto_approval_remaining_rwf) || 0;
   const maxAdvanceAmount = Number(eligibility?.max_advance_amount) || 0;

   const refreshPushState = useCallback(async () => {
      const s = await getTeacherPortalPushState();
      setPushUi({ supported: s.supported, permission: s.permission, subscribed: s.subscribed });
   }, []);

   useEffect(() => { refreshPushState(); }, [refreshPushState]);

   const load = useCallback(async (silent) => {
      if (!silent) setLoading(true);
      else setPayrollLoading(true);
      setError(null);
      setPayrollLoading(true);
      try {
         const [rowsData, dashboard] = await Promise.all([
            kaziGetHistory(),
            kaziGetDashboard(),
            kaziGetCatalog().catch(() => null),
            kaziGetDeals().catch(() => []),
         ]);
         const uid = teacher?.id;
         const prevMap = readStatusSnapshot(uid);
         const nextMap = Object.fromEntries(rowsData.map((r) => [String(r.id), r.status]));
         const newAlerts = computeStatusTransitionAlerts(prevMap, rowsData);
         writeStatusSnapshot(uid, nextMap);
         setRows(rowsData);
         if (newAlerts.length) {
            setStatusAlerts((prev) => {
               const seen = new Set(prev.map((a) => a.key));
               const merged = [...prev];
               for (const a of newAlerts) {
                  if (!seen.has(a.key)) {
                     seen.add(a.key);
                     merged.unshift(a);
                  }
               }
               return merged.slice(0, 8);
            });
         }
         setPayrollSalary(payrollFromDashboard(dashboard));
         setEligibility(eligibilityFromDashboard(dashboard));
      } catch (e) {
         setError(e.response?.data?.message || 'Could not load Ticha Avance from KaziAdvance.');
         setRows([]);
         setPayrollSalary(null);
      } finally {
         setLoading(false);
         setPayrollLoading(false);
      }
   }, [teacher?.id]);

   useEffect(() => { load(false); }, [load]);

   useEffect(() => {
      const notice = location.state?.avanceNotice;
      if (!notice) return;
      setStatusAlerts((prev) => {
         if (prev.some((a) => a.message === notice)) return prev;
         return [{ key: `nav-notice-${Date.now()}`, variant: 'info', title: 'Request submitted', message: notice }, ...prev].slice(0, 8);
      });
      window.history.replaceState({}, document.title);
   }, [location.state?.avanceNotice]);

   const cashoutRequests = useMemo(
      () => rows.filter(r => String(r.request_type || '').toLowerCase() === 'cashout'),
      [rows]
   );
   const dealRequests = useMemo(
      () => rows.filter(r => String(r.request_type || '').toLowerCase() !== 'cashout'),
      [rows]
   );

   const openNewRequest = () => setShowApplyModal(true);

   const submitUpdate = async () => {
      if (!editRow?.id) return;
      setSubmitting(true);
      setError(null);
      try {
         const amt = Number(String(amount).replace(/[^\d.]/g, ''));
         const purpose = String(editRow.purpose || cashoutReason || description || 'Advance').trim();
         await kaziUpdateRequest(editRow.id, {
            amount: amt,
            months: Number(repayment) || 3,
            purpose,
            description: String(description || '').trim(),
         });
         setEditRow(null);
         setAmount('');
         await load(true);
      } catch (e) {
         setError(e.response?.data?.message || 'Update failed.');
      } finally {
         setSubmitting(false);
      }
   };

   const handleCancel = async (id) => {
      if (!window.confirm('Cancel this request?')) return;
      try {
         await kaziCancelRequest(id);
         await load(true);
         setDetailRow(null);
      } catch (e) {
         alert(e.response?.data?.message || 'Could not cancel.');
      }
   };

   const openEdit = (row) => {
      setEditRow(row);
      setAmount(String(row.amount_rwf ?? ''));
      setRepayment(Number(row.repayment_term_months) || 6);
      if (String(row.request_type).toLowerCase() === 'cashout') {
         setCashoutReason(String(row.cashout_reason || row.purpose || ''));
         setDescription(String(row.details || ''));
      } else {
         setDescription(String(row.purpose || ''));
      }
   };

   const renderBalanceCard = () => {
      const nextPayroll = (() => {
         const d = new Date();
         d.setMonth(d.getMonth() + 1);
         d.setDate(1);
         return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
      })();
      const { net, gross, deductionsTotal } = payrollSalary || {};
      const fmt = (n) => {
         if (payrollLoading) return '…';
         if (!Number.isFinite(n)) return '-';
         return Math.round(n).toLocaleString();
      };

      return (
         <div className="relative -mx-4 overflow-hidden border-y border-white/10 bg-[linear-gradient(145deg,#0E1F35,#1B3354)] p-5 text-white sm:rounded-[24px] sm:border">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-re-orange/20" />
            <div className="absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-white/5" />
            <div className="relative z-10 mb-1 flex items-start justify-between">
               <p className="text-sm font-semibold text-white">Payroll Balance</p>
               <button type="button" onClick={() => setShowBalances(!showBalances)} className="rounded-full p-1 text-white/40 hover:bg-white/10" aria-label={showBalances ? 'Hide amounts' : 'Show amounts'}>
                  {showBalances ? <EyeOff size={14} /> : <Eye size={14} />}
               </button>
            </div>
            <p className="relative z-10 mt-1 flex min-h-[2.25rem] flex-wrap items-baseline gap-1 text-3xl font-black tracking-tight">
               {payrollLoading ? <Loader2 className="h-8 w-8 animate-spin text-white/50" /> : (
                  <>
                     <span>{showBalances ? fmt(net) : '******'}</span>
                     <span className="font-black">RWF</span>
                  </>
               )}
            </p>
            <div className="relative z-10 mt-5 flex border-t border-white/10 pt-4">
               <div className="flex-1 border-r border-white/10 pr-4">
                  <p className="text-sm font-semibold text-white">Actual Payroll</p>
                  <p className="text-sm font-semibold text-white">
                     {payrollLoading ? '…' : (showBalances ? fmt(gross) : '******')} {!payrollLoading && <span className="text-sm font-black">RWF</span>}
                  </p>
               </div>
               <div className="flex-1 pl-4">
                  <p className="text-sm font-semibold text-white">Deduction</p>
                  <p className="text-sm font-semibold text-white">
                     {payrollLoading ? '…' : (showBalances ? fmt(deductionsTotal) : '******')} {!payrollLoading && <span className="text-sm font-black">RWF</span>}
                  </p>
               </div>
            </div>
            <div className="relative z-10 mt-3 hidden items-center gap-1.5 opacity-40 md:flex">
               <Clock size={10} className="text-re-orange" />
               <p className="text-sm font-semibold text-white">Next Payroll: {nextPayroll}</p>
            </div>
         </div>
      );
   };

   const renderRequestButton = (isMobile) => {
      if (isMobile) {
         return (
            <div className="px-0 md:py-4">
               <button onClick={openNewRequest} className="group flex w-full items-center justify-between rounded-2xl border border-re-orange/20 bg-white p-5 active:scale-[0.98]">
                  <div className="flex items-center gap-4">
                     <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-re-orange/10 text-re-orange">
                        <Plus size={24} strokeWidth={3} />
                     </div>
                     <div className="text-left">
                        <p className="text-sm font-black uppercase tracking-tight text-re-text">Request Cashout</p>
                        <p className="text-[10px] font-bold uppercase text-re-text-muted opacity-60">
                           {autoApprovalRemainingRwf > 0
                              ? `≤ ${formatMoney(autoApprovalRemainingRwf)} auto-approved instantly`
                              : maxAdvanceAmount > 0
                                ? `Up to ${formatMoney(maxAdvanceAmount)} available`
                                : `Up to ${advanceMaxPercent}% of net salary`}
                        </p>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-re-orange transition-transform group-hover:translate-x-1" />
               </button>
            </div>
         );
      }
      return (
         <button onClick={openNewRequest} className="mt-2 flex w-full items-center justify-center gap-2 rounded-[20px] bg-re-orange py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white active:scale-[0.98]">
            <Plus size={16} />
            <span>Request Cashout</span>
         </button>
      );
   };

   const dismissStatusAlert = (key) => setStatusAlerts((prev) => prev.filter((a) => a.key !== key));

   const handleEnablePush = async () => {
      setPushBusy(true); setPushHint(null);
      try { await subscribeTeacherPortalPush(); await refreshPushState(); }
      catch (e) { setPushHint(e.response?.data?.message || e.message || 'Could not enable notifications.'); }
      finally { setPushBusy(false); }
   };
   const handleDisablePush = async () => {
      setPushBusy(true); setPushHint(null);
      try { await unsubscribeTeacherPortalPush(); await refreshPushState(); }
      catch (e) { setPushHint(e.response?.data?.message || e.message || 'Could not turn off notifications.'); }
      finally { setPushBusy(false); }
   };

   const renderWebPushCard = () => {
      if (!isWebPushEnvironmentSupported()) {
         return (
            <div className="relative min-h-[160px] overflow-hidden border border-white/10 bg-[linear-gradient(145deg,#0E1F35,#1F3554)] p-6 text-white md:rounded-[24px]">
               <p className="text-[10px] font-black uppercase tracking-widest">Notifications</p>
               <p className="mt-2 text-[11px] font-semibold leading-relaxed text-white/60">This browser does not support web push notifications.</p>
            </div>
         );
      }
      const denied = pushUi.permission === 'denied';
      const subscribed = pushUi.subscribed;
      return (
         <div className="relative min-h-[160px] overflow-hidden border border-white/10 bg-[linear-gradient(145deg,#0E1F35,#1F3554)] p-6 text-white md:rounded-[24px]">
            <div className="relative z-10 space-y-4">
               <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-re-orange/30 bg-re-orange/20">
                  <Bell size={18} className="text-re-orange" />
               </div>
               <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest">
                    {subscribed ? 'Notifications on' : 'Enable notifications'}
                  </h4>
                  <p className="mt-2 text-[11px] font-semibold leading-relaxed text-white/60">
                    {denied
                      ? 'Notifications are blocked. Allow them in your browser settings for this site.'
                      : 'Get alerts when your advance is approved, rejected, or when a repayment reminder is due.'}
                  </p>
                  <ul className="mt-3 space-y-1 text-[10px] font-bold uppercase tracking-wide text-white/50">
                    <li>Approved</li>
                    <li>Rejected</li>
                    <li>Reminder</li>
                  </ul>
               </div>
               {pushHint ? <p className="text-[11px] font-semibold text-amber-300">{pushHint}</p> : null}
               {denied ? null : subscribed ? (
                  <button
                    type="button"
                    disabled={pushBusy}
                    onClick={handleDisablePush}
                    className="text-[10px] font-black uppercase tracking-widest text-re-orange"
                  >
                    {pushBusy ? '…' : 'Turn off'}
                  </button>
               ) : (
                  <button
                    type="button"
                    disabled={pushBusy}
                    onClick={handleEnablePush}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-re-orange px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[#000435]"
                  >
                    {pushBusy ? '…' : 'Enable web push'}
                  </button>
               )}
            </div>
         </div>
      );
   };

   if (loading && !rows.length) {
      return (
         <div className="flex h-screen items-center justify-center bg-re-bg">
            <Loader2 className="h-10 w-10 animate-spin text-re-orange" />
         </div>
      );
   }

   return (
      <div>
         {statusAlerts.length > 0 && createPortal(
            <div className="pointer-events-none fixed inset-x-0 top-4 z-[240] flex flex-col items-center gap-2 px-4">
               {statusAlerts.map((a) => {
                  const isSuccess = a.variant === 'success';
                  const isReject = a.variant === 'reject';
                  return (
                     <div key={a.key} className="pointer-events-auto flex w-full max-w-lg gap-3 rounded-2xl border border-black/5 bg-white p-4">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSuccess ? 'bg-emerald-100 text-emerald-700' : isReject ? 'bg-red-100 text-red-700' : 'bg-sky-100 text-sky-700'}`}>
                           {isSuccess ? <CheckCircle2 size={20} /> : isReject ? <XCircle size={20} /> : <Send size={20} />}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                           <p className="text-sm font-black leading-tight text-re-text">{a.title}</p>
                           <p className="mt-0.5 text-xs font-semibold leading-snug text-re-text-muted">{a.message}</p>
                        </div>
                        <button type="button" onClick={() => dismissStatusAlert(a.key)} className="shrink-0 rounded-lg p-1.5 text-re-text-muted hover:bg-black/5" aria-label="Dismiss notification">
                           <X size={16} />
                        </button>
                     </div>
                  );
               })}
            </div>,
            document.body
         )}

         <div className="relative z-20 mx-auto max-w-[1600px] px-4 pb-20 md:px-12 md:pt-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
               <div className="space-y-4 md:space-y-8 lg:col-span-2">
                  <div className="space-y-4 lg:hidden">
                     {renderBalanceCard()}
                     {renderRequestButton(true)}
                     {renderWebPushCard()}
                  </div>

                  <div className="overflow-hidden border-y border-black/5 bg-white md:rounded-[32px] md:border">
                     <div className="px-4 pb-0 pt-4 md:px-6 md:pt-5">
                        <div className="flex gap-2 rounded-2xl bg-re-bg p-1">
                           <button
                              onClick={() => setActiveTab('cashout')}
                              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-wide transition-all ${
                                 activeTab === 'cashout' ? 'bg-re-orange text-white' : 'text-re-text-muted hover:text-re-text'
                              }`}
                           >
                              <Banknote size={13} className="shrink-0" />
                              <span>Cashouts</span>
                              {cashoutRequests.length > 0 && (
                                 <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black ${activeTab === 'cashout' ? 'bg-white/25 text-white' : 'bg-re-orange/15 text-re-orange'}`}>
                                    {cashoutRequests.length}
                                 </span>
                              )}
                           </button>
                           <button
                              onClick={() => setActiveTab('deals')}
                              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-wide transition-all ${
                                 activeTab === 'deals' ? 'bg-indigo-600 text-white' : 'text-re-text-muted hover:text-re-text'
                              }`}
                           >
                              <Package size={13} className="shrink-0" />
                              <span>Deals</span>
                              {dealRequests.length > 0 && (
                                 <span className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black ${activeTab === 'deals' ? 'bg-white/25 text-white' : 'bg-indigo-500/15 text-indigo-600'}`}>
                                    {dealRequests.length}
                                 </span>
                              )}
                           </button>
                        </div>
                     </div>

                     {activeTab === 'cashout' && (
                        <div>
                           <div className="flex items-center justify-between px-4 pb-2 pt-4 md:px-6">
                              <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted opacity-60">
                                 {cashoutRequests.length} request{cashoutRequests.length !== 1 ? 's' : ''}
                                 {cashoutRequests.length > 0 && ` · ${formatMoney(cashoutRequests.reduce((s, r) => s + (Number(r.amount_rwf) || 0), 0))} total`}
                              </p>
                              <div className="flex items-center gap-3">
                              <Link
                                 to="/repayment-schedule"
                                 className="text-[10px] font-black uppercase tracking-wide text-[#c87800]"
                              >
                                 Repayment schedule
                              </Link>
                              <button
                                 onClick={openNewRequest}
                                 className="flex items-center gap-1.5 rounded-xl bg-re-orange px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white"
                              >
                                 <Plus size={11} /> New Request
                              </button>
                              </div>
                           </div>
                           {cashoutRequests.length === 0 ? (
                              <div className="flex flex-col items-center justify-center gap-3 py-14">
                                 <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-re-bg">
                                    <Banknote size={24} className="text-re-text-muted/30" />
                                 </div>
                                 <div className="text-center">
                                    <p className="text-xs font-black uppercase tracking-wide text-re-text-muted opacity-40">No cashout requests yet</p>
                                    <p className="mt-1 text-[10px] text-re-text-muted opacity-30">Tap "New Request" to request funds</p>
                                 </div>
                              </div>
                           ) : (
                              <div className="overflow-x-auto pb-2">
                                 <table className="w-full min-w-[360px]">
                                    <thead>
                                       <tr className="border-b border-black/5 bg-re-bg/40">
                                          <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-re-text-muted/70 md:px-6">Date & Reason</th>
                                          <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-re-text-muted/70">Amount</th>
                                          <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-re-text-muted/70">Status</th>
                                          <th className="w-8 px-3 py-2.5"></th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/[0.04]">
                                       {cashoutRequests.map((r) => (
                                          <tr key={r.id} onClick={() => setDetailRow(r)} className="group cursor-pointer hover:bg-re-bg/40">
                                             <td className="px-4 py-3.5 md:px-6">
                                                <div className="text-xs font-bold text-re-text">{new Date(r.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                {(r.cashout_reason || r.description) && (
                                                   <div className="mt-0.5 max-w-[180px] truncate text-[10px] text-re-text-muted opacity-50">{r.cashout_reason || r.description}</div>
                                                )}
                                             </td>
                                             <td className="whitespace-nowrap px-3 py-3.5">
                                                <span className="text-sm font-black text-re-text">{formatMoney(r.amount_rwf)}</span>
                                             </td>
                                             <td className="whitespace-nowrap px-3 py-3.5">
                                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${STATUS_MAP[r.status]?.className || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                   {STATUS_MAP[r.status]?.short || r.status}
                                                </span>
                                             </td>
                                             <td className="px-3 py-3.5 text-right">
                                                <ChevronRight size={14} className="inline-block text-re-text-muted/40" />
                                             </td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                           )}
                        </div>
                     )}

                     {activeTab === 'deals' && (
                        <div>
                           <div className="flex items-center justify-between px-4 pb-2 pt-4 md:px-6">
                              <p className="text-[10px] font-black uppercase tracking-widest text-re-text-muted opacity-60">
                                 {dealRequests.length} request{dealRequests.length !== 1 ? 's' : ''}
                                 {dealRequests.length > 0 && ` · ${formatMoney(dealRequests.reduce((s, r) => s + (Number(r.amount_rwf) || 0), 0))} total`}
                              </p>
                           </div>
                           {dealRequests.length === 0 ? (
                              <div className="flex flex-col items-center justify-center gap-3 py-14">
                                 <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-re-bg">
                                    <Package size={24} className="text-re-text-muted/30" />
                                 </div>
                                 <div className="text-center">
                                    <p className="text-xs font-black uppercase tracking-wide text-re-text-muted opacity-40">No deal requests yet</p>
                                    <p className="mt-1 text-[10px] text-re-text-muted opacity-30">Browse TichaDeals to get started</p>
                                 </div>
                              </div>
                           ) : (
                              <div className="overflow-x-auto pb-2">
                                 <table className="w-full min-w-[380px]">
                                    <thead>
                                       <tr className="border-b border-black/5 bg-re-bg/40">
                                          <th className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-re-text-muted/70 md:px-6">Service / Deal</th>
                                          <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-re-text-muted/70">Amount</th>
                                          <th className="hidden px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-re-text-muted/70 sm:table-cell">Term</th>
                                          <th className="px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-wider text-re-text-muted/70">Status</th>
                                          <th className="w-8 px-3 py-2.5"></th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/[0.04]">
                                       {dealRequests.map((r) => {
                                          const label = r.service_category ? r.service_category.replace(/_/g, ' ') : r.vendor_label || 'Service';
                                          return (
                                             <tr key={r.id} onClick={() => setDetailRow(r)} className="group cursor-pointer hover:bg-re-bg/40">
                                                <td className="px-4 py-3.5 md:px-6">
                                                   <div className="text-xs font-bold capitalize text-re-text">{label}</div>
                                                   <div className="mt-0.5 text-[10px] text-re-text-muted opacity-50">{new Date(r.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-3.5"><span className="text-sm font-black text-re-text">{formatMoney(r.amount_rwf)}</span></td>
                                                <td className="hidden whitespace-nowrap px-3 py-3.5 sm:table-cell"><span className="text-xs font-semibold text-re-text-muted/60">{r.repayment_term_months || 1}mo</span></td>
                                                <td className="whitespace-nowrap px-3 py-3.5">
                                                   <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${STATUS_MAP[r.status]?.className || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                                      {STATUS_MAP[r.status]?.short || r.status}
                                                   </span>
                                                </td>
                                                <td className="px-3 py-3.5 text-right"><ChevronRight size={14} className="inline-block text-re-text-muted/40" /></td>
                                             </tr>
                                          );
                                       })}
                                    </tbody>
                                 </table>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               </div>

               <div className="h-fit md:space-y-4 lg:sticky lg:top-20">
                  <div className="hidden space-y-2 lg:block">
                     {renderBalanceCard()}
                     {renderRequestButton(false)}
                  </div>
                  <div className="md:space-y-2">
                     <div className="hidden items-start gap-4 border border-emerald-500/10 bg-white p-5 md:flex md:rounded-2xl">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-100/50 bg-emerald-50 text-emerald-500"><User size={18} /></div>
                        <div className="pt-0.5">
                           <div className="flex items-center gap-1.5">
                              <h3 className="text-[11px] font-black uppercase text-re-text">KYC Verified</h3>
                              <CheckCircle size={10} className="text-emerald-500" />
                           </div>
                           <p className="mt-1 text-[9px] font-bold text-re-text-muted opacity-70">Your profile matches school records for check-offs.</p>
                        </div>
                     </div>
                     <div className="hidden md:block">
                        {renderWebPushCard()}
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <TichaAvanceRequestModal
            open={showApplyModal}
            eligibility={eligibility}
            onClose={() => setShowApplyModal(false)}
            onSubmitted={(result) => {
               setStatusAlerts((prev) => [{
                  key: `submitted-${Date.now()}`,
                  variant: 'success',
                  title: 'Request submitted',
                  message: result?.message || 'Your advance request is waiting approval.',
               }, ...prev].slice(0, 8));
               void load(true);
            }}
         />

         {editRow && createPortal(
            <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/60 p-4">
               <div className="w-full max-w-md space-y-6 rounded-[32px] border border-black/5 bg-white p-8">
                  <div className="flex items-center justify-between">
                     <h2 className="text-lg font-black uppercase tracking-tight text-re-text">Update Request</h2>
                     <button onClick={() => setEditRow(null)} className="rounded-xl p-2 hover:bg-re-bg"><X size={20} /></button>
                  </div>
                  <div className="space-y-4">
                     <div>
                        <label className="text-[10px] font-black uppercase text-re-text-muted">Amount (RWF)</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 h-12 w-full rounded-xl border border-black/10 bg-white px-4 font-black outline-none focus:border-re-orange/40" />
                     </div>
                     {String(editRow.request_type).toLowerCase() !== 'cashout' && (
                        <div>
                           <label className="text-[10px] font-black uppercase text-re-text-muted">Repayment Months</label>
                           <select value={repayment} onChange={e => setRepayment(Number(e.target.value))} className="mt-1 h-12 w-full rounded-xl border border-black/10 bg-white px-4 font-black outline-none focus:border-re-orange/40">
                              {REPAYMENT_OPTIONS.map(m => <option key={m} value={m}>{m} Months</option>)}
                           </select>
                        </div>
                     )}
                     <button onClick={submitUpdate} disabled={submitting} className="w-full rounded-2xl bg-re-grad-orange py-4 font-black uppercase tracking-widest text-white">{submitting ? 'Saving…' : 'Save Changes'}</button>
                  </div>
               </div>
            </div>,
            document.body
         )}

         <Modal open={!!detailRow} onClose={() => setDetailRow(null)} wide
            title={detailRow ? `${String(detailRow.request_type || 'service').toLowerCase() === 'cashout' ? 'Cashout' : 'Deal'} Request #${detailRow.id}` : ''}>
            {detailRow && (() => {
               const isCashout = String(detailRow.request_type || '').toLowerCase() === 'cashout';
               const isPending = detailRow.status === 'pending_accountant';
               const amt = Number(detailRow.amount_rwf) || 0;
               return (
                  <div className="space-y-5">
                     <div className="flex items-center justify-between gap-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${isCashout ? 'bg-re-orange/10 text-re-orange' : 'bg-indigo-50 text-indigo-700'}`}>
                           {isCashout ? <Banknote size={12} /> : <Package size={12} />}
                           {isCashout ? 'Cashout' : (detailRow.service_category?.replace(/_/g, ' ') || 'Service')}
                        </span>
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold ${STATUS_MAP[detailRow.status]?.className || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                           {STATUS_MAP[detailRow.status]?.label || detailRow.status}
                        </span>
                     </div>
                     <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 rounded-2xl bg-re-bg p-4">
                           <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted opacity-50">Amount</p>
                           <p className="text-xl font-black text-re-text">{formatMoney(amt)}</p>
                        </div>
                        <div className="space-y-1 rounded-2xl bg-re-bg p-4">
                           <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted opacity-50">Date</p>
                           <p className="text-sm font-black text-re-text">{new Date(detailRow.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                     </div>
                     {(detailRow.cashout_reason || detailRow.purpose || detailRow.description) && (
                        <div className="space-y-1 rounded-2xl bg-re-bg p-4">
                           <p className="text-[9px] font-black uppercase tracking-widest text-re-text-muted opacity-50">Details</p>
                           <p className="text-sm font-semibold leading-relaxed text-re-text">{detailRow.description || detailRow.cashout_reason || detailRow.purpose}</p>
                        </div>
                     )}
                     {isPending && (
                        <div className="flex gap-3 pt-1">
                           <button onClick={() => { setDetailRow(null); openEdit(detailRow); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white py-3 text-[10px] font-black uppercase tracking-widest text-re-text">
                              <Pencil size={12} /> Edit
                           </button>
                           <button onClick={() => handleCancel(detailRow.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-50 py-3 text-[10px] font-black uppercase tracking-widest text-red-500">
                              <Trash2 size={12} /> Cancel
                           </button>
                        </div>
                     )}
                  </div>
               );
            })()}
         </Modal>
      </div>
   );
}

function Modal({ open, onClose, title, children, wide }) {
   if (!open) return null;
   return createPortal(
      <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-4">
         <div className={`flex w-full flex-col overflow-hidden rounded-[32px] border border-black/5 bg-white ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
            <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-8 py-6">
               <h2 className="text-lg font-black uppercase tracking-tight text-re-text">{title}</h2>
               <button onClick={onClose} className="rounded-xl p-2 hover:bg-re-bg"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto p-8">{children}</div>
         </div>
      </div>,
      document.body
   );
}
