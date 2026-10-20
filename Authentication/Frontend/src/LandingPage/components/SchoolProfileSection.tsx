'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pencil, X } from 'lucide-react';
import { resolvePublicAssetUrl } from '@/lib/organization-registration';
import {
  countWords,
  formatDotList,
  formatProgramLabel,
  generateSchoolDescription,
  type SchoolProfileInput,
} from './school-profile-description';

type FormSlice = SchoolProfileInput;

function SchoolProfileCard({
  form,
  logoUrl,
  description,
  descriptionSlot,
  footer,
}: {
  form: FormSlice;
  logoUrl?: string;
  description?: string;
  descriptionSlot?: ReactNode;
  footer?: ReactNode;
}) {
  const locationShort = [form.sectorName, form.districtName].filter(Boolean).join(', ');
  const logoSrc = logoUrl ? resolvePublicAssetUrl(logoUrl) : '';

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl border border-[#000435]/10 bg-white object-contain p-1"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#000435]/10 bg-[#000435]/[0.04] text-xs font-semibold text-[#667085]">
            Logo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-semibold text-[#000435]">
            {form.organizationName || 'Your school'}
          </h3>
          <p className="mt-1 text-sm text-[#667085]">
            {[form.schoolCategory, formatProgramLabel(form.schoolProgram), locationShort]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      {descriptionSlot ?? (
        description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#000435]/85">
            {description}
          </p>
        ) : null
      )}

      <div className="space-y-3 rounded-2xl bg-[#FCB038]/10 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
            Education levels
          </p>
          <p className="mt-1 text-sm font-medium text-[#000435]">
            {formatDotList(form.educationLevels)}
          </p>
        </div>
        {form.aLevelCombinations.length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
              A-Level combinations
            </p>
            <p className="mt-1 text-sm font-medium text-[#000435]">
              {formatDotList(form.aLevelCombinations)}
            </p>
          </div>
        ) : null}
        {form.tvetTrades.length > 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
              TVET trades
            </p>
            <p className="mt-1 text-sm font-medium text-[#000435]">
              {formatDotList(form.tvetTrades)}
            </p>
          </div>
        ) : null}
      </div>

      {footer}
    </div>
  );
}

function PublicProfilePreview({
  form,
  logoUrl,
  onClose,
}: {
  form: FormSlice;
  logoUrl?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#000435]/45 p-4 sm:items-center">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#000435]/10 bg-white shadow-[0_32px_80px_-24px_rgba(0,4,53,0.35)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-preview-title"
      >
        <div className="flex items-center justify-between border-b border-[#000435]/[0.08] px-5 py-4">
          <p id="profile-preview-title" className="text-sm font-semibold text-[#000435]">
            Public profile preview
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#667085] hover:bg-[#000435]/[0.05]"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <SchoolProfileCard
            form={form}
            logoUrl={logoUrl}
            description={form.description}
          />
        </div>
      </div>
    </div>
  );
}

export function SchoolProfileSection({
  form,
  logoUrl,
  onDescriptionChange,
}: {
  form: FormSlice;
  logoUrl?: string;
  onDescriptionChange: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(form.description);
  const [previewOpen, setPreviewOpen] = useState(false);

  const profileInput = useMemo(() => ({ ...form }), [form]);

  useEffect(() => {
    if (!isEditing) setDraft(form.description);
  }, [form.description, isEditing]);

  useEffect(() => {
    if (form.description.trim()) return;
    if (!form.organizationName.trim() || !form.schoolCategory || !form.schoolProgram) return;
    if (form.educationLevels.length === 0) return;
    const generated = generateSchoolDescription(form);
    if (generated) onDescriptionChange(generated);
  }, [
    form.organizationName,
    form.establishedDate,
    form.provinceName,
    form.districtName,
    form.sectorName,
    form.schoolCategory,
    form.schoolProgram,
    form.educationLevels,
    form.aLevelCombinations,
    form.tvetTrades,
    form.description,
    onDescriptionChange,
  ]);

  const canShow = Boolean(form.organizationName.trim());
  if (!canShow) return null;

  function refreshFromDetails() {
    const next = generateSchoolDescription(profileInput);
    onDescriptionChange(next);
    setDraft(next);
    setIsEditing(false);
  }

  function saveDescription() {
    onDescriptionChange(draft.trim());
    setIsEditing(false);
  }

  const displayDescription = form.description.trim();
  const wordCount = countWords(isEditing ? draft : form.description);

  return (
    <>
      <section className="space-y-4 rounded-2xl border border-[#000435]/[0.08] bg-white p-5 shadow-[0_12px_40px_-28px_rgba(0,4,53,0.18)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FCB038]">
              School profile
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[#000435] sm:text-xl">
              How your school appears publicly
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#667085]">
              This preview uses the details you entered above. Edit the description if you
              want to adjust the wording.
            </p>
          </div>
          {!isEditing ? (
            <button
              type="button"
              onClick={() => {
                setDraft(form.description);
                setIsEditing(true);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#000435] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0a0f52]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit description
            </button>
          ) : null}
        </div>

        <div className="rounded-2xl border border-[#000435]/[0.08] bg-[#fafafa] p-5 sm:p-6">
          <SchoolProfileCard
            form={form}
            logoUrl={logoUrl}
            description={!isEditing ? displayDescription : undefined}
            descriptionSlot={
              isEditing ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
                    About the school
                  </p>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={8}
                    className="w-full rounded-xl border border-[#000435]/12 bg-white px-4 py-3 text-sm leading-relaxed text-[#000435] outline-none transition focus:border-[#FCB038] focus:ring-4 focus:ring-[#FCB038]/15"
                    placeholder="Describe your school…"
                  />
                </div>
              ) : displayDescription ? undefined : (
                <p className="text-sm leading-relaxed text-[#667085]">
                  Complete the school details above and a description will appear here from
                  your entries.
                </p>
              )
            }
            footer={
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#000435]/[0.06] pt-4">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={refreshFromDetails}
                      className="text-xs font-medium text-[#667085] underline-offset-2 hover:text-[#000435] hover:underline"
                    >
                      Reset from your school details
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(form.description);
                          setIsEditing(false);
                        }}
                        className="rounded-full border border-[#000435]/12 px-4 py-2 text-xs font-semibold text-[#000435]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={saveDescription}
                        className="rounded-full bg-[#000435] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0a0f52]"
                      >
                        Save
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-[#667085]">
                      {wordCount > 0 ? `${wordCount} words` : null}
                    </p>
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="text-xs font-semibold text-[#000435] underline decoration-[#FCB038]/50 underline-offset-4"
                    >
                      Full-screen preview
                    </button>
                  </>
                )}
              </div>
            }
          />
        </div>
      </section>

      {previewOpen ? (
        <PublicProfilePreview
          form={{ ...form, description: form.description }}
          logoUrl={logoUrl}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </>
  );
}
