import { Link, useLocation, Navigate } from 'react-router-dom';
import { WelcomeHeader } from '@/components/welcome/welcome-header';
import type { RegistrationSubmission } from '@/school-register/types';

const SUPPORT_EMAIL = 'support@shuleplus.rw';
const SUPPORT_PHONE = '+250 788 123 456';

export default function RegisterConfirmationPage() {
  const state = useLocation().state as { submission?: RegistrationSubmission } | null;
  const sub = state?.submission;

  if (!sub) {
    return <Navigate to="/register" replace />;
  }

  return (
    <div className="min-h-screen bg-surface">
      <WelcomeHeader />
      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-line bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Registration received</p>
          <h1 className="mt-2 text-2xl font-extrabold text-navy">Thank you for registering</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Your school registration has been submitted for verification. Trip applications remain separate and require
            their own government approval after your school is verified.
          </p>

          <dl className="mt-8 grid gap-4 rounded-2xl bg-surface p-5 text-sm">
            <div className="flex justify-between gap-4 border-b border-line pb-3">
              <dt className="font-semibold text-slate-500">Reference</dt>
              <dd className="font-bold text-navy">{sub.reference}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-3">
              <dt className="font-semibold text-slate-500">School</dt>
              <dd className="text-right font-bold text-navy">{sub.schoolName}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-line pb-3">
              <dt className="font-semibold text-slate-500">Submitted</dt>
              <dd>{new Date(sub.submittedAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-semibold text-slate-500">Status</dt>
              <dd>
                <span className="rounded-full bg-amber/20 px-3 py-1 text-xs font-bold text-amber-900">{sub.status}</span>
              </dd>
            </div>
          </dl>

          <div className="mt-8">
            <h2 className="text-sm font-bold text-navy">What happens next</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
              <li>Our team reviews your documents (typically 3–5 working days).</li>
              <li>You may receive a request for additional information by email or SMS.</li>
              <li>Once a super admin approves your school, sign in at Login with your username and password.</li>
              <li>Approved schools can submit individual trip applications for government review.</li>
            </ol>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            {sub.confirmationEmailSent !== false ? (
              <>
                We sent a confirmation email to{' '}
                <b className="text-navy">{sub.form.step5.accountEmail || sub.form.step1.email}</b> with your reference,
                registration status, and your ShuleTrip username and password. Check your inbox and spam folder.
              </>
            ) : (
              <>
                We could not send email automatically. Save your username and password from the form. Contact support
                if you need help:{' '}
              </>
            )}{' '}
            Support:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-navy hover:underline">
              {SUPPORT_EMAIL}
            </a>{' '}
            ·{' '}
            <a href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`} className="font-semibold text-navy hover:underline">
              {SUPPORT_PHONE}
            </a>
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-navy text-sm font-bold text-white"
            >
              Login to ShuleTrip
            </Link>
            <Link
              to="/"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full border-2 border-navy text-sm font-bold text-navy"
            >
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
