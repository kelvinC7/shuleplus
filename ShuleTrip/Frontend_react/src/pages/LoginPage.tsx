import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Eye, EyeOff, Landmark, Loader2, Lock } from 'lucide-react';
import { WelcomeHeader } from '@/components/welcome/welcome-header';
import { useToast } from '@/components/ui/toast-provider';
import { loginShuleTripPortal } from '@/services/portal-public-api';
import { setToken } from '@/shared/auth-token';
import { cn } from '@/shared/cn';
import { loginErrorToast } from '@/shared/login-error-toast';

type Portal = 'school' | 'government';

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
    <div className="min-h-screen bg-[#f8f9fb]">
      <WelcomeHeader />
      <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl lg:grid-cols-2">
        <div className="relative hidden overflow-hidden lg:block">
          <img
            src="/shuletrip-bg.png"
            alt=""
            className="absolute inset-0 h-full w-full bg-[#fff8eb] object-contain object-left"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/40 to-transparent" />
          <div className="relative flex h-full flex-col justify-end p-12 text-white">
            <img src="/shule_logo.png" alt="ShuleTrip" className="mb-6 h-12 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <h2 className="text-3xl font-extrabold leading-tight">One platform for safer school journeys</h2>
            <p className="mt-3 max-w-md text-sm text-white/80">
              Schools plan trips, parents give digital consent, and government teams review with full audit trails.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Sign in</p>
            <h1 className="mt-2 text-2xl font-extrabold text-navy">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-600">
              {portal === 'government'
                ? 'All government roles — intake, education, transport, checkpoint, approval, monitoring, and admin.'
                : 'Schools — use your registered email or username.'}
            </p>

            <div className="mt-6 flex gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-line">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPortal(t.id)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold transition sm:text-sm',
                    portal === t.id ? 'bg-navy text-white' : 'text-slate-600 hover:text-navy'
                  )}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-3xl border border-line bg-white p-6 shadow-sm">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Username or email</label>
                <input
                  className="w-full rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-navy/30 focus:ring-2 focus:ring-navy/10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-xl border border-line py-2.5 pl-10 pr-11 text-sm outline-none focus:border-navy/30 focus:ring-2 focus:ring-navy/10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-navy text-sm font-bold text-white shadow-lg transition hover:bg-navy-muted disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sign in
              </button>
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
    </div>
  );
}
