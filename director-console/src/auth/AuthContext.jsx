import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { iam } from '../lib/api/iam';

const AuthContext = createContext(null);
const KEY = 'director_auth';

function loadStored() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}

function tokenExp(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return 0;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return (JSON.parse(json).exp || 0) * 1000;
  } catch { return 0; }
}

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => loadStored());
  const [user, setUser] = useState(session?.user || null);
  const [loading, setLoading] = useState(!!session?.accessToken);
  const refreshPromise = useRef(null);
  const timerRef = useRef(null);

  const token = session?.accessToken || null;

  useEffect(() => {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  }, [session]);

  const clear = useCallback(() => {
    setSessionState(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (refreshPromise.current) return refreshPromise.current;
    const rt = session?.refreshToken || loadStored()?.refreshToken;
    if (!rt) { clear(); return null; }
    refreshPromise.current = (async () => {
      try {
        const res = await iam.refresh(rt);
        const data = res?.data ?? res;
        const accessToken = data?.accessToken || data?.token || data?.tokens?.accessToken;
        const refreshToken = data?.refreshToken || data?.tokens?.refreshToken || rt;
        if (!accessToken) throw new Error('No access token returned from refresh');
        let me = data?.user || null;
        setSessionState((s) => ({ ...(s || {}), accessToken, refreshToken, ...(me ? { user: me } : {}) }));
        if (me) setUser(me);
        return accessToken;
      } catch {
        clear();
        return null;
      } finally {
        refreshPromise.current = null;
      }
    })();
    return refreshPromise.current;
  }, [session?.refreshToken, clear]);

  // schedule proactive refresh ~60s before expiry (min 10s)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!token) return;
    const exp = tokenExp(token);
    if (!exp) return;
    const ms = Math.max(10000, exp - Date.now() - 60000);
    timerRef.current = setTimeout(() => { void refresh(); }, ms);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [token, refresh]);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let on = true;
    (async () => {
      let access = token;
      const exp = tokenExp(access);
      if (exp && exp - Date.now() < 30000) {
        access = await refresh();
      }
      if (!access) { if (on) setLoading(false); return; }
      try {
        const u = await iam.me(access);
        if (on) { setUser(u); setSessionState((s) => (s ? { ...s, user: u } : s)); }
      } catch (err) {
        if (!on) return;
        if (err?.status === 401) {
          const next = await refresh();
          if (next) {
            try {
              const u = await iam.me(next);
              if (on) { setUser(u); setSessionState((s) => (s ? { ...s, user: u } : s)); }
            } catch { if (on) clear(); }
          } else if (on) { clear(); }
        } else if (!user) {
          setUser(session?.user || { name: 'Director' });
        }
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []); // eslint-disable-line

  const login = async (email, password) => {
    const res = await iam.login({ identifier: email, email, password });
    const data = res?.data ?? res;
    if (data?.mfaRequired || data?.requiresMfa) {
      const err = new Error('MFA required for this account. Complete MFA in the main portal for now.');
      err.data = data; throw err;
    }
    const accessToken = data?.accessToken || data?.token || data?.tokens?.accessToken;
    const refreshToken = data?.refreshToken || data?.tokens?.refreshToken;
    if (!accessToken) throw new Error('Login succeeded but no access token was returned.');
    let me = data?.user || null;
    try { me = await iam.me(accessToken); } catch {}
    const next = { accessToken, refreshToken, user: me };
    setSessionState(next); setUser(me);
    return me;
  };

  const logout = async () => {
    try { if (token) await iam.logout(token); } catch {}
    clear();
  };

  const value = useMemo(() => ({ user, token, session, loading, login, logout, refresh }), [user, token, session, loading, refresh, logout, login]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

