import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export function LoginScreen() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(identifier.trim(), password); }
    catch (err) { setError(err?.message || 'Login failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="stage">
      <div className="phone">
        <div className="screen">
          <div className="notch" />
          <div className="st-splash st-login">
            <div className="st-brand">
              <img src="/ShuleManagerWhite.png" alt="ShuleManager" />
              <p>The director&rsquo;s workspace</p>
            </div>

            <img className="st-teacher" src="/st-teacher.webp" alt="" />

            <form className="st-card" onSubmit={submit}>
              <h2 className="st-lg-t">Welcome back</h2>
              <p className="st-lg-sub">Sign in to your director console.</p>

              <label className="st-l" htmlFor="st-id">Email or mobile number</label>
              <input
                id="st-id" className="st-in" type="text" autoComplete="username"
                value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter email/tel" required
              />

              <label className="st-l" htmlFor="st-pw">Password</label>
              <div className="st-pw">
                <input
                  id="st-pw" className="st-in" type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password" value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>

              {error && <p className="st-err">{error}</p>}

              <button type="submit" className="st-go" disabled={busy}>
                {busy ? (<><span className="st-spin" /> Signing in…</>) : 'Sign in'}
              </button>
            </form>

            <div className="st-ft">
              <span>Powered by</span>
              <img src="/logo_white.png" alt="Shule+" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
