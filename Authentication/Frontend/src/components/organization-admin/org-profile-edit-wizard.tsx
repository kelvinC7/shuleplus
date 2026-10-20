'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import axios from 'axios';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ClipboardCheck,
  ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  UploadCloud,
  UserRound,
} from 'lucide-react';
import {
  EDUCATION_LEVELS,
  SCHOOL_CATEGORIES,
  SCHOOL_PROGRAMS,
  resolvePublicAssetUrl,
} from '@/lib/organization-registration';
import { orgAdminApi } from '@/lib/org-admin-api';
import {
  EMPTY_ORG_PROFILE_FORM,
  ORG_PROFILE_STEPS,
  isCompleteDate,
  isValidEmail,
  isValidPhone,
  orgProfileFormFromOrganization,
  orgProfileFormToPayload,
  type OrgProfileFormState,
} from '@/lib/org-profile-form';
import { SchoolSearchSelect, type CatalogSchool } from '@/LandingPage/components/SchoolSearchSelect';
import {
  EstablishedDatePicker,
  SearchableMultiSelect,
} from '@/LandingPage/components/OnboardFormPickers';
import { SchoolProfileSection } from '@/LandingPage/components/SchoolProfileSection';
import { generateSchoolDescription, countWords } from '@/LandingPage/components/school-profile-description';
import {
  A_LEVEL_COMBINATIONS,
  TVET_TRADES,
} from '@/LandingPage/components/onboard-school-options';
import {
  LocationMapPreview,
  LocationSummaryCard,
} from '@/LandingPage/components/LocationMapPreview';
import { useToast } from '@/shared/notifications';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type Loc = { id: string; name: string; code?: string };

function mapSchoolCategory(status?: string | null): string {
  const s = (status ?? '').trim().toLowerCase();
  if (s.includes('gov') && s.includes('aid')) return 'Government-Aided';
  if (s.includes('public')) return 'Public';
  if (s.includes('private')) return 'Private';
  return '';
}

function inferEducationLevels(school: CatalogSchool): string[] {
  const name = school.name.toLowerCase();
  if (school.type?.toUpperCase() === 'TVET') return ['TVET'];

  const levels: string[] = [];
  if (/nursery|nurser|kindergarten|\bkg\b/i.test(name)) levels.push('Nursery');
  if (/primary|\bep\b|ecole prim|primaire/i.test(name)) levels.push('Primary');
  if (/secondary|\bgs\b|ecole sec|lycee|lycée|\bss\b|s\.s\./i.test(name)) {
    levels.push('O-Level');
    if (/a[\s.-]?level|advanced|upper secondary/i.test(name)) levels.push('A-Level');
  }
  if (levels.length === 0) levels.push('Primary');
  return [...new Set(levels)];
}

function applyCatalogAutofill(
  school: CatalogSchool,
  setForm: Dispatch<SetStateAction<OrgProfileFormState>>,
) {
  const category = mapSchoolCategory(school.status);
  const levels = inferEducationLevels(school);

  setForm((prev) => {
    const next = {
      ...prev,
      organizationName: school.name,
      schoolCategory: category || prev.schoolCategory,
      schoolProgram: prev.schoolProgram || 'Day',
      educationLevels: levels,
      aLevelCombinations: levels.includes('A-Level') ? prev.aLevelCombinations : [],
      tvetTrades: levels.includes('TVET') ? prev.tvetTrades : [],
    };
    return {
      ...next,
      description: generateSchoolDescription(next),
    };
  });
}

export function OrgProfileEditWizard() {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OrgProfileFormState>(EMPTY_ORG_PROFILE_FORM);
  const [provinces, setProvinces] = useState<Loc[]>([]);
  const [districts, setDistricts] = useState<Loc[]>([]);
  const [sectors, setSectors] = useState<Loc[]>([]);
  const [cells, setCells] = useState<Loc[]>([]);
  const [villages, setVillages] = useState<Loc[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortLocs = useCallback((list: Loc[]) => [...list].sort((a, b) => a.name.localeCompare(b.name)), []);

  const loadDistricts = useCallback(
    async (provinceId: string) => {
      if (!provinceId) return [];
      const { data } = await axios.get(`${API_BASE}/public/locations/provinces/${provinceId}/districts`);
      return sortLocs((data.data ?? []) as Loc[]);
    },
    [sortLocs],
  );

  const loadSectors = useCallback(
    async (districtId: string) => {
      if (!districtId) return [];
      const { data } = await axios.get(`${API_BASE}/public/locations/districts/${districtId}/sectors`);
      return sortLocs((data.data ?? []) as Loc[]);
    },
    [sortLocs],
  );

  const loadCells = useCallback(
    async (sectorId: string) => {
      if (!sectorId) return [];
      const { data } = await axios.get(`${API_BASE}/public/locations/sectors/${sectorId}/cells`);
      return sortLocs((data.data ?? []) as Loc[]);
    },
    [sortLocs],
  );

  const loadVillages = useCallback(
    async (cellId: string) => {
      if (!cellId) return [];
      const { data } = await axios.get(`${API_BASE}/public/locations/cells/${cellId}/villages`);
      return sortLocs((data.data ?? []) as Loc[]);
    },
    [sortLocs],
  );

  useEffect(() => {
    axios
      .get(`${API_BASE}/public/locations/provinces`)
      .then((r) => setProvinces(sortLocs((r.data.data ?? []) as Loc[])))
      .catch(() => setProvinces([]));
  }, [sortLocs]);

  useEffect(() => {
    orgAdminApi
      .getOrganizationProfile()
      .then(({ data }) => setForm(orgProfileFormFromOrganization(data.data)))
      .catch(() => toast.error('Failed to load organization profile', 'Load failed'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (!form.provinceId) {
      setDistricts([]);
      return;
    }
    void loadDistricts(form.provinceId).then(setDistricts).catch(() => setDistricts([]));
  }, [form.provinceId, loadDistricts]);

  useEffect(() => {
    if (!form.districtId) {
      setSectors([]);
      return;
    }
    void loadSectors(form.districtId).then(setSectors).catch(() => setSectors([]));
  }, [form.districtId, loadSectors]);

  useEffect(() => {
    if (!form.sectorId) {
      setCells([]);
      return;
    }
    void loadCells(form.sectorId).then(setCells).catch(() => setCells([]));
  }, [form.sectorId, loadCells]);

  useEffect(() => {
    if (!form.cellId) {
      setVillages([]);
      return;
    }
    void loadVillages(form.cellId).then(setVillages).catch(() => setVillages([]));
  }, [form.cellId, loadVillages]);

  function setField<K extends keyof OrgProfileFormState>(key: K, value: OrgProfileFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleLevel(level: string) {
    setForm((prev) => {
      const has = prev.educationLevels.includes(level);
      const educationLevels = has
        ? prev.educationLevels.filter((l) => l !== level)
        : [...prev.educationLevels, level];
      return {
        ...prev,
        educationLevels,
        aLevelCombinations: educationLevels.includes('A-Level') ? prev.aLevelCombinations : [],
        tvetTrades: educationLevels.includes('TVET') ? prev.tvetTrades : [],
      };
    });
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.provinceId) return 'Province is required';
      if (!form.districtId) return 'District is required';
      if (!form.sectorId && !form.sectorName.trim()) return 'Sector is required';
      if (!form.cellId && !form.cellName.trim()) return 'Cell is required';
    }
    if (step === 2) {
      if (!form.organizationName.trim()) return 'Enter your school name';
      if (form.organizationName.trim().length < 3) return 'School name looks too short';
      if (!form.schoolCategory) return 'School category is required';
      if (!form.schoolProgram) return 'School program is required';
      if (!form.logoUrl.trim()) return 'School logo is required — upload your school logo to continue';
      if (form.establishedDate && !isCompleteDate(form.establishedDate)) {
        return 'Complete established date (year, month, and day) or leave it empty';
      }
      if (form.educationLevels.length === 0) return 'Select at least one education level';
      if (form.educationLevels.includes('A-Level') && form.aLevelCombinations.length === 0) {
        return 'Add at least one A-Level combination';
      }
      if (form.educationLevels.includes('TVET') && form.tvetTrades.length === 0) {
        return 'Add at least one TVET trade';
      }
    }
    if (step === 3) {
      if (!form.phone.trim()) return 'School phone is required';
      if (!isValidPhone(form.phone)) return 'Enter a valid school phone number';
      if (!form.email.trim()) return 'School email is required';
      if (!isValidEmail(form.email)) return 'Enter a valid school email address';
      if (form.website.trim()) {
        try {
          const w = form.website.trim().startsWith('http')
            ? form.website.trim()
            : `https://${form.website.trim()}`;
          new URL(w);
        } catch {
          return 'Website URL looks invalid';
        }
      }
    }
    if (step === 4) {
      if (!form.organizationHead.trim()) return 'Head Teacher / Principal name is required';
      if (!form.headEmail.trim()) return 'Head Teacher email is required';
      if (!isValidEmail(form.headEmail)) return 'Enter a valid Head Teacher email';
      if (form.headPhone.trim() && !isValidPhone(form.headPhone)) {
        return 'Enter a valid Head Teacher phone';
      }
    }
    return null;
  }

  async function next() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (step < 5) {
      setStep((s) => s + 1);
      return;
    }
    await submit();
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await orgAdminApi.updateOrganizationProfile(orgProfileFormToPayload(form));
      toast.success('Your school profile has been updated.', 'Profile saved');
    } catch {
      toast.error('Could not save profile. Please try again.', 'Save failed');
      setError('Could not save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const resolvedProvinceName =
    provinces.find((p) => p.id === form.provinceId)?.name || form.provinceName;
  const resolvedDistrictName =
    districts.find((d) => d.id === form.districtId)?.name || form.districtName;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Organization profile</p>
        <h2 className="mt-1 text-2xl font-bold text-navy">Edit school profile</h2>
        <p className="mt-1 text-sm text-muted">
          Update location, branding, contact details, and leadership — same steps as onboarding.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="border-b border-border px-5 py-5 sm:px-7">
              <ProfileStepper step={step} />
            </div>

            <div className="p-5 sm:p-7 lg:p-8">
              {step === 1 ? (
                <StepLocation
                  form={form}
                  setField={setField}
                  provinces={provinces}
                  districts={districts}
                  sectors={sectors}
                  cells={cells}
                  villages={villages}
                />
              ) : null}
              {step === 2 ? (
                <StepSchool form={form} setField={setField} setForm={setForm} toggleLevel={toggleLevel} />
              ) : null}
              {step === 3 ? (
                <StepContact form={form} setField={setField} provinces={provinces} districts={districts} />
              ) : null}
              {step === 4 ? <StepLeadership form={form} setField={setField} /> : null}
              {step === 5 ? (
                <StepReview form={form} provinces={provinces} districts={districts} />
              ) : null}

              {error ? (
                <p className="mt-5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
                  {error}
                </p>
              ) : null}

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => (step > 1 ? setStep((s) => s - 1) : undefined)}
                  disabled={submitting || step === 1}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-navy transition hover:bg-navy/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => void next()}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-navy/90 disabled:opacity-60 sm:min-w-[190px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      {step === 5 ? 'Save changes' : 'Continue'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <LivePreviewPanel
          form={form}
          step={step}
          provinceName={resolvedProvinceName}
          districtName={resolvedDistrictName}
        />
      </div>
    </div>
  );
}

function ProfileStepper({ step }: { step: number }) {
  const current = ORG_PROFILE_STEPS.find((s) => s.id === step) ?? ORG_PROFILE_STEPS[0];
  const icons = [MapPin, Building2, Phone, UserRound, ClipboardCheck];

  return (
    <div>
      <div className="sm:hidden">
        <div className="flex items-center justify-between text-xs font-medium text-muted">
          <span>
            Step {step} of {ORG_PROFILE_STEPS.length}
          </span>
          <span className="text-navy">{current.label}</span>
        </div>
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-navy/10">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-300"
            style={{ width: `${(step / ORG_PROFILE_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="hidden items-start sm:flex">
        {ORG_PROFILE_STEPS.map((s, i) => {
          const active = step === s.id;
          const doneStep = step > s.id;
          const Icon = icons[i] ?? MapPin;
          return (
            <li key={s.id} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                <span className={`h-px flex-1 ${i === 0 ? 'opacity-0' : doneStep || active ? 'bg-amber-500' : 'bg-border'}`} />
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm transition-all ${
                    doneStep
                      ? 'bg-amber-500 text-white shadow-md'
                      : active
                        ? 'bg-navy text-white shadow-md'
                        : 'bg-navy/5 text-muted'
                  }`}
                >
                  {doneStep ? <Check className="h-4 w-4" strokeWidth={3} /> : <Icon className="h-4 w-4" />}
                </span>
                <span className={`h-px flex-1 ${i === ORG_PROFILE_STEPS.length - 1 ? 'opacity-0' : doneStep ? 'bg-amber-500' : 'bg-border'}`} />
              </div>
              <span className={`text-[11px] font-semibold ${active ? 'text-navy' : 'text-muted'}`}>{s.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm font-medium text-navy outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/15';

function Field({
  label,
  children,
  hint,
  error,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string | null;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
        {optional ? <span className="text-[10px] font-medium text-muted/70">Optional</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[11px] font-medium text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.75 text-xs font-semibold transition-all ${
        active ? 'border-navy bg-navy text-white' : 'border-border bg-white text-navy hover:border-navy/25'
      }`}
    >
      {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      {children}
    </button>
  );
}

function inferImageMimeType(file: File): string {
  if (file.type && file.type.startsWith('image/')) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function BrandingUpload({
  label,
  value,
  onUploaded,
  onCleared,
  required = false,
}: {
  label: string;
  value: string;
  onUploaded: (url: string) => void;
  onCleared?: () => void;
  required?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const assetType = label.toLowerCase().includes('signature')
    ? 'signature'
    : label.toLowerCase().includes('stamp')
      ? 'stamp'
      : 'logo';
  const displaySrc = previewUrl || (value ? resolvePublicAssetUrl(value) : '');

  useEffect(() => {
    setImgError(false);
  }, [displaySrc]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const mime = inferImageMimeType(file);
    if (!mime.startsWith('image/')) return;

    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    const blobPreview = URL.createObjectURL(file);
    setPreviewUrl(blobPreview);
    setImgError(false);
    setUploading(true);

    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const { data } = await axios.post(`${API_BASE}/public/branding/upload`, {
        assetType,
        fileName: file.name,
        contentBase64,
        mimeType: mime,
      });
      const uploadedUrl = String(data.data?.url ?? '').trim();
      if (!uploadedUrl) throw new Error('Upload did not return a file URL');
      onUploaded(uploadedUrl);
      URL.revokeObjectURL(blobPreview);
      setPreviewUrl(null);
    } catch {
      setImgError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-[#f8f9fb] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-navy">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </p>
        {!required ? (
          <span className="rounded-full bg-navy/5 px-2 py-0.5 text-[10px] font-medium text-muted">Optional</span>
        ) : (
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-navy">Required</span>
        )}
      </div>
      {displaySrc && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displaySrc}
          alt={label}
          className="mt-2.5 h-16 w-full rounded-xl border border-border bg-white object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="mt-2.5 flex h-16 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-[11px] text-muted">
          <UploadCloud className="h-4 w-4" />
          {imgError ? 'Preview failed — try PNG or JPEG' : 'No file yet'}
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy/90">
          {uploading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading…
            </>
          ) : value || previewUrl ? (
            'Replace'
          ) : (
            <>
              <ImageIcon className="h-3 w-3" />
              Upload
            </>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        {value && onCleared && !required ? (
          <button
            type="button"
            onClick={() => {
              if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
              onCleared();
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted hover:bg-red-50 hover:text-red-600"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StepHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-lg font-semibold text-navy">{title}</h3>
        <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function StepLocation({
  form,
  setField,
  provinces,
  districts,
  sectors,
  cells,
  villages,
}: {
  form: OrgProfileFormState;
  setField: <K extends keyof OrgProfileFormState>(key: K, value: OrgProfileFormState[K]) => void;
  provinces: Loc[];
  districts: Loc[];
  sectors: Loc[];
  cells: Loc[];
  villages: Loc[];
}) {
  function clearBelowDistrict() {
    setField('sectorId', '');
    setField('sectorName', '');
    setField('cellId', '');
    setField('cellName', '');
    setField('villageId', '');
    setField('villageName', '');
  }

  function clearBelowSector() {
    setField('cellId', '');
    setField('cellName', '');
    setField('villageId', '');
    setField('villageName', '');
  }

  function clearBelowCell() {
    setField('villageId', '');
    setField('villageName', '');
  }

  return (
    <div className="space-y-6">
      <StepHeader icon={MapPin} title="Location" subtitle="Update your school's administrative location in Rwanda." />

      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Province *">
          <select
            className={inputClass}
            value={form.provinceId}
            onChange={(e) => {
              const value = e.target.value;
              const selected = provinces.find((p) => p.id === value);
              setField('provinceId', value);
              setField('provinceName', selected?.name ?? '');
              setField('districtId', '');
              setField('districtName', '');
              clearBelowDistrict();
            }}
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
            className={inputClass}
            value={form.districtId}
            onChange={(e) => {
              const value = e.target.value;
              const selected = districts.find((d) => d.id === value);
              setField('districtId', value);
              setField('districtName', selected?.name ?? '');
              clearBelowDistrict();
            }}
            disabled={!form.provinceId}
          >
            <option value="">{form.provinceId ? 'Select district' : 'Select province first'}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-3">
        <Field label="Sector *">
          <select
            className={inputClass}
            value={form.sectorId}
            onChange={(e) => {
              const value = e.target.value;
              const selected = sectors.find((s) => s.id === value);
              setField('sectorId', value);
              setField('sectorName', selected?.name ?? '');
              clearBelowSector();
            }}
            disabled={!form.districtId}
          >
            <option value="">{form.districtId ? 'Select sector' : 'Select district first'}</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cell *">
          <select
            className={inputClass}
            value={form.cellId}
            onChange={(e) => {
              const value = e.target.value;
              const selected = cells.find((c) => c.id === value);
              setField('cellId', value);
              setField('cellName', selected?.name ?? '');
              clearBelowCell();
            }}
            disabled={!form.sectorId}
          >
            <option value="">{form.sectorId ? 'Select cell' : 'Select sector first'}</option>
            {cells.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Village" optional>
          <select
            className={inputClass}
            value={form.villageId}
            onChange={(e) => {
              const value = e.target.value;
              const selected = villages.find((v) => v.id === value);
              setField('villageId', value);
              setField('villageName', selected?.name ?? '');
            }}
            disabled={!form.cellId || villages.length === 0}
          >
            <option value="">
              {!form.cellId ? 'Select cell first' : villages.length === 0 ? 'Not available' : 'Select village (optional)'}
            </option>
            {villages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {(form.provinceName || form.districtName || form.sectorName) && (
        <LocationMapPreview
          parts={{
            provinceName: provinces.find((p) => p.id === form.provinceId)?.name || form.provinceName,
            districtName: districts.find((d) => d.id === form.districtId)?.name || form.districtName,
            sectorName: form.sectorName,
            cellName: form.cellName,
            villageName: form.villageName,
          }}
        />
      )}
    </div>
  );
}

function StepSchool({
  form,
  setField,
  setForm,
  toggleLevel,
}: {
  form: OrgProfileFormState;
  setField: <K extends keyof OrgProfileFormState>(key: K, value: OrgProfileFormState[K]) => void;
  setForm: Dispatch<SetStateAction<OrgProfileFormState>>;
  toggleLevel: (level: string) => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        icon={Building2}
        title="School details"
        subtitle="Update your school name, levels, branding, and public description."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="School name *" hint={form.districtName ? `Accredited schools in ${form.districtName}` : undefined}>
          <SchoolSearchSelect
            districtName={form.districtName}
            value={form.organizationName}
            disabled={!form.districtId}
            onChange={(name, school) => {
              setField('organizationName', name);
              if (school) applyCatalogAutofill(school, setForm);
            }}
          />
        </Field>
        <Field label="Established date" optional hint="Pick year, then month and day">
          <EstablishedDatePicker value={form.establishedDate} onChange={(v) => setField('establishedDate', v)} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">School category *</p>
          <div className="flex flex-wrap gap-2">
            {SCHOOL_CATEGORIES.map((c) => (
              <ChipButton key={c} active={form.schoolCategory === c} onClick={() => setField('schoolCategory', c)}>
                {c}
              </ChipButton>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">School program *</p>
          <div className="flex flex-wrap gap-2">
            {SCHOOL_PROGRAMS.map((p) => (
              <ChipButton key={p} active={form.schoolProgram === p} onClick={() => setField('schoolProgram', p)}>
                {p}
              </ChipButton>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Education levels *</p>
        <div className="flex flex-wrap gap-2">
          {EDUCATION_LEVELS.map((level) => (
            <ChipButton key={level} active={form.educationLevels.includes(level)} onClick={() => toggleLevel(level)}>
              {level}
            </ChipButton>
          ))}
        </div>
      </div>

      {form.educationLevels.includes('A-Level') ? (
        <div className="rounded-2xl border border-border bg-[#f8f9fb] p-4 sm:p-5">
          <SearchableMultiSelect
            label="A-Level combinations *"
            hint="Search and select codes (e.g. PCB, PCM) or add your own"
            placeholder="Search combinations…"
            options={A_LEVEL_COMBINATIONS}
            selected={form.aLevelCombinations}
            onChange={(v) => setField('aLevelCombinations', v)}
          />
        </div>
      ) : null}

      {form.educationLevels.includes('TVET') ? (
        <div className="rounded-2xl border border-border bg-[#f8f9fb] p-4 sm:p-5">
          <SearchableMultiSelect
            label="TVET trades *"
            hint="Search trades or type a custom trade name"
            placeholder="Search trades…"
            options={TVET_TRADES}
            selected={form.tvetTrades}
            onChange={(v) => setField('tvetTrades', v)}
          />
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-[#f8f9fb] p-4 sm:p-5">
        <p className="text-sm font-semibold text-navy">School branding</p>
        <p className="mt-1 text-xs text-muted">
          Upload logo, signature, and stamp — used on documents and your public school page.
        </p>
        <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
          <BrandingUpload label="School Logo" value={form.logoUrl} required onUploaded={(url) => setField('logoUrl', url)} />
          <BrandingUpload
            label="Principal Signature"
            value={form.signatureUrl}
            onUploaded={(url) => setField('signatureUrl', url)}
            onCleared={() => setField('signatureUrl', '')}
          />
          <BrandingUpload
            label="School Stamp"
            value={form.stampUrl}
            onUploaded={(url) => setField('stampUrl', url)}
            onCleared={() => setField('stampUrl', '')}
          />
        </div>
      </div>

      <SchoolProfileSection
        form={form}
        logoUrl={form.logoUrl}
        onDescriptionChange={(value) => setField('description', value)}
      />
    </div>
  );
}

function StepContact({
  form,
  setField,
  provinces,
  districts,
}: {
  form: OrgProfileFormState;
  setField: <K extends keyof OrgProfileFormState>(key: K, value: OrgProfileFormState[K]) => void;
  provinces: Loc[];
  districts: Loc[];
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        icon={Phone}
        title="Contact information"
        subtitle="How parents and partners reach your school on your public mini-website."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone *" hint="e.g. 078xxxxxxx">
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="078xxxxxxx"
                inputMode="tel"
              />
            </Field>
            <Field label="Email *">
              <input
                className={inputClass}
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="info@school.rw"
              />
            </Field>
          </div>
          <Field label="Website" optional hint="e.g. www.myschool.rw">
            <input
              className={inputClass}
              value={form.website}
              onChange={(e) => setField('website', e.target.value)}
              placeholder="www.myschool.rw"
            />
          </Field>
          <Field label="Postal address" optional>
            <input
              className={inputClass}
              value={form.postalAddress}
              onChange={(e) => setField('postalAddress', e.target.value)}
              placeholder="P.O. Box 123, Kigali"
            />
          </Field>
        </div>

        <div className="space-y-4">
          <LocationSummaryCard
            parts={{
              provinceName: provinces.find((p) => p.id === form.provinceId)?.name || form.provinceName,
              districtName: districts.find((d) => d.id === form.districtId)?.name || form.districtName,
              sectorName: form.sectorName,
              cellName: form.cellName,
              villageName: form.villageName,
            }}
          />
          <LocationMapPreview
            parts={{
              provinceName: provinces.find((p) => p.id === form.provinceId)?.name || form.provinceName,
              districtName: districts.find((d) => d.id === form.districtId)?.name || form.districtName,
              sectorName: form.sectorName,
              cellName: form.cellName,
              villageName: form.villageName,
              postalAddress: form.postalAddress,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StepLeadership({
  form,
  setField,
}: {
  form: OrgProfileFormState;
  setField: <K extends keyof OrgProfileFormState>(key: K, value: OrgProfileFormState[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={UserRound}
        title="Leadership"
        subtitle="Head Teacher / Principal details shown on your school profile."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Head Teacher / Principal *">
          <input
            className={inputClass}
            value={form.organizationHead}
            onChange={(e) => setField('organizationHead', e.target.value)}
            placeholder="Full name"
          />
        </Field>
        <Field label="Phone" optional>
          <input
            className={inputClass}
            value={form.headPhone}
            onChange={(e) => setField('headPhone', e.target.value)}
            placeholder="078xxxxxxx"
            inputMode="tel"
          />
        </Field>
      </div>

      <Field label="Leadership email *" hint="Contact email for your school leadership">
        <input
          className={inputClass}
          type="email"
          value={form.headEmail}
          onChange={(e) => setField('headEmail', e.target.value)}
          placeholder="head@school.rw"
        />
      </Field>
    </div>
  );
}

function StepReview({
  form,
  provinces,
  districts,
}: {
  form: OrgProfileFormState;
  provinces: Loc[];
  districts: Loc[];
}) {
  const provinceName = provinces.find((p) => p.id === form.provinceId)?.name ?? form.provinceName ?? '—';
  const districtName = districts.find((d) => d.id === form.districtId)?.name ?? form.districtName ?? '—';

  const sections: { title: string; rows: [string, string][] }[] = [
    {
      title: 'School',
      rows: [
        ['Name', form.organizationName || '—'],
        ['Code', form.organizationCode || '—'],
        ['Established', form.establishedDate || '—'],
        ['Category', form.schoolCategory || '—'],
        ['Program', form.schoolProgram || '—'],
        ['Levels', form.educationLevels.join(', ') || '—'],
        ['Description', form.description.trim() ? `${countWords(form.description)} words` : '—'],
        ...(form.aLevelCombinations.length ? [['A-Level', form.aLevelCombinations.join(', ')] as [string, string]] : []),
        ...(form.tvetTrades.length ? [['TVET trades', form.tvetTrades.join(', ')] as [string, string]] : []),
      ],
    },
    {
      title: 'Location',
      rows: [
        ['Province', provinceName],
        ['District', districtName],
        ['Sector', form.sectorName || '—'],
        ['Cell', form.cellName || '—'],
        ['Village', form.villageName || '—'],
      ],
    },
    {
      title: 'Contact',
      rows: [
        ['Phone', form.phone || '—'],
        ['Email', form.email || '—'],
        ...(form.website ? [['Website', form.website] as [string, string]] : []),
        ...(form.postalAddress ? [['Postal address', form.postalAddress] as [string, string]] : []),
      ],
    },
    {
      title: 'Leadership',
      rows: [
        ['Head Teacher', form.organizationHead || '—'],
        ['Email', form.headEmail || '—'],
        ...(form.headPhone ? [['Phone', form.headPhone] as [string, string]] : []),
      ],
    },
  ];

  const branding: [string, string][] = [
    ...(form.logoUrl ? [['Logo', 'Uploaded'] as [string, string]] : []),
    ...(form.signatureUrl ? [['Signature', 'Uploaded'] as [string, string]] : []),
    ...(form.stampUrl ? [['Stamp', 'Uploaded'] as [string, string]] : []),
  ];

  return (
    <div className="space-y-5">
      <StepHeader
        icon={ClipboardCheck}
        title="Review & save"
        subtitle="Confirm your changes before saving your school profile."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <ReviewSection key={section.title} title={section.title} rows={section.rows} />
        ))}
      </div>

      {branding.length > 0 ? <ReviewSection title="Branding" rows={branding} /> : null}
    </div>
  );
}

function ReviewSection({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#f8f9fb]">
      <div className="border-b border-border bg-white px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      </div>
      <dl className="divide-y divide-border px-4">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,38%)_minmax(0,1fr)] sm:gap-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="text-sm font-semibold text-navy sm:text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function LivePreviewPanel({
  form,
  step,
  provinceName,
  districtName,
}: {
  form: OrgProfileFormState;
  step: number;
  provinceName: string;
  districtName: string;
}) {
  const focusLabels = ['Location', 'School', 'Contact', 'Leadership', 'Review'];
  const focus = focusLabels[step - 1] ?? 'Review';

  return (
    <aside className="hidden w-[300px] shrink-0 lg:block">
      <div className="sticky top-8 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="relative flex flex-col items-center gap-3 border-b border-border bg-navy px-6 py-7">
          <div className="relative z-10 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15">
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvePublicAssetUrl(form.logoUrl)}
                alt="School logo"
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <Building2 className="h-7 w-7 text-white/40" />
            )}
          </div>
          <div className="relative z-10 text-center">
            <p className="max-w-[220px] truncate text-sm font-semibold text-white">
              {form.organizationName || 'Your school'}
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-white/50">
              {form.organizationCode || 'School code'}
            </p>
          </div>
        </div>

        <div className="divide-y divide-border p-4 text-sm">
          <PreviewRow active={focus === 'Location'} label="Location" value={[provinceName, districtName].filter(Boolean).join(' · ') || 'Not set'} />
          <PreviewRow active={focus === 'School'} label="School" value={form.schoolCategory ? `${form.schoolCategory} · ${form.schoolProgram}` : 'Not set'} />
          <PreviewRow active={focus === 'Contact'} label="Contact" value={form.phone || form.email || 'Not set'} />
          <PreviewRow active={focus === 'Leadership'} label="Leadership" value={form.organizationHead || 'Not set'} />
        </div>
      </div>
    </aside>
  );
}

function PreviewRow({ active, label, value }: { active: boolean; label: string; value: string }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 transition ${active ? 'bg-primary/10 ring-1 ring-primary/20' : ''}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 truncate font-medium text-navy">{value}</p>
    </div>
  );
}
