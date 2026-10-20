"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, PenLine, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CatalogSchool = {
  name: string;
  sector?: string | null;
  status?: string;
  type?: string;
  district: string;
};

type CatalogFile = {
  districts: Record<string, CatalogSchool[]>;
};

let catalogCache: CatalogFile | null = null;

async function loadCatalog(): Promise<CatalogFile> {
  if (catalogCache) return catalogCache;
  const res = await fetch("/schools-catalog.json");
  if (!res.ok) throw new Error("Failed to load schools catalog");
  catalogCache = (await res.json()) as CatalogFile;
  return catalogCache;
}

/** Map location district name (e.g. "Gasabo") to catalog key (GASABO). */
export function matchDistrictKey(
  districtName: string,
  keys: string[],
): string | null {
  const n = districtName.trim().toUpperCase().replace(/\s+/g, "");
  if (!n) return null;
  const exact = keys.find((k) => k === n || k.replace(/\s+/g, "") === n);
  if (exact) return exact;
  return keys.find((k) => n.includes(k) || k.includes(n)) ?? null;
}

export function SchoolSearchSelect({
  districtName,
  value,
  onChange,
  disabled,
}: {
  districtName: string;
  value: string;
  onChange: (schoolName: string, school?: CatalogSchool | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [catalog, setCatalog] = useState<CatalogFile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadCatalog()
      .then(setCatalog)
      .catch(() => setLoadError("Could not load accredited school list"));
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setManualMode(false);
    setQuery("");
    setOpen(false);
  }, [districtName]);

  const districtKey = useMemo(() => {
    if (!catalog || !districtName) return null;
    return matchDistrictKey(districtName, Object.keys(catalog.districts));
  }, [catalog, districtName]);

  const schools = useMemo(() => {
    if (!catalog || !districtKey) return [];
    return catalog.districts[districtKey] ?? [];
  }, [catalog, districtKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return schools.slice(0, 80);
    return schools
      .filter((s) => {
        const hay =
          `${s.name} ${s.sector ?? ""} ${s.status ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 80);
  }, [schools, query]);

  const selected = schools.find((s) => s.name === value) ?? null;
  const isCustomSchool = Boolean(value && !selected);
  const trimmedQuery = query.trim();
  const canAddFromQuery = trimmedQuery.length >= 3 && !filtered.some(
    (s) => s.name.toLowerCase() === trimmedQuery.toLowerCase(),
  );

  function enterManualMode(prefill = "") {
    setManualMode(true);
    setOpen(false);
    if (prefill && !value) onChange(prefill, null);
    setTimeout(() => manualInputRef.current?.focus(), 50);
  }

  function useCustomName(name: string) {
    const cleaned = name.trim();
    if (!cleaned) return;
    onChange(cleaned, null);
    setManualMode(true);
    setOpen(false);
    setQuery("");
  }

  if (manualMode || (!districtKey && districtName && catalog)) {
    return (
      <div ref={rootRef} className="space-y-2">
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-50/70 px-3 py-2.5 text-[11px] text-navy-800">
          <PenLine className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
          <p>
            Enter your official school name. You can still complete registration even if
            the school is not on the accredited list yet.
          </p>
        </div>
        <input
          ref={manualInputRef}
          className="w-full rounded-xl border border-navy-900/[0.12] bg-white px-3.5 py-3 text-sm font-medium text-navy-900 outline-none transition placeholder:font-normal placeholder:text-navy-700/30 hover:border-navy-900/20 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15"
          value={value}
          onChange={(e) => onChange(e.target.value, null)}
          placeholder="Official school name"
          disabled={disabled}
        />
        {districtKey && schools.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setManualMode(false);
              setQuery("");
            }}
            className="text-xs font-semibold text-amber-700 hover:text-amber-800"
          >
            Search accredited schools instead
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || !districtName}
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border bg-white px-3.5 py-3 text-left text-sm transition",
          "border-navy-900/[0.12] hover:border-navy-900/25",
          "focus:outline-none focus-visible:border-amber-400 focus-visible:ring-4 focus-visible:ring-amber-400/15",
          disabled || !districtName ? "cursor-not-allowed opacity-55" : "",
          open ? "border-amber-400 ring-4 ring-amber-400/15" : "",
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-navy-700/40" />
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            value ? "font-semibold text-navy-900" : "text-navy-700/35",
          )}
        >
          {value ||
            (districtName
              ? "Search and select your school…"
              : "Select a district first")}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            className="rounded-md p-1 text-navy-700/40 hover:bg-navy-900/[0.06] hover:text-navy-900"
            onClick={(e) => {
              e.stopPropagation();
              onChange("", null);
              setQuery("");
              setManualMode(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onChange("", null);
              }
            }}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-navy-700/35" />
        )}
      </button>

      {selected?.sector ? (
        <p className="mt-1.5 text-[11px] text-navy-700/50">
          Sector:{" "}
          <span className="font-semibold text-navy-800">{selected.sector}</span>
          {selected.status ? ` · ${selected.status}` : ""}
        </p>
      ) : null}

      {isCustomSchool ? (
        <p className="mt-1.5 text-[11px] font-medium text-amber-700">
          Custom school name — not from accredited list
        </p>
      ) : null}

      {loadError ? (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-red-600">{loadError}</p>
          <button
            type="button"
            onClick={() => enterManualMode()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add your school manually
          </button>
        </div>
      ) : null}

      {open && districtKey ? (
        <div className="absolute left-0 right-0 z-40 mt-2 overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-[0_16px_40px_rgba(0,4,53,0.14)]">
          <div className="border-b border-navy-900/[0.06] p-2.5">
            <div className="flex items-center gap-2 rounded-xl bg-navy-900/[0.04] px-3 py-2">
              <Search className="h-4 w-4 text-navy-700/40" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${schools.length} schools in ${districtKey}…`}
                className="w-full bg-transparent text-sm text-navy-900 outline-none placeholder:text-navy-700/35"
              />
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-4 text-center">
                <p className="text-sm text-navy-700/55">
                  {trimmedQuery
                    ? `No accredited school matches “${trimmedQuery}”`
                    : "No schools in this district list"}
                </p>
                {canAddFromQuery ? (
                  <button
                    type="button"
                    onClick={() => useCustomName(trimmedQuery)}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#000435] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0a0f52]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add “{trimmedQuery}” as my school
                  </button>
                ) : (
                  <p className="mt-2 text-[11px] text-navy-700/45">
                    Type at least 3 characters to add your school
                  </p>
                )}
              </li>
            ) : (
              filtered.map((s) => {
                const active = s.name === value;
                return (
                  <li key={`${s.sector}-${s.name}`}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-start gap-2 px-3.5 py-2.5 text-left text-sm transition hover:bg-amber-50",
                        active ? "bg-amber-50" : "",
                      )}
                      onClick={() => {
                        onChange(s.name, s);
                        setOpen(false);
                        setQuery("");
                        setManualMode(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0 text-amber-500",
                          active ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-navy-900">
                          {s.name}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-navy-700/50">
                          {[s.sector, s.status, s.type]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <div className="border-t border-navy-900/[0.06] bg-[#f8f9fb] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] text-navy-700/45">
              Accredited list · {schools.length} schools in {districtKey}
            </span>
            <button
              type="button"
              onClick={() => enterManualMode(trimmedQuery)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800"
            >
              <PenLine className="h-3 w-3" />
              School not listed? Add your own
            </button>
          </div>
        </div>
      ) : null}

      {districtKey && !open && schools.length === 0 ? (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-amber-700">
            No accredited schools listed for {districtName}. You can add your school manually.
          </p>
          <button
            type="button"
            onClick={() => enterManualMode()}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Add your school
          </button>
        </div>
      ) : null}

      {!districtKey && districtName && catalog && !loadError ? (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] text-amber-700">
            No accredited list matched “{districtName}”. Add your school manually:
          </p>
          <button
            type="button"
            onClick={() => enterManualMode()}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Add your school
          </button>
        </div>
      ) : null}
    </div>
  );
}
