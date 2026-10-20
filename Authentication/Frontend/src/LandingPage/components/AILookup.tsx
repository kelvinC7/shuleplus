"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Search,
  GraduationCap,
  Building2,
  UserRound,
  BadgeCheck,
  Loader2,
  ArrowUpRight,
} from "lucide-react";

type LookupMode = "student" | "sdms";

type LookupResult = {
  code: string;
  mode: LookupMode;
  name: string;
  school: string;
  detail: string;
  status: "Active" | "Graduated" | "Transferred";
  meta: { label: string; value: string }[];
};

const DEMO: Record<string, Omit<LookupResult, "code" | "mode">> = {
  "STU-KGL-00142": {
    name: "Aline Uwase",
    school: "Kigali Bright Academy",
    detail: "Senior 3 · Science Combination",
    status: "Active",
    meta: [
      { label: "District", value: "Gasabo" },
      { label: "Gender", value: "Female" },
      { label: "Enrollment", value: "2022" },
    ],
  },
  "SDMS-2024-0847": {
    name: "Jean Paul Habimana",
    school: "Green Hills Academy",
    detail: "Primary 5 · Day Scholar",
    status: "Active",
    meta: [
      { label: "District", value: "Kicukiro" },
      { label: "Guardian", value: "Verified" },
      { label: "Fees", value: "Up to date" },
    ],
  },
  "SDMS-2023-5521": {
    name: "Mugisha Eric",
    school: "Rwanda Coding Academy",
    detail: "Year 2 · TVET Software",
    status: "Active",
    meta: [
      { label: "Track", value: "Software Dev" },
      { label: "Attendance", value: "96%" },
      { label: "NESA", value: "Compliant" },
    ],
  },
};

const suggestions = [
  { label: "Student Code", value: "STU-KGL-00142", mode: "student" as const },
  { label: "SDMS Code", value: "SDMS-2024-0847", mode: "sdms" as const },
];

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, "-");
}

function resolveLookup(code: string, mode: LookupMode): LookupResult | null {
  const key = normalizeCode(code);
  const hit = DEMO[key];
  if (!hit) return null;
  return { code: key, mode, ...hit };
}

export function AILookup() {
  const [mode, setMode] = useState<LookupMode>("student");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setNotFound(false);
    setResult(null);

    await new Promise((r) => setTimeout(r, 900));

    const hit = resolveLookup(query, mode);
    if (hit) {
      setResult(hit);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }

  function applySuggestion(value: string, nextMode: LookupMode) {
    setMode(nextMode);
    setQuery(value);
    setNotFound(false);
    setResult(null);
  }

  const placeholder =
    mode === "student"
      ? "Enter student code - e.g. STU-KGL-00142"
      : "Enter SDMS code - e.g. SDMS-2024-0847";

  return (
    <div className="w-full">
      <div className="rounded-[1.75rem] border border-navy-900/[0.08] bg-white/90 p-2 shadow-lift backdrop-blur-xl">
        <div className="flex items-center gap-2 px-4 pt-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-glow-amber">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">Student Lookup</p>
            <p className="text-[12px] text-navy-700/55">Search by student code or SDMS code</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-3 px-2 pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-navy-900/[0.08] bg-mist-50/80 px-4 py-3 focus-within:border-amber-400/50 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-400/10">
              <Search className="h-4 w-4 shrink-0 text-navy-700/40" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setNotFound(false);
                }}
                placeholder={placeholder}
                className="min-w-0 flex-1 bg-transparent text-sm text-navy-900 outline-none placeholder:text-navy-700/35"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-navy-900 px-6 text-sm font-semibold text-white transition-all hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-50 sm:shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching
                </>
              ) : (
                <>
                  Search
                  <ArrowUpRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
          <div className="flex rounded-full border border-navy-900/[0.08] bg-mist-50 p-1">
            {(["student", "sdms"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
                  mode === m
                    ? "bg-white text-navy-900 shadow-soft"
                    : "text-navy-700/55 hover:text-navy-900"
                }`}
              >
                {m === "student" ? "Student Code" : "SDMS Code"}
              </button>
            ))}
          </div>
          {suggestions.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => applySuggestion(s.value, s.mode)}
              className="rounded-full border border-navy-900/[0.06] bg-white px-3 py-1.5 text-[11px] font-medium text-navy-700/70 transition-colors hover:border-amber-400/40 hover:text-navy-900"
            >
              Try {s.value}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.code}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-4 overflow-hidden rounded-2xl border border-navy-900/[0.08] bg-white shadow-soft"
          >
            <div className="flex items-start justify-between gap-4 border-b border-navy-900/[0.06] bg-gradient-to-r from-mist-50 to-white px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-accent/10 text-indigo-accent">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-navy-900">{result.name}</p>
                  <p className="mt-0.5 text-sm text-navy-700/60">{result.detail}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-accent/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-accent">
                <BadgeCheck className="h-3.5 w-3.5" />
                {result.status}
              </span>
            </div>

            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-navy-800">
                <GraduationCap className="h-4 w-4 text-amber-500" />
                <span className="text-navy-700/55">Code</span>
                <span className="font-mono font-semibold">{result.code}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-navy-800">
                <Building2 className="h-4 w-4 text-amber-500" />
                <span className="text-navy-700/55">School</span>
                <span className="font-medium">{result.school}</span>
              </div>
              {result.meta.map((m) => (
                <div key={m.label} className="text-sm">
                  <span className="text-navy-700/50">{m.label}</span>
                  <p className="font-medium text-navy-900">{m.value}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-navy-900/[0.06] bg-mist-50/50 px-5 py-3 text-[12px] text-navy-700/55">
              Demo preview - sign in for full academic, finance, and guardian records.
            </div>
          </motion.div>
        )}

        {notFound && !loading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-xl border border-rose-accent/20 bg-rose-accent/5 px-4 py-3 text-sm text-navy-800"
          >
            No record found for that code. Try a sample code above or sign in for live lookup.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
