"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { PlatformPageLayout } from "@/components/platform-page-layout";
import { useAcademicPeriod } from "@/contexts/academic-period-context";
import {
  parseAcademicSettings,
  suggestNextYear,
  validateYear,
  type AcademicSettings,
} from "@/lib/academic-settings";
import {
  fetchAcademicSettings,
  updateAcademicSettings,
} from "@/services/academic-settings-api";

export function AcademicSettingsView() {
  const { refresh: refreshPeriod } = useAcademicPeriod();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AcademicSettings | null>(null);
  const [newYear, setNewYear] = useState("");
  const [newTerm, setNewTerm] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSettings(parseAcademicSettings(await fetchAcademicSettings()));
    } catch {
      toast.error("Failed to load academic settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const saved = parseAcademicSettings(
        await updateAcademicSettings(settings),
      );
      setSettings(saved);
      await refreshPeriod();
      toast.success("Academic settings saved for all modules");
    } catch {
      toast.error("Failed to save academic settings");
    } finally {
      setSaving(false);
    }
  }

  function addYear() {
    if (!settings) return;
    const value = newYear.trim() || suggestNextYear(settings.academicYears);
    if (!validateYear(value)) {
      toast.error("Use format 2025-2026");
      return;
    }
    if (settings.academicYears.includes(value)) {
      toast.error("Academic year already exists");
      return;
    }
    setSettings({
      ...settings,
      academicYears: [...settings.academicYears, value].sort(),
      currentAcademicYear: settings.currentAcademicYear ?? value,
    });
    setNewYear("");
  }

  function removeYear(year: string) {
    if (!settings || settings.academicYears.length <= 1) return;
    const academicYears = settings.academicYears.filter((y) => y !== year);
    setSettings({
      ...settings,
      academicYears,
      currentAcademicYear:
        settings.currentAcademicYear === year
          ? academicYears[0]
          : settings.currentAcademicYear,
    });
  }

  function addTerm() {
    if (!settings) return;
    const value = newTerm.trim();
    if (!value) return;
    if (settings.terms.includes(value)) {
      toast.error("Term already exists");
      return;
    }
    setSettings({ ...settings, terms: [...settings.terms, value] });
    setNewTerm("");
  }

  return (
    <PlatformPageLayout
      title="Academic Settings"
      subtitle="Shared with Organization Admin — same year and term across Babyeyi, Student Management, ShuleKit, and Uniform."
    >
      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !settings ? (
        <p className="text-sm text-rose-600">Unable to load settings.</p>
      ) : (
        <div className="mx-auto max-w-3xl space-y-6">
          <p className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted">
            Changes here update the organization-wide academic period. You can
            also manage these in{" "}
            <Link
              href={`${process.env.NEXT_PUBLIC_IAM_URL?.replace(/\/$/, "") || "http://localhost:3000"}/organization-admin/settings`}
              className="font-semibold text-navy underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Organization Admin → Settings
            </Link>
            .
          </p>

          <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
              Current period
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Current academic year
                </span>
                <select
                  value={settings.currentAcademicYear ?? ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      currentAcademicYear: e.target.value,
                    })
                  }
                  className="input w-full"
                >
                  {settings.academicYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Current term
                </span>
                <select
                  value={settings.currentTerm ?? ""}
                  onChange={(e) =>
                    setSettings({ ...settings, currentTerm: e.target.value })
                  }
                  className="input w-full"
                >
                  {settings.terms.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
              Academic years
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {settings.academicYears.map((year) => (
                <span
                  key={year}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    settings.currentAcademicYear === year
                      ? "bg-primary text-navy"
                      : "bg-navy/5 text-navy"
                  }`}
                >
                  {year}
                  {settings.currentAcademicYear === year ? (
                    <span className="opacity-70">· current</span>
                  ) : null}
                  {settings.academicYears.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeYear(year)}
                      className="rounded-full p-0.5 hover:bg-black/10"
                      aria-label={`Remove ${year}`}
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                value={newYear}
                onChange={(e) => setNewYear(e.target.value)}
                placeholder={suggestNextYear(settings.academicYears)}
                className="input min-w-[160px] flex-1"
              />
              <button type="button" className="btn-secondary" onClick={addYear}>
                Add year
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
              Terms
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {settings.terms.map((term) => (
                <span
                  key={term}
                  className="rounded-full bg-navy/5 px-3 py-1.5 text-xs font-semibold text-navy"
                >
                  {term}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="e.g. Term 1"
                className="input min-w-[160px] flex-1"
              />
              <button type="button" className="btn-secondary" onClick={addTerm}>
                Add term
              </button>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="btn-primary"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      )}
    </PlatformPageLayout>
  );
}
