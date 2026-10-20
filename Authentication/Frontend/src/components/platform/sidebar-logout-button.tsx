'use client';

interface SidebarLogoutButtonProps {
  fullName?: string;
  onLogout: () => void;
}

export function SidebarLogoutButton({ fullName, onLogout }: SidebarLogoutButtonProps) {
  return (
    <div className="shrink-0 border-t border-white/10 p-4">
      <button
        type="button"
        onClick={onLogout}
        className="group flex w-full items-center gap-3 rounded-2xl bg-red-500/[0.08] px-3.5 py-2.5 text-left ring-1 ring-red-400/15 transition hover:bg-red-500/[0.13] hover:ring-red-400/25"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-300/90">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-red-500/90">Log out</span>

        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="shrink-0 text-red-300/40 transition group-hover:translate-x-0.5 group-hover:text-red-300/70"
        >
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
