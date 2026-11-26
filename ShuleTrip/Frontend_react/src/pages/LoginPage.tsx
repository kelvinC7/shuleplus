import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Eye, EyeOff, Landmark, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { WelcomeHeader } from '@/components/welcome/welcome-header';
import { useToast } from '@/components/ui/toast-provider';
import { loginShuleTripPortal } from '@/services/portal-public-api';
import { setToken } from '@/shared/auth-token';
import { cn } from '@/shared/cn';
import { loginErrorToast } from '@/shared/login-error-toast';

type Portal = 'school' | 'government';

const FEATURES = [
  'Plan and register educational trips in minutes',
  'Collect digital parent consent, no paper forms',
  'Government review with a complete audit trail',
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [portal, setPortal] = useState<Portal>('school');

  useEffect(() => {
    const p = searchParams.get('portal');
    if (p === 'government') setPortal('government');
    if (p === 'school') setPortal('school');
  }, [searchParams]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginShuleTripPortal({ portal, username, password });
      setToken(result.accessToken);
      toast({
        variant: 'success',
        title: 'Welcome back',
        description: 'You are signed in to ShuleTrip.',
        durationMs: 4000,
      });
      if (result.portal === 'school') navigate('/school/dashboard');
      else navigate('/government/overview');
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string; code?: string } } })
        ?.response;
      const msg =
        res?.data?.message ?? "We couldn't sign you in. Double-check your username and password, then try again.";
      const payload = loginErrorToast(res?.status, msg, portal, res?.data?.code);
      toast({
        variant: payload.variant,
        title: payload.title,
        description: payload.description,
        durationMs: payload.variant === 'warning' ? 12000 : 8000,
      });
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Portal; label: string; icon: typeof Building2 }[] = [
    { id: 'school', label: 'School', icon: Building2 },
    { id: 'government', label: 'Government', icon: Landmark },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8f9fb]">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-amber/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-navy/10 blur-3xl"
      />
      <WelcomeHeader />

      <div className="relative mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        {/* Brand panel */}
        <div className="relative hidden overflow-hidden rounded-[2rem] border border-white/60 bg-navy shadow-elevated lg:block">
          <img
            src="/shuletrip-bg.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/20" />
          <div className="relative flex h-full min-h-[560px] flex-col justify-end p-10 text-white">
            <div className="mb-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              Safe school journeys
            </div>
            <h2 className="max-w-md text-3xl font-extrabold leading-tight tracking-tight">
              One platform for safer school journeys.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
              Schools plan trips, parents give digital consent, and government teams review with full audit trails.
            </p>
            <ul className="mt-6 space-y-2.5">
              {FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/85">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber/20 text-amber">
                    <ShieldCheck className="h-3 w-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form panel */}
        <div className="mx-auto w-full max-w-md">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">Sign in</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-navy">Welcome back</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {portal === 'government'
              ? 'All government roles — intake, education, transport, checkpoint, approval, monitoring, and admin.'
              : 'Schools — use your registered email or username.'}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPortal(t.id)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition sm:text-sm',
                  portal === t.id
                    ? 'bg-navy text-white shadow-sm shadow-navy/25'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-navy'
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={onSubmit}
            className="mt-5 space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-card"
          >
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Username or email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber/70 focus:ring-4 focus:ring-amber/15"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder="you@school.rw"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-amber/70 focus:ring-4 focus:ring-amber/15"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-navy to-navy-muted text-sm font-bold text-white shadow-lg shadow-navy/20 transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in
            </button>
            <p className="flex items-center justify-center gap-1.5 text-center text-[11px] font-semibold text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secured by Shule+ identity
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            First time here?{' '}
            <Link to="/register" className="font-bold text-navy hover:underline">
              Register your school
            </Link>{' '}
            to get started.
          </p>
          {portal === 'government' ? (
            <p className="mt-3 text-center text-xs text-slate-400">
              Demo: <span className="font-semibold text-slate-500">gov.reviewer</span> / GovReview@2026
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
