"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { API_URL, pingApi } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

export function ApiOfflineBanner() {
  const { apiOffline, reload } = useAuth();
  const [checking, setChecking] = useState(false);
  const [stillOffline, setStillOffline] = useState(apiOffline);

  useEffect(() => {
    setStillOffline(apiOffline);
  }, [apiOffline]);

  useEffect(() => {
    if (!apiOffline) return;
    const id = window.setInterval(async () => {
      const ok = await pingApi();
      if (ok) {
        setStillOffline(false);
        void reload();
      }
    }, 8000);
    return () => window.clearInterval(id);
  }, [apiOffline, reload]);

  if (!stillOffline) return null;

  async function retry() {
    setChecking(true);
    const ok = await pingApi();
    if (ok) {
      setStillOffline(false);
      await reload();
    }
    setChecking(false);
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">KaziAdvance API is offline</p>
            <p className="text-xs text-amber-800">
              Start the backend at <code className="font-mono">{API_URL}</code> —{" "}
              <code className="font-mono">cd KaziAvance/Backend && npm run dev</code>
            </p>
          </div>
        </div>
        <button type="button" className="btn-secondary text-xs" disabled={checking} onClick={() => void retry()}>
          {checking ? "Checking…" : "Retry connection"}
        </button>
      </div>
    </div>
  );
}
