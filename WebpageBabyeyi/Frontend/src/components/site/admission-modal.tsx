'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { School } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  FlowModalBody,
  FlowModalFooter,
  FlowModalHeader,
  FlowModalPortal,
  FlowModalStepper,
  flowErrorBoxClass,
  flowInfoBoxClass,
  flowInputClass,
  flowLabelClass,
  flowSelectClass,
  flowSuccessBoxClass,
  flowCardClass,
  flowSectionTitleClass,
  flowSectionSubClass,
  FlowCheckIcon,
} from './flow-modal-shell';
import {
  ALLOWED_DOC_TYPES,
  CLASSES_BY_LEVEL,
  ADMISSION_STATUS_FLOW,
  MAX_DOC_BYTES,
  fetchAdmissionConfig,
  formatRwf,
  saveAdmissionDraft,
  submitAdmissionApplication,
  normalizeEducationLevels,
  levelUsesClassPicker,
  levelUsesCombinationPicker,
  levelUsesTvetPicker,
  type AdmissionConfig,
  type AdmissionDocumentDef,
  type AdmissionDocumentUpload,
  type AdmissionApplication,
} from '@/lib/admissions-api';
import {
  FlowLanguageStep,
  type FlowLang,
} from './flow-language';
import {
  pickAdmissionText,
  levelLabel,
  statusLabelKey,
} from './admission-i18n';
import {
  fetchDistricts,
  fetchProvinces,
  fetchSectors,
  fetchCells,
  fetchVillages,
  type LocationOption,
} from '@/lib/locations';

interface AdmissionModalProps {
  school: School;
  open: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

function LevelPill({
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
      className={cn(
        'rounded-full px-3.5 py-2 text-[12px] font-medium transition-all',
        active
          ? 'bg-teal-600 text-white shadow-md'
          : 'border border-ink-200 bg-white text-ink-600 hover:border-teal-300',
      )}
    >
      {children}
    </button>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
    </svg>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function docsForLevel(
  config: AdmissionConfig | null,
  level: string,
  admissionType: string,
): AdmissionDocumentDef[] {
  if (!config) return [];
  return config.requiredDocuments.filter((d) => {
    if (d.transferOnly && admissionType !== 'Transfer Student') return false;
    if (d.levels?.length && !d.levels.includes(level)) return false;
    return true;
  });
}

export function AdmissionModal({ school, open, onClose }: AdmissionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<FlowLang | null>(null);
  const t = pickAdmissionText(lang);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AdmissionConfig | null>(null);
  const [draftToken, setDraftToken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<AdmissionApplication | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  // Step 1
  const [admissionLevel, setAdmissionLevel] = useState('');
  const [classApplying, setClassApplying] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [termOfEntry, setTermOfEntry] = useState('');
  const [boardingPreference, setBoardingPreference] = useState('Day');
  const [studentGender, setStudentGender] = useState('');
  const [previousSchoolSel, setPreviousSchoolSel] = useState('');
  const [preferredCombination, setPreferredCombination] = useState('');
  const [admissionType, setAdmissionType] = useState('New Student');

  // Step 2
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('Rwandan');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [studentPhoto, setStudentPhoto] = useState<AdmissionDocumentUpload | null>(null);
  const [nationalId, setNationalId] = useState('');
  const [prevSchoolDetail, setPrevSchoolDetail] = useState('');
  const [currentClass, setCurrentClass] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [lastReport, setLastReport] = useState<AdmissionDocumentUpload | null>(null);

  // Step 3
  const [guardianName, setGuardianName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [sectors, setSectors] = useState<LocationOption[]>([]);
  const [cells, setCells] = useState<LocationOption[]>([]);
  const [villages, setVillages] = useState<LocationOption[]>([]);
  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [cellId, setCellId] = useState('');
  const [villageId, setVillageId] = useState('');

  // Step 4
  const [documents, setDocuments] = useState<Record<string, AdmissionDocumentUpload>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Step 5
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setLang(null);
    setError(null);
    setSubmitted(null);
    setConfigLoading(true);
    void fetchAdmissionConfig(school.id)
      .then((c) => {
        setConfig(c);
        const levels = normalizeEducationLevels(
          c.educationLevels.length ? c.educationLevels : school.educationLevels,
        );
        const firstLevel = levels[0] ?? '';
        setAdmissionLevel(firstLevel);
        setAcademicYear(c.currentAcademicYear ?? c.academicYears[0] ?? '');
        setTermOfEntry(c.currentTerm ?? c.terms[0] ?? '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : t.errLoad))
      .finally(() => setConfigLoading(false));
    void fetchProvinces().then(setProvinces).catch(() => {});
  }, [open, school.id, school.educationLevels]);

  const schoolLevels = useMemo(() => {
    const fromConfig = normalizeEducationLevels(config?.educationLevels ?? []);
    if (fromConfig.length) return fromConfig;
    return normalizeEducationLevels(school.educationLevels ?? []);
  }, [config?.educationLevels, school.educationLevels]);

  const aLevelOptions = useMemo(() => {
    const fromConfig = config?.aLevelCombinations ?? [];
    if (fromConfig.length) return fromConfig;
    return school.aLevelCombinations ?? [];
  }, [config?.aLevelCombinations, school.aLevelCombinations]);

  const tvetOptions = useMemo(() => {
    const fromConfig = config?.tvetTrades ?? [];
    if (fromConfig.length) return fromConfig;
    return school.tvetTrades ?? [];
  }, [config?.tvetTrades, school.tvetTrades]);

  const levelClasses = useMemo(
    () => (levelUsesClassPicker(admissionLevel) ? CLASSES_BY_LEVEL[admissionLevel] ?? [] : []),
    [admissionLevel],
  );

  useEffect(() => {
    if (levelUsesClassPicker(admissionLevel)) {
      if (levelClasses.length && !levelClasses.includes(classApplying)) {
        setClassApplying(levelClasses[0] ?? '');
      }
      setPreferredCombination('');
    } else if (levelUsesCombinationPicker(admissionLevel)) {
      setClassApplying('');
      if (aLevelOptions.length && !aLevelOptions.includes(preferredCombination)) {
        setPreferredCombination(aLevelOptions[0] ?? '');
      }
    } else if (levelUsesTvetPicker(admissionLevel)) {
      setPreferredCombination('');
      if (tvetOptions.length && !tvetOptions.includes(classApplying)) {
        setClassApplying(tvetOptions[0] ?? '');
      }
    }
  }, [admissionLevel, levelClasses, aLevelOptions, tvetOptions, classApplying, preferredCombination]);

  const applyingSummary = useMemo(() => {
    if (levelUsesCombinationPicker(admissionLevel)) return preferredCombination || '—';
    if (levelUsesTvetPicker(admissionLevel)) return classApplying || '—';
    return classApplying || '—';
  }, [admissionLevel, classApplying, preferredCombination]);

  useEffect(() => {
    if (!provinceId) { setDistricts([]); return; }
    void fetchDistricts(provinceId).then(setDistricts).catch(() => {});
  }, [provinceId]);

  useEffect(() => {
    if (!districtId) { setSectors([]); return; }
    void fetchSectors(districtId).then(setSectors).catch(() => {});
  }, [districtId]);

  useEffect(() => {
    if (!sectorId) { setCells([]); return; }
    void fetchCells(sectorId).then(setCells).catch(() => {});
  }, [sectorId]);

  useEffect(() => {
    if (!cellId) { setVillages([]); return; }
    void fetchVillages(cellId).then(setVillages).catch(() => {});
  }, [cellId]);

  const requiredDocs = useMemo(
    () => docsForLevel(config, admissionLevel, admissionType),
    [config, admissionLevel, admissionType],
  );

  const availablePlaces = config?.availablePlaces[admissionLevel];
  const deadlinePassed =
    config?.applicationDeadline &&
    new Date(config.applicationDeadline) < new Date();

  const payload = useCallback(
    () => ({
      organizationId: school.id,
      draftToken: draftToken ?? undefined,
      admissionLevel,
      classApplying: levelUsesCombinationPicker(admissionLevel) ? preferredCombination : classApplying,
      academicYear,
      termOfEntry,
      boardingPreference,
      studentGender: studentGender || firstName ? studentGender : '',
      previousSchool: previousSchoolSel || prevSchoolDetail || undefined,
      preferredCombination: levelUsesCombinationPicker(admissionLevel) ? preferredCombination : undefined,
      admissionType,
      studentDetails: {
        firstName,
        lastName,
        gender: studentGender,
        dateOfBirth,
        nationality,
        placeOfBirth: placeOfBirth || undefined,
        nationalId: nationalId || undefined,
        studentPhoto,
        previousSchool: prevSchoolDetail || previousSchoolSel || undefined,
        currentClass: currentClass || undefined,
        transferReason: admissionType === 'Transfer Student' ? transferReason : undefined,
        lastReport,
      },
      parentDetails: {
        fullName: guardianName,
        relationship,
        phone,
        whatsapp,
        email: email || undefined,
        address: {
          provinceId,
          districtId,
          sectorId,
          cellId,
          villageId,
          province: provinces.find((p) => p.id === provinceId)?.name,
          district: districts.find((d) => d.id === districtId)?.name,
          sector: sectors.find((s) => s.id === sectorId)?.name,
          cell: cells.find((c) => c.id === cellId)?.name,
          village: villages.find((v) => v.id === villageId)?.name,
        },
      },
      documents: Object.values(documents),
    }),
    [
      school.id, draftToken, admissionLevel, classApplying, academicYear, termOfEntry,
      boardingPreference, studentGender, previousSchoolSel, prevSchoolDetail, preferredCombination,
      admissionType, firstName, lastName, dateOfBirth, nationality, placeOfBirth, nationalId,
      studentPhoto, currentClass, transferReason, lastReport, guardianName, relationship,
      phone, whatsapp, email, provinceId, districtId, sectorId, cellId, villageId,
      provinces, districts, sectors, cells, villages, documents,
    ],
  );

  async function handleSaveDraft() {
    setSavingDraft(true);
    setError(null);
    try {
      const result = await saveAdmissionDraft({
        organizationId: school.id,
        draftToken: draftToken ?? undefined,
        payload: payload(),
      });
      setDraftToken(result.draftToken);
      localStorage.setItem(`admission-draft-${school.id}`, result.draftToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errSaveDraft);
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleDocUpload(docId: string, file: File) {
    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      setError(t.errFileType);
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      setError(t.errFileSize);
      return;
    }
    setUploadProgress((p) => ({ ...p, [docId]: 30 }));
    const contentBase64 = await fileToBase64(file);
    setUploadProgress((p) => ({ ...p, [docId]: 100 }));
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setDocuments((d) => ({
      ...d,
      [docId]: {
        id: docId,
        fileName: file.name,
        contentBase64,
        mimeType: file.type,
        previewUrl,
      },
    }));
    setTimeout(() => setUploadProgress((p) => ({ ...p, [docId]: 0 })), 800);
  }

  function validateStep(s: Step): string | null {
    if (s === 1) {
      if (!lang) return t.langTitle;
    }
    if (s === 2) {
      if (!admissionLevel) return t.errSelectLevel;
      if (levelUsesClassPicker(admissionLevel) && !classApplying) return t.errSelectClass;
      if (levelUsesCombinationPicker(admissionLevel) && !preferredCombination) return t.errSelectCombination;
      if (levelUsesTvetPicker(admissionLevel) && !classApplying) return t.errSelectTrade;
      if (!academicYear) return t.academicYearUnset;
      if (!termOfEntry) return t.termOfEntry;
      if (!studentGender) return t.errSelectGender;
      if (deadlinePassed) return t.errDeadlinePassed;
    }
    if (s === 3) {
      if (!firstName.trim()) return t.errFirstName;
      if (!lastName.trim()) return t.errLastName;
      if (!dateOfBirth) return t.errDob;
      if (admissionType === 'Transfer Student' && !transferReason.trim()) {
        return t.errTransferReason;
      }
    }
    if (s === 4) {
      if (!guardianName.trim()) return t.errGuardian;
      if (!relationship) return t.errRelationship;
      if (!phone.trim()) return t.errPhone;
      if (!districtId || !sectorId) return t.errAddress;
    }
    if (s === 5) {
      const missing = requiredDocs.filter((d) => d.required && !documents[d.id]);
      if (missing.length) return t.errDocs(missing.map((d) => d.name).join(', '));
    }
    if (s === 6) {
      if (!confirmAccurate) return t.errConfirm;
      if (!acceptTerms) return t.errTerms;
    }
    return null;
  }

  async function handleNext() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    if (step === 6) {
      setLoading(true);
      try {
        const result = await submitAdmissionApplication({
          ...payload(),
          confirmAccurate: true,
          acceptTerms: true,
        });
        setSubmitted(result);
        setStep(7);
        localStorage.removeItem(`admission-draft-${school.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : t.errSubmit);
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep((s) => Math.min(6, s + 1) as Step);
  }

  function handleBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1) as Step);
  }

  if (!open) return null;

  const formSteps = 6;

  return (
    <FlowModalPortal open={open} mounted={mounted} onClose={onClose} ariaLabel="School admission" zIndex={130}>
      <FlowModalHeader
        badge={t.modalBadge}
        title={step === 7 ? t.stepTitles[6]! : t.stepTitles[step - 1] ?? t.modalBadge}
        schoolName={school.name}
        subtitle={step <= formSteps && lang ? `${step}/${formSteps}` : undefined}
        onClose={onClose}
        closeDisabled={loading}
        stepper={
          step <= formSteps && lang ? (
            <FlowModalStepper steps={t.stepLabels} currentStep={step} />
          ) : null
        }
      />

      <FlowModalBody>
        {configLoading ? (
          <div className="flex flex-col items-center gap-3 py-12 text-ink-500">
            <Spinner className="h-8 w-8 text-sky-600" />
            <p className="text-sm font-medium">{t.loading}</p>
          </div>
        ) : error && step !== 7 ? (
          <div className={cn(flowErrorBoxClass, 'mb-4')}>{error}</div>
        ) : null}

        {!configLoading && step === 1 ? (
          <FlowLanguageStep
            lang={lang}
            onSelect={setLang}
            title={t.langTitle}
            subtitle={t.langSub}
          />
        ) : null}

        {!configLoading && step === 2 && config && lang ? (
          <div className="space-y-4">
            {config.welcomeMessage ? (
              <div className={flowInfoBoxClass}>{config.welcomeMessage}</div>
            ) : null}

            {(availablePlaces != null || config.estimatedFee != null || config.applicationDeadline) && (
              <div className="grid gap-2 sm:grid-cols-3">
                {availablePlaces != null ? (
                  <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-teal-700">{t.availablePlaces}</p>
                    <p className="text-lg font-medium text-teal-900">{availablePlaces}</p>
                  </div>
                ) : null}
                {config.estimatedFee != null ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-center">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-amber-700">{t.estFee}</p>
                    <p className="text-sm font-medium text-amber-900">{formatRwf(config.estimatedFee)}</p>
                  </div>
                ) : null}
                {config.applicationDeadline ? (
                  <div className={cn(
                    'rounded-xl border px-3 py-2.5 text-center',
                    deadlinePassed ? 'border-magenta-200 bg-magenta-50' : 'border-sky-200 bg-sky-50',
                  )}>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-ink-600">{t.deadline}</p>
                    <p className="text-xs font-medium text-ink-900">
                      {new Date(config.applicationDeadline).toLocaleDateString()}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <div>
              <label className={flowLabelClass}>{t.admissionLevel}</label>
              <div className="flex flex-wrap gap-2">
                {schoolLevels.map((lvl) => (
                  <LevelPill
                    key={lvl}
                    active={admissionLevel === lvl}
                    onClick={() => setAdmissionLevel(lvl)}
                  >
                    {levelLabel(lvl, t)}
                  </LevelPill>
                ))}
              </div>
            </div>

            {levelUsesClassPicker(admissionLevel) ? (
              <div>
                <label className={flowLabelClass}>{t.classGrade}</label>
                <select className={flowSelectClass} value={classApplying} onChange={(e) => setClassApplying(e.target.value)}>
                  {levelClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {levelUsesCombinationPicker(admissionLevel) ? (
              <div>
                <label className={flowLabelClass}>{t.aLevelCombination}</label>
                {aLevelOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {aLevelOptions.map((combo) => (
                      <LevelPill
                        key={combo}
                        active={preferredCombination === combo}
                        onClick={() => setPreferredCombination(combo)}
                      >
                        {combo}
                      </LevelPill>
                    ))}
                  </div>
                ) : (
                  <div className={flowErrorBoxClass}>{t.noCombinations}</div>
                )}
              </div>
            ) : null}

            {levelUsesTvetPicker(admissionLevel) ? (
              <div>
                <label className={flowLabelClass}>{t.tvetTrade}</label>
                {tvetOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {tvetOptions.map((trade) => (
                      <LevelPill
                        key={trade}
                        active={classApplying === trade}
                        onClick={() => setClassApplying(trade)}
                      >
                        {trade}
                      </LevelPill>
                    ))}
                  </div>
                ) : (
                  <div className={flowErrorBoxClass}>{t.noTrades}</div>
                )}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={flowLabelClass}>{t.academicYear}</label>
                <div className={cn(flowInfoBoxClass, 'font-medium text-ink-800')}>
                  {academicYear || t.academicYearUnset}
                </div>
                <p className="mt-1 text-[11px] text-ink-500">{t.academicYearHint}</p>
              </div>
              <div>
                <label className={flowLabelClass}>{t.termOfEntry}</label>
                <select className={flowSelectClass} value={termOfEntry} onChange={(e) => setTermOfEntry(e.target.value)}>
                  {config.terms.map((term) => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={flowLabelClass}>{t.boardingPreference}</label>
                <select className={flowSelectClass} value={boardingPreference} onChange={(e) => setBoardingPreference(e.target.value)}>
                  <option value="Day">{t.boardingDay}</option>
                  <option value="Boarding">{t.boardingBoarding}</option>
                  <option value="Both">{t.boardingBoth}</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={flowLabelClass}>{t.studentGender}</label>
                <select className={flowSelectClass} value={studentGender} onChange={(e) => setStudentGender(e.target.value)}>
                  <option value="">{t.select}</option>
                  <option value="Male">{t.genderMale}</option>
                  <option value="Female">{t.genderFemale}</option>
                </select>
              </div>
              <div>
                <label className={flowLabelClass}>{t.admissionType}</label>
                <select className={flowSelectClass} value={admissionType} onChange={(e) => setAdmissionType(e.target.value)}>
                  <option value="New Student">{t.newStudent}</option>
                  <option value="Transfer Student">{t.transferStudent}</option>
                </select>
              </div>
            </div>

            <div>
              <label className={flowLabelClass}>{t.previousSchoolOptional}</label>
              <input className={flowInputClass} value={previousSchoolSel} onChange={(e) => setPreviousSchoolSel(e.target.value)} placeholder={t.previousSchoolPlaceholder} />
            </div>
          </div>
        ) : null}

        {!configLoading && step === 3 && lang ? (
          <div className="space-y-5">
            <div>
              <p className={flowSectionTitleClass}>{t.studentTitle}</p>
              <p className={flowSectionSubClass}>{t.studentSub}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={flowLabelClass}>{t.firstName}</label>
                <input className={flowInputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className={flowLabelClass}>{t.lastName}</label>
                <input className={flowInputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div>
                <label className={flowLabelClass}>{t.studentGender}</label>
                <select className={flowSelectClass} value={studentGender} onChange={(e) => setStudentGender(e.target.value)}>
                  <option value="">{t.select}</option>
                  <option value="Male">{t.genderMale}</option>
                  <option value="Female">{t.genderFemale}</option>
                </select>
              </div>
              <div>
                <label className={flowLabelClass}>{t.dateOfBirth}</label>
                <input type="date" className={flowInputClass} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
              <div>
                <label className={flowLabelClass}>{t.nationality}</label>
                <input className={flowInputClass} value={nationality} onChange={(e) => setNationality(e.target.value)} />
              </div>
              <div>
                <label className={flowLabelClass}>{t.placeOfBirth}</label>
                <input className={flowInputClass} value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} />
              </div>
              <div>
                <label className={flowLabelClass}>{t.nationalId}</label>
                <input className={flowInputClass} value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
              </div>
              <div>
                <label className={flowLabelClass}>{t.studentPhoto}</label>
                <input
                  type="file"
                  accept="image/*"
                  className={flowInputClass}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleDocUpload('student_photo', f).then(() => setStudentPhoto(documents.student_photo ?? null));
                  }}
                />
              </div>
            </div>

            <div>
              <p className={flowSectionTitleClass}>{t.prevEducationTitle}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={flowLabelClass}>{t.previousSchool}</label>
                  <input className={flowInputClass} value={prevSchoolDetail} onChange={(e) => setPrevSchoolDetail(e.target.value)} />
                </div>
                <div>
                  <label className={flowLabelClass}>{t.currentClass}</label>
                  <input className={flowInputClass} value={currentClass} onChange={(e) => setCurrentClass(e.target.value)} />
                </div>
                {admissionType === 'Transfer Student' ? (
                  <div className="sm:col-span-2">
                    <label className={flowLabelClass}>{t.transferReason}</label>
                    <textarea className={cn(flowInputClass, 'min-h-[80px] resize-y')} value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {!configLoading && step === 4 && lang ? (
          <div className="space-y-4">
            <div>
              <p className={flowSectionTitleClass}>{t.parentTitle}</p>
              <p className={flowSectionSubClass}>{t.parentSub}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={flowLabelClass}>{t.guardianName}</label>
                <input className={flowInputClass} value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
              </div>
              <div>
                <label className={flowLabelClass}>{t.relationship}</label>
                <select className={flowSelectClass} value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                  <option value="">{t.select}</option>
                  <option value="Father">{t.relFather}</option>
                  <option value="Mother">{t.relMother}</option>
                  <option value="Guardian">{t.relGuardian}</option>
                  <option value="Other">{t.relOther}</option>
                </select>
              </div>
              <div>
                <label className={flowLabelClass}>{t.phone}</label>
                <input className={flowInputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07xxxxxxxx" />
              </div>
              <div>
                <label className={flowLabelClass}>{t.whatsapp}</label>
                <input className={flowInputClass} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="07xxxxxxxx" />
              </div>
              <div>
                <label className={flowLabelClass}>{t.emailOptional}</label>
                <input type="email" className={flowInputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <p className={cn(flowSectionTitleClass, 'mb-2')}>{t.homeAddress}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={flowLabelClass}>{t.province}</label>
                  <select className={flowSelectClass} value={provinceId} onChange={(e) => { setProvinceId(e.target.value); setDistrictId(''); setSectorId(''); setCellId(''); setVillageId(''); }}>
                    <option value="">{t.select}</option>
                    {provinces.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={flowLabelClass}>{t.district}</label>
                  <select className={flowSelectClass} value={districtId} onChange={(e) => { setDistrictId(e.target.value); setSectorId(''); setCellId(''); setVillageId(''); }} disabled={!provinceId}>
                    <option value="">{t.select}</option>
                    {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={flowLabelClass}>{t.sector}</label>
                  <select className={flowSelectClass} value={sectorId} onChange={(e) => { setSectorId(e.target.value); setCellId(''); setVillageId(''); }} disabled={!districtId}>
                    <option value="">{t.select}</option>
                    {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={flowLabelClass}>{t.cell}</label>
                  <select className={flowSelectClass} value={cellId} onChange={(e) => { setCellId(e.target.value); setVillageId(''); }} disabled={!sectorId}>
                    <option value="">{t.select}</option>
                    {cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={flowLabelClass}>{t.village}</label>
                  <select className={flowSelectClass} value={villageId} onChange={(e) => setVillageId(e.target.value)} disabled={!cellId}>
                    <option value="">{t.select}</option>
                    {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!configLoading && step === 5 && lang ? (
          <div className="space-y-4">
            <div className={flowInfoBoxClass}>{t.docsHint}</div>
            {requiredDocs.map((doc) => {
              const uploaded = documents[doc.id];
              const progress = uploadProgress[doc.id] ?? 0;
              return (
                <div key={doc.id} className={flowCardClass}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{doc.name}</p>
                      <span className={cn(
                        'mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase',
                        doc.required ? 'bg-magenta-100 text-magenta-700' : 'bg-ink-100 text-ink-600',
                      )}>
                        {doc.required ? t.required : t.optional}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={(el) => { fileRefs.current[doc.id] = el; }}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleDocUpload(doc.id, f);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileRefs.current[doc.id]?.click()}
                        className="rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-sky-700"
                      >
                        {uploaded ? t.replace : t.upload}
                      </button>
                    </div>
                  </div>
                  {progress > 0 && progress < 100 ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  ) : null}
                  {uploaded?.previewUrl ? (
                    <img src={uploaded.previewUrl} alt="" className="mt-2 h-20 w-20 rounded-lg object-cover ring-1 ring-ink-200" />
                  ) : uploaded ? (
                    <p className="mt-2 text-xs font-medium text-teal-700">✓ {uploaded.fileName}</p>
                  ) : null}
                </div>
              );
            })}
            <button
              type="button"
              disabled={savingDraft}
              onClick={() => void handleSaveDraft()}
              className="w-full rounded-full border border-ink-200 py-2.5 text-[13px] font-medium text-ink-600 hover:bg-ink-50 disabled:opacity-50"
            >
              {savingDraft ? t.savingDraft : t.saveDraft}
            </button>
          </div>
        ) : null}

        {!configLoading && step === 6 && lang ? (
          <div className="space-y-4">
            {[
              { title: t.reviewSchool, edit: 2 as Step, content: `${school.name} · ${levelLabel(admissionLevel, t)} · ${applyingSummary}` },
              { title: t.reviewStudent, edit: 3 as Step, content: `${firstName} ${lastName} · ${dateOfBirth}` },
              { title: t.reviewParent, edit: 4 as Step, content: `${guardianName} · ${phone}` },
              { title: t.reviewDocs, edit: 5 as Step, content: t.reviewDocsCount(Object.keys(documents).length) },
            ].map((section) => (
              <div key={section.title} className={flowCardClass}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-medium uppercase tracking-wide text-ink-500">{section.title}</p>
                  <button type="button" onClick={() => setStep(section.edit)} className="text-[12px] font-medium text-sky-600 hover:text-sky-700">{t.edit}</button>
                </div>
                <p className="mt-1 text-sm font-medium text-ink-800">{section.content}</p>
              </div>
            ))}

            {config?.estimatedFee != null ? (
              <div className={flowInfoBoxClass}>
                {t.estFeeReview}: <strong>{formatRwf(config.estimatedFee)}</strong>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-3">
              <input type="checkbox" checked={confirmAccurate} onChange={(e) => setConfirmAccurate(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-ink-300" />
              <span className="text-[13px] text-ink-700">{t.confirmAccurate}</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-3">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-ink-300" />
              <span className="text-[13px] text-ink-700">
                {t.acceptTerms}
                {config?.termsUrl ? (
                  <> (<a href={config.termsUrl} target="_blank" rel="noopener" className="font-medium text-sky-600">{t.termsLink}</a>)</>
                ) : null}
                {config?.privacyUrl ? (
                  <> · <a href={config.privacyUrl} target="_blank" rel="noopener" className="font-medium text-sky-600">{t.privacyLink}</a></>
                ) : null}
              </span>
            </label>

            <div className={flowSuccessBoxClass}>
              {t.refPreview}: <strong>ADM-{new Date().getFullYear()}-XXXXXX</strong>
            </div>
          </div>
        ) : null}

        {step === 7 && submitted && lang ? (
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 text-3xl">🎉</div>
            <div>
              <p className={flowSectionTitleClass}>{t.successTitle}</p>
              <p className={flowSectionSubClass}>{t.successSub}</p>
            </div>
            <div className={flowCardClass}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{t.applicationNumber}</p>
              <p className="text-xl font-medium text-teal-700">{submitted.applicationNumber}</p>
              <p className="mt-2 text-sm text-ink-600">
                {t.statusLabel}: <strong>{statusLabelKey(submitted.status, t)}</strong>
              </p>
              <p className="text-sm text-ink-600">{submitted.organizationName ?? school.name}</p>
              <p className="text-sm text-ink-600">{submitted.studentName ?? `${firstName} ${lastName}`}</p>
              {submitted.submittedAt ? (
                <p className="text-xs text-ink-500">Submitted {new Date(submitted.submittedAt).toLocaleString()}</p>
              ) : null}
            </div>

            <div className="space-y-2 text-left">
              <p className="text-[12px] font-medium uppercase tracking-wide text-ink-500">{t.trackingTitle}</p>
              <div className="flex flex-wrap justify-center gap-1 sm:justify-start">
                {ADMISSION_STATUS_FLOW.map((st, i) => {
                  const active = i <= submitted.statusIndex;
                  const labels = [
                    t.statusSubmitted,
                    t.statusUnderReview,
                    t.statusDocsVerification,
                    t.statusAssessment,
                    t.statusApproved,
                    t.statusFeePayment,
                    t.statusEnrolled,
                  ];
                  return (
                    <div key={st} className="flex items-center gap-1">
                      <span className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-medium',
                        active ? 'bg-teal-500 text-white' : 'bg-ink-100 text-ink-400',
                      )}>
                        {active ? <FlowCheckIcon className="h-3 w-3" /> : i + 1}
                      </span>
                      <span className={cn('hidden text-[10px] font-medium sm:inline', active ? 'text-teal-700' : 'text-ink-400')}>
                        {labels[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button type="button" onClick={onClose} className="rounded-full bg-sky-600 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-sky-700">
                {t.done}
              </button>
            </div>
          </div>
        ) : null}
      </FlowModalBody>

      {step <= formSteps && !configLoading ? (
        <FlowModalFooter
          onBack={step > 1 ? handleBack : undefined}
          hideBack={step === 1}
          onNext={() => void handleNext()}
          nextLabel={step === formSteps ? t.submit : t.continue}
          nextDisabled={(!!deadlinePassed && step === 2) || (step === 1 && !lang)}
          loading={loading}
          backLabel={t.back}
          nextIcon={loading ? <Spinner className="h-4 w-4" /> : undefined}
        />
      ) : null}
    </FlowModalPortal>
  );
}
