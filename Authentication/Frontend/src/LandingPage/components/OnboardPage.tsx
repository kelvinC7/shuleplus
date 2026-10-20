"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ClipboardCheck,
  Copy,
  ImageIcon,
  Loader2,
  Lock,
  LogIn,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from "lucide-react";
import {
  EDUCATION_LEVELS,
  SCHOOL_CATEGORIES,
  SCHOOL_PROGRAMS,
  resolvePublicAssetUrl,
} from "@/lib/organization-registration";
import { SchoolSearchSelect, type CatalogSchool } from "@/LandingPage/components/SchoolSearchSelect";
import {
  EstablishedDatePicker,
  SearchableMultiSelect,
} from "@/LandingPage/components/OnboardFormPickers";
import { SchoolProfileSection } from "@/LandingPage/components/SchoolProfileSection";
import { generateSchoolDescription, countWords } from "@/LandingPage/components/school-profile-description";
import {
  A_LEVEL_COMBINATIONS,
  TVET_TRADES,
} from "@/LandingPage/components/onboard-school-options";
import {
  LocationMapPreview,
  LocationSummaryCard,
} from "@/LandingPage/components/LocationMapPreview";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const STORAGE_KEY = "shuleplus-onboard-modules";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+?250|0)?[7][0-9]{8}$/;

function isValidEmail(v: string) {
  return EMAIL_RE.test(v.trim());
}

function isValidPhone(v: string) {
  const digits = v.replace(/[\s\-()]/g, "");
  return (
    PHONE_RE.test(digits) ||
    (/^\+?[0-9]{9,15}$/.test(digits) && digits.replace(/\D/g, "").length >= 9)
  );
}

type SelectedModule = { id: string; name: string; svg?: string; slug?: string };
type Loc = { id: string; name: string; code?: string };

const STEPS = [
  { id: 1, label: "Location", icon: MapPin },
  { id: 2, label: "School", icon: Building2 },
  { id: 3, label: "Contact", icon: Phone },
  { id: 4, label: "Leadership", icon: UserRound },
  { id: 5, label: "Review", icon: ClipboardCheck },
] as const;

function mapSchoolCategory(status?: string | null): string {
  const s = (status ?? "").trim().toLowerCase();
  if (s.includes("gov") && s.includes("aid")) return "Government-Aided";
  if (s.includes("public")) return "Public";
  if (s.includes("private")) return "Private";
  return "";
}

function inferEducationLevels(school: CatalogSchool): string[] {
  const name = school.name.toLowerCase();
  if (school.type?.toUpperCase() === "TVET") return ["TVET"];

  const levels: string[] = [];
  if (/nursery|nurser|kindergarten|\bkg\b/i.test(name)) levels.push("Nursery");
  if (/primary|\bep\b|ecole prim|primaire/i.test(name)) levels.push("Primary");
  if (/secondary|\bgs\b|ecole sec|lycee|lycée|\bss\b|s\.s\./i.test(name)) {
    levels.push("O-Level");
    if (/a[\s.-]?level|advanced|upper secondary/i.test(name)) levels.push("A-Level");
  }
  if (levels.length === 0) levels.push("Primary");
  return [...new Set(levels)];
}

function applyCatalogAutofill(
  school: CatalogSchool,
  setForm: Dispatch<SetStateAction<FormState>>,
) {
  const category = mapSchoolCategory(school.status);
  const levels = inferEducationLevels(school);

  setForm((prev) => {
    const next = {
      ...prev,
      organizationName: school.name,
      schoolCategory: category || prev.schoolCategory,
      schoolProgram: prev.schoolProgram || "Day",
      educationLevels: levels,
      aLevelCombinations: levels.includes("A-Level") ? prev.aLevelCombinations : [],
      tvetTrades: levels.includes("TVET") ? prev.tvetTrades : [],
    };
    return {
      ...next,
      description: generateSchoolDescription(next),
    };
  });
}

function isCompleteDate(value: string) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const languages = [
  { code: "ENG", flag: "gb" },
  { code: "KIN", flag: "rw" },
  { code: "FRA", flag: "fr" },
  { code: "SWA", flag: "ke" },
] as const;

type FormState = {
  organizationName: string;
  establishedDate: string;
  description: string;
  schoolCategory: string;
  schoolProgram: string;
  educationLevels: string[];
  aLevelCombinations: string[];
  tvetTrades: string[];
  logoUrl: string;
  signatureUrl: string;
  stampUrl: string;
  phone: string;
  email: string;
  website: string;
  postalAddress: string;
  provinceId: string;
  provinceName: string;
  districtId: string;
  districtName: string;
  sectorId: string;
  sectorName: string;
  cellId: string;
  cellName: string;
  villageId: string;
  villageName: string;
  organizationHead: string;
  headPhone: string;
  headEmail: string;
  tempPassword: string;
  confirmPassword: string;
};

const initialForm: FormState = {
  organizationName: "",
  establishedDate: "",
  description: "",
  schoolCategory: "",
  schoolProgram: "",
  educationLevels: [],
  aLevelCombinations: [],
  tvetTrades: [],
  logoUrl: "",
  signatureUrl: "",
  stampUrl: "",
  phone: "",
  email: "",
  website: "",
  postalAddress: "",
  provinceId: "",
  provinceName: "",
  districtId: "",
  districtName: "",
  sectorId: "",
  sectorName: "",
  cellId: "",
  cellName: "",
  villageId: "",
  villageName: "",
  organizationHead: "",
  headPhone: "",
  headEmail: "",
  tempPassword: "",
  confirmPassword: "",
};

export function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [modules, setModules] = useState<SelectedModule[]>([]);
  const [lang, setLang] = useState<(typeof languages)[number]["code"]>("ENG");
  const [langOpen, setLangOpen] = useState(false);
  const [provinces, setProvinces] = useState<Loc[]>([]);
  const [districts, setDistricts] = useState<Loc[]>([]);
  const [sectors, setSectors] = useState<Loc[]>([]);
  const [cells, setCells] = useState<Loc[]>([]);
  const [villages, setVillages] = useState<Loc[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ organizationCode?: string | null } | null>(
    null,
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setModules(JSON.parse(raw) as SelectedModule[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    axios
      .get(`${API_BASE}/public/locations/provinces`)
      .then((r) => {
        const list = (r.data.data ?? []) as Loc[];
        list.sort((a, b) => a.name.localeCompare(b.name));
        setProvinces(list);
      })
      .catch(() => setProvinces([]));
  }, []);

  const sortLocs = useCallback((list: Loc[]) => {
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const loadDistricts = useCallback(
    async (provinceId: string) => {
      if (!provinceId) return [];
      const { data } = await axios.get(
        `${API_BASE}/public/locations/provinces/${provinceId}/districts`,
      );
      return sortLocs((data.data ?? []) as Loc[]);
    },
    [sortLocs],
  );

  const loadSectors = useCallback(
    async (districtId: string) => {
      if (!districtId) return [];
      const { data } = await axios.get(
        `${API_BASE}/public/locations/districts/${districtId}/sectors`,
      );
      return sortLocs((data.data ?? []) as Loc[]);
    },
    [sortLocs],
  );

  const loadCells = useCallback(
    async (sectorId: string) => {
      if (!sectorId) return [];
      const { data } = await axios.get(
        `${API_BASE}/public/locations/sectors/${sectorId}/cells`,
      );
      return sortLocs((data.data ?? []) as Loc[]);
    },
    [sortLocs],
  );

  const loadVillages = useCallback(
    async (cellId: string) => {
      if (!cellId) return [];
      const { data } = await axios.get(
        `${API_BASE}/public/locations/cells/${cellId}/villages`,
      );
      return sortLocs((data.data ?? []) as Loc[]);
    },
    [sortLocs],
  );

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

  const currentLang = languages.find((l) => l.code === lang) ?? languages[0];

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
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
        aLevelCombinations: educationLevels.includes("A-Level")
          ? prev.aLevelCombinations
          : [],
        tvetTrades: educationLevels.includes("TVET") ? prev.tvetTrades : [],
      };
    });
  }

  function validateStep(): string | null {
    if (step === 1) {
      if (!form.provinceId) return "Province is required";
      if (!form.districtId) return "District is required";
      if (!form.sectorId && !form.sectorName.trim()) return "Sector is required";
      if (!form.cellId && !form.cellName.trim()) return "Cell is required";
      // Village is optional
    }
    if (step === 2) {
      if (!form.organizationName.trim())
        return "Enter your school name or select from the list";
      if (form.organizationName.trim().length < 3)
        return "School name looks too short";
      if (!form.schoolCategory)
        return "School category is required";
      if (!form.schoolProgram)
        return "School program is required";
      if (!form.logoUrl.trim())
        return "School logo is required  upload your school logo to continue";
      if (form.establishedDate && !isCompleteDate(form.establishedDate))
        return "Complete established date (year, month, and day) or leave it empty";
      if (form.educationLevels.length === 0)
        return "Select at least one education level";
      if (
        form.educationLevels.includes("A-Level") &&
        form.aLevelCombinations.length === 0
      )
        return "Add at least one A-Level combination";
      if (
        form.educationLevels.includes("TVET") &&
        form.tvetTrades.length === 0
      )
        return "Add at least one TVET trade";
    }
    if (step === 3) {
      if (!form.phone.trim()) return "School phone is required";
      if (!isValidPhone(form.phone)) return "Enter a valid school phone number";
      if (!form.email.trim()) return "School email is required";
      if (!isValidEmail(form.email))
        return "Enter a valid school email address";
      if (form.website.trim()) {
        try {
          // allow domain without protocol
          const w = form.website.trim().startsWith("http")
            ? form.website.trim()
            : `https://${form.website.trim()}`;
          new URL(w);
        } catch {
          return "Website URL looks invalid";
        }
      }
    }
    if (step === 4) {
      if (!form.organizationHead.trim())
        return "Head Teacher / Principal name is required";
      if (!form.headEmail.trim())
        return "Head Teacher email is required (used for login)";
      if (!isValidEmail(form.headEmail))
        return "Enter a valid Head Teacher email";
      if (form.headPhone.trim() && !isValidPhone(form.headPhone))
        return "Enter a valid Head Teacher phone";
      if (form.tempPassword.length < 8)
        return "Password must be at least 8 characters";
      if (form.tempPassword !== form.confirmPassword)
        return "Passwords do not match";
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
    if (step < 5) setStep((s) => s + 1);
    else await submit();
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        organizationType: "SCHOOL",
        organizationName: form.organizationName.trim(),
        establishedDate: form.establishedDate || undefined,
        description: form.description.trim() || undefined,
        schoolCategory: form.schoolCategory,
        category: form.schoolCategory,
        schoolProgram: form.schoolProgram,
        educationLevels: form.educationLevels,
        aLevelCombinations: form.educationLevels.includes("A-Level")
          ? form.aLevelCombinations
          : [],
        tvetTrades: form.educationLevels.includes("TVET")
          ? form.tvetTrades
          : [],
        logoUrl: form.logoUrl || undefined,
        signatureUrl: form.signatureUrl || undefined,
        stampUrl: form.stampUrl || undefined,
        phone: form.phone.trim(),
        email: form.email.trim(),
        website: form.website.trim() || undefined,
        postalAddress: form.postalAddress.trim() || undefined,
        provinceId: form.provinceId,
        provinceName: form.provinceName || undefined,
        districtId: form.districtId,
        districtName: form.districtName || undefined,
        sectorName: form.sectorName.trim() || undefined,
        cellName: form.cellName.trim() || undefined,
        villageName: form.villageName.trim() || undefined,
        country: "Rwanda",
        organizationHead: form.organizationHead.trim(),
        headPhone: form.headPhone.trim() || undefined,
        headEmail: form.headEmail.trim(),
        // Head Teacher / Principal is the organization admin
        adminName: form.organizationHead.trim(),
        adminEmail: form.headEmail.trim(),
        adminPhone: form.headPhone.trim() || undefined,
        tempPassword: form.tempPassword,
        requirePasswordChange: false,
        preferredLanguage: lang,
        timezone: "Africa/Kigali",
        subscriptionTier: "Standard",
        selectedModules: modules.map((m) => ({
          id: m.id,
          name: m.name,
          slug: m.slug ?? m.id,
        })),
      };

      const { data } = await axios.post(
        `${API_BASE}/public/school-registrations`,
        { payload },
      );
      sessionStorage.removeItem(STORAGE_KEY);
      setDone({ organizationCode: data.data?.organizationCode });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Could not submit registration. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <SuccessScreen
        organizationCode={done.organizationCode}
        headEmail={form.headEmail}
      />
    );
  }

  const resolvedProvinceName =
    provinces.find((p) => p.id === form.provinceId)?.name || form.provinceName;
  const resolvedDistrictName =
    districts.find((d) => d.id === form.districtId)?.name || form.districtName;

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <header className="border-b border-navy-900/[0.06] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:max-w-7xl">
          <Link
            href="/"
            className="inline-flex items-center transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo.png"
              alt="Shule+"
              width={110}
              height={32}
              className="h-7 w-auto sm:h-8"
            />
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-900/[0.08] bg-white px-2.5 py-2 text-sm font-medium text-navy-900 transition-colors hover:bg-[#f8f9fb]"
              aria-expanded={langOpen}
              aria-haspopup="listbox"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://flagcdn.com/w40/${currentLang.flag}.png`}
                alt=""
                className="h-4 w-[22px] rounded-[3px] object-cover ring-1 ring-black/[0.06]"
              />
              {currentLang.code}
              <ChevronDown
                className={`h-3.5 w-3.5 text-navy-700/40 transition-transform ${langOpen ? "rotate-180" : ""}`}
              />
            </button>
            {langOpen ? (
              <ul
                role="listbox"
                className="absolute right-0 top-full z-20 mt-2 min-w-[140px] overflow-hidden rounded-xl border border-navy-900/[0.08] bg-white py-1.5"
              >
                {languages.map((l) => {
                  const active = lang === l.code;
                  return (
                    <li key={l.code}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setLang(l.code);
                          setLangOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-navy-900 transition-colors hover:bg-[#f8f9fb]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://flagcdn.com/w40/${l.flag}.png`}
                          alt=""
                          className="h-4 w-[22px] rounded-[3px] object-cover ring-1 ring-black/[0.06]"
                        />
                        <span className="flex-1">{l.code}</span>
                        {active ? (
                          <Check className="h-3.5 w-3.5 text-amber-500" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:max-w-7xl lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center gap-3 sm:mb-8">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-navy-900/[0.08] bg-white lg:hidden">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvePublicAssetUrl(form.logoUrl)}
                  alt="School logo"
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <Building2 className="h-5 w-5 text-navy-700/30" />
              )}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                School onboarding
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-navy-900 sm:text-3xl">
                Register your school
              </h1>
              <p className="mt-2 text-sm text-navy-700/55">
                Step {step} of {STEPS.length} —{" "}
                {STEPS.find((s) => s.id === step)?.label}
              </p>
            </div>
          </div>

          {modules.length > 0 ? (
            <p className="mb-6 rounded-xl border border-amber-500/20 bg-amber-50/80 px-4 py-3 text-sm text-navy-800">
              Launching with{" "}
              <strong className="font-semibold">
                {modules.length} {modules.length === 1 ? "module" : "modules"}
              </strong>
              . They unlock after activation.
            </p>
          ) : (
            <p className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-navy-900/[0.08] bg-white px-4 py-3 text-sm text-navy-700/65">
              <span>No modules selected  you can add them later.</span>
              <Link
                href="/enter-as-school"
                className="font-semibold text-amber-600 hover:text-amber-700"
              >
                Choose modules
              </Link>
            </p>
          )}

          <div className="overflow-hidden rounded-2xl border border-navy-900/[0.08] bg-white shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
            <div className="border-b border-navy-900/[0.06] px-5 py-5 sm:px-7">
              <Stepper step={step} />
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
                <StepSchool
                  form={form}
                  setField={setField}
                  setForm={setForm}
                  toggleLevel={toggleLevel}
                />
              ) : null}
              {step === 3 ? (
                <StepContact
                  form={form}
                  setField={setField}
                  provinces={provinces}
                  districts={districts}
                />
              ) : null}
              {step === 4 ? (
                <StepLeadership form={form} setField={setField} />
              ) : null}
              {step === 5 ? (
                <StepReview
                  form={form}
                  modules={modules}
                  provinces={provinces}
                  districts={districts}
                />
              ) : null}

              {error ? (
                <p className="mt-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
                  {error}
                </p>
              ) : null}

              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-navy-900/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    step > 1 ? setStep((s) => s - 1) : router.push('/enter-as-school')
                  }
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-navy-900/[0.12] bg-white px-5 py-3 text-sm font-semibold text-navy-800 transition-all hover:border-navy-900/20 hover:bg-[#f8f9fb] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {step > 1 ? "Back" : "Back to Modules"}
                </button>
                <button
                  type="button"
                  onClick={() => void next()}
                  disabled={submitting}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#000435] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-8px_rgba(0,4,53,0.5)] transition-all hover:bg-[#0a0f52] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[190px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      {step === 5 ? "Complete Registration" : "Continue"}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <LivePreviewPanel
          form={form}
          modules={modules}
          step={step}
          provinceName={resolvedProvinceName}
          districtName={resolvedDistrictName}
        />
      </main>
    </div>
  );
}

function SuccessScreen({
  organizationCode,
  headEmail,
}: {
  organizationCode?: string | null;
  headEmail: string;
}) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    if (!organizationCode) return;
    void navigator.clipboard.writeText(organizationCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f9fb] px-4 py-10 sm:px-6">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-[0.35] blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(245,158,11,0.35) 0%, rgba(245,158,11,0) 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 right-0 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(0,4,53,0.18) 0%, rgba(0,4,53,0) 70%)",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-navy-900/[0.08] bg-white shadow-[0_32px_80px_-24px_rgba(0,4,53,0.25)]">
          <div
            className="relative flex flex-col items-center px-6 pb-8 pt-9 text-center sm:px-10"
            style={{ backgroundColor: "#000435" }}
          >
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(245,158,11,0.25) 0%, transparent 40%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.08) 0%, transparent 45%)",
              }}
            />
            <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 shadow-[0_10px_30px_-6px_rgba(245,158,11,0.6)]">
              <Check className="h-8 w-8 text-[#000435]" strokeWidth={3} />
            </div>
            <h1 className="relative z-10 mt-5 text-2xl font-semibold text-white sm:text-[1.7rem]">
              You can sign in now
            </h1>
            <p className="relative z-10 mt-2 max-w-xs text-sm leading-relaxed text-white/65">
              Your workspace is ready. Modules unlock after Super Admin
              approval.
            </p>
          </div>

          <div className="px-6 py-7 sm:px-10 sm:py-8">
            {organizationCode ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.08] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/70">
                  Reference / school code
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span className="font-mono text-2xl font-bold tracking-[0.25em] text-navy-900">
                    {organizationCode}
                  </span>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-navy-900/[0.12] bg-white px-2.5 py-1.5 text-xs font-semibold text-navy-800 transition-colors hover:border-amber-400 hover:text-amber-700"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ) : null}

            <ul className="mt-5 space-y-3">
              <li className="flex items-start gap-3 rounded-xl bg-[#f8f9fb] px-3.5 py-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-900/[0.06] text-navy-800">
                  <LogIn className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm leading-relaxed text-navy-700/80">
                  Sign in with{" "}
                  {headEmail ? (
                    <span className="font-semibold text-navy-900">
                      {headEmail}
                    </span>
                  ) : (
                    "your Head Teacher email"
                  )}{" "}
                  and the password you set  you can sign in directly to your
                  dashboard.
                </p>
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-[#f8f9fb] px-3.5 py-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-900/[0.06] text-navy-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm leading-relaxed text-navy-700/80">
                  Selected modules stay locked until a Super Admin approves your
                  school  then they unlock automatically.
                </p>
              </li>
            </ul>

            <Link
              href="/login"
              className="mt-7 flex w-full items-center justify-center rounded-xl bg-[#000435] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_24px_-8px_rgba(0,4,53,0.45)] transition-colors hover:bg-[#0a0f52]"
            >
              Go to Login
            </Link>
            <Link
              href="/"
              className="mt-3 flex w-full items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-navy-700/60 transition-colors hover:text-navy-900"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const current = STEPS.find((s) => s.id === step) ?? STEPS[0];

  return (
    <div>
      <div className="sm:hidden">
        <div className="flex items-center justify-between text-xs font-medium text-navy-700/55">
          <span>
            Step {step} of {STEPS.length}
          </span>
          <span className="text-navy-900">{current.label}</span>
        </div>
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-navy-900/[0.06]">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-300"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="hidden items-start sm:flex">
        {STEPS.map((s, i) => {
          const active = step === s.id;
          const doneStep = step > s.id;
          const Icon = s.icon;
          return (
            <li key={s.id} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                <span
                  className={`h-px flex-1 transition-colors ${
                    i === 0
                      ? "opacity-0"
                      : doneStep || active
                        ? "bg-amber-500"
                        : "bg-navy-900/[0.08]"
                  }`}
                />
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm transition-all ${
                    doneStep
                      ? "bg-amber-500 text-white shadow-[0_6px_14px_-4px_rgba(245,158,11,0.5)]"
                      : active
                        ? "bg-[#000435] text-white shadow-[0_6px_14px_-4px_rgba(0,4,53,0.5)]"
                        : "bg-navy-900/[0.05] text-navy-700/35"
                  }`}
                >
                  {doneStep ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </span>
                <span
                  className={`h-px flex-1 transition-colors ${
                    i === STEPS.length - 1
                      ? "opacity-0"
                      : doneStep
                        ? "bg-amber-500"
                        : "bg-navy-900/[0.08]"
                  }`}
                />
              </div>
              <span
                className={`text-[11px] font-semibold transition-colors ${
                  active ? "text-navy-900" : "text-navy-700/40"
                }`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

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
        <span className="text-xs font-semibold uppercase tracking-wide text-navy-700/55">
          {label}
        </span>
        {optional ? (
          <span className="text-[10px] font-medium text-navy-700/35">
            Optional
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[11px] font-medium text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-navy-700/45">{hint}</span>
      ) : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-navy-900/[0.12] bg-white px-3.5 py-3 text-sm font-medium text-navy-900 outline-none transition placeholder:font-normal placeholder:text-navy-700/30 hover:border-navy-900/20 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/15 disabled:cursor-not-allowed disabled:opacity-55";

const inputErrorClass =
  "w-full rounded-xl border border-red-300 bg-red-50/40 px-3.5 py-3 text-sm font-medium text-navy-900 outline-none transition placeholder:font-normal placeholder:text-navy-700/30 focus:border-red-400 focus:ring-4 focus:ring-red-400/15";

const inputValidClass =
  "w-full rounded-xl border border-emerald-300 bg-emerald-50/30 px-3.5 py-3 text-sm font-medium text-navy-900 outline-none transition placeholder:font-normal placeholder:text-navy-700/30 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/15";

function InputWithStatus({
  icon: Icon,
  valid,
  error,
  className,
  ...props
}: {
  icon?: React.ComponentType<{ className?: string }>;
  valid?: boolean;
  error?: string | null;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const state = error ? "error" : valid ? "valid" : "default";
  const base =
    state === "error"
      ? inputErrorClass
      : state === "valid"
        ? inputValidClass
        : inputClass;

  return (
    <div className="relative">
      {Icon ? (
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-700/35" />
      ) : null}
      <input
        className={`${base} ${Icon ? "pl-10" : ""} ${
          state !== "default" ? "pr-10" : ""
        } ${className ?? ""}`}
        {...props}
      />
      {state === "valid" ? (
        <Check
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500"
          strokeWidth={3}
        />
      ) : null}
    </div>
  );
}

function inferImageMimeType(file: File): string {
  if (file.type && file.type.startsWith("image/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
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
  const assetType = label.toLowerCase().includes("signature")
    ? "signature"
    : label.toLowerCase().includes("stamp")
      ? "stamp"
      : "logo";

  const displaySrc = previewUrl || (value ? resolvePublicAssetUrl(value) : "");

  useEffect(() => {
    setImgError(false);
  }, [displaySrc]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    const mime = inferImageMimeType(file);
    if (!mime.startsWith("image/")) return;

    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    const blobPreview = URL.createObjectURL(file);
    setPreviewUrl(blobPreview);
    setImgError(false);
    setUploading(true);

    try {
      const contentBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      const { data } = await axios.post(`${API_BASE}/public/branding/upload`, {
        assetType,
        fileName: file.name,
        contentBase64,
        mimeType: mime,
      });
      const uploadedUrl = String(data.data?.url ?? "").trim();
      if (!uploadedUrl) throw new Error("Upload did not return a file URL");
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
    <div className="rounded-2xl border border-navy-900/[0.08] bg-[#f8f9fb] p-3.5 transition-all hover:border-navy-900/[0.14] hover:shadow-[0_4px_16px_-8px_rgba(0,4,53,0.15)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-navy-900">
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </p>
        {!required ? (
          <span className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 text-[10px] font-medium text-navy-700/50">
            Optional
          </span>
        ) : (
          <span className="rounded-full bg-[#FCB038]/20 px-2 py-0.5 text-[10px] font-medium text-[#000435]">
            Required
          </span>
        )}
      </div>
      {displaySrc && !imgError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displaySrc}
          alt={label}
          className="mt-2.5 h-16 w-full rounded-xl border border-navy-900/[0.06] bg-white object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="mt-2.5 flex h-16 items-center justify-center gap-2 rounded-xl border border-dashed border-navy-900/[0.15] text-[11px] text-navy-700/45">
          <UploadCloud className="h-4 w-4" />
          {imgError ? "Preview failed  try PNG or JPEG" : "No file yet"}
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#000435] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0a0f52]">
          {uploading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading…
            </>
          ) : value || previewUrl ? (
            "Replace"
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
              e.target.value = "";
            }}
          />
        </label>
        {value && onCleared && !required ? (
          <button
            type="button"
            onClick={() => {
              if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
              onCleared();
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-navy-700/55 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.75 text-xs font-semibold transition-all active:scale-[0.97] ${
        active
          ? "border-[#000435] bg-[#000435] text-white"
          : "border-navy-900/[0.12] bg-white text-navy-800 hover:border-navy-900/25"
      }`}
    >
      {active ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      {children}
    </button>
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
  form: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  provinces: Loc[];
  districts: Loc[];
  sectors: Loc[];
  cells: Loc[];
  villages: Loc[];
}) {
  function clearBelowDistrict() {
    setField("sectorId", "");
    setField("sectorName", "");
    setField("cellId", "");
    setField("cellName", "");
    setField("villageId", "");
    setField("villageName", "");
  }

  function clearBelowSector() {
    setField("cellId", "");
    setField("cellName", "");
    setField("villageId", "");
    setField("villageName", "");
  }

  function clearBelowCell() {
    setField("villageId", "");
    setField("villageName", "");
  }

  return (
    <div className="space-y-6">
      <StepHeader
        icon={MapPin}
        title="Location"
        subtitle="Pick Rwanda locations from the list. Village is optional."
      />

      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-navy-700/55">
          Administrative area
        </p>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Province *">
            <select
              className={inputClass}
              value={form.provinceId}
              onChange={(e) => {
                const value = e.target.value;
                const selected = provinces.find((p) => p.id === value);
                setField("provinceId", value);
                setField("provinceName", selected?.name ?? "");
                setField("districtId", "");
                setField("districtName", "");
                clearBelowDistrict();
                setField("organizationName", "");
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
                setField("districtId", value);
                setField("districtName", selected?.name ?? "");
                clearBelowDistrict();
                setField("organizationName", "");
              }}
              disabled={!form.provinceId}
            >
              <option value="">
                {form.provinceId ? "Select district" : "Select province first"}
              </option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-navy-700/55">
          Local address
        </p>
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Field label="Sector *">
            <select
              className={inputClass}
              value={form.sectorId}
              onChange={(e) => {
                const value = e.target.value;
                const selected = sectors.find((s) => s.id === value);
                setField("sectorId", value);
                setField("sectorName", selected?.name ?? "");
                clearBelowSector();
              }}
              disabled={!form.districtId}
            >
              <option value="">
                {form.districtId ? "Select sector" : "Select district first"}
              </option>
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
                setField("cellId", value);
                setField("cellName", selected?.name ?? "");
                clearBelowCell();
              }}
              disabled={!form.sectorId}
            >
              <option value="">
                {form.sectorId ? "Select cell" : "Select sector first"}
              </option>
              {cells.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Village"
            optional
            hint={
              form.cellId && villages.length === 0
                ? "No villages listed for this cell"
                : undefined
            }
          >
            <select
              className={inputClass}
              value={form.villageId}
              onChange={(e) => {
                const value = e.target.value;
                const selected = villages.find((v) => v.id === value);
                setField("villageId", value);
                setField("villageName", selected?.name ?? "");
              }}
              disabled={!form.cellId || villages.length === 0}
            >
              <option value="">
                {!form.cellId
                  ? "Select cell first"
                  : villages.length === 0
                    ? "Not available"
                    : "Select village (optional)"}
              </option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
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
  form: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  setForm: Dispatch<SetStateAction<FormState>>;
  toggleLevel: (level: string) => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        icon={Building2}
        title="School details"
        subtitle="Search the accredited list or add your own school if it is not available."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Field
          label="School name *"
          hint={
            form.districtName
              ? `Accredited schools in ${form.districtName}`
              : "Complete Location (district) first"
          }
        >
          <SchoolSearchSelect
            districtName={form.districtName}
            value={form.organizationName}
            disabled={!form.districtId}
            onChange={(name, school) => {
              setField("organizationName", name);
              if (school) applyCatalogAutofill(school, setForm);
            }}
          />
        </Field>

        <Field label="Established date" optional hint="Pick year, then month and day">
          <EstablishedDatePicker
            value={form.establishedDate}
            onChange={(v) => setField("establishedDate", v)}
          />
        </Field>
      </div>

      {!form.organizationName && form.districtId ? (
        <p className="rounded-xl border border-amber-500/20 bg-amber-50/80 px-3.5 py-2.5 text-xs text-navy-800">
          Search the accredited list first. If your school is not there, choose{" "}
          <strong className="font-semibold">School not listed? Add your own</strong> or type
          the name and use <strong className="font-semibold">Add as my school</strong>.
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-700/55">
            School category *
          </p>
          <div className="flex flex-wrap gap-2">
            {SCHOOL_CATEGORIES.map((c) => (
              <ChipButton
                key={c}
                active={form.schoolCategory === c}
                onClick={() => setField("schoolCategory", c)}
              >
                {c}
              </ChipButton>
            ))}
          </div>
          {!form.schoolCategory ? (
            <p className="mt-1.5 text-[11px] text-amber-700/80">Select a category to continue</p>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-700/55">
            School program *
          </p>
          <div className="flex flex-wrap gap-2">
            {SCHOOL_PROGRAMS.map((p) => (
              <ChipButton
                key={p}
                active={form.schoolProgram === p}
                onClick={() => setField("schoolProgram", p)}
              >
                {p}
              </ChipButton>
            ))}
          </div>
          {!form.schoolProgram ? (
            <p className="mt-1.5 text-[11px] text-amber-700/80">Select a program to continue</p>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-700/55">
          Education levels *
        </p>
        <div className="flex flex-wrap gap-2">
          {EDUCATION_LEVELS.map((level) => (
            <ChipButton
              key={level}
              active={form.educationLevels.includes(level)}
              onClick={() => toggleLevel(level)}
            >
              {level}
            </ChipButton>
          ))}
        </div>
      </div>

      {form.educationLevels.includes("A-Level") ? (
        <div className="rounded-2xl border border-navy-900/[0.08] bg-[#f8f9fb] p-4 sm:p-5">
          <SearchableMultiSelect
            label="A-Level combinations *"
            hint="Search and select codes (e.g. PCB, PCM) or add your own"
            placeholder="Search combinations…"
            options={A_LEVEL_COMBINATIONS}
            selected={form.aLevelCombinations}
            onChange={(v) => setField("aLevelCombinations", v)}
          />
        </div>
      ) : null}

      {form.educationLevels.includes("TVET") ? (
        <div className="rounded-2xl border border-navy-900/[0.08] bg-[#f8f9fb] p-4 sm:p-5">
          <SearchableMultiSelect
            label="TVET trades *"
            hint="Search trades or type a custom trade name"
            placeholder="Search trades…"
            options={TVET_TRADES}
            selected={form.tvetTrades}
            onChange={(v) => setField("tvetTrades", v)}
          />
        </div>
      ) : null}

      <div className="rounded-2xl border border-navy-900/[0.08] bg-[#f8f9fb] p-4 sm:p-5">
        <p className="text-sm font-semibold text-navy-900">School branding</p>
        <p className="mt-1 text-xs text-navy-700/55">
          Upload your school logo (required). Signature and stamp are optional and sync
          into school documents.
        </p>
        <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
          <BrandingUpload
            label="School Logo"
            value={form.logoUrl}
            required
            onUploaded={(url) => setField("logoUrl", url)}
          />
          <BrandingUpload
            label="Principal Signature"
            value={form.signatureUrl}
            onUploaded={(url) => setField("signatureUrl", url)}
            onCleared={() => setField("signatureUrl", "")}
          />
          <BrandingUpload
            label="School Stamp"
            value={form.stampUrl}
            onUploaded={(url) => setField("stampUrl", url)}
            onCleared={() => setField("stampUrl", "")}
          />
        </div>
      </div>

      <SchoolProfileSection
        form={form}
        logoUrl={form.logoUrl}
        onDescriptionChange={(value) => setField("description", value)}
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
  form: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  provinces: Loc[];
  districts: Loc[];
}) {
  const phoneTouched = form.phone.trim().length > 0;
  const emailTouched = form.email.trim().length > 0;
  const phoneError =
    phoneTouched && !isValidPhone(form.phone)
      ? "Use a valid Rwanda phone (e.g. 078xxxxxxx)"
      : null;
  const emailError =
    emailTouched && !isValidEmail(form.email)
      ? "Enter a valid email like name@school.rw"
      : null;
  let websiteError: string | null = null;
  if (form.website.trim()) {
    try {
      const w = form.website.trim().startsWith("http")
        ? form.website.trim()
        : `https://${form.website.trim()}`;
      new URL(w);
    } catch {
      websiteError = "Website URL looks invalid";
    }
  }

  return (
    <div className="space-y-6">
      <StepHeader
        icon={Phone}
        title="Contact information"
        subtitle="How parents and partners reach the school — this appears on your public mini-website."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Phone *"
              error={phoneError}
              hint={!phoneError ? "e.g. 078xxxxxxx" : undefined}
            >
              <InputWithStatus
                icon={Phone}
                valid={phoneTouched && !phoneError}
                error={phoneError}
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="078xxxxxxx"
                inputMode="tel"
                autoComplete="tel"
              />
            </Field>
            <Field
              label="Email *"
              error={emailError}
              hint={!emailError ? "Official school email" : undefined}
            >
              <InputWithStatus
                icon={Mail}
                valid={emailTouched && !emailError}
                error={emailError}
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="info@school.rw"
                autoComplete="email"
              />
            </Field>
          </div>

          <Field label="Website" error={websiteError} optional>
            <input
              className={websiteError ? inputErrorClass : inputClass}
              value={form.website}
              onChange={(e) => setField("website", e.target.value)}
              placeholder="https://"
              autoComplete="url"
            />
          </Field>

          <Field label="Postal address" optional>
            <input
              className={inputClass}
              value={form.postalAddress}
              onChange={(e) => setField("postalAddress", e.target.value)}
              placeholder="P.O. Box / street"
            />
          </Field>
        </div>

        <div className="space-y-4">
          <LocationSummaryCard
            parts={{
              provinceName:
                provinces.find((p) => p.id === form.provinceId)?.name || form.provinceName,
              districtName:
                districts.find((d) => d.id === form.districtId)?.name || form.districtName,
              sectorName: form.sectorName,
              cellName: form.cellName,
              villageName: form.villageName,
            }}
          />
          <LocationMapPreview
            parts={{
              provinceName:
                provinces.find((p) => p.id === form.provinceId)?.name || form.provinceName,
              districtName:
                districts.find((d) => d.id === form.districtId)?.name || form.districtName,
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
  form: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const emailTouched = form.headEmail.trim().length > 0;
  const phoneTouched = form.headPhone.trim().length > 0;
  const emailError =
    emailTouched && !isValidEmail(form.headEmail)
      ? "Enter a valid login Email"
      : null;
  const phoneError =
    phoneTouched && !isValidPhone(form.headPhone)
      ? "Use a valid phone (e.g. 078xxxxxxx)"
      : null;
  const passwordError =
    form.tempPassword.length > 0 && form.tempPassword.length < 8
      ? "Password must be at least 8 characters"
      : null;
  const confirmError =
    form.confirmPassword.length > 0 &&
    form.confirmPassword !== form.tempPassword
      ? "Passwords do not match"
      : null;
  const passwordValid = form.tempPassword.length >= 8;
  const confirmValid =
    form.confirmPassword.length > 0 &&
    form.confirmPassword === form.tempPassword &&
    !confirmError;

  return (
    <div className="space-y-5">
      <StepHeader
        icon={UserRound}
        title="Leadership & access"
        subtitle="The Head Teacher / Principal is the organization admin and signs in with this email."
      />

      <div className="flex items-start gap-2.5 rounded-2xl border border-[#000435]/10 bg-[#000435]/[0.03] px-4 py-3 text-sm text-navy-800">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-navy-700/50" />
        No separate admin account  leadership credentials below become the
        school organization login.
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Head Teacher / Principal *">
          <input
            className={inputClass}
            value={form.organizationHead}
            onChange={(e) => setField("organizationHead", e.target.value)}
            placeholder="Full name"
            autoComplete="name"
          />
        </Field>
        <Field label="Phone" error={phoneError} optional>
          <InputWithStatus
            icon={Phone}
            valid={phoneTouched && !phoneError}
            error={phoneError}
            value={form.headPhone}
            onChange={(e) => setField("headPhone", e.target.value)}
            placeholder="078xxxxxxx"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>
      </div>

      <Field
        label="Login Email *"
        hint={!emailError ? "Used to sign in to Shule+" : undefined}
        error={emailError}
      >
        <InputWithStatus
          icon={Mail}
          valid={emailTouched && !emailError}
          error={emailError}
          type="email"
          value={form.headEmail}
          onChange={(e) => setField("headEmail", e.target.value)}
          placeholder="head@school.rw"
          autoComplete="email"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Password *"
          hint={!passwordError ? "At least 8 characters" : undefined}
          error={passwordError}
        >
          <InputWithStatus
            icon={Lock}
            valid={passwordValid}
            error={passwordError}
            type="password"
            value={form.tempPassword}
            onChange={(e) => setField("tempPassword", e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>
        <Field label="Confirm password *" error={confirmError}>
          <InputWithStatus
            icon={Lock}
            valid={confirmValid}
            error={confirmError}
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setField("confirmPassword", e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>
      </div>
    </div>
  );
}

function StepReview({
  form,
  modules,
  districts,
  provinces,
}: {
  form: FormState;
  modules: SelectedModule[];
  districts: Loc[];
  provinces: Loc[];
}) {
  const provinceName =
    (provinces.find((p) => p.id === form.provinceId)?.name ??
      form.provinceName) ||
    "—";
  const districtName =
    (districts.find((d) => d.id === form.districtId)?.name ??
      form.districtName) ||
    "—";

  const sections: { title: string; rows: [string, string][] }[] = [
    {
      title: "School",
      rows: [
        ["Name", form.organizationName || "—"],
        ["Established", form.establishedDate || "—"],
        ["Category", form.schoolCategory || "—"],
        ["Program", form.schoolProgram || "—"],
        ["Levels", form.educationLevels.join(", ") || "—"],
        ["Description", form.description.trim() ? `${countWords(form.description)} words` : "—"],
        ...(form.aLevelCombinations.length
          ? [["A-Level", form.aLevelCombinations.join(", ")] as [string, string]]
          : []),
        ...(form.tvetTrades.length
          ? [["TVET trades", form.tvetTrades.join(", ")] as [string, string]]
          : []),
      ],
    },
    {
      title: "Location",
      rows: [
        ["Province", provinceName],
        ["District", districtName],
        ["Sector", form.sectorName || "—"],
        ["Cell", form.cellName || "—"],
        ["Village", form.villageName || "—"],
      ],
    },
    {
      title: "Contact",
      rows: [
        ["Phone", form.phone || "—"],
        ["Email", form.email || "—"],
        ...(form.website
          ? [["Website", form.website] as [string, string]]
          : []),
        ...(form.postalAddress
          ? [["Postal address", form.postalAddress] as [string, string]]
          : []),
      ],
    },
    {
      title: "Leadership",
      rows: [
        ["Head Teacher", form.organizationHead || "—"],
        ["Login email", form.headEmail || "—"],
        ...(form.headPhone
          ? [["Phone", form.headPhone] as [string, string]]
          : []),
      ],
    },
  ];

  const branding: [string, string][] = [
    ...(form.logoUrl ? [["Logo", "Uploaded"] as [string, string]] : []),
    ...(form.signatureUrl
      ? [["Signature", "Uploaded"] as [string, string]]
      : []),
    ...(form.stampUrl ? [["Stamp", "Uploaded"] as [string, string]] : []),
  ];

  return (
    <div className="space-y-5">
      <StepHeader
        icon={ClipboardCheck}
        title="Review & submit"
        subtitle="Confirm details. Your school becomes active; modules unlock after activation."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <ReviewSection
            key={section.title}
            title={section.title}
            rows={section.rows}
          />
        ))}
      </div>

      {branding.length > 0 ? (
        <ReviewSection title="Branding" rows={branding} />
      ) : null}

      <div className="rounded-2xl border border-navy-900/[0.06] bg-[#f8f9fb] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/55">
            Selected modules
          </p>
          <span className="rounded-full bg-navy-900/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-navy-700/60">
            {modules.length} total
          </span>
        </div>
        {modules.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {modules.map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center rounded-full border border-navy-900/[0.08] bg-white px-3 py-1.5 text-xs font-semibold text-navy-800"
              >
                {m.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-navy-700/55">No modules selected.</p>
        )}
      </div>
    </div>
  );
}

function ReviewSection({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-navy-900/[0.06] bg-[#f8f9fb]">
      <div className="border-b border-navy-900/[0.06] bg-white px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-700/55">
          {title}
        </p>
      </div>
      <dl className="divide-y divide-navy-900/[0.06] px-4">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="grid gap-1 py-3 sm:grid-cols-[minmax(0,38%)_minmax(0,1fr)] sm:gap-4"
          >
            <dt className="text-sm text-navy-700/55">{label}</dt>
            <dd className="text-sm font-semibold text-navy-900 sm:text-right">
              {value}
            </dd>
          </div>
        ))}
      </dl>
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
    <div className="flex items-start gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
        <p className="mt-0.5 text-sm text-navy-700/60">{subtitle}</p>
      </div>
    </div>
  );
}

function LivePreviewPanel({
  form,
  modules,
  step,
  provinceName,
  districtName,
}: {
  form: FormState;
  modules: SelectedModule[];
  step: number;
  provinceName: string;
  districtName: string;
}) {
  const focusByStep: Record<number, "location" | "school" | "contact" | "leadership" | "review"> = {
    1: "location",
    2: "school",
    3: "contact",
    4: "leadership",
    5: "review",
  };
  const focus = focusByStep[step];

  return (
    <aside className="hidden w-[300px] shrink-0 lg:block">
      <div className="sticky top-8 overflow-hidden rounded-2xl border border-navy-900/[0.08] bg-white shadow-[0_1px_2px_rgba(0,4,53,0.04)]">
        <div
          className="relative flex flex-col items-center gap-3 border-b border-navy-900/[0.06] px-6 py-7"
          style={{ backgroundColor: "#000435" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 10%, rgba(245,158,11,0.25) 0%, transparent 45%)",
            }}
          />
          <div className="relative z-10 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15 transition-all">
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
              {form.organizationName || "Your school"}
            </p>
            <p className="mt-0.5 text-[11px] text-white/45">Code assigned on submit</p>
          </div>
        </div>

        <div className="divide-y divide-navy-900/[0.06]">
          <PreviewRow
            active={focus === "location"}
            label="Location"
            value={[provinceName, districtName].filter(Boolean).join(" · ") || "Not set"}
          />
          <PreviewRow
            active={focus === "school"}
            label="Levels"
            value={form.educationLevels.join(", ") || "Not set"}
          />
          <PreviewRow
            active={focus === "contact"}
            label="Contact"
            value={form.phone || form.email || "Not set"}
          />
          <PreviewRow
            active={focus === "leadership"}
            label="Head Teacher"
            value={form.organizationHead || "Not set"}
          />
          <PreviewRow
            active={focus === "review"}
            label="Modules"
            value={`${modules.length} selected`}
          />
        </div>
      </div>
    </aside>
  );
}

function PreviewRow({
  active,
  label,
  value,
}: {
  active: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-5 py-3.5 transition-colors ${
        active ? "bg-amber-500/[0.08]" : ""
      }`}
    >
      <span
        className={`text-xs font-semibold uppercase tracking-wide ${
          active ? "text-amber-700" : "text-navy-700/40"
        }`}
      >
        {label}
      </span>
      <span
        className={`max-w-[150px] truncate text-right text-xs font-medium ${
          active ? "text-navy-900" : "text-navy-700/55"
        }`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}