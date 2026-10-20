'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { usePlatformAdmin } from '@/hooks/use-platform-admin';
import {
  DEFAULT_REGISTRATION_FORM,
  EDUCATION_LEVELS,
  LEADERSHIP_LABELS,
  SCHOOL_CATEGORIES,
  SCHOOL_PROGRAMS,
  WIZARD_ORG_TYPES,
  WIZARD_STEPS,
  formToPayload,
  formatOrgTypeLabel,
  organizationToForm,
  resolvePublicAssetUrl,
  type LocationRef,
  type RegistrationFormState,
  type WizardOrgType,
} from '@/lib/organization-registration';
import { useToast } from '@/shared/notifications';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-poppins-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function BrandingUpload({
  label,
  value,
  onUploaded,
  onCleared,
}: {
  label: string;
  value: string;
  onUploaded: (url: string) => void;
  onCleared?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const assetType =
    label.toLowerCase().includes('signature') ? 'signature' : label.toLowerCase().includes('stamp') ? 'stamp' : 'logo';

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const { data } = await api.post(`/internal/branding/upload`, {
        assetType,
        fileName: file.name,
        contentBase64,
        mimeType: file.type || 'image/png',
      });
      const relative = data.data.url as string;
      // Persist absolute URL for reliable preview across Auth Frontend ports.
      onUploaded(resolvePublicAssetUrl(relative));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-navy">{label}</p>
        <span className="rounded bg-navy/5 px-1.5 py-0.5 text-[10px] font-poppins-medium text-muted">Optional</span>
      </div>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvePublicAssetUrl(value)}
          alt={label}
          className="mt-2 h-16 w-full rounded-lg object-contain bg-slate-50"
        />
      ) : (
        <div className="mt-2 flex h-16 items-center justify-center rounded-lg border border-dashed border-border text-[11px] text-muted">
          No file
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer rounded-lg bg-navy/5 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy/10">
          {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </label>
        {value && onCleared ? (
          <button
            type="button"
            onClick={onCleared}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted hover:bg-danger/10 hover:text-danger"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TagInput({
  label,
  placeholder,
  tags,
  onChange,
}: {
  label: string;
  placeholder: string;
  tags: string[];
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState('');

  function addTag(raw: string) {
    const value = raw.trim();
    if (!value) return;
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) return;
    onChange([...tags, value]);
    setInput('');
  }

  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-white p-3">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-poppins-medium text-navy"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="text-muted hover:text-danger"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              addTag(input);
            }
          }}
          onBlur={() => addTag(input)}
          placeholder={placeholder}
          className="min-w-[160px] flex-1 border-0 bg-transparent text-sm outline-none"
        />
      </div>
      <p className="mt-1 text-xs text-muted">Type a name and press Enter to add. Examples: PCB, PCM, Software Development.</p>
    </Field>
  );
}

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() =>
              onChange(active ? selected.filter((s) => s !== opt) : [...selected, opt])
            }
            className={`rounded-lg border px-3 py-1.5 text-xs font-poppins-medium transition ${
              active ? 'border-primary bg-primary/10 text-navy' : 'border-border text-muted hover:border-primary/40'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function OrganizationRegistrationWizard({
  mode = 'register',
  organizationId,
}: {
  mode?: 'register' | 'edit';
  organizationId?: string;
} = {}) {
  const router = useRouter();
  const platform = usePlatformAdmin();
  const toast = useToast();
  const isEdit = mode === 'edit' && Boolean(organizationId);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RegistrationFormState>(DEFAULT_REGISTRATION_FORM);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(isEdit);

  const [provinces, setProvinces] = useState<LocationRef[]>([]);
  const [districts, setDistricts] = useState<LocationRef[]>([]);
  const [sectors, setSectors] = useState<LocationRef[]>([]);
  const [cells, setCells] = useState<LocationRef[]>([]);
  const [villages, setVillages] = useState<LocationRef[]>([]);

  const update = useCallback(<K extends keyof RegistrationFormState>(key: K, value: RegistrationFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  useEffect(() => {
    api
      .get(`${platform.apiPrefix}/locations/provinces`)
      .then((res) => setProvinces(res.data.data))
      .catch(() => setProvinces([]));
  }, [platform.apiPrefix]);

  useEffect(() => {
    if (!isEdit || !organizationId) return;
    setLoadingProfile(true);
    api
      .get(`${platform.apiPrefix}/organizations/${organizationId}`)
      .then((res) => {
        setForm(organizationToForm(res.data.data));
      })
      .catch(() => toast.error('Failed to load organization profile', 'Load failed'))
      .finally(() => setLoadingProfile(false));
  }, [isEdit, organizationId, platform.apiPrefix, toast]);

  useEffect(() => {
    if (!form.provinceId) {
      setDistricts([]);
      return;
    }
    api
      .get(`${platform.apiPrefix}/locations/provinces/${form.provinceId}/districts`)
      .then((res) => setDistricts(res.data.data))
      .catch(() => setDistricts([]));
  }, [form.provinceId, platform.apiPrefix]);

  useEffect(() => {
    if (!form.districtId) {
      setSectors([]);
      update('organizationCodePreview', '');
      return;
    }
    api
      .get(`${platform.apiPrefix}/locations/districts/${form.districtId}/sectors`)
      .then((res) => setSectors(res.data.data))
      .catch(() => setSectors([]));
    if (!isEdit) {
      api
        .get(`${platform.apiPrefix}/locations/districts/${form.districtId}/preview-code`)
        .then((res) =>
          update(
            'organizationCodePreview',
            res.data.data.organizationCode ?? res.data.data.formatted ?? ''
          )
        )
        .catch(() => update('organizationCodePreview', ''));
    }
  }, [form.districtId, platform.apiPrefix, update, isEdit]);

  useEffect(() => {
    if (!form.sectorId) {
      setCells([]);
      return;
    }
    api
      .get(`${platform.apiPrefix}/locations/sectors/${form.sectorId}/cells`)
      .then((res) => setCells(res.data.data))
      .catch(() => setCells([]));
  }, [form.sectorId, platform.apiPrefix]);

  useEffect(() => {
    if (!form.cellId) {
      setVillages([]);
      return;
    }
    api
      .get(`${platform.apiPrefix}/locations/cells/${form.cellId}/villages`)
      .then((res) => setVillages(res.data.data))
      .catch(() => setVillages([]));
  }, [form.cellId, platform.apiPrefix]);

  useEffect(() => {
    // Register flow: keep title in sync with type. Edit: avoid overwriting loaded/custom titles.
    if (isEdit) return;
    update('headPosition', LEADERSHIP_LABELS[form.organizationType]);
  }, [form.organizationType, update, isEdit]);

  const leaderLabel = form.headPosition || LEADERSHIP_LABELS[form.organizationType];

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return form.organizationName.trim().length >= 2;
      case 1:
        return Boolean(form.provinceId && form.districtId && form.sectorId && form.cellId && form.villageId);
      case 2:
        return form.organizationName.trim().length >= 2;
      case 5:
        if (isEdit) return Boolean(form.adminEmail);
        return Boolean(form.adminName && form.adminEmail && form.adminUsername);
      default:
        return true;
    }
  }, [step, form, isEdit]);

  async function saveDraft() {
    if (isEdit) {
      await saveProfile();
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`${platform.apiPrefix}/organization-registrations/draft`, {
        id: draftId ?? undefined,
        payload: formToPayload(form),
      });
      setDraftId(res.data.data.id);
      toast.success('Draft saved.', 'Saved');
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to save draft.',
        'Save failed'
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    if (!organizationId) return;
    setSaving(true);
    setSubmitting(true);
    try {
      await api.put(`${platform.apiPrefix}/organizations/${organizationId}/profile`, formToPayload(form));
      toast.success('Organization profile updated.', 'Updated');
      router.push(`${platform.organizationsPath}/${organizationId}?updated=1`);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to update organization.',
        'Update failed'
      );
      setSaving(false);
      setSubmitting(false);
    }
  }

  async function submitRegistration() {
    if (isEdit) {
      await saveProfile();
      return;
    }
    setSubmitting(true);
    try {
      let id = draftId;
      if (!id) {
        const draftRes = await api.post(`${platform.apiPrefix}/organization-registrations/draft`, {
          payload: formToPayload(form),
        });
        id = draftRes.data.data.id;
        setDraftId(id);
      } else {
        await api.post(`${platform.apiPrefix}/organization-registrations/draft`, {
          id,
          payload: formToPayload(form),
        });
      }
      await api.post(`${platform.apiPrefix}/organization-registrations/submit`, { registrationId: id });
      toast.success('Registration submitted for approval.', 'Submitted');
      router.push(`${platform.pendingApprovalsPath}?submitted=1`);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Failed to submit registration.',
        'Submit failed'
      );
      setSubmitting(false);
    }
  }

  function renderDynamicDetails() {
    const t = form.organizationType;
    if (t === 'SCHOOL' || t === 'TVET') {
      return (
        <div className="space-y-4 rounded-xl border border-border bg-navy/[0.02] p-4">
          <p className="font-poppins-semibold text-navy">School Details</p>
          <Field label="School Category">
            <div className="flex flex-wrap gap-2">
              {SCHOOL_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update('schoolCategory', c)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-poppins-medium ${
                    form.schoolCategory === c ? 'border-primary bg-primary/10 text-navy' : 'border-border text-muted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field label="School Program">
            <div className="flex flex-wrap gap-2">
              {SCHOOL_PROGRAMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update('schoolProgram', p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-poppins-medium ${
                    form.schoolProgram === p ? 'border-primary bg-primary/10 text-navy' : 'border-border text-muted'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Education Levels">
            <CheckboxGroup
              options={EDUCATION_LEVELS}
              selected={form.educationLevels}
              onChange={(v) => update('educationLevels', v)}
            />
          </Field>
          {form.educationLevels.includes('A-Level') && (
            <TagInput
              label="A-Level Combinations / Streams"
              placeholder="e.g. PCB, PCM, MCB"
              tags={form.aLevelCombinations}
              onChange={(v) => update('aLevelCombinations', v)}
            />
          )}
          {(form.educationLevels.includes('TVET') || t === 'TVET') && (
            <TagInput
              label="TVET Trades / Streams"
              placeholder="e.g. Software Development, Networking"
              tags={form.tvetTrades}
              onChange={(v) => update('tvetTrades', v)}
            />
          )}
        </div>
      );
    }
    if (t === 'HOSPITAL') {
      return (
        <div className="space-y-4 rounded-xl border border-border bg-navy/[0.02] p-4">
          <p className="font-poppins-semibold text-navy">Hospital Details</p>
          <Field label="Hospital Type">
            <input value={form.hospitalType} onChange={(e) => update('hospitalType', e.target.value)} className="input" />
          </Field>
          <Field label="Beds Capacity">
            <input
              type="number"
              value={form.bedsCapacity}
              onChange={(e) => update('bedsCapacity', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Operating Hours">
            <input
              value={form.operatingHours}
              onChange={(e) => update('operatingHours', e.target.value)}
              className="input"
            />
          </Field>
          <div className="flex flex-wrap gap-4 text-sm">
            {(
              [
                ['emergencyServices', 'Emergency Services'],
                ['laboratory', 'Laboratory'],
                ['pharmacy', 'Pharmacy'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => update(key, e.target.checked)}
                  className="rounded border-border"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      );
    }
    if (t === 'FACTORY') {
      return (
        <div className="space-y-4 rounded-xl border border-border bg-navy/[0.02] p-4">
          <p className="font-poppins-semibold text-navy">Factory Details</p>
          <Field label="Industry">
            <input value={form.industry} onChange={(e) => update('industry', e.target.value)} className="input" />
          </Field>
          <Field label="Production Type">
            <input
              value={form.productionType}
              onChange={(e) => update('productionType', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Factory Size">
            <input value={form.factorySize} onChange={(e) => update('factorySize', e.target.value)} className="input" />
          </Field>
          <Field label="Employee Capacity">
            <input
              type="number"
              value={form.employeeCapacity}
              onChange={(e) => update('employeeCapacity', e.target.value)}
              className="input"
            />
          </Field>
        </div>
      );
    }
    if (t === 'CHURCH') {
      return (
        <div className="space-y-4 rounded-xl border border-border bg-navy/[0.02] p-4">
          <p className="font-poppins-semibold text-navy">Church Details</p>
          <Field label="Denomination">
            <input value={form.denomination} onChange={(e) => update('denomination', e.target.value)} className="input" />
          </Field>
          <Field label="Diocese">
            <input value={form.diocese} onChange={(e) => update('diocese', e.target.value)} className="input" />
          </Field>
          <Field label="Branch">
            <input value={form.branch} onChange={(e) => update('branch', e.target.value)} className="input" />
          </Field>
        </div>
      );
    }
    return (
      <div className="space-y-4 rounded-xl border border-border bg-navy/[0.02] p-4">
        <p className="font-poppins-semibold text-navy">Business Details</p>
        <Field label="Business Sector">
          <input value={form.businessSector} onChange={(e) => update('businessSector', e.target.value)} className="input" />
        </Field>
        <Field label="Industry">
          <input value={form.industry} onChange={(e) => update('industry', e.target.value)} className="input" />
        </Field>
        <Field label="Business Size">
          <input value={form.businessSize} onChange={(e) => update('businessSize', e.target.value)} className="input" />
        </Field>
        <Field label="Tax Category">
          <input value={form.taxCategory} onChange={(e) => update('taxCategory', e.target.value)} className="input" />
        </Field>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {loadingProfile ? (
        <div className="space-y-4 py-10">
          <div className="h-8 w-64 animate-pulse rounded-lg bg-navy/5" />
          <div className="h-40 animate-pulse rounded-2xl bg-navy/5" />
        </div>
      ) : (
        <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-poppins-semibold uppercase tracking-wide text-primary">
            {isEdit ? 'Organization profile' : 'New registration'}
          </p>
          <h1 className="font-montserrat text-2xl font-bold text-navy">
            {isEdit ? 'Edit Organization' : 'Organization Registration'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {isEdit
              ? 'Same steps as registration — type, location, details, contacts, leadership, access, and review.'
              : 'Register schools, hospitals, factories, churches, and other organizations on Babyeyi.'}
          </p>
        </div>
        {isEdit && form.organizationCodePreview ? (
          <div className="rounded-xl border border-border bg-navy/[0.03] px-4 py-2 text-right">
            <p className="text-[10px] font-poppins-semibold uppercase tracking-wide text-muted">Org code</p>
            <p className="font-poppins-semibold text-navy">{form.organizationCodePreview}</p>
          </div>
        ) : null}
      </div>

      <div className="mb-8 overflow-x-auto">
        <div className="flex min-w-max items-center gap-1">
          {WIZARD_STEPS.map((label, i) => {
            const stepLabel =
              isEdit && i === WIZARD_STEPS.length - 1 ? 'Review & Save' : label;
            return (
            <div key={label} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  if (isEdit || i <= step) setStep(i);
                }}
                className="flex flex-col items-center px-1"
                title={stepLabel}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-poppins-bold transition ${
                    i < step ? 'bg-primary text-navy' : i === step ? 'bg-navy text-primary' : 'bg-navy/5 text-muted'
                  } ${isEdit || i <= step ? 'cursor-pointer hover:ring-2 hover:ring-primary/40' : ''}`}
                >
                  {i < step ? '✓' : i + 1}
                </span>
                <span className={`mt-1 max-w-[4.5rem] text-center text-[10px] ${i === step ? 'text-navy' : 'text-muted'}`}>
                  {stepLabel.split(' ')[0]}
                </span>
              </button>
              {i < WIZARD_STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 w-6 rounded ${i < step ? 'bg-primary' : 'bg-navy/10'}`} />
              )}
            </div>
          );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Organization Type *">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {WIZARD_ORG_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const next = t as WizardOrgType;
                      update('organizationType', next);
                      update('headPosition', LEADERSHIP_LABELS[next]);
                      if (next !== 'SCHOOL' && next !== 'TVET') {
                        update('signatureUrl', '');
                        update('stampUrl', '');
                      }
                    }}
                    className={`rounded-lg border py-2 text-xs font-poppins-medium transition ${
                      form.organizationType === t
                        ? 'border-primary bg-primary/10 text-navy'
                        : 'border-border text-muted hover:border-primary/40'
                    }`}
                  >
                    {formatOrgTypeLabel(t)}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Organization Name *">
              <input
                value={form.organizationName}
                onChange={(e) => update('organizationName', e.target.value)}
                placeholder="e.g. Kigali International School"
                className="input"
              />
            </Field>
            <Field label="Organization Category">
              <input
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                placeholder="Optional category"
                className="input"
              />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Field label="Country">
              <input value={form.country} readOnly className="input bg-navy/5" />
            </Field>
            <Field label="Province *">
              <select
                value={form.provinceId}
                onChange={(e) => {
                  update('provinceId', e.target.value);
                  update('districtId', '');
                  update('sectorId', '');
                  update('cellId', '');
                  update('villageId', '');
                }}
                className="input"
              >
                <option value="">Select province</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="District *">
              <select
                value={form.districtId}
                onChange={(e) => {
                  update('districtId', e.target.value);
                  update('sectorId', '');
                  update('cellId', '');
                  update('villageId', '');
                }}
                className="input"
                disabled={!form.provinceId}
              >
                <option value="">Select district</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.code ? `(Code ${d.code})` : ''}
                  </option>
                ))}
              </select>
            </Field>
            {form.organizationCodePreview && (
              <div className="rounded-lg bg-primary/10 px-4 py-3 text-sm">
                <span className="text-muted">Organization Code Preview: </span>
                <span className="font-poppins-bold text-navy">{form.organizationCodePreview}</span>
              </div>
            )}
            <Field label="Sector *">
              <select
                value={form.sectorId}
                onChange={(e) => {
                  update('sectorId', e.target.value);
                  update('cellId', '');
                  update('villageId', '');
                }}
                className="input"
                disabled={!form.districtId}
              >
                <option value="">Select sector</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cell *">
              <select
                value={form.cellId}
                onChange={(e) => {
                  update('cellId', e.target.value);
                  update('villageId', '');
                }}
                className="input"
                disabled={!form.sectorId}
              >
                <option value="">Select cell</option>
                {cells.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Village *">
              <select value={form.villageId} onChange={(e) => update('villageId', e.target.value)} className="input" disabled={!form.cellId}>
                <option value="">Select village</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Field label="Organization Name *">
              <input value={form.organizationName} onChange={(e) => update('organizationName', e.target.value)} className="input" />
            </Field>
            <Field label="Established Date">
              <input
                type="date"
                value={form.establishedDate}
                onChange={(e) => update('establishedDate', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={3}
                className="input"
              />
            </Field>
            {(form.organizationType === 'SCHOOL' || form.organizationType === 'TVET') ? (
              <div className="rounded-2xl border border-border bg-navy/[0.02] p-4">
                <p className="text-sm font-semibold text-navy">School Branding Assets</p>
                <p className="mt-1 text-xs text-muted">
                  Optional. Logo, principal signature, and stamp sync into Babyeyi Wizard when provided.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <BrandingUpload
                    label="School Logo"
                    value={form.logoUrl}
                    onUploaded={(url) => update('logoUrl', url)}
                    onCleared={() => update('logoUrl', '')}
                  />
                  <BrandingUpload
                    label="Principal Signature"
                    value={form.signatureUrl}
                    onUploaded={(url) => update('signatureUrl', url)}
                    onCleared={() => update('signatureUrl', '')}
                  />
                  <BrandingUpload
                    label="School Stamp"
                    value={form.stampUrl}
                    onUploaded={(url) => update('stampUrl', url)}
                    onCleared={() => update('stampUrl', '')}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-navy/[0.02] p-4">
                <p className="text-sm font-semibold text-navy">Organization Logo</p>
                <p className="mt-1 text-xs text-muted">Optional. Upload a logo for this organization.</p>
                <div className="mt-4 max-w-xs">
                  <BrandingUpload
                    label="Organization Logo"
                    value={form.logoUrl}
                    onUploaded={(url) => update('logoUrl', url)}
                    onCleared={() => update('logoUrl', '')}
                  />
                </div>
              </div>
            )}
            {renderDynamicDetails()}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Field label="Phone">
              <input value={form.phone} onChange={(e) => update('phone', e.target.value)} className="input" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="input" />
            </Field>
            <Field label="Website">
              <input value={form.website} onChange={(e) => update('website', e.target.value)} className="input" />
            </Field>
            <Field label="Postal Address">
              <input value={form.postalAddress} onChange={(e) => update('postalAddress', e.target.value)} className="input" />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Field label={`${leaderLabel} *`}>
              <input
                value={form.organizationHead}
                onChange={(e) => update('organizationHead', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Phone">
              <input value={form.headPhone} onChange={(e) => update('headPhone', e.target.value)} className="input" />
            </Field>
            <Field label="Email">
              <input type="email" value={form.headEmail} onChange={(e) => update('headEmail', e.target.value)} className="input" />
            </Field>
            {(form.organizationType === 'SCHOOL' || form.organizationType === 'TVET') && (
              <>
                <Field label="Deputy Head Teacher">
                  <input value={form.deputyHead} onChange={(e) => update('deputyHead', e.target.value)} className="input" />
                </Field>
                <Field label="School Manager">
                  <input value={form.schoolManager} onChange={(e) => update('schoolManager', e.target.value)} className="input" />
                </Field>
                <Field label="Bursar">
                  <input value={form.bursar} onChange={(e) => update('bursar', e.target.value)} className="input" />
                </Field>
                <Field label="Secretary">
                  <input value={form.secretary} onChange={(e) => update('secretary', e.target.value)} className="input" />
                </Field>
              </>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            {isEdit && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-navy">
                Admin login credentials are managed from Organization Settings. Contact fields below are for profile reference only.
              </div>
            )}
            <Field label="Administrator Name *">
              <input
                value={form.adminName}
                onChange={(e) => update('adminName', e.target.value)}
                className="input"
                disabled={isEdit}
              />
            </Field>
            <Field label="Administrator Email *">
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) => update('adminEmail', e.target.value)}
                className="input"
                disabled={isEdit}
              />
            </Field>
            <Field label="Administrator Phone">
              <input
                value={form.adminPhone}
                onChange={(e) => update('adminPhone', e.target.value)}
                className="input"
                disabled={isEdit}
              />
            </Field>
            {!isEdit && (
              <>
                <Field label="Username *">
                  <input value={form.adminUsername} onChange={(e) => update('adminUsername', e.target.value)} className="input" />
                </Field>
                <Field label="Temporary Password">
                  <input
                    type="password"
                    value={form.tempPassword}
                    onChange={(e) => update('tempPassword', e.target.value)}
                    className="input"
                    autoComplete="new-password"
                  />
                </Field>
              </>
            )}
            <Field label="Preferred Language">
              <select
                value={form.preferredLanguage}
                onChange={(e) => update('preferredLanguage', e.target.value)}
                className="input"
              >
                <option value="English">English</option>
                <option value="Kinyarwanda">Kinyarwanda</option>
                <option value="French">French</option>
              </select>
            </Field>
            <Field label="Timezone">
              <input value={form.timezone} onChange={(e) => update('timezone', e.target.value)} className="input" />
            </Field>
            {!isEdit && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.requirePasswordChange}
                  onChange={(e) => update('requirePasswordChange', e.target.checked)}
                  className="rounded border-border"
                />
                Require password change on first login
              </label>
            )}
            {!isEdit && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Status after submit: <strong>Pending Approval</strong>. Admin account is created on approval — no invitation email is sent.
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <p className="font-poppins-semibold text-navy">{isEdit ? 'Review & Save' : 'Review & Submit'}</p>
            {[
              ['Type', formatOrgTypeLabel(form.organizationType)],
              ['Name', form.organizationName],
              ['Code', form.organizationCodePreview || '—'],
              ['District', districts.find((d) => d.id === form.districtId)?.name ?? '—'],
              ['Phone', form.phone || '—'],
              ['Email', form.email || '—'],
              ['Leader', form.organizationHead || '—'],
              ['Admin', form.adminName || '—'],
              ['Admin Email', form.adminEmail || '—'],
              ...(form.logoUrl ? [['Logo', 'Uploaded']] : []),
              ...((form.organizationType === 'SCHOOL' || form.organizationType === 'TVET') && form.signatureUrl
                ? [['Signature', 'Uploaded']]
                : []),
              ...((form.organizationType === 'SCHOOL' || form.organizationType === 'TVET') && form.stampUrl
                ? [['Stamp', 'Uploaded']]
                : []),
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-border py-2 text-sm">
                <span className="text-muted">{label}</span>
                <span className="max-w-[60%] text-right font-poppins-medium text-navy">{value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              step === 0
                ? router.push(isEdit && organizationId ? `${platform.organizationsPath}/${organizationId}` : platform.organizationsPath)
                : setStep((s) => s - 1)
            }
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-poppins-medium text-navy transition hover:bg-navy/5"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex flex-wrap gap-2">
            {!isEdit && (
              <button
                type="button"
                disabled={saving}
                onClick={saveDraft}
                className="rounded-xl border border-border px-5 py-2.5 text-sm font-poppins-medium text-navy transition hover:bg-navy/5 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
            )}
            {isEdit && step < WIZARD_STEPS.length - 1 && (
              <button
                type="button"
                disabled={saving || submitting || !form.organizationName.trim()}
                onClick={() => void saveProfile()}
                className="rounded-xl border border-primary/40 bg-primary/10 px-5 py-2.5 text-sm font-poppins-semibold text-navy transition hover:bg-primary/20 disabled:opacity-50"
              >
                {saving || submitting ? 'Saving…' : 'Save Changes'}
              </button>
            )}
            {step < WIZARD_STEPS.length - 1 ? (
              <button
                type="button"
                disabled={!canProceed}
                onClick={() => setStep((s) => s + 1)}
                className="rounded-xl bg-navy px-6 py-2.5 text-sm font-poppins-semibold text-primary transition hover:bg-navy-light disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={submitRegistration}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-poppins-semibold text-navy transition hover:bg-primary-hover disabled:opacity-50"
              >
                {submitting
                  ? isEdit
                    ? 'Saving…'
                    : 'Submitting…'
                  : isEdit
                    ? 'Save Changes'
                    : 'Submit for Approval'}
              </button>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
