'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Eye,
  Pencil,
  Plus,
  Save,
  Sparkles,
  SpellCheck,
  ShieldCheck,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { HrStepWizard } from '@/components/hr-step-wizard';
import { useAcademicPeriod } from '@/contexts/academic-period-context';
import { calcBankTotal, calcPaidAtSchoolTotal } from '@/lib/circular-totals';
import { OfficialDocModal } from '@/lib/official-doc/official-doc-modal';
import { resolveAssetUrl } from '@/lib/official-doc/tokens';
import { wizardFormToDraftCircular } from '@/lib/official-doc/wizard-draft-circular';
import {
  applyWordingCorrections,
  buildParentMessageTemplate,
  detectWordingIssues,
} from '@/lib/parent-message-assist';
import { useToast } from '@/shared/notifications';
import {
  createCircular,
  fetchAcademicClasses,
  fetchCircular,
  fetchNesaLimit,
  fetchRequirementsCatalog,
  fetchSchoolInfo,
  publishCircular,
  saveDocumentDescriptionTemplate,
  updateCircular,
  uploadAsset,
} from '@/services/babyeyi-api';
import {
  EMPTY_WIZARD_FORM,
  type BankAccount,
  type LeaderContact,
  type PaymentLine,
  type RequirementLine,
  type WizardFormState,
} from '@/types';

const EMPTY_PAYMENT: PaymentLine = { name: '', amount: 0, pay_channel: 'babyeyi' };
const EMPTY_REQUIREMENT: { item: string; description: string; quantity: string; pay_channel: 'school' | 'babyeyi'; unitPrice: number } = {
  item: '',
  description: '',
  quantity: '1',
  pay_channel: 'babyeyi',
  unitPrice: 0,
};

const PAYMENT_CHANNEL_OPTIONS: Array<{ value: 'babyeyi' | 'school'; label: string }> = [
  { value: 'babyeyi', label: 'Other requirements (paid via bank)' },
  { value: 'school', label: 'Paid to School Account' },
];
const EMPTY_BANK: BankAccount = { bank_name: '', account_no: '', account_name: '', is_primary: false };
const BANK_OTHERS = 'Others';
const RWANDA_BANK_OPTIONS = [
  'Bank of Kigali Plc',
  'BPR Bank Rwanda Plc',
  'I&M Bank Rwanda Plc',
  'Equity Bank Rwanda Plc',
  'Access Bank Rwanda Plc',
  'Ecobank Rwanda Plc',
  'GT Bank Rwanda Plc',
  'Bank of Africa Rwanda Plc',
  'NCBA Bank Rwanda Plc',
  'Development Bank of Rwanda (BRD)',
  'Zigama Credit and Savings Bank',
  'Urwego Bank',
  'Unguka Bank',
] as const;
const RWANDA_BANKS = [...RWANDA_BANK_OPTIONS, BANK_OTHERS];

function resolveBankPicker(name: string): { picker: string; other: string } {
  if (!name) return { picker: '', other: '' };
  if (RWANDA_BANK_OPTIONS.includes(name as (typeof RWANDA_BANK_OPTIONS)[number])) {
    return { picker: name, other: '' };
  }
  return { picker: BANK_OTHERS, other: name };
}
const EMPTY_LEADER: LeaderContact = { name: '', role: 'Head Teacher', phone: '', email: '' };

const WIZARD_STEPS = [
  { title: 'School', description: 'School profile & location' },
  { title: 'Academic', description: 'Year, term & category' },
  { title: 'Classes', description: 'Select target classes' },
  { title: 'Payments', description: 'Fee lines & NESA check' },
  { title: 'Requirements', description: 'Materials, rules & announcements' },
  { title: 'Banks', description: 'Payment accounts' },
  { title: 'Authorization', description: 'Signature & stamp' },
  { title: 'Leaders', description: 'School leadership' },
  { title: 'Preview', description: 'Review & publish' },
];

const LEFT_NAV = [
  'School Profile',
  'Academic Information',
  'Classes',
  'Payments',
  'Requirements & Notices',
  'Bank Accounts',
  'Authorization',
  'Leaders',
  'Preview',
];

function isGovernmentAided(category: string) {
  return /government[-\s]?aided/i.test(category.trim()) || /aided/i.test(category.trim());
}

/** NESA policy applies to Government, and Gov-Aided public cohorts only. */
function isPolicySkipped(ownershipType: string, schoolCategory: string, feeTargetStudents: string) {
  const own = ownershipType.toLowerCase().replace(/[_-]+/g, ' ');
  const privateSchool = own.includes('private') && !own.includes('aided');
  if (privateSchool) return true;
  const aided = own.includes('aided') || isGovernmentAided(ownershipType) || isGovernmentAided(schoolCategory);
  const cohort = (feeTargetStudents || schoolCategory || 'public').toLowerCase();
  if (aided && cohort.includes('private')) return true;
  return false;
}

function calcCompletion(form: WizardFormState, step: number) {
  const checks = [
    !!form.className,
    !!form.academicYear && !!form.term,
    form.classes.length > 0,
    form.payments.some((p) => p.name && p.amount > 0),
    form.requirements.length > 0,
    form.banks.some((b) => b.bank_name),
    true,
    form.leaders.some((l) => l.name),
    step >= 8,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function CreateWizardView() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('id');
  const toast = useToast();
  const { settings: academicSettings, year: periodYear, term: periodTerm, loading: periodLoading } = useAcademicPeriod();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardFormState>(EMPTY_WIZARD_FORM);
  const [classOptions, setClassOptions] = useState<
    Array<{ id?: string; name: string; stream: string | null; label: string; educationLevel: string }>
  >([]);
  const [catalog, setCatalog] = useState<Array<{ id: string; name: string; description?: string; quantity: string }>>([]);
  const [nesaLimit, setNesaLimit] = useState<number | null>(null);
  const [tuitionMax, setTuitionMax] = useState<number | null>(null);
  const [gaMax, setGaMax] = useState<number | null>(null);
  const [policyLoaded, setPolicyLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [circularId, setCircularId] = useState<string | null>(editId);
  const [version, setVersion] = useState(1);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [registeredCategory, setRegisteredCategory] = useState('');
  const [branding, setBranding] = useState<{
    logoUrl: string | null;
    otherLogoUrl: string | null;
    signatureUrl: string | null;
    stampUrl: string | null;
    schoolName: string;
    schoolCode: string | null;
    principalName: string | null;
  } | null>(null);

  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentEditIndex, setPaymentEditIndex] = useState<number | null>(null);
  const [requirementModal, setRequirementModal] = useState(false);
  const [requirementEditIndex, setRequirementEditIndex] = useState<number | null>(null);
  const [bankModal, setBankModal] = useState(false);
  const [bankEditIndex, setBankEditIndex] = useState<number | null>(null);
  const [leaderModal, setLeaderModal] = useState(false);
  const [leaderEditIndex, setLeaderEditIndex] = useState<number | null>(null);
  const [ruleModal, setRuleModal] = useState(false);
  const [ruleEditIndex, setRuleEditIndex] = useState<number | null>(null);
  const [announceModal, setAnnounceModal] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [ruleDraft, setRuleDraft] = useState('');
  const [announceDraft, setAnnounceDraft] = useState({ title: '', detail: '' });
  const [paymentDraft, setPaymentDraft] = useState<PaymentLine>(EMPTY_PAYMENT);
  const [requirementDraft, setRequirementDraft] = useState(EMPTY_REQUIREMENT);
  const [bankDraft, setBankDraft] = useState<BankAccount>(EMPTY_BANK);
  const [bankPicker, setBankPicker] = useState('');
  const [otherBankName, setOtherBankName] = useState('');
  const [leaderDraft, setLeaderDraft] = useState<LeaderContact>(EMPTY_LEADER);

  const totalFee = useMemo(() => calcBankTotal(form.payments), [form.payments]);
  const paidAtSchoolTotal = useMemo(
    () => calcPaidAtSchoolTotal(form.payments, form.requirements),
    [form.payments, form.requirements]
  );
  const filteredClassOptions = useMemo(
    () =>
      classOptions.filter(
        (item) =>
          !form.educationLevel ||
          item.educationLevel.toUpperCase() === form.educationLevel.toUpperCase()
      ),
    [classOptions, form.educationLevel]
  );
  const selectedClassesLabel = useMemo(
    () => (form.classes.length ? form.classes.join(', ') : form.className),
    [form.classes, form.className]
  );
  const classNameOptions = useMemo(() => {
    const names = new Set<string>();
    for (const item of filteredClassOptions) names.add(item.name);
    return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [filteredClassOptions]);
  const wordingIssues = useMemo(() => detectWordingIssues(form.parentMessage), [form.parentMessage]);
  const completion = calcCompletion(form, step);
  const isPrivateFeeScope = isPolicySkipped(
    form.ownershipType,
    form.schoolCategory,
    form.feeTargetStudents
  );
  const overNesa = !isPrivateFeeScope && nesaLimit !== null && totalFee > nesaLimit;
  const govAided = isGovernmentAided(registeredCategory) || /aided/i.test(form.ownershipType);

  function openParentPreview() {
    setPreviewOpen(true);
  }

  function autofillParentMessage() {
    const template = buildParentMessageTemplate({
      schoolName: branding?.schoolName,
      classes: form.classes,
      className: form.className,
      term: form.term,
      academicYear: form.academicYear,
      language: form.language,
    });
    update('parentMessage', template);
    toast.success('Parent message autofilled - review and edit if needed');
  }

  function correctParentMessage() {
    if (!form.parentMessage.trim()) {
      toast.warning('Add a message first, or use Autofill');
      return;
    }
    const issues = detectWordingIssues(form.parentMessage);
    const mostlyUnclear =
      issues.length > 0 && issues.every((i) => i.reason === 'Unclear wording' || i.reason === 'Gibberish');
    const wordCount = form.parentMessage.trim().split(/\s+/).filter(Boolean).length;
    if (mostlyUnclear && wordCount <= 6) {
      toast.warning('Message looks unclear - Autofill applied a proper parent letter');
      autofillParentMessage();
      return;
    }
    const corrected = applyWordingCorrections(form.parentMessage);
    if (corrected === form.parentMessage) {
      if (issues.length) {
        toast.warning('Some unclear words need a rewrite - try Autofill');
      } else {
        toast.success('No wording issues found');
      }
      return;
    }
    update('parentMessage', corrected);
    toast.success('Wording corrections applied');
  }

  async function saveDocumentDescription(showToast = true) {
    setSavingDescription(true);
    try {
      await saveDocumentDescriptionTemplate({
        includeSchoolDescription: form.includeSchoolDescription,
        descriptionLines: form.descriptionLines,
      });
      if (showToast) {
        toast.success(
          form.includeSchoolDescription
            ? 'School description saved for your next circulars'
            : 'School description turned off for new circulars'
        );
      }
    } catch {
      toast.error('Could not save school description');
    } finally {
      setSavingDescription(false);
    }
  }

  async function toggleSchoolDescription(on: boolean) {
    const lines = on && form.descriptionLines.length === 0 ? [''] : form.descriptionLines;
    setForm((f) => ({ ...f, includeSchoolDescription: on, descriptionLines: lines }));
    try {
      await saveDocumentDescriptionTemplate({
        includeSchoolDescription: on,
        descriptionLines: lines,
      });
      toast.success(on ? 'School description enabled for new circulars' : 'School description turned off');
    } catch {
      toast.error('Could not save preference');
    }
  }

  async function replaceBrandingAsset(
    assetKey: 'logo' | 'other_logo' | 'signature' | 'stamp',
    file: File
  ) {
    try {
      const res = await uploadAsset(file, assetKey);
      const url = resolveAssetUrl(res.url) || res.url;
      setBranding((b) => {
        if (!b) return b;
        if (assetKey === 'logo') return { ...b, logoUrl: url };
        if (assetKey === 'other_logo') return { ...b, otherLogoUrl: url };
        if (assetKey === 'signature') return { ...b, signatureUrl: url };
        return { ...b, stampUrl: url };
      });
      toast.success('Image replaced');
    } catch {
      toast.error('Upload failed');
    }
  }

  useEffect(() => {
    if (!bankModal || bankEditIndex !== null) return;
    if (branding?.schoolName && !bankDraft.account_name.trim()) {
      setBankDraft((d) => ({ ...d, account_name: branding.schoolName }));
    }
  }, [bankModal, bankEditIndex, branding?.schoolName, bankDraft.account_name]);

  useEffect(() => {
    void (async () => {
      try {
        const [school, reqs, academic] = await Promise.all([
          fetchSchoolInfo(),
          fetchRequirementsCatalog(),
          fetchAcademicClasses().catch(() => null),
        ]);
        const academicClasses =
          academic?.classes
            ?.filter((c) => c.name || c.label)
            .map((c) => {
              const name = (c.name || c.label || '').trim();
              return {
                id: c.id,
                name,
                stream: null,
                label: name,
                educationLevel: (c.educationLevel || 'PRIMARY').toUpperCase(),
              };
            }) ?? [];
        setClassOptions(academicClasses);
        setCatalog(reqs);
        const leadersFromIam = (school.leaders ?? []).filter((l) => l.name);
        const categoryFromIam = school.schoolCategory ?? '';
        const descriptionTemplate = !editId ? school.documentDescriptionTemplate : null;
        setRegisteredCategory(categoryFromIam);
        setForm((f) => ({
          ...f,
          ownershipType: school.profile.ownershipType,
          province: school.profile.province ?? '',
          district: school.profile.district ?? '',
          sector: school.profile.sector ?? '',
          ...(descriptionTemplate
            ? {
                includeSchoolDescription: descriptionTemplate.includeSchoolDescription,
                descriptionLines: descriptionTemplate.descriptionLines.length
                  ? descriptionTemplate.descriptionLines
                  : descriptionTemplate.includeSchoolDescription
                    ? ['']
                    : [],
              }
            : {}),
          schoolCategory: isGovernmentAided(categoryFromIam)
            ? f.schoolCategory === 'Public' || f.schoolCategory === 'Private'
              ? f.schoolCategory
              : ''
            : categoryFromIam || f.schoolCategory,
          feeTargetStudents: isGovernmentAided(categoryFromIam)
            ? f.schoolCategory === 'Private'
              ? 'private'
              : f.feeTargetStudents || 'public'
            : /private/i.test(school.profile.ownershipType)
              ? 'private'
              : 'public',
          leaders:
            f.leaders.some((l) => (l.name ?? '').trim())
              ? f.leaders
              : leadersFromIam.length
                ? leadersFromIam
                : f.leaders,
        }));
        setBranding({
          logoUrl: resolveAssetUrl(school.branding?.logoUrl ?? school.profile.logoPath),
          otherLogoUrl: resolveAssetUrl(school.branding?.otherLogoUrl ?? school.profile.otherLogoPath),
          signatureUrl: resolveAssetUrl(school.branding?.signatureUrl ?? school.profile.signaturePath),
          stampUrl: resolveAssetUrl(school.branding?.stampUrl ?? school.profile.stampPath),
          schoolName: school.profile.schoolName,
          schoolCode: school.profile.schoolCode ?? null,
          principalName: school.profile.principalName ?? null,
        });
      } catch {
        toast.error('Failed to load school info');
      }
    })();
  }, [toast, editId]);

  useEffect(() => {
    if (editId || periodLoading) return;
    setForm((f) => ({
      ...f,
      academicYear: f.academicYear || periodYear,
      term: f.term || periodTerm,
    }));
  }, [editId, periodLoading, periodYear, periodTerm]);

  useEffect(() => {
    if (!editId) return;
    void fetchCircular(editId)
      .then((c) => {
        setCircularId(c.id);
        setVersion(c.version);
        const loadedClasses = (
          Array.isArray(c.classes) && c.classes.length
            ? (c.classes as string[])
            : c.className
              ? [c.className]
              : []
        ).map((label) => label.replace(/\s+[A-Z0-9]+$/i, '').trim() || label);
        const requirements = (c.requirements ?? []).map((r) => {
          const qty = Number(r.quantity) || 1;
          const storedUnit = Number(r.unitPrice);
          const cost = Number(r.cost);
          const unitPrice =
            Number.isFinite(storedUnit) && storedUnit > 0
              ? storedUnit
              : Number.isFinite(cost) && cost > 0
                ? qty > 1
                  ? cost / qty
                  : cost
                : 0;
          return {
            ...r,
            pay_channel: (r.pay_channel === 'school' ? 'school' : 'babyeyi') as 'school' | 'babyeyi',
            unitPrice,
            cost: unitPrice > 0 ? qty * unitPrice : Number(r.cost) || 0,
          };
        });
        setForm({
          academicYear: c.academicYear,
          term: c.term,
          educationLevel: (c.educationLevel ?? '').toUpperCase(),
          className: loadedClasses[0] ?? c.className,
          classes: loadedClasses,
          schoolCategory: c.schoolCategory,
          ownershipType: c.ownershipType,
          feeTargetStudents: c.feeTargetStudents,
          province: c.province ?? '',
          district: c.district ?? '',
          sector: c.sector ?? '',
          language: c.language,
          parentMessage: c.parentMessage ?? '',
          payments: c.payments,
          requirements,
          banks: c.banks,
          classReqs: c.classReqs,
          otherInfos: c.otherInfos ?? [],
          includeAnnouncements: c.includeAnnouncements ?? false,
          announcements: c.announcements ?? [],
          includeSchoolDescription: c.includeSchoolDescription ?? false,
          descriptionLines: Array.isArray(c.descriptionLines) ? c.descriptionLines : [],
          leaders: Array.isArray(c.leaders) ? c.leaders : [],
          requestIncrease: c.requestIncrease,
          increaseReason: c.increaseReason ?? '',
          increaseDesc: '',
        });
      })
      .catch((err) => {
        toast.error((err as Error)?.message || 'Could not load circular for editing');
      });
  }, [editId, toast]);

  useEffect(() => {
    if (!form.className || !form.term) return;
    if (
      isPolicySkipped(form.ownershipType, form.schoolCategory, form.feeTargetStudents) ||
      (govAided && !form.schoolCategory)
    ) {
      setNesaLimit(null);
      setTuitionMax(null);
      setGaMax(null);
      setPolicyLoaded(false);
      return;
    }
    void fetchNesaLimit({
      level: form.className,
      term: form.term,
      category: form.schoolCategory,
      district: form.district,
      ownershipType: form.ownershipType,
      feeTargetStudents: form.feeTargetStudents,
      academicYear: form.academicYear,
      educationLevel: form.educationLevel,
    })
      .then((r) => {
        if (r.applies === false) {
          setNesaLimit(null);
          setTuitionMax(null);
          setGaMax(null);
          setPolicyLoaded(false);
          return;
        }
        setNesaLimit(r.limit);
        setTuitionMax(r.tuitionMaxRwf ?? null);
        setGaMax(r.generalAssemblyMaxRwf ?? null);
        setPolicyLoaded(true);
      })
      .catch(() => {
        setNesaLimit(null);
        setTuitionMax(null);
        setGaMax(null);
        setPolicyLoaded(false);
      });
  }, [
    form.className,
    form.term,
    form.schoolCategory,
    form.district,
    form.ownershipType,
    form.feeTargetStudents,
    form.academicYear,
    form.educationLevel,
    govAided,
  ]);

  const update = useCallback(<K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  async function saveDraft() {
    setSaving(true);
    try {
      const saved = circularId
        ? await updateCircular(circularId, form, 'DRAFT')
        : await createCircular(form, 'DRAFT');
      setCircularId(saved.id);
      setVersion(saved.version);
      setLastSaved(new Date());
      toast.success('Draft saved - it appears in Circular List');
      router.replace(`/create?id=${saved.id}`);
    } catch {
      toast.error('Could not save draft');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (govAided && !form.schoolCategory) {
      toast.warning('Choose Public or Private for Government-Aided schools.');
      setStep(1);
      return;
    }
    if (overNesa && !form.requestIncrease) {
      toast.warning('Total fee exceeds NESA limit. Enable increase request or reduce fees.');
      return;
    }
    setSaving(true);
    try {
      const status = overNesa && form.requestIncrease ? 'PENDING' : 'APPROVED';
      const saved = circularId
        ? await updateCircular(circularId, form, status)
        : await createCircular(form, status);
      setCircularId(saved.id);
      if (status === 'APPROVED') {
        await publishCircular(saved.id);
      }
      toast.success('Circular saved successfully');
      router.push(`/circulars/${saved.id}`);
    } catch {
      toast.error('Failed to save circular');
    } finally {
      setSaving(false);
    }
  }

  function toggleClass(cls: string) {
    setForm((f) => {
      const classes = f.classes.includes(cls) ? f.classes.filter((c) => c !== cls) : [...f.classes, cls];
      return { ...f, classes, className: classes[0] ?? '' };
    });
  }

  function isClassSelected(name: string) {
    return form.classes.includes(name);
  }

  function openAddPayment() {
    setPaymentEditIndex(null);
    setPaymentDraft(EMPTY_PAYMENT);
    setPaymentModal(true);
  }

  function openEditPayment(index: number) {
    const p = form.payments[index];
    if (!p) return;
    setPaymentEditIndex(index);
    setPaymentDraft({ ...p });
    setPaymentModal(true);
  }

  function savePayment() {
    if (!paymentDraft.name.trim()) {
      toast.warning('Payment name is required');
      return;
    }
    setForm((f) => {
      if (paymentEditIndex !== null) {
        const payments = [...f.payments];
        payments[paymentEditIndex] = { ...paymentDraft };
        return { ...f, payments };
      }
      return { ...f, payments: [...f.payments, { ...paymentDraft }] };
    });
    setPaymentDraft(EMPTY_PAYMENT);
    setPaymentEditIndex(null);
    setPaymentModal(false);
  }

  function openAddRequirement() {
    setRequirementEditIndex(null);
    setRequirementDraft(EMPTY_REQUIREMENT);
    setRequirementModal(true);
  }

  function openEditRequirement(index: number) {
    const r = form.requirements[index];
    if (!r) return;
    const qty = Number(r.quantity) || 1;
    const storedUnit = Number(r.unitPrice);
    const cost = Number(r.cost);
    const unitPrice =
      Number.isFinite(storedUnit) && storedUnit > 0
        ? storedUnit
        : Number.isFinite(cost) && cost > 0
          ? qty > 1
            ? cost / qty
            : cost
          : 0;
    setRequirementEditIndex(index);
    setRequirementDraft({
      item: r.item,
      description: r.description ?? '',
      quantity: r.quantity ?? '1',
      pay_channel: r.pay_channel === 'school' ? 'school' : 'babyeyi',
      unitPrice,
    });
    setRequirementModal(true);
  }

  function saveRequirement() {
    if (!requirementDraft.item.trim()) {
      toast.warning('Requirement name is required');
      return;
    }
    const paidAtSchool = requirementDraft.pay_channel === 'school';
    const qty = Number(requirementDraft.quantity) || 1;
    const unitPrice = paidAtSchool ? Number(requirementDraft.unitPrice) || 0 : 0;
    if (paidAtSchool && unitPrice <= 0) {
      toast.warning('Unit price is required for Paid to School Account items');
      return;
    }
    const line: RequirementLine = {
      item: requirementDraft.item.trim(),
      description: requirementDraft.description.trim() || undefined,
      quantity: requirementDraft.quantity.trim() || '1',
      pay_channel: requirementDraft.pay_channel,
      // Other Requirement: price is set by Super Admin on the ShuleKit Standard Kit.
      unitPrice: paidAtSchool ? unitPrice : undefined,
      cost: paidAtSchool ? qty * unitPrice : 0,
    };
    setForm((f) => {
      if (requirementEditIndex !== null) {
        const requirements = [...f.requirements];
        requirements[requirementEditIndex] = line;
        return { ...f, requirements };
      }
      return { ...f, requirements: [...f.requirements, line] };
    });
    setRequirementDraft(EMPTY_REQUIREMENT);
    setRequirementEditIndex(null);
    setRequirementModal(false);
  }

  function resetBankModal() {
    setBankDraft(EMPTY_BANK);
    setBankPicker('');
    setOtherBankName('');
    setBankEditIndex(null);
    setBankModal(false);
  }

  function openAddBank() {
    setBankEditIndex(null);
    setBankDraft({
      ...EMPTY_BANK,
      account_name: branding?.schoolName ?? '',
    });
    setBankPicker('');
    setOtherBankName('');
    setBankModal(true);
  }

  function openEditBank(index: number) {
    const b = form.banks[index];
    if (!b) return;
    setBankEditIndex(index);
    setBankDraft({ ...b });
    const resolved = resolveBankPicker(b.bank_name);
    setBankPicker(resolved.picker);
    setOtherBankName(resolved.other);
    setBankModal(true);
  }

  function saveBank() {
    const finalBankName = bankPicker === BANK_OTHERS ? otherBankName.trim() : bankPicker.trim();
    if (!finalBankName) {
      toast.warning(bankPicker === BANK_OTHERS ? 'Enter the bank name' : 'Select a bank');
      return;
    }
    const savedBank: BankAccount = { ...bankDraft, bank_name: finalBankName };
    setForm((f) => {
      if (bankEditIndex !== null) {
        const banks = [...f.banks];
        banks[bankEditIndex] = savedBank;
        return { ...f, banks };
      }
      const cleaned = f.banks.filter((b) => b.bank_name.trim());
      return {
        ...f,
        banks: [...cleaned, { ...savedBank, is_primary: cleaned.every((b) => !b.is_primary) }],
      };
    });
    resetBankModal();
  }

  function openAddLeader() {
    setLeaderEditIndex(null);
    setLeaderDraft(EMPTY_LEADER);
    setLeaderModal(true);
  }

  function openEditLeader(index: number) {
    const l = form.leaders[index];
    if (!l) return;
    setLeaderEditIndex(index);
    setLeaderDraft({
      name: l.name,
      role: l.role,
      phone: l.phone ?? '',
      email: l.email ?? '',
    });
    setLeaderModal(true);
  }

  function saveLeader() {
    if (!leaderDraft.name.trim()) {
      toast.warning('Leader name is required');
      return;
    }
    if (!leaderDraft.role.trim()) {
      toast.warning('Leader role is required');
      return;
    }
    const entry: LeaderContact = {
      name: leaderDraft.name.trim(),
      role: leaderDraft.role.trim(),
      phone: leaderDraft.phone?.trim() || '',
      email: leaderDraft.email?.trim() || '',
    };
    setForm((f) => {
      if (leaderEditIndex !== null) {
        const leaders = [...f.leaders];
        leaders[leaderEditIndex] = entry;
        return { ...f, leaders };
      }
      return { ...f, leaders: [...f.leaders, entry] };
    });
    setLeaderDraft(EMPTY_LEADER);
    setLeaderEditIndex(null);
    setLeaderModal(false);
  }

  function openAddRule() {
    setRuleEditIndex(null);
    setRuleDraft('');
    setRuleModal(true);
  }

  function openEditRule(index: number) {
    const r = form.otherInfos[index];
    if (!r) return;
    setRuleEditIndex(index);
    setRuleDraft(r.item);
    setRuleModal(true);
  }

  function saveRule() {
    if (!ruleDraft.trim()) {
      toast.warning('School rule is required');
      return;
    }
    const item = ruleDraft.trim();
    setForm((f) => {
      if (ruleEditIndex !== null) {
        const otherInfos = [...f.otherInfos];
        otherInfos[ruleEditIndex] = { item };
        return { ...f, otherInfos };
      }
      return { ...f, otherInfos: [...f.otherInfos, { item }] };
    });
    setRuleDraft('');
    setRuleEditIndex(null);
    setRuleModal(false);
  }

  function addRequirementFromCatalog(item: { name: string; description?: string; quantity: string }) {
    // Catalog items default to Other Requirement (ShuleKit). Open the form so unit price can be set.
    setRequirementEditIndex(null);
    setRequirementDraft({
      item: item.name,
      description: item.description ?? '',
      quantity: item.quantity || '1',
      pay_channel: 'babyeyi',
      unitPrice: 0,
    });
    setRequirementModal(true);
  }

  return (
    <div className="space-y-4">
      {/* TOP STATUS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy/10 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="rounded-full bg-navy/5 px-2.5 py-1 font-semibold text-navy/70">Draft</span>
          <span className="text-navy/45">
            {saving ? 'Saving-' : lastSaved ? `Auto-saved ${lastSaved.toLocaleTimeString()}` : 'Not saved'}
          </span>
          <span className="text-navy/45">Version {version}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <div className="flex items-center justify-end gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/40">Completion</p>
              <p className="text-xs font-semibold text-navy">{completion}%</p>
            </div>
            <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-navy/10">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion}%` }} />
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveDraft()}
            className="inline-flex items-center gap-1.5 rounded-full border border-navy/15 bg-white px-3.5 py-2 text-xs font-semibold text-navy transition hover:border-primary/40 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Saving-' : 'Save draft'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        {/* LEFT STEP NAV */}
        <aside className="hidden xl:block">
          <nav className="sticky top-24 space-y-1 rounded-2xl border border-navy/10 bg-white p-3 shadow-sm">
            {LEFT_NAV.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                  step === i ? 'bg-primary/15 text-navy' : 'text-navy/55 hover:bg-navy/5 hover:text-navy'
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    step === i ? 'bg-primary text-navy' : i < step ? 'bg-emerald-100 text-emerald-700' : 'bg-navy/10 text-navy/50'
                  }`}
                >
                  {i < step ? <CheckCircle2 size={12} /> : i + 1}
                </span>
                <span className="truncate">{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <HrStepWizard
            steps={WIZARD_STEPS}
            currentStep={step}
            onStepClick={setStep}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
            onNext={() => setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))}
            onSubmit={() => void handleSubmit()}
            isLastStep={step === WIZARD_STEPS.length - 1}
            saving={saving}
            submitLabel="Publish Circular"
          >
            {step === 0 && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-navy/10 bg-navy/[0.03] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/45">
                    From organization registration
                  </p>
                  <p className="mt-1 text-base font-semibold text-navy">{branding?.schoolName ?? 'School profile'}</p>
                  <p className="text-sm text-navy/55">
                    {branding?.schoolCode ? `Code ${branding.schoolCode} - ` : ''}
                    {branding?.principalName ? `Principal: ${branding.principalName}` : 'Synced from super admin registration'}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    [
                      { label: 'School logo', url: branding?.logoUrl, key: 'logo' as const },
                      { label: 'Ministry logo', url: branding?.otherLogoUrl, key: 'other_logo' as const },
                      { label: 'Signature', url: branding?.signatureUrl, key: 'signature' as const },
                      { label: 'Stamp', url: branding?.stampUrl, key: 'stamp' as const },
                    ] as const
                  ).map((item) => (
                    <div key={item.label} className="flex flex-col rounded-xl border border-navy/10 bg-white p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/45">{item.label}</p>
                      <div className="mt-2 flex h-24 items-center justify-center overflow-hidden rounded-lg bg-[#f6f7fa]">
                        {item.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.url}
                            alt={item.label}
                            className="max-h-24 w-full object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div
                          className={`flex h-full w-full items-center justify-center px-2 text-center text-xs text-navy/40 ${
                            item.url ? 'hidden' : ''
                          }`}
                        >
                          Not set yet
                        </div>
                      </div>
                      <label className="mt-2 inline-flex cursor-pointer items-center justify-center gap-1 rounded-lg border border-navy/10 bg-navy/[0.03] px-2.5 py-1.5 text-xs font-semibold text-navy transition hover:border-primary/40 hover:bg-primary/10">
                        {item.url ? 'Replace' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file) return;
                            void replaceBrandingAsset(item.key, file);
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Province" value={form.province} onChange={(v) => update('province', v)} />
                  <Field label="District" value={form.district} onChange={(v) => update('district', v)} />
                  <Field label="Sector" value={form.sector} onChange={(v) => update('sector', v)} />
                  <Field label="Ownership" value={form.ownershipType} onChange={(v) => update('ownershipType', v)} />
                </div>

                <div className="rounded-2xl border border-navy/10 bg-navy/[0.02] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-navy">Include School Description on Document</p>
                      <p className="mt-1 text-sm text-navy/55">
                        Custom header text (church, P.O. Box, phone, email, etc.) shown centered between the two logos -
                        replaces the default ministry header.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.includeSchoolDescription}
                      aria-label="Include school description on document"
                      onClick={() => void toggleSchoolDescription(!form.includeSchoolDescription)}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                        form.includeSchoolDescription ? 'bg-primary' : 'bg-navy/20'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                          form.includeSchoolDescription ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {form.includeSchoolDescription ? (
                    <div className="mt-4 space-y-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/45">
                        Header lines (printed under the school name, one per line)
                      </p>
                      {form.descriptionLines.map((line, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            className="input flex-1"
                            value={line}
                            placeholder={
                              i === 0
                                ? 'e.g. ANGLICAN CHURCH OF RWANDA | DIOCESE OF CYANGUGU'
                                : 'e.g. TEL: (+250) 788 260 529'
                            }
                            onChange={(e) => {
                              const lines = [...form.descriptionLines];
                              lines[i] = e.target.value;
                              update('descriptionLines', lines);
                            }}
                          />
                          <button
                            type="button"
                            title="Remove line"
                            aria-label="Remove line"
                            onClick={() =>
                              update(
                                'descriptionLines',
                                form.descriptionLines.filter((_, idx) => idx !== i)
                              )
                            }
                            className="rounded-lg border border-navy/10 p-2 text-navy/45 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => update('descriptionLines', [...form.descriptionLines, ''])}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy transition hover:border-primary/40 hover:bg-primary/10"
                      >
                        <Plus size={13} /> Add line
                      </button>
                    </div>
                  ) : form.descriptionLines.some((line) => line.trim()) ? (
                    <p className="mt-3 text-[11px] text-navy/50">
                      You have saved header lines. Turn on the checkbox above to include them on this circular.
                    </p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-navy/10 pt-4">
                    <p className="text-[11px] text-navy/45">
                      Save your header preference and lines to reuse automatically on new circulars.
                    </p>
                    <button
                      type="button"
                      onClick={() => void saveDocumentDescription()}
                      disabled={savingDescription}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-navy transition hover:bg-primary/20 disabled:opacity-60"
                    >
                      <Save size={13} />
                      {savingDescription ? 'Saving…' : 'Save lines for next time'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <SelectField
                    label="Academic Year"
                    value={form.academicYear}
                    options={academicSettings.academicYears}
                    placeholder="Select year"
                    onChange={(v) => update('academicYear', v)}
                  />
                  <SelectField
                    label="Term"
                    value={form.term}
                    options={academicSettings.terms}
                    placeholder="Select term"
                    onChange={(v) => update('term', v)}
                  />
                  <SelectField
                    label="Education Level"
                    value={form.educationLevel}
                    options={['NURSERY', 'PRIMARY', 'SECONDARY', 'TVET']}
                    placeholder="Select"
                    onChange={(v) => {
                      setForm((current) => ({
                        ...current,
                        educationLevel: v,
                        classes: [],
                        className: '',
                      }));
                    }}
                  />
                </div>

                <div className="rounded-2xl border border-navy/10 bg-navy/[0.03] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/45">School category</p>
                  <p className="mt-1 text-sm text-navy/70">
                    Registered as{' '}
                    <span className="font-semibold text-navy">{registeredCategory || 'Not set in organization profile'}</span>
                  </p>
                  {govAided ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold text-navy">
                        Government-Aided schools must choose fee scope *
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(['Public', 'Private'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              update('schoolCategory', opt);
                              update('feeTargetStudents', opt === 'Private' ? 'private' : 'public');
                              if (opt === 'Private') {
                                update('requestIncrease', false);
                                setNesaLimit(null);
                                setTuitionMax(null);
                                setGaMax(null);
                                setPolicyLoaded(false);
                              }
                            }}
                            className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors ${
                              form.schoolCategory === opt
                                ? 'border-primary bg-primary text-navy'
                                : 'border-navy/10 bg-white text-navy/55 hover:border-primary/40'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      {form.schoolCategory === 'Private' ? (
                        <p className="mt-3 text-xs text-navy/55">
                          Private fee scope: no  payment limit - enter the amounts you need.
                        </p>
                      ) : form.schoolCategory === 'Public' ? (
                        <p className="mt-3 text-xs text-navy/55">
                          Public fee scope:  limits apply on the Payments step.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="mt-3 inline-flex rounded-xl border border-navy/10 bg-white px-4 py-2 text-sm font-semibold text-navy">
                      {form.schoolCategory || registeredCategory || '-'}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-navy">Parent message</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={autofillParentMessage}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy transition hover:border-primary/40 hover:bg-primary/10"
                      >
                        <Sparkles size={13} /> Autofill
                      </button>
                      <button
                        type="button"
                        onClick={correctParentMessage}
                        disabled={!form.parentMessage.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-navy/10 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-navy transition hover:border-primary/40 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <SpellCheck size={13} /> Fix wording
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="input mt-1 min-h-[100px]"
                    value={form.parentMessage}
                    onChange={(e) => update('parentMessage', e.target.value)}
                    placeholder="Optional message shown to parents on the circular-"
                    spellCheck
                    lang={form.language === 'fr' ? 'fr' : form.language === 'rw' ? 'rw' : 'en'}
                  />
                  {wordingIssues.length > 0 ? (
                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-amber-950">
                          {wordingIssues.length} wording issue{wordingIssues.length === 1 ? '' : 's'} detected
                        </p>
                        <button
                          type="button"
                          onClick={correctParentMessage}
                          className="text-[11px] font-bold text-amber-900 underline-offset-2 hover:underline"
                        >
                          Correct all
                        </button>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {wordingIssues.slice(0, 5).map((issue) => (
                          <li key={issue.id} className="text-[11px] text-amber-900/90">
                            <span className="rounded bg-white/70 px-1 font-medium text-danger line-through">
                              {issue.from}
                            </span>
                            {issue.to !== '-' ? (
                              <>
                                <span className="mx-1 text-amber-800/60">?</span>
                                <span className="rounded bg-white/70 px-1 font-semibold text-success">{issue.to}</span>
                              </>
                            ) : (
                              <span className="ml-1 text-amber-800/70">needs rewrite</span>
                            )}
                            <span className="ml-1 text-amber-800/55">({issue.reason})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : form.parentMessage.trim() ? (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-success">
                      <CheckCircle2 size={12} /> No wording issues detected
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[11px] text-muted">
                      Use Autofill for a ready parent letter, or write your own.
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-navy/55">
                  Select one or more classes for the{' '}
                  <strong>{form.educationLevel || 'selected'}</strong> level (e.g. P1, P2 — not individual streams).
                </p>
                {!form.educationLevel ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Go back to Academic Information and choose an education level first.
                  </div>
                ) : null}

                {form.educationLevel ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-navy">Classes</label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {classNameOptions.map((name) => {
                          const active = isClassSelected(name);
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => toggleClass(name)}
                              className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                                active
                                  ? 'border-primary bg-primary/15 text-navy'
                                  : 'border-navy/10 text-navy/55 hover:border-primary/40'
                              }`}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {form.classes.length > 0 ? (
                      <div className="rounded-xl border border-navy/10 bg-navy/[0.03] px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/45">
                          Selected ({form.classes.length})
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {form.classes.map((cls) => (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => toggleClass(cls)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-navy"
                            >
                              {cls}
                              <X size={12} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {classNameOptions.length === 0 ? (
                      <div className="rounded-xl border border-navy/10 bg-navy/[0.03] px-4 py-3 text-sm text-navy/60">
                        No {form.educationLevel.toLowerCase()} classes found in Student Management.
                        Add classes under Student Management → Classes first.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <SectionHeader
                  icon={<Wallet size={17} />}
                  title="Fee payments"
                  subtitle="Add each fee line parents will see on the circular."
                  actionLabel="Add payment"
                  onAction={openAddPayment}
                />

                <SmartFeeChecker
                  totalFee={totalFee}
                  nesaLimit={nesaLimit}
                  tuitionMax={tuitionMax}
                  gaMax={gaMax}
                  policyLoaded={policyLoaded}
                  payments={form.payments}
                  isPrivate={isPrivateFeeScope}
                  overNesa={overNesa}
                  className={selectedClassesLabel}
                  educationLevel={form.educationLevel}
                  term={form.term}
                  category={form.schoolCategory}
                  requestIncrease={form.requestIncrease}
                  onRequestIncreaseChange={(v) => update('requestIncrease', v)}
                />

                {form.payments.length === 0 ? (
                  <EmptyState icon={<Wallet size={26} />} title="No payments yet" subtitle="Click Add payment to create the first fee line." />
                ) : (
                  <div className="space-y-2.5">
                    {form.payments.map((p, i) => {
                      const paidAtSchool = p.pay_channel === 'school';
                      return (
                        <ListRow key={`${p.name}-${i}`}>
                          <div>
                            <p className="text-sm font-semibold text-navy">{p.name || 'Untitled payment'}</p>
                            <span
                              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                paidAtSchool ? 'bg-amber-100 text-amber-800' : 'bg-navy/5 text-navy/55'
                              }`}
                            >
                              {paidAtSchool ? 'Paid to School Account' : 'Paid via bank'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="mr-1 text-base font-semibold text-navy">{Number(p.amount).toLocaleString()} RWF</p>
                            <CardIconButton label="Edit payment" onClick={() => openEditPayment(i)}>
                              <Pencil size={15} />
                            </CardIconButton>
                            <CardIconButton
                              label="Remove payment"
                              danger
                              onClick={() => update('payments', form.payments.filter((_, idx) => idx !== i))}
                            >
                              <Trash2 size={15} />
                            </CardIconButton>
                          </div>
                        </ListRow>
                      );
                    })}
                  </div>
                )}

                {paidAtSchoolTotal > 0 ? (
                  <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-semibold text-amber-950">Total Paid at School Account</p>
                    <p className="text-base font-bold text-amber-950">{paidAtSchoolTotal.toLocaleString()} RWF</p>
                  </div>
                ) : null}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <SectionHeader
                  icon={<ClipboardList size={17} />}
                  title="Student requirements"
                  subtitle="☑ School account needs a unit price. Unchecked = Other Requirement (priced in ShuleKit)."
                  actionLabel="Add requirement"
                  onAction={openAddRequirement}
                />

                {catalog.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-navy/45">
                      Quick add from catalog
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {catalog.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addRequirementFromCatalog(item)}
                          className="rounded-xl border border-navy/10 bg-white px-3 py-1.5 text-xs font-medium text-navy transition-colors hover:border-primary/50 hover:bg-primary/10"
                        >
                          + {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {form.requirements.length === 0 ? (
                  <EmptyState icon={<ClipboardList size={26} />} title="No requirements yet" />
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {form.requirements.map((r, i) => {
                      const paidAtSchool = r.pay_channel === 'school';
                      return (
                        <div key={`${r.item}-${i}`} className="rounded-2xl border border-navy/10 bg-white p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-navy">{r.item}</p>
                              {r.description ? <p className="mt-1 text-xs text-navy/45">{r.description}</p> : null}
                              <p className="mt-2 text-xs font-medium text-navy/55">Qty: {r.quantity || '1'}</p>
                              {paidAtSchool && Number(r.unitPrice ?? r.cost ?? 0) > 0 ? (
                                <p className="mt-1 text-xs font-medium text-amber-700">
                                  Unit price {Number(r.unitPrice ?? 0).toLocaleString()} RWF - Line total{' '}
                                  {Number(r.cost ?? 0).toLocaleString()} RWF
                                </p>
                              ) : null}
                              {!paidAtSchool ? (
                                <p className="mt-1 text-xs text-navy/45">Price set by Super Admin in ShuleKit</p>
                              ) : null}
                              <span
                                className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  paidAtSchool ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                                }`}
                              >
                                {paidAtSchool ? 'Paid to School Account' : 'Other Requirement (ShuleKit)'}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <CardIconButton label="Edit requirement" onClick={() => openEditRequirement(i)}>
                                <Pencil size={15} />
                              </CardIconButton>
                              <CardIconButton
                                label="Remove requirement"
                                danger
                                onClick={() => update('requirements', form.requirements.filter((_, idx) => idx !== i))}
                              >
                                <Trash2 size={15} />
                              </CardIconButton>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* School rules + important announcements (same step) */}
            {step === 4 && (
              <div className="mt-8 space-y-5 border-t border-navy/10 pt-6">
                <SectionHeader
                  title="School rules"
                  subtitle="Short rules printed beside requirements on the circular."
                  actionLabel="Add rule"
                  onAction={openAddRule}
                />
                {form.otherInfos.length > 0 ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {form.otherInfos.map((r, i) => (
                      <ListRow key={`${r.item}-${i}`}>
                        <p className="text-sm text-navy/80">{r.item}</p>
                        <div className="flex shrink-0 items-center gap-1">
                          <CardIconButton label="Edit rule" onClick={() => openEditRule(i)}>
                            <Pencil size={15} />
                          </CardIconButton>
                          <CardIconButton
                            label="Remove rule"
                            danger
                            onClick={() => update('otherInfos', form.otherInfos.filter((_, idx) => idx !== i))}
                          >
                            <Trash2 size={15} />
                          </CardIconButton>
                        </div>
                      </ListRow>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-navy/45">No school rules yet - optional.</p>
                )}

                <div className="rounded-2xl border border-navy/10 bg-navy/[0.02] p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={form.includeAnnouncements}
                      onChange={(e) => {
                        const on = e.target.checked;
                        update('includeAnnouncements', on);
                        if (on) setAnnounceModal(true);
                        if (!on) update('announcements', []);
                      }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-navy">Important announcements</p>
                      <p className="text-sm text-navy/55">
                        When enabled, announcements appear on View &amp; Print. When off, they are hidden from the
                        circular.
                      </p>
                    </div>
                  </label>
                  {form.includeAnnouncements ? (
                    <div className="mt-4 space-y-3">
                      <button type="button" className="btn-primary text-sm" onClick={() => setAnnounceModal(true)}>
                        <Plus size={16} /> Add announcement
                      </button>
                      {form.announcements.length === 0 ? (
                        <p className="text-xs text-navy/45">No announcements yet - open the form to add some.</p>
                      ) : (
                        <ul className="space-y-2">
                          {form.announcements.map((a, i) => (
                            <li
                              key={`${a.title}-${i}`}
                              className="flex items-start justify-between gap-2 rounded-xl border border-navy/10 bg-white px-4 py-3 text-sm"
                            >
                              <div>
                                <p className="font-semibold text-navy">{a.title}</p>
                                {a.detail ? <p className="mt-0.5 text-xs text-navy/45">{a.detail}</p> : null}
                              </div>
                              <button
                                type="button"
                                className="rounded-lg p-1.5 text-navy/40 hover:bg-rose-50 hover:text-rose-600"
                                onClick={() =>
                                  update(
                                    'announcements',
                                    form.announcements.filter((_, idx) => idx !== i)
                                  )
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-5">
                <SectionHeader
                  icon={<Building2 size={17} />}
                  title="Bank accounts"
                  subtitle="Accounts parents can pay into for this circular."
                  actionLabel="Add bank"
                  onAction={openAddBank}
                />

                {form.banks.filter((b) => b.bank_name).length === 0 ? (
                  <EmptyState icon={<Building2 size={26} />} title="No bank accounts yet" subtitle="Click Add bank to register payment accounts." />
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {form.banks
                      .map((b, i) => ({ b, i }))
                      .filter(({ b }) => b.bank_name)
                      .map(({ b, i }) => (
                        <div key={`${b.bank_name}-${i}`} className="rounded-2xl border border-navy/10 bg-white p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-base font-semibold text-navy">{b.bank_name}</p>
                              <p className="mt-2 text-sm text-navy/55">Account - {b.account_no || '-'}</p>
                              <p className="text-sm text-navy/55">Name - {b.account_name || '-'}</p>
                              {b.is_primary ? (
                                <span className="mt-3 inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold text-navy">
                                  Primary
                                </span>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <CardIconButton label="Edit bank" onClick={() => openEditBank(i)}>
                                <Pencil size={15} />
                              </CardIconButton>
                              <CardIconButton
                                label="Remove bank"
                                danger
                                onClick={() => update('banks', form.banks.filter((_, idx) => idx !== i))}
                              >
                                <Trash2 size={15} />
                              </CardIconButton>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-4">
                <p className="text-sm text-navy/55">
                  Signature and stamp load automatically from organization registration. Replace in School Assets if needed.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-navy/10 p-6 text-center">
                    <p className="text-sm font-semibold text-navy">Director signature</p>
                    {branding?.signatureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={branding.signatureUrl} alt="Signature" className="mx-auto mt-3 h-24 object-contain" />
                    ) : (
                      <p className="mt-3 text-xs text-navy/40">Not set in IAM yet</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-navy/10 p-6 text-center">
                    <p className="text-sm font-semibold text-navy">School stamp</p>
                    {branding?.stampUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={branding.stampUrl} alt="Stamp" className="mx-auto mt-3 h-24 object-contain" />
                    ) : (
                      <p className="mt-3 text-xs text-navy/40">Not set in IAM yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-5">
                <SectionHeader
                  icon={<Users size={17} />}
                  title="School leaders"
                  subtitle="Add as many leaders as you need for this circular."
                  actionLabel="Add leader"
                  onAction={openAddLeader}
                />

                {form.leaders.filter((l) => l.name.trim()).length === 0 && form.leaders.length === 0 ? (
                  <EmptyState icon={<Users size={26} />} title="No leaders yet" subtitle="Click Add leader to include leadership contacts." />
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {form.leaders.map((l, i) => (
                      <div key={`${l.name}-${l.role}-${i}`} className="rounded-2xl border border-navy/10 bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-navy">{l.name || 'Untitled leader'}</p>
                            <p className="mt-0.5 text-sm text-navy/55">{l.role || '-'}</p>
                            {l.phone ? <p className="mt-2 text-xs text-navy/60">Phone - {l.phone}</p> : null}
                            {l.email ? <p className="text-xs text-navy/60">Email - {l.email}</p> : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <CardIconButton label="Edit leader" onClick={() => openEditLeader(i)}>
                              <Pencil size={15} />
                            </CardIconButton>
                            <CardIconButton
                              label="Remove leader"
                              danger
                              onClick={() => update('leaders', form.leaders.filter((_, idx) => idx !== i))}
                            >
                              <Trash2 size={15} />
                            </CardIconButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 8 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-navy/10 bg-navy/[0.03] p-5">
                  <h4 className="text-sm font-semibold text-navy">Summary</h4>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-navy/45">Class</dt>
                      <dd className="font-semibold text-navy">{form.classes.join(', ') || form.className}</dd>
                    </div>
                    <div>
                      <dt className="text-navy/45">Term</dt>
                      <dd className="font-semibold text-navy">
                        {form.term} - {form.academicYear}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-navy/45">Category</dt>
                      <dd className="font-semibold text-navy">{form.schoolCategory || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-navy/45">Total fee (via bank)</dt>
                      <dd className="font-semibold text-navy">{totalFee.toLocaleString()} RWF</dd>
                    </div>
                    <div>
                      <dt className="text-navy/45">Total paid at school</dt>
                      <dd className="font-semibold text-navy">{paidAtSchoolTotal.toLocaleString()} RWF</dd>
                    </div>
                    <div>
                      <dt className="text-navy/45">Requirements</dt>
                      <dd className="font-semibold text-navy">{form.requirements.length} items</dd>
                    </div>
                    <div>
                      <dt className="text-navy/45">Banks</dt>
                      <dd className="font-semibold text-navy">{form.banks.filter((b) => b.bank_name).length} accounts</dd>
                    </div>
                  </dl>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openParentPreview}
                    className="inline-flex items-center gap-2 rounded-2xl bg-navy px-5 py-3 text-sm font-bold text-primary shadow-sm transition hover:bg-navy-light"
                  >
                    <Eye size={16} /> Open parent preview
                  </button>
                  <p className="w-full text-xs text-muted sm:w-auto sm:self-center">
                    Same View &amp; Print letter layout - works on draft before publish.
                  </p>
                </div>
              </div>
            )}
          </HrStepWizard>
        </div>
      </div>

      {previewOpen ? (
        <OfficialDocModal
          draftCircular={wizardFormToDraftCircular(form, { id: circularId, version })}
          previewOnly
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}

      {paymentModal ? (
        <Modal
          title={paymentEditIndex !== null ? 'Edit payment' : 'Add payment'}
          onClose={() => setPaymentModal(false)}
        >
          <Field label="Payment name *" value={paymentDraft.name} onChange={(v) => setPaymentDraft((d) => ({ ...d, name: v }))} />
          <Field
            label="Amount (RWF) *"
            value={String(paymentDraft.amount || '')}
            onChange={(v) => setPaymentDraft((d) => ({ ...d, amount: Number(v) || 0 }))}
          />
          <SelectField
            label="Channel"
            value={paymentDraft.pay_channel}
            options={PAYMENT_CHANNEL_OPTIONS}
            onChange={(v) => setPaymentDraft((d) => ({ ...d, pay_channel: v as 'school' | 'babyeyi' }))}
          />
          <ModalActions
            onCancel={() => setPaymentModal(false)}
            onConfirm={savePayment}
            confirmLabel={paymentEditIndex !== null ? 'Save payment' : 'Add payment'}
          />
        </Modal>
      ) : null}

      {requirementModal ? (
        <Modal
          title={requirementEditIndex !== null ? 'Edit requirement' : 'Add requirement'}
          onClose={() => {
            setRequirementModal(false);
            setRequirementEditIndex(null);
          }}
        >
          <Field
            label="Requirement name *"
            value={requirementDraft.item}
            onChange={(v) => setRequirementDraft((d) => ({ ...d, item: v }))}
          />
          <div>
            <label className="text-xs font-semibold text-navy">Description (optional)</label>
            <textarea
              className="input mt-1 min-h-[64px] max-h-28 resize-y"
              value={requirementDraft.description}
              onChange={(e) => setRequirementDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </div>
          <Field
            label="Quantity *"
            value={requirementDraft.quantity}
            onChange={(v) => setRequirementDraft((d) => ({ ...d, quantity: v }))}
          />
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-navy/10 bg-navy/[0.02] px-3 py-2.5">
            <input
              type="checkbox" 
              className="mt-0.5 h-4 w-4 shrink-0"
              checked={requirementDraft.pay_channel === 'school'}
              onChange={(e) =>
                setRequirementDraft((d) => ({
                  ...d,
                  pay_channel: e.target.checked ? 'school' : 'babyeyi',
                  unitPrice: e.target.checked ? d.unitPrice : 0,
                }))
              }
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-navy">Paid to School Account</span>
              <span className="mt-0.5 block text-xs leading-snug text-navy/55">
                {requirementDraft.pay_channel === 'school'
                  ? 'School fee — set unit price below. Not imported to ShuleKit.'
                  : 'Other Requirement — imported to ShuleKit; Super Admin sets the kit price.'}
              </span>
            </span>
          </label>
          {requirementDraft.pay_channel === 'school' ? (
            <>
              <Field
                label="Unit Price (RWF) *"
                value={String(requirementDraft.unitPrice || '')}
                onChange={(v) => setRequirementDraft((d) => ({ ...d, unitPrice: Number(v) || 0 }))}
              />
              <div className="rounded-xl bg-navy/[0.03] px-3 py-2.5 text-sm">
                <span className="text-navy/55">Line total — </span>
                <span className="font-semibold text-navy">
                  {(
                    (Number(requirementDraft.quantity) || 1) * (Number(requirementDraft.unitPrice) || 0)
                  ).toLocaleString()}{' '}
                  RWF
                </span>
              </div>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-navy/15 bg-navy/[0.02] px-3 py-2.5 text-xs leading-snug text-navy/60">
              No unit price here.
            </p>
          )}
          <ModalActions
            onCancel={() => {
              setRequirementModal(false);
              setRequirementEditIndex(null);
            }}
            onConfirm={saveRequirement}
            confirmLabel={requirementEditIndex !== null ? 'Save requirement' : 'Add requirement'}
          />
        </Modal>
      ) : null}

      {bankModal ? (
        <Modal
          title={bankEditIndex !== null ? 'Edit bank account' : 'Add bank account'}
          onClose={resetBankModal}
        >
          <SelectField
            label="Bank name *"
            value={bankPicker}
            options={RWANDA_BANKS}
            placeholder="Select bank"
            onChange={(v) => {
              setBankPicker(v);
              if (v !== BANK_OTHERS) setOtherBankName('');
            }}
          />
          {bankPicker === BANK_OTHERS ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
              <Field
                label="Other bank name *"
                value={otherBankName}
                onChange={setOtherBankName}
                placeholder="Enter bank name"
              />
            </div>
          ) : null}
          <Field
            label="Account number"
            value={bankDraft.account_no}
            onChange={(v) => setBankDraft((d) => ({ ...d, account_no: v }))}
          />
          <Field
            label="Account name"
            value={bankDraft.account_name}
            onChange={(v) => setBankDraft((d) => ({ ...d, account_name: v }))}
            placeholder={branding?.schoolName ?? 'School name'}
          />
          <ModalActions
            onCancel={resetBankModal}
            onConfirm={saveBank}
            confirmLabel={bankEditIndex !== null ? 'Save bank' : 'Add bank'}
          />
        </Modal>
      ) : null}

      {ruleModal ? (
        <Modal title={ruleEditIndex !== null ? 'Edit school rule' : 'Add school rule'} onClose={() => setRuleModal(false)}>
          <div>
            <label className="text-xs font-semibold text-navy">Rule *</label>
            <textarea
              className="input mt-1 min-h-[72px]"
              value={ruleDraft}
              onChange={(e) => setRuleDraft(e.target.value)}
            />
          </div>
          <ModalActions
            onCancel={() => setRuleModal(false)}
            onConfirm={saveRule}
            confirmLabel={ruleEditIndex !== null ? 'Save rule' : 'Add rule'}
          />
        </Modal>
      ) : null}

      {leaderModal ? (
        <Modal title={leaderEditIndex !== null ? 'Edit leader' : 'Add leader'} onClose={() => setLeaderModal(false)}>
          <Field label="Name *" value={leaderDraft.name} onChange={(v) => setLeaderDraft((d) => ({ ...d, name: v }))} />
          <Field label="Role *" value={leaderDraft.role} onChange={(v) => setLeaderDraft((d) => ({ ...d, role: v }))} />
          <Field label="Phone" value={leaderDraft.phone ?? ''} onChange={(v) => setLeaderDraft((d) => ({ ...d, phone: v }))} />
          <Field label="Email" value={leaderDraft.email ?? ''} onChange={(v) => setLeaderDraft((d) => ({ ...d, email: v }))} />
          <ModalActions
            onCancel={() => setLeaderModal(false)}
            onConfirm={saveLeader}
            confirmLabel={leaderEditIndex !== null ? 'Save leader' : 'Add leader'}
          />
        </Modal>
      ) : null}

      {announceModal ? (
        <Modal title="Important announcement" onClose={() => setAnnounceModal(false)}>
          <Field
            label="Title *"
            value={announceDraft.title}
            onChange={(v) => setAnnounceDraft((d) => ({ ...d, title: v }))}
          />
          <Field
            label="Detail"
            value={announceDraft.detail}
            onChange={(v) => setAnnounceDraft((d) => ({ ...d, detail: v }))}
          />
          <ModalActions
            onCancel={() => setAnnounceModal(false)}
            onConfirm={() => {
              if (!announceDraft.title.trim()) return;
              update('includeAnnouncements', true);
              update('announcements', [
                ...form.announcements,
                { title: announceDraft.title.trim(), detail: announceDraft.detail.trim() || undefined },
              ]);
              setAnnounceDraft({ title: '', detail: '' });
              setAnnounceModal(false);
            }}
            confirmLabel="Add announcement"
          />
        </Modal>
      ) : null}
    </div>
  );
}

/* ---------- shared bits ---------- */

function SmartFeeChecker({
  totalFee,
  nesaLimit,
  tuitionMax,
  gaMax,
  policyLoaded,
  payments,
  isPrivate,
  overNesa,
  className,
  educationLevel,
  term,
  category,
  requestIncrease,
  onRequestIncreaseChange,
}: {
  totalFee: number;
  nesaLimit: number | null;
  tuitionMax: number | null;
  gaMax: number | null;
  policyLoaded: boolean;
  payments: PaymentLine[];
  isPrivate: boolean;
  overNesa: boolean;
  className: string;
  educationLevel: string;
  term: string;
  category: string;
  requestIncrease: boolean;
  onRequestIncreaseChange: (v: boolean) => void;
}) {
  const bankPayments = payments.filter((p) => (p.pay_channel ?? 'babyeyi') === 'babyeyi');
  const tuitionEntered = bankPayments
    .filter((p) => /tuition|school fee|fees?/i.test(p.name))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const gaEntered = bankPayments
    .filter((p) => /general\s*assembly|assembl-e|assembly/i.test(p.name))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const tuitionOk = tuitionMax == null || tuitionEntered <= 0 || tuitionEntered <= tuitionMax;
  const gaOk = gaMax == null || gaEntered <= 0 || gaEntered <= gaMax;

  if (isPrivate) {
    return (
      <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-navy/[0.06] bg-gradient-to-br from-navy/[0.04] to-transparent px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-primary">
              <ShieldCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-navy">Smart Checker</p>
              <p className="mt-0.5 text-xs text-navy/50">
                Private fee scope - Fees limit policy engine not applied
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Unlimited
          </span>
        </div>
        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
          <div className="rounded-xl bg-navy/[0.03] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-navy/40">Current total</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-navy">{totalFee.toLocaleString()} RWF</p>
          </div>
          <div className="rounded-xl bg-navy/[0.03] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-navy/40">Scope</p>
            <p className="mt-1 text-sm font-semibold text-navy">
              {category || 'Private'} - {className || '-'} - {term || '-'}
            </p>
            <p className="mt-1 text-xs text-navy/45">Enter any payment amounts parents should pay.</p>
          </div>
        </div>
      </div>
    );
  }

  if (nesaLimit === null) {
    return (
      <div className="overflow-hidden rounded-2xl border border-dashed border-navy/15 bg-navy/[0.02] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy/40">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-navy">Smart Checker</p>
            <p className="text-xs text-navy/50">
              Select education level, class, and term to load active NESA tuition + General Assembly limits.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pct = nesaLimit > 0 ? Math.min(100, Math.round((totalFee / nesaLimit) * 100)) : 0;
  const remaining = Math.max(0, nesaLimit - totalFee);
  const excess = Math.max(0, totalFee - nesaLimit);
  const within = !overNesa;
  const barColor = overNesa ? 'bg-rose-500' : pct >= 90 ? 'bg-amber-400' : 'bg-emerald-500';
  const tone = overNesa
    ? {
        badge: 'bg-rose-50 text-rose-800',
        dot: 'bg-rose-500',
        label: 'Over limit',
        icon: <AlertTriangle size={18} />,
        iconWrap: 'bg-rose-500 text-white',
      }
    : {
        badge: 'bg-emerald-50 text-emerald-800',
        dot: 'bg-emerald-500',
        label: totalFee === nesaLimit ? 'At limit' : 'Within limit',
        icon: <CheckCircle2 size={18} />,
        iconWrap: 'bg-emerald-500 text-white',
      };

  return (
    <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-navy/[0.06] bg-gradient-to-br from-navy/[0.04] to-transparent px-5 py-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.iconWrap}`}>
            {tone.icon}
          </div>
          <div>
            <p className="text-sm font-bold text-navy">Smart Checker</p>
            <p className="mt-0.5 text-xs text-navy/50">
              Fees limit Policy Engine - {educationLevel || 'Level'} - {className || 'Class'} - {term || 'Term'} -{' '}
              {category || 'Public'}
            </p>
            {policyLoaded ? (
              <p className="mt-1 text-[11px] font-semibold text-emerald-700">Policy loaded successfully</p>
            ) : null}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {tone.label}
        </span>
      </div>

      <div className="space-y-4 px-5 py-4">
        {(tuitionMax != null || gaMax != null) && (
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-navy/10 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-navy/40">Tuition max</p>
              <p className="text-sm font-bold tabular-nums text-navy">
                {tuitionMax != null ? `${tuitionMax.toLocaleString()} RWF` : '-'}
              </p>
              <p className={`text-[11px] font-semibold ${tuitionOk ? 'text-emerald-700' : 'text-rose-600'}`}>
                {tuitionEntered > 0 ? (tuitionOk ? 'VALID' : 'OVER LIMIT') : '-'}
              </p>
            </div>
            <div className="rounded-xl border border-navy/10 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-navy/40">General Assembly</p>
              <p className="text-sm font-bold tabular-nums text-navy">
                {gaMax != null ? `${gaMax.toLocaleString()} RWF` : '-'}
              </p>
              <p className={`text-[11px] font-semibold ${gaOk ? 'text-emerald-700' : 'text-rose-600'}`}>
                {gaEntered > 0 ? (gaOk ? 'VALID' : 'OVER LIMIT') : '-'}
              </p>
            </div>
            <div className="rounded-xl border border-navy/10 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-navy/40">Combined max</p>
              <p className="text-sm font-bold tabular-nums text-navy">{nesaLimit.toLocaleString()} RWF</p>
              <p className={`text-[11px] font-semibold ${within ? 'text-emerald-700' : 'text-rose-600'}`}>
                {within ? 'READY' : 'REQUEST APPROVAL'}
              </p>
            </div>
          </div>
        )}

        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-navy/45">Usage vs NESA limit</span>
            <span className={`tabular-nums ${overNesa ? 'text-rose-600' : 'text-navy'}`}>{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-navy/[0.06]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl bg-navy/[0.03] px-3 py-3 sm:px-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-navy/40">NESA limit</p>
            <p className="mt-1 text-base font-bold tabular-nums text-navy sm:text-lg">
              {nesaLimit.toLocaleString()}
            </p>
            <p className="text-[10px] text-navy/40">RWF</p>
          </div>
          <div className="rounded-xl bg-navy/[0.03] px-3 py-3 sm:px-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-navy/40">Total fees</p>
            <p className={`mt-1 text-base font-bold tabular-nums sm:text-lg ${overNesa ? 'text-rose-600' : 'text-navy'}`}>
              {totalFee.toLocaleString()}
            </p>
            <p className="text-[10px] text-navy/40">RWF</p>
          </div>
          <div className="rounded-xl bg-navy/[0.03] px-3 py-3 sm:px-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-navy/40">
              {overNesa ? 'Excess' : 'Remaining'}
            </p>
            <p
              className={`mt-1 text-base font-bold tabular-nums sm:text-lg ${
                overNesa ? 'text-rose-600' : within ? 'text-emerald-700' : 'text-navy'
              }`}
            >
              {(overNesa ? excess : remaining).toLocaleString()}
            </p>
            <p className="text-[10px] text-navy/40">RWF</p>
          </div>
        </div>

        {overNesa ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 transition hover:bg-rose-50">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={requestIncrease}
              onChange={(e) => onRequestIncreaseChange(e.target.checked)}
            />
            <span className="text-sm text-rose-900">
              <span className="font-semibold">Request NESA increase approval</span>
              <span className="mt-0.5 block text-xs text-rose-800/75">
                Total exceeds the limit by {excess.toLocaleString()} RWF. Tick this to route DEO ? NESA.
              </span>
            </span>
          </label>
        ) : (
          <p className="text-xs text-navy/45">
            Fees are within the approved NESA ceiling for this class and term.
          </p>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold text-navy">
          {icon ? <span className="text-navy/45">{icon}</span> : null}
          {title}
        </h4>
        {subtitle ? <p className="mt-0.5 text-sm text-navy/55">{subtitle}</p> : null}
      </div>
      <button type="button" onClick={onAction} className="btn-primary text-sm">
        <Plus size={16} /> {actionLabel}
      </button>
    </div>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-navy/15 bg-navy/[0.015] px-6 py-12 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-navy/5 text-navy/35">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-navy">{title}</p>
      {subtitle ? <p className="mt-1 text-xs text-navy/45">{subtitle}</p> : null}
    </div>
  );
}

function ListRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-navy/10 bg-white p-4">
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/45 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
      <div className="relative z-10 flex max-h-[min(92dvh,100%)] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-navy/10 px-4 py-3 sm:px-5 sm:py-4">
          <h3 className="pr-2 text-sm font-semibold text-navy">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-navy/45 hover:bg-navy/5 hover:text-navy"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 sm:space-y-4 sm:px-5 sm:py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-1 flex flex-col-reverse gap-2 border-t border-navy/5 bg-white px-4 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:px-0 sm:pt-2 sm:pb-0">
      <button type="button" onClick={onCancel} className="btn-secondary w-full text-sm sm:w-auto">
        Cancel
      </button>
      <button type="button" onClick={onConfirm} className="btn-primary w-full text-sm sm:w-auto">
        {confirmLabel}
      </button>
    </div>
  );
}

function CardIconButton({
  children,
  onClick,
  label,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg border border-navy/10 p-1.5 transition-colors ${
        danger ? 'text-navy/40 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600' : 'text-navy/50 hover:bg-navy/5'
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-navy">{label}</label>
      <input
        className="input mt-1"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: string[] | Array<{ value: string; label: string }>;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const normalized = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <div>
      <label className="text-xs font-semibold text-navy">{label}</label>
      <select className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}