import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/shared/cn';

const NAV = [
  { label: 'Home', hash: 'home' },
  { label: 'How it works', hash: 'how-it-works' },
  { label: 'Contact Us', hash: 'contact' },
] as const;

function isNavActive(pathname: string, locationHash: string, sectionId: string) {
  if (pathname !== '/') return false;
  const current = locationHash.replace('#', '') || 'home';
  return current === sectionId;
}

export function WelcomeHeader() {
  const [open, setOpen] = useState(false);
  const { pathname, hash } = useLocation();

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3" onClick={closeMenu}>
          <img src="/shule_logo.png" alt="" className="h-10 w-10 shrink-0 object-contain" onError={(e) => { (e.target as HTMLImageElement).src = '/yellow-icon.png'; }} />
          <div className="min-w-0">
            <p className="text-lg font-extrabold tracking-tight text-navy">ShuleTrip</p>
            <p className="truncate text-[11px] font-semibold text-slate-500">Travel · Explore · Learn</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.hash}
              to={{ pathname: '/', hash: item.hash }}
              className={cn(
                'text-sm font-semibold transition-colors hover:text-amber-700',
                isNavActive(pathname, hash, item.hash) ? 'text-navy' : 'text-slate-600'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link
            to="/login?portal=government"
            className="hidden text-sm font-semibold text-slate-600 transition hover:text-navy md:inline-flex"
          >
            Government
          </Link>
          <Link
            to="/login"
            className="inline-flex h-10 items-center justify-center rounded-full border-2 border-navy px-5 text-sm font-bold text-navy transition hover:bg-navy/5"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="inline-flex h-10 items-center justify-center rounded-full bg-amber px-5 text-sm font-bold text-navy shadow-[0_8px_20px_rgba(252,176,56,0.35)] transition hover:bg-[#ffb84d]"
          >
            Register School
          </Link>
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-xl border border-line text-navy lg:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-line bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.hash}
                to={{ pathname: '/', hash: item.hash }}
                onClick={closeMenu}
                className={cn(
                  'rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-surface',
                  isNavActive(pathname, hash, item.hash) ? 'text-navy' : 'text-slate-700'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid gap-2">
            <Link
              to="/login?portal=government"
              onClick={closeMenu}
              className="flex h-11 items-center justify-center rounded-full border border-line text-sm font-bold text-navy"
            >
              Government sign in
            </Link>
            <Link to="/login" onClick={closeMenu} className="flex h-11 items-center justify-center rounded-full border-2 border-navy text-sm font-bold text-navy">
              Login
            </Link>
            <Link to="/register" onClick={closeMenu} className="flex h-11 items-center justify-center rounded-full bg-amber text-sm font-bold text-navy">
              Register School
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
