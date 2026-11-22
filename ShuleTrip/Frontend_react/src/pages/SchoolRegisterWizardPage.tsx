import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { WelcomeHeader } from '@/components/welcome/welcome-header';
import { RegisterStepper, REGISTER_STEPS } from '@/components/register/register-stepper';
import { submitSchoolRegistrationApi } from '@/services/portal-public-api';
import { FileUploadZone } from '@/components/ui/file-upload';
import { cn } from '@/shared/cn';
import {
  DRAFT_KEY,
  EMPTY_FORM,
  type RegistrationSubmission,
  type SchoolRegisterForm,
} from '@/school-register/types';
const LEVEL_OPTIONS = ['Nursery', 'Primary', 'Ordinary Level', 'Advanced Level', 'TVET', 'Combined School'];
const OWNERSHIP = ['Government', 'Government-aided', 'Private'];
const SCHOOL_TYPES = ['Day School', 'Boarding School', 'Day and Boarding'];

const HEAD_FIELDS = [
  { key: 'headName' as const, label: 'Full name', required: true },
  { key: 'headPosition' as const, label: 'Position', required: false },
  { key: 'headNationalId' as const, label: 'National ID', required: true },
  { key: 'headPhone' as const, label: 'Phone', required: true, type: 'tel' as const },
  { key: 'headEmail' as const, label: 'Email', required: false, type: 'email' as const },
];

const COORDINATOR_FIELDS = [
  { key: 'coordinatorName' as const, label: 'Full name', required: true },
  { key: 'coordinatorPosition' as const, label: 'Position', required: false },
  { key: 'coordinatorPhone' as const, label: 'Phone', required: false, type: 'tel' as const },
  { key: 'coordinatorEmail' as const, label: 'Email', required: true, type: 'email' as const },
];

function passwordScore(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
  );
}

function inputClass() {
  return 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-navy/40 focus:ring-2 focus:ring-navy/10';
}

export default function SchoolRegisterWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SchoolRegisterForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SchoolRegisterForm;
        setForm({
          ...EMPTY_FORM,
          ...parsed,
          step2: { ...EMPTY_FORM.step2, ...parsed.step2 },
          step5: { ...EMPTY_FORM.step5, ...parsed.step5 },
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const patch = useCallback(<K extends keyof SchoolRegisterForm>(key: K, value: SchoolRegisterForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const pwMeta = useMemo(() => passwordScore(form.step5.password), [form.step5.password]);

  function validateStep(): string | null {
    const s1 = form.step1;
    if (step === 0) {
      if (!s1.officialName.trim()) return 'Enter the official school name.';
      if (!s1.schoolCode.trim()) return 'Enter the school code.';
      if (!s1.rebNumber.trim()) return 'Enter the registration number.';
      if (!s1.levels.length) return 'Select at least one school level.';
      if (!s1.ownership) return 'Select school ownership.';
      if (!s1.schoolType) return 'Select school type.';
      if (!s1.email.trim()) return 'Enter the school email.';
      if (!s1.phone.trim()) return 'Enter the school phone number.';
    }
    if (step === 1) {
      if (!form.step2.country.trim()) return 'Enter the country.';
      if (!form.step2.provinceName.trim()) return 'Enter the province.';
      if (!form.step2.districtName.trim()) return 'Enter the district.';
      if (!form.step2.physicalAddress.trim()) return 'Enter the physical address.';
    }
    if (step === 2) {
      if (!form.step3.headName.trim() || !form.step3.headNationalId.trim() || !form.step3.headPhone.trim()) {
        return 'Complete head teacher details, including National ID.';
      }
      if (!form.step3.coordinatorName.trim() || !form.step3.coordinatorEmail.trim())
        return 'Complete ShuleTrip coordinator details.';
    }
    if (step === 3) {
      if (!form.step4.regCertificate) return 'Upload the school registration certificate.';
      if (!form.step4.schoolIdDoc) return 'Upload official school identification.';
      if (!form.step4.authLetter) return 'Upload the authorization letter.';
    }
    if (step === 4) {
      const s5 = form.step5;
      if (!s5.accountEmail.trim() || !s5.username.trim()) return 'Enter account email and username.';
      if (s5.password.length < 8) return 'Password must be at least 8 characters.';
      if (s5.password !== s5.confirmPassword) return 'Passwords do not match.';
      if (!s5.acceptTerms || !s5.acceptPrivacy) return 'Accept the terms and privacy policy.';
    }
    return null;
  }

  function next() {
    const msg = validateStep();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, REGISTER_STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submitRegistration() {
    const msg = validateStep();
    if (msg) {
      setError(msg);
      return;
    }
    setSubmitting(true);
    setError(null);

    const reference = `ST-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    try {
      const result = await submitSchoolRegistrationApi({ reference, form });
      const submission: RegistrationSubmission = {
        reference: result.reference,
        schoolName: form.step1.officialName,
        submittedAt: new Date().toISOString(),
        status: 'Submitted',
        form,
        confirmationEmailSent: result.confirmationEmailSent,
      };
      localStorage.removeItem(DRAFT_KEY);
      navigate('/register/confirmation', { state: { submission } });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Registration failed. Try again or contact support.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const stepNum = step + 1;

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <WelcomeHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:max-w-4xl">
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">School onboarding</p>
          <h1 className="mt-1 text-2xl font-semibold text-navy sm:text-3xl">Register your school</h1>
          <p className="mt-2 text-sm text-navy/55">
            Step {stepNum} of {REGISTER_STEPS.length} · {REGISTER_STEPS[step]?.label}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-navy/[0.08] bg-white shadow-sm">
          <div className="border-b border-navy/[0.06] px-5 py-5 sm:px-7">
            <RegisterStepper step={stepNum} />
          </div>
          <div className="p-5 sm:p-7 lg:p-8">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-navy">Tell us about your institution</h2>
              <div>
                <FieldLabel required>Official school name</FieldLabel>
                <input className={inputClass()} value={form.step1.officialName} onChange={(e) => patch('step1', { ...form.step1, officialName: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel required>School code</FieldLabel>
                  <input className={inputClass()} value={form.step1.schoolCode} onChange={(e) => patch('step1', { ...form.step1, schoolCode: e.target.value })} />
                </div>
                <div>
                  <FieldLabel required>Registration number</FieldLabel>
                  <input
                    className={inputClass()}
                    value={form.step1.rebNumber}
                    onChange={(e) => patch('step1', { ...form.step1, rebNumber: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <FieldLabel required>School level</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {LEVEL_OPTIONS.map((lvl) => {
                    const on = form.step1.levels.includes(lvl);
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() =>
                          patch('step1', {
                            ...form.step1,
                            levels: on ? form.step1.levels.filter((x) => x !== lvl) : [...form.step1.levels, lvl],
                          })
                        }
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-bold transition',
                          on ? 'bg-navy text-white' : 'bg-surface text-slate-600 ring-1 ring-line'
                        )}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel required>School ownership</FieldLabel>
                  <select className={inputClass()} value={form.step1.ownership} onChange={(e) => patch('step1', { ...form.step1, ownership: e.target.value })}>
                    <option value="">Select…</option>
                    {OWNERSHIP.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel required>School type</FieldLabel>
                  <select className={inputClass()} value={form.step1.schoolType} onChange={(e) => patch('step1', { ...form.step1, schoolType: e.target.value })}>
                    <option value="">Select…</option>
                    {SCHOOL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel required>School email</FieldLabel>
                  <input type="email" className={inputClass()} value={form.step1.email} onChange={(e) => patch('step1', { ...form.step1, email: e.target.value })} />
                </div>
                <div>
                  <FieldLabel required>School phone</FieldLabel>
                  <input type="tel" className={inputClass()} value={form.step1.phone} onChange={(e) => patch('step1', { ...form.step1, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <FieldLabel>School website</FieldLabel>
                <input type="url" className={inputClass()} placeholder="https://" value={form.step1.website} onChange={(e) => patch('step1', { ...form.step1, website: e.target.value })} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-navy">Official physical location</h2>
              <div>
                <FieldLabel required>Country</FieldLabel>
                <input
                  className={inputClass()}
                  placeholder="e.g. Rwanda"
                  value={form.step2.country}
                  onChange={(e) => patch('step2', { ...form.step2, country: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Province</FieldLabel>
                  <input
                    className={inputClass()}
                    placeholder="e.g. Kigali City"
                    value={form.step2.provinceName}
                    onChange={(e) => patch('step2', { ...form.step2, provinceName: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel required>District</FieldLabel>
                  <input
                    className={inputClass()}
                    placeholder="e.g. Gasabo"
                    value={form.step2.districtName}
                    onChange={(e) => patch('step2', { ...form.step2, districtName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Sector</FieldLabel>
                  <input
                    className={inputClass()}
                    placeholder="e.g. Remera"
                    value={form.step2.sectorName}
                    onChange={(e) => patch('step2', { ...form.step2, sectorName: e.target.value, sectorId: '' })}
                  />
                </div>
                <div>
                  <FieldLabel>Cell (optional)</FieldLabel>
                  <input
                    className={inputClass()}
                    placeholder="Optional"
                    value={form.step2.cellName}
                    onChange={(e) => patch('step2', { ...form.step2, cellName: e.target.value, cellId: '' })}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Village</FieldLabel>
                <input className={inputClass()} value={form.step2.village} onChange={(e) => patch('step2', { ...form.step2, village: e.target.value })} />
              </div>
              <div>
                <FieldLabel required>Physical address</FieldLabel>
                <textarea className={cn(inputClass(), 'min-h-[100px]')} value={form.step2.physicalAddress} onChange={(e) => patch('step2', { ...form.step2, physicalAddress: e.target.value })} />
              </div>
              <div>
                <FieldLabel>GPS coordinates (optional)</FieldLabel>
                <input className={inputClass()} placeholder="-1.9536, 30.0606" value={form.step2.gps} onChange={(e) => patch('step2', { ...form.step2, gps: e.target.value })} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-navy">School administration</h2>
              <fieldset className="space-y-3 rounded-2xl border border-line p-4">
                <legend className="px-1 text-sm font-bold text-navy">Head teacher / school director</legend>
                {HEAD_FIELDS.map(({ key, label, required, type }) => (
                  <div key={key}>
                    <FieldLabel required={required}>{label}</FieldLabel>
                    <input
                      className={inputClass()}
                      type={type ?? 'text'}
                      value={form.step3[key]}
                      onChange={(e) => patch('step3', { ...form.step3, [key]: e.target.value })}
                      required={required}
                    />
                  </div>
                ))}
              </fieldset>
              <fieldset className="space-y-3 rounded-2xl border border-line p-4">
                <legend className="px-1 text-sm font-bold text-navy">ShuleTrip coordinator</legend>
                <p className="text-xs text-slate-500">Main contact for trip applications and government communication.</p>
                {COORDINATOR_FIELDS.map(({ key, label, required, type }) => (
                  <div key={key}>
                    <FieldLabel required={required}>{label}</FieldLabel>
                    <input
                      className={inputClass()}
                      type={type ?? 'text'}
                      value={form.step3[key]}
                      onChange={(e) => patch('step3', { ...form.step3, [key]: e.target.value })}
                      required={required}
                    />
                  </div>
                ))}
              </fieldset>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-navy">Verification documents</h2>
              <p className="text-sm text-slate-500">PDF, JPG or PNG · max 5 MB each. Optional items stay optional.</p>
              <FileUploadZone
                label="School registration certificate"
                required
                hint="PDF preferred"
                value={form.step4.regCertificate}
                onChange={(meta) => patch('step4', { ...form.step4, regCertificate: meta })}
              />
              <FileUploadZone
                label="Official school identification"
                required
                value={form.step4.schoolIdDoc}
                onChange={(meta) => patch('step4', { ...form.step4, schoolIdDoc: meta })}
              />
              <FileUploadZone
                label="Authorization letter from school head"
                required
                value={form.step4.authLetter}
                onChange={(meta) => patch('step4', { ...form.step4, authLetter: meta })}
              />
              <FileUploadZone
                label="Head teacher identification"
                hint="Optional unless required by your authority"
                value={form.step4.headIdDoc}
                onChange={(meta) => patch('step4', { ...form.step4, headIdDoc: meta })}
              />
              <FileUploadZone
                label="School official stamp / signature"
                value={form.step4.stampSignature}
                onChange={(meta) => patch('step4', { ...form.step4, stampSignature: meta })}
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-navy">Create your secure account</h2>
              <p className="text-sm text-slate-600">
                After you submit, we will email your account email with a confirmation, your reference number, and your
                login username and password.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Account email</FieldLabel>
                  <input type="email" className={inputClass()} value={form.step5.accountEmail} onChange={(e) => patch('step5', { ...form.step5, accountEmail: e.target.value })} />
                </div>
                <div>
                  <FieldLabel required>Username</FieldLabel>
                  <input className={inputClass()} value={form.step5.username} onChange={(e) => patch('step5', { ...form.step5, username: e.target.value })} />
                </div>
              </div>
              <div>
                <FieldLabel required>Password</FieldLabel>
                <input type="password" className={inputClass()} value={form.step5.password} onChange={(e) => patch('step5', { ...form.step5, password: e.target.value })} />
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full transition-all', pwMeta.color)} style={{ width: `${Math.min(100, pwMeta.score * 20)}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-600">{pwMeta.label}</span>
                </div>
              </div>
              <div>
                <FieldLabel required>Confirm password</FieldLabel>
                <input type="password" className={inputClass()} value={form.step5.confirmPassword} onChange={(e) => patch('step5', { ...form.step5, confirmPassword: e.target.value })} />
              </div>
              <label className="flex gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.step5.acceptTerms} onChange={(e) => patch('step5', { ...form.step5, acceptTerms: e.target.checked })} />
                I accept the Terms and Conditions
              </label>
              <label className="flex gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.step5.acceptPrivacy} onChange={(e) => patch('step5', { ...form.step5, acceptPrivacy: e.target.checked })} />
                I accept the Privacy Policy
              </label>

              <button
                type="button"
                onClick={() => setShowReview((v) => !v)}
                className="mt-4 text-sm font-bold text-navy underline-offset-2 hover:underline"
              >
                {showReview ? 'Hide' : 'Review & submit registration'}
              </button>

              {showReview ? (
                <div className="mt-4 rounded-2xl bg-surface p-4 text-sm text-slate-700">
                  <p><b>School:</b> {form.step1.officialName} ({form.step1.schoolCode})</p>
                  <p>
                    <b>Location:</b> {form.step2.districtName}, {form.step2.provinceName}, {form.step2.country}
                    {form.step2.sectorName ? ` · ${form.step2.sectorName}` : ''}
                    {form.step2.cellName ? ` · ${form.step2.cellName}` : ''}
                  </p>
                  <p><b>Coordinator:</b> {form.step3.coordinatorName} · {form.step3.coordinatorEmail}</p>
                  <p><b>Documents:</b> {[form.step4.regCertificate, form.step4.schoolIdDoc, form.step4.authLetter].filter(Boolean).length} required files attached</p>
                </div>
              ) : null}
            </div>
          )}

          {error ? (
            <p className="mt-5 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col-reverse gap-3 border-t border-navy/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
            {step > 0 ? (
              <button
                type="button"
                onClick={back}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-navy/[0.12] bg-white px-5 py-3 text-sm font-semibold text-navy transition hover:bg-[#f8f9fb] disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-navy/[0.12] bg-white px-5 py-3 text-sm font-semibold text-navy transition hover:bg-[#f8f9fb]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to home
              </Link>
            )}
            {step < REGISTER_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-navy-muted sm:min-w-[190px]"
              >
                Continue
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={submitRegistration}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-60 sm:min-w-[220px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Complete registration'
                )}
              </button>
            )}
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
