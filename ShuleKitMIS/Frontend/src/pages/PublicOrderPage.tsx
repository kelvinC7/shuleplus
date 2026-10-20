import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Card,
  CardActionArea,
  Stack,
  Radio,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import ChecklistIcon from '@mui/icons-material/Checklist';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import StorefrontIcon from '@mui/icons-material/Storefront';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import EditIcon from '@mui/icons-material/Edit';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import BackpackOutlinedIcon from '@mui/icons-material/BackpackOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CloseIcon from '@mui/icons-material/Close';
import {
  publicClaimParent,
  publicCreatePlatformOrder,
  publicGetAcademicSettings,
  publicGetSettings,
  publicListProducts,
  publicListStandardKits,
  publicLookupStudent,
  type PublicAcademicSettings,
  type PublicProduct,
  type PublicStandardKit,
} from '@/services/api';
import { downloadReceiptPdf, statusChip } from '@/utils/receipt.tsx';
import { mapGradeLevel } from '@/shared/grade';
import studentsImg from '@/assets/students.png';
import type { Kit, KitRequest, LookupResult, ParentRelation } from '@/types';

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? 'http://localhost:3038/api').replace(/\/api\/?$/, '');

/** Resolve product/kit image URLs for the public FE (absolute or /uploads relative). */
function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^(https?:|data:)/i.test(url)) return url;
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`;
  return url;
}

type Step = 'search' | 'items' | 'delivery' | 'payment' | 'done';
type PaymentMethod = 'MOBILE_MONEY' | 'CARD';
type OrderPath = 'standard' | 'custom';
type FlowStage = 'choose' | 'order';

interface ItemSelection {
  selected: boolean;
  quantity: number;
}

/** Adapt a platform StandardKit into the legacy Kit shape used by this wizard UI. */
function standardKitToKit(kit: PublicStandardKit): Kit {
  const amount = kit.pricingRules?.[0]
    ? Number(kit.pricingRules[0].sellingPrice)
    : Number(kit.totalAmount);
  return {
    id: kit.id,
    organizationId: kit.organizationId ?? '',
    name: kit.name,
    gradeLevel: kit.className,
    description: kit.description,
    imageUrl: kit.imageUrl,
    amount: String(amount),
    status: 'ACTIVE',
    createdAt: '',
    updatedAt: '',
    academicYear: kit.academicYear,
    term: kit.term,
    requirements: kit.items.map((i) => ({
      id: i.id,
      kitId: kit.id,
      organizationId: kit.organizationId ?? '',
      title: i.title,
      quantity: i.quantity,
      unitPrice: String(i.unitPrice),
      imageUrl: i.imageUrl,
      notes: i.description,
      createdAt: '',
      updatedAt: '',
    })),
  };
}

function productsToKit(products: PublicProduct[]): Kit {
  return {
    id: 'custom-catalog',
    organizationId: '',
    name: 'Custom Kit',
    gradeLevel: 'Custom',
    description: 'Build your own kit from the platform catalog.',
    imageUrl: null,
    amount: '0',
    status: 'ACTIVE',
    createdAt: '',
    updatedAt: '',
    requirements: products.map((p) => {
      const price = p.pricingRules?.[0] ? Number(p.pricingRules[0].sellingPrice) : Number(p.unitPrice);
      return {
        id: p.id,
        kitId: 'custom-catalog',
        organizationId: '',
        title: p.name,
        quantity: 1,
        unitPrice: String(price),
        imageUrl: resolveMediaUrl(p.imageUrl),
        notes: p.description,
        createdAt: '',
        updatedAt: '',
      };
    }),
  };
}

function initSelectionsFor(kit: Kit | null, selectedDefault = true): Record<string, ItemSelection> {
  if (!kit) return {};
  const out: Record<string, ItemSelection> = {};
  for (const r of kit.requirements) {
    out[r.id] = { selected: selectedDefault, quantity: Math.max(1, r.quantity) };
  }
  return out;
}

function uniqueRequirements(reqs: Kit['requirements']): Kit['requirements'] {
  return Array.from(new Map(reqs.map((r) => [r.id, r])).values());
}

const glassSx = {
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.6)',
  bgcolor: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 16px 48px rgba(0,31,63,0.1)',
};

function shuleCodeOf(student: LookupResult): string {
  return student.shuleCode ?? student.studentUid ?? student.studentCode ?? student.sdmCode ?? '—';
}

function StudentProfileHeader({ student }: { student: LookupResult }) {
  return (
    <Box
      sx={{
        bgcolor: 'accent.main',
        px: { xs: 3, md: 4 },
        py: 1.25,
        mx: { xs: -3, md: -4 },
        mt: { xs: -3, md: -4 },
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        borderBottom: '1px solid rgba(0,17,33,0.12)',
      }}
    >
      <Avatar
        src={student.photoUrl ?? undefined}
        alt={student.fullName}
        slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
        sx={{ width: 40, height: 40, bgcolor: '#fff', color: 'accent.main', fontWeight: 800, fontSize: 16, border: '1.5px solid rgba(255,255,255,0.8)' }}
      >
        {student.fullName.charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, color: '#001121', fontSize: '0.95rem', lineHeight: 1.3 }}>{student.fullName}</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 2, mt: 0.5 }}>
          <Typography sx={{ color: 'rgba(0,17,33,0.65)', fontWeight: 600, fontSize: '0.72rem', lineHeight: 1.3 }}>
            School: <b style={{ color: '#001121' }}>{student.schoolName}</b>
          </Typography>
          <Typography sx={{ color: 'rgba(0,17,33,0.65)', fontWeight: 600, fontSize: '0.72rem', lineHeight: 1.3 }}>
            District: <b style={{ color: '#001121' }}>{student.district ?? '—'}</b>
          </Typography>
          <Typography sx={{ color: 'rgba(0,17,33,0.65)', fontWeight: 600, fontSize: '0.72rem', lineHeight: 1.3 }}>
            Class: <b style={{ color: '#001121' }}>{student.classLabel ?? student.className ?? 'No class'}</b>
          </Typography>
          <Typography sx={{ color: 'rgba(0,17,33,0.65)', fontWeight: 600, fontSize: '0.72rem', lineHeight: 1.3 }}>
            ShuleCode: <b style={{ color: '#001121' }}>{shuleCodeOf(student)}</b>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

const STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'search', label: 'ShuleCode', icon: <PersonSearchIcon sx={{ fontSize: 15 }} /> },
  { id: 'items', label: 'Choose kit', icon: <ChecklistIcon sx={{ fontSize: 15 }} /> },
  { id: 'delivery', label: 'Delivery', icon: <LocalShippingIcon sx={{ fontSize: 15 }} /> },
  { id: 'payment', label: 'Payment', icon: <PaymentIcon sx={{ fontSize: 15 }} /> },
];

function StepDots({ current }: { current: number }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
      {STEPS.map((s, i) => (
        <Fragment key={s.id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                bgcolor: i < current ? 'accent.main' : i === current ? 'primary.main' : 'rgba(0,31,63,0.08)',
                color: i < current || i === current ? '#fff' : 'rgba(0,31,63,0.4)',
                transition: 'background-color 0.2s ease',
              }}
            >
              {i < current ? '✓' : s.icon}
            </Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: i === current ? 700 : 500,
                color: i <= current ? 'primary.main' : 'rgba(0,31,63,0.4)',
                display: { xs: 'none', sm: 'block' },
              }}
            >
              {s.label}
            </Typography>
          </Box>
          {i < STEPS.length - 1 && (
            <Box sx={{ width: 18, height: 1, bgcolor: i < current ? 'accent.main' : 'rgba(0,31,63,0.12)' }} />
          )}
        </Fragment>
      ))}
    </Box>
  );
}

function StepHeading({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <Box sx={{ mb: 2.5, textAlign: 'left' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, color: 'primary.main' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)', mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

export default function PublicOrderPage() {
  const [step, setStep] = useState<Step>('search');
  const [studentCode, setStudentCode] = useState('');
  const [student, setStudent] = useState<LookupResult | null>(null);
  const [kits, setKits] = useState<Kit[]>([]);
  const [kitsLoading, setKitsLoading] = useState(false);
  const [kitCatalog, setKitCatalog] = useState<PublicStandardKit[]>([]);
  const [orgAcademicSettings, setOrgAcademicSettings] = useState<PublicAcademicSettings | null>(null);
  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterKitId, setFilterKitId] = useState('');
  const [selectedKitId, setSelectedKitId] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [itemSelections, setItemSelections] = useState<Record<string, ItemSelection>>({});
  const [deliveryMethod, setDeliveryMethod] = useState<'AT_SCHOOL' | 'AT_HOME'>('AT_SCHOOL');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOBILE_MONEY');
  const [notes, setNotes] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<KitRequest | null>(null);
  const [paymentLabel, setPaymentLabel] = useState('');
  const [mobileView, setMobileView] = useState<'banner' | 'form'>('banner');
  const [flowStage, setFlowStage] = useState<FlowStage>('choose');
  const [orderPath, setOrderPath] = useState<OrderPath>('standard');
  const [homeDeliveryFee, setHomeDeliveryFee] = useState(2500);
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [imagePreview, setImagePreview] = useState<{ url: string; title: string } | null>(null);
  const [imageZoom, setImageZoom] = useState(1);

  const openProductImage = useCallback((url: string, title: string) => {
    setImagePreview({ url, title });
    setImageZoom(1);
  }, []);

  const closeProductImage = useCallback(() => {
    setImagePreview(null);
    setImageZoom(1);
  }, []);

  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [parentStep, setParentStep] = useState<'form' | 'consent'>('form');
  const [pFirstName, setPFirstName] = useState('');
  const [pLastName, setPLastName] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pEmail, setPEmail] = useState('');
  const [pRole, setPRole] = useState<ParentRelation>('GUARDIAN');
  const [pSending, setPSending] = useState(false);
  const [manualParent, setManualParent] = useState<{ name: string; phone: string; role: ParentRelation } | null>(null);

  const lookupParent = student?.parents[0] ?? null;
  const effectiveParent = manualParent ?? lookupParent;
  const selectedKit = kits.find((k) => k.id === selectedKitId) ?? null;
  const homeFee = deliveryMethod === 'AT_HOME' ? homeDeliveryFee : 0;
  const hasPricedItems = selectedKit?.requirements.some((r) => Number(r.unitPrice) > 0) ?? false;
  const selectedItemCount = selectedKit
    ? selectedKit.requirements.filter((r) => (itemSelections[r.id] ?? { selected: true }).selected).length
    : 0;

  const subtotal = (() => {
    if (!selectedKit) return 0;
    if (!hasPricedItems) return Number(selectedKit.amount);
    return selectedKit.requirements.reduce((sum, r) => {
      if (Number(r.unitPrice) <= 0) return sum;
      const sel = itemSelections[r.id] ?? { selected: true, quantity: Math.max(1, r.quantity) };
      return sel.selected ? sum + Number(r.unitPrice) * Math.max(1, sel.quantity) : sum;
    }, 0);
  })();
  const total = subtotal + homeFee;

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  const yearOptions = useMemo(() => {
    const years = [
      ...(orgAcademicSettings?.academicYears ?? []),
      ...kitCatalog.map((k) => k.academicYear),
      student?.academicYear,
      filterYear,
    ].filter(Boolean) as string[];
    return [...new Set(years)].sort();
  }, [kitCatalog, student?.academicYear, filterYear, orgAcademicSettings?.academicYears]);

  const termOptions = useMemo(() => {
    const terms = [
      ...(orgAcademicSettings?.terms ?? []),
      ...kitCatalog.map((k) => k.term),
      student?.term,
      filterTerm,
    ].filter(Boolean) as string[];
    return [...new Set(terms)].sort();
  }, [kitCatalog, student?.term, filterTerm, orgAcademicSettings?.terms]);

  const kitOptions = useMemo(() => {
    return kitCatalog
      .filter((k) => {
        if (filterYear && k.academicYear.toLowerCase() !== filterYear.toLowerCase()) return false;
        if (filterTerm && k.term.toLowerCase() !== filterTerm.toLowerCase()) return false;
        return true;
      })
      .map((k) => ({
        id: k.id,
        label: `${k.className} · ${k.name}`.replace(/\s+/g, ' ').trim(),
        className: k.className,
      }));
  }, [kitCatalog, filterYear, filterTerm]);

  const displayedKits = useMemo(() => {
    if (!filterKitId) return kits;
    return kits.filter((k) => k.id === filterKitId);
  }, [kits, filterKitId]);

  const loadStandardKits = useCallback(
    async (opts: {
      organizationId: string;
      academicYear?: string;
      term?: string;
      className?: string;
      preferClass?: string;
    }) => {
      setKitsLoading(true);
      try {
        const std = await publicListStandardKits({
          organizationId: opts.organizationId,
          academicYear: opts.academicYear || undefined,
          term: opts.term || undefined,
          className: opts.className || undefined,
        }).catch(() => [] as PublicStandardKit[]);

        let available = std.map(standardKitToKit);
        // If year/term filters yield nothing, fall back to ShuleKit list so parents can adjust filters.
        if (available.length === 0 && (opts.academicYear || opts.term || opts.className)) {
          const fallback = await publicListStandardKits({ organizationId: opts.organizationId }).catch(
            () => [] as PublicStandardKit[]
          );
          // Keep catalog for filter options; do not auto-show unfiltered kits when filters are set.
          setKitCatalog(fallback);
          available = [];
        } else if (available.length > 0) {
          setKitCatalog((prev) => {
            const byId = new Map(prev.map((k) => [k.id, k]));
            for (const k of std) byId.set(k.id, k);
            return [...byId.values()];
          });
        }

        setKits(available);
        const prefer = (opts.preferClass ?? opts.className ?? '').toLowerCase();
        const preferred =
          available.find((k) => k.gradeLevel.toLowerCase() === prefer) ?? available[0] ?? null;
        setSelectedKitId(preferred?.id ?? '');
      } finally {
        setKitsLoading(false);
      }
    },
    []
  );

  const paymentMethodLabel: Record<PaymentMethod, string> = {
    MOBILE_MONEY: 'Mobile Money',
    CARD: 'Card',
  };

  const relationLabels: Record<ParentRelation, string> = {
    FATHER: 'Father',
    MOTHER: 'Mother',
    GUARDIAN: 'Guardian',
  };

  // Step 1: look up the student, but stay on this step so the parent can confirm who they found
  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const code = studentCode.trim();
    if (!code) return;
    setLookingUp(true);
    setError(null);
    setStudent(null);
    setKits([]);
    setSelectedKitId('');
    setItemSelections({});
    try {
      const found = await publicLookupStudent(code);
      setStudent(found);

      const [settings, academic] = await Promise.all([
        publicGetSettings().catch(() => null),
        publicGetAcademicSettings(found.organizationId).catch(() => null),
      ]);
      if (settings) setHomeDeliveryFee(Number(settings.homeDeliveryFee) || 2500);
      setOrgAcademicSettings(academic);

      if (orderPath === 'custom') {
        const products = await publicListProducts().catch(() => [] as PublicProduct[]);
        const customKit = productsToKit(products);
        setKits([customKit]);
        setSelectedKitId(customKit.id);
        setItemSelections(initSelectionsFor(customKit, false));
      } else {
        const className = found.classLabel ?? found.className ?? undefined;
        const year = found.academicYear || academic?.currentAcademicYear || '';
        const termVal = found.term || academic?.currentTerm || '';
        setFilterYear(year);
        setFilterTerm(termVal);
        setFilterKitId('');

        const catalog = await publicListStandardKits({ organizationId: found.organizationId }).catch(
          () => [] as PublicStandardKit[]
        );
        setKitCatalog(catalog);

        await loadStandardKits({
          organizationId: found.organizationId,
          academicYear: year || undefined,
          term: termVal || undefined,
          preferClass: className,
        });
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Student not found. Check the code and try again.'
      );
    } finally {
      setLookingUp(false);
    }
  }

  function clearStudent() {
    setStudent(null);
    setKits([]);
    setKitCatalog([]);
    setOrgAcademicSettings(null);
    setFilterYear('');
    setFilterTerm('');
    setFilterKitId('');
    setSelectedKitId('');
    setItemSelections({});
    setReviewing(false);
    setError(null);
  }

  useEffect(() => {
    if (orderPath !== 'standard' || !student || step !== 'items' || reviewing) return;
    void loadStandardKits({
      organizationId: student.organizationId,
      academicYear: filterYear || undefined,
      term: filterTerm || undefined,
      preferClass: student.classLabel ?? student.className ?? undefined,
    });
    // filterKitId is applied client-side on displayedKits
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when year/term filters change
  }, [filterYear, filterTerm, orderPath, student?.organizationId, step, reviewing, loadStandardKits]);

  useEffect(() => {
    if (!filterKitId || !displayedKits.length) return;
    if (!displayedKits.some((k) => k.id === selectedKitId)) {
      setSelectedKitId(filterKitId);
    }
  }, [filterKitId, displayedKits, selectedKitId]);

  function confirmStudent() {
    setError(null);
    setStep('items');
  }

  function pickKit(kit: Kit) {
    setSelectedKitId(kit.id);
    setError(null);
  }

  function goToKitDetails() {
    if (!selectedKit) {
      setError(orderPath === 'custom' ? 'No products available yet.' : 'Please select a kit first.');
      return;
    }
    setError(null);
    if (orderPath === 'custom') {
      const anySelected = Object.values(itemSelections).some((s) => s.selected);
      if (!anySelected) {
        setError('Select at least one product for your custom kit.');
        return;
      }
      setReviewing(true);
      return;
    }
    setItemSelections(initSelectionsFor(selectedKit, true));
    setReviewing(true);
  }

  function toggleItem(requirementId: string) {
    setItemSelections((prev) => {
      const cur = prev[requirementId] ?? { selected: true, quantity: 1 };
      return { ...prev, [requirementId]: { ...cur, selected: !cur.selected } };
    });
  }

  function setItemQuantity(requirementId: string, value: number) {
    const qty = Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1;
    setItemSelections((prev) => {
      const cur = prev[requirementId] ?? { selected: true, quantity: 1 };
      return { ...prev, [requirementId]: { ...cur, quantity: qty } };
    });
  }

  function goToDelivery() {
    setError(null);
    setStep('delivery');
  }

  function goToPayment() {
    if (deliveryMethod === 'AT_HOME' && !deliveryAddress.trim()) {
      setError('Please enter a delivery address for home delivery.');
      return;
    }
    setError(null);
    setStep('payment');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!student || !selectedKitId) return;
    if (!effectiveParent) {
      setError(null);
      setParentStep('form');
      setParentModalOpen(true);
      return;
    }
    await submitOrder(false);
  }

  function openParentModal() {
    setError(null);
    setParentStep('form');
    setParentModalOpen(true);
  }

  function openConsent() {
    if (!pFirstName.trim() || !pLastName.trim() || !pPhone.trim()) return;
    setManualParent({ name: `${pFirstName.trim()} ${pLastName.trim()}`.trim(), phone: pPhone.trim(), role: pRole });
    setParentStep('consent');
  }

  async function submitOrder(sendToSchool: boolean) {
    if (!student || !selectedKitId || !effectiveParent) return;
    setSubmitting(true);
    setError(null);

    let consentNote = sendToSchool ? 'Parent consent: agreed — sent to school' : 'Parent consent: denied — order only';
    if (sendToSchool) {
      setPSending(true);
      try {
        const parts = effectiveParent.name.trim().split(/\s+/);
        await publicClaimParent({
          studentCode: studentCode.trim(),
          firstName: parts[0] || effectiveParent.name.trim(),
          lastName: parts.slice(1).join(' ') || 'Parent',
          phone: effectiveParent.phone?.trim() || undefined,
          email: pEmail.trim() || undefined,
          role: effectiveParent.role,
        });
      } catch (claimErr: unknown) {
        consentNote =
          (claimErr as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Parent details could not be sent to school — order saved only';
      } finally {
        setPSending(false);
      }
    }
    setParentModalOpen(false);

    try {
      // NOTE: the API type doesn't currently have a dedicated paymentMethod field.
      // Until the backend/type is extended, the chosen method is recorded in notes
      // so it isn't silently dropped. Add a real `paymentMethod` column/field when ready.
      const combinedNotes = [
        `Payment method: ${paymentMethodLabel[paymentMethod]}`,
        consentNote,
        notes.trim(),
      ]
        .filter(Boolean)
        .join(' — ');

      const items = selectedKit
        ? uniqueRequirements(selectedKit.requirements)
            .map((r) => {
              const sel = itemSelections[r.id] ?? { selected: true, quantity: Math.max(1, r.quantity) };
              return sel.selected ? { requirementId: r.id, quantity: sel.quantity } : null;
            })
            .filter((i): i is { requirementId: string; quantity: number } => i !== null)
        : [];

      setPaymentLabel(paymentMethodLabel[paymentMethod]);
      const apiPaymentMethod =
        paymentMethod === 'CARD' ? 'BANK_TRANSFER' : 'MOBILE_MONEY';

      const createdRequest = await publicCreatePlatformOrder({
        orderType: orderPath === 'custom' ? 'CUSTOM' : 'STANDARD',
        studentCode: studentCode.trim(),
        standardKitId: orderPath === 'standard' ? selectedKitId : undefined,
        items: items.map((i) => {
          const req = selectedKit?.requirements.find((r) => r.id === i.requirementId);
          return {
            productId: orderPath === 'custom' ? i.requirementId : undefined,
            requirementId: orderPath === 'standard' ? i.requirementId : undefined,
            title: req?.title,
            unitPrice: req ? Number(req.unitPrice) : undefined,
            quantity: i.quantity,
            imageUrl: req?.imageUrl ?? undefined,
          };
        }),
        parentName: effectiveParent.name.trim(),
        parentPhone: effectiveParent.phone?.trim() || undefined,
        parentRelation: effectiveParent.role,
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'AT_HOME' ? deliveryAddress.trim() || undefined : undefined,
        district: student?.district ?? undefined,
        sector: student?.sector ?? undefined,
        notes: combinedNotes,
        paymentMethod: apiPaymentMethod,
        paymentReference: `PUBLIC_${paymentMethod}`,
      });
      setCreated(createdRequest);
      setStep('done');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Unable to submit your request. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetOrder() {
    setFlowStage('choose');
    setOrderPath('standard');
    setStep('search');
    setStudentCode('');
    setStudent(null);
    setKits([]);
    setKitCatalog([]);
    setFilterYear('');
    setFilterTerm('');
    setFilterKitId('');
    setSelectedKitId('');
    setItemSelections({});
    setReviewing(false);
    setDeliveryMethod('AT_SCHOOL');
    setDeliveryAddress('');
    setPaymentMethod('MOBILE_MONEY');
    setNotes('');
    setError(null);
    setCreated(null);
    setPaymentLabel('');
    setParentModalOpen(false);
    setParentStep('form');
    setManualParent(null);
    setPFirstName('');
    setPLastName('');
    setPPhone('');
    setPEmail('');
    setPRole('GUARDIAN');
    setMobileView('banner');
  }

  async function downloadReceipt() {
    if (!created || !student) return;
    await downloadReceiptPdf({
      schoolName: student.schoolName,
      requestNumber: created.requestNumber,
      status: created.status,
      createdAt: created.createdAt,
      studentName: created.studentName,
      className: created.className,
      studentCode: created.studentCode,
      parentName: created.parentName,
      parentPhone: created.parentPhone,
      kitName: created.kit?.name ?? null,
      district: student.district ?? null,
      subtotal: created.subtotal,
      homeFee: created.homeFee,
      deliveryMethod: created.deliveryMethod,
      paymentLabel: paymentLabel || (created.notes?.match(/Payment method:\s*([^—]+)/)?.[1] ?? '').trim(),
      total: created.total,
      notes: created.notes,
      items: created.items.map((it) => ({
        title: it.title,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        lineTotal: Number(it.lineTotal),
      })),
    });
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1.15fr' },
        overflowY: 'hidden',
        height: '100vh',
      }}
    >
      {/* ---------- LEFT PANEL (unchanged branding) ---------- */}
      <Box
        sx={{
          position: 'relative',
          bgcolor: 'primary.main',
          color: '#fff',
          p: 2,
          display: { xs: mobileView === 'banner' ? 'flex' : 'none', md: 'flex' },
          flexDirection: 'column',
          overflow: 'hidden',
          height: { xs: '100vh', md: 'auto' },
          maxHeight: '100vh',
        }}
      >
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box component="img" src="/logo_white.png" alt="ShuleKit" sx={{ height: 40 }} />
        </Box>
        <Box
          sx={{
            position: 'relative',
            my: 'auto',
            mb:'150px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 2,
          }}
        >
          <Typography
            variant="h4"
            component="div"
            sx={{
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              fontStyle: 'italic',
              color: '#fff',
              fontFamily: "'Caveat', 'Kalam', 'Patrick Hand', cursive",
              textShadow: '0 2px 14px rgba(0,0,0,0.18)',
              maxWidth: 340,
              fontSize: { xs: '1.9rem', sm: '2.4rem', md: '2.125rem' },
            }}
          >
            Order ShuleKit with{' '}
            <Box component="span" sx={{ position: 'relative', display: 'inline-block', color: 'accent.main' }}>
              ease
              <Box
                component="svg"
                viewBox="0 0 120 10"
                sx={{ position: 'absolute', left: 0, bottom: -2, width: '100%', height: 7 }}
                preserveAspectRatio="none"
              >
                <path d="M2 6 Q30 1 60 6 Q90 11 118 5" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </Box>
            </Box>
          </Typography>

          <Box
            component="img"
            src={studentsImg}
            alt=""
            sx={{width: { xs: 220, sm: 240, md: 260 }, maxWidth: '70%' }}
          />
        </Box>

        <Button
          fullWidth
          onClick={() => setMobileView('form')}
          endIcon={<ArrowForwardIcon />}
          sx={{
            display: { xs: 'flex', md: 'none' },
            position: 'absolute',
            left: '6%',
            right: '6%',
            bottom: 16,
            bgcolor: '#fff',
            color: 'accent.main',
            fontWeight: 800,
            textTransform: 'none',
            borderRadius: 2.5,
            py: 1.1,
            fontSize: '0.95rem',
            boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' },
          }}
        >
          Start your order
        </Button>
      </Box>

      {/* ---------- RIGHT PANEL (form flow) ---------- */}
      <Box
        sx={{
          position: 'relative',
          display: { xs: mobileView === 'form' ? 'flex' : 'none', md: 'flex' },
          flexDirection: 'column',
          backgroundImage: 'url(/my_bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          height: { xs: '100vh', md: 'auto' },
          overflowY: 'auto',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.12) 55%, rgba(255,255,255,0))',
            pointerEvents: 'none',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'space-between', md: 'flex-end' },
            gap: 1.25,
            p: { xs: 2.5, md: 5 },
            pb: 0,
          }}
        >
          <IconButton
            onClick={() => setMobileView('banner')}
            aria-label="Back"
            sx={{
              display: { xs: 'inline-flex', md: 'none' },
              bgcolor: 'rgba(0,17,33,0.06)',
              color: 'primary.main',
              '&:hover': { bgcolor: 'rgba(0,17,33,0.12)' },
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>

          <Box sx={{ display: 'flex', gap: { xs: 1, md: 1.25 }, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button
              component={Link}
              to="/order/status"
              variant="contained"
              size="small"
              sx={{ bgcolor: 'accent.main', color: 'accent.contrastText', fontWeight: 700, textTransform: 'none', px: { xs: 1.5, md: 2.25 }, fontSize: { xs: '0.72rem', md: '0.8125rem' }, boxShadow: 'none', '&:hover': { bgcolor: 'accent.dark', boxShadow: 'none' } }}
            >
              <ReceiptLongIcon sx={{ mr: 0.75, fontSize: 18 }} />
              Check Order Status
            </Button>
          </Box>
        </Box>

        <Box sx={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', p: { xs: 2.5, md: 5 } }}>
          <Box sx={{ width: '100%', maxWidth: flowStage === 'choose' ? 640 : 560 }}>
            {flowStage === 'choose' ? (
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    color: 'primary.main',
                    lineHeight: 1.15,
                    mb: 1,
                    fontSize: { xs: '1.85rem', sm: '2.25rem', md: '2.75rem' },
                  }}
                >
                  Order with ShuleKit
                </Typography>
                <Typography sx={{ color: 'rgba(0,17,33,0.55)', fontWeight: 600, fontSize: '1rem', mb: 0.75 }}>
                  Choose how you want to order
                </Typography>
                <Box
                  sx={{
                    width: 56,
                    height: 4,
                    borderRadius: 999,
                    bgcolor: 'accent.main',
                    mx: 'auto',
                    mb: 3.5,
                  }}
                />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                    mb: 3,
                    textAlign: 'left',
                  }}
                >
                  {/* Standard Kit */}
                  <Box
                    onClick={() => {
                      setOrderPath('standard');
                      setCustomNotice(false);
                    }}
                    sx={{
                      position: 'relative',
                      borderRadius: 3,
                      p: 2.5,
                      bgcolor: '#fff',
                      border: orderPath === 'standard' ? '2px solid #3B82F6' : '1px solid rgba(0,17,33,0.08)',
                      boxShadow:
                        orderPath === 'standard'
                          ? '0 12px 32px rgba(59,130,246,0.16)'
                          : '0 8px 24px rgba(0,17,33,0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 220,
                    }}
                  >
                    <Radio
                      checked={orderPath === 'standard'}
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8, color: '#93C5FD', '&.Mui-checked': { color: '#3B82F6' } }}
                    />
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 2,
                        bgcolor: 'rgba(59,130,246,0.12)',
                        color: '#2563EB',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      <BackpackOutlinedIcon />
                    </Box>
                    <Typography sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.1rem', mb: 0.75 }}>
                      Standard Kit
                    </Typography>
                    <Typography sx={{ color: 'rgba(0,17,33,0.55)', fontSize: '0.875rem', lineHeight: 1.45, mb: 2.5, flex: 1 }}>
                      Choose from our pre-designed kits based on grade levels.
                    </Typography>
                    <Button
                      fullWidth
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderPath('standard');
                        setFlowStage('order');
                        setStep('search');
                      }}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        bgcolor: 'rgba(59,130,246,0.14)',
                        color: '#1D4ED8',
                        boxShadow: 'none',
                        '&:hover': { bgcolor: 'rgba(59,130,246,0.22)', boxShadow: 'none' },
                      }}
                    >
                      Choose Standard Kit
                    </Button>
                  </Box>

                  {/* Custom Kit */}
                  <Box
                    onClick={() => setOrderPath('custom')}
                    sx={{
                      position: 'relative',
                      borderRadius: 3,
                      p: 2.5,
                      bgcolor: '#fff',
                      border: orderPath === 'custom' ? '2px solid #F59E0B' : '1px solid rgba(0,17,33,0.08)',
                      boxShadow:
                        orderPath === 'custom'
                          ? '0 12px 32px rgba(245,158,11,0.16)'
                          : '0 8px 24px rgba(0,17,33,0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 220,
                    }}
                  >
                    <Radio
                      checked={orderPath === 'custom'}
                      size="small"
                      sx={{ position: 'absolute', top: 8, right: 8, color: '#FCD34D', '&.Mui-checked': { color: '#F59E0B' } }}
                    />
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: 2,
                        bgcolor: 'rgba(245,158,11,0.14)',
                        color: '#D97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2,
                      }}
                    >
                      <Inventory2OutlinedIcon />
                    </Box>
                    <Typography sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.1rem', mb: 0.75 }}>
                      Custom Kit
                    </Typography>
                    <Typography sx={{ color: 'rgba(0,17,33,0.55)', fontSize: '0.875rem', lineHeight: 1.45, mb: 2.5, flex: 1 }}>
                      Build your own kit by selecting items that fit your needs.
                    </Typography>
                    <Button
                      fullWidth
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderPath('custom');
                        setFlowStage('order');
                        setStep('search');
                      }}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        bgcolor: 'rgba(245,158,11,0.14)',
                        color: '#B45309',
                        boxShadow: 'none',
                        '&:hover': { bgcolor: 'rgba(245,158,11,0.22)', boxShadow: 'none' },
                      }}
                    >
                      Build Custom Kit
                    </Button>
                  </Box>
                </Box>

                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid rgba(0,17,33,0.08)',
                    bgcolor: '#fff',
                    px: { xs: 1.5, sm: 2 },
                    py: 1.75,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                    gap: 1.5,
                  }}
                >
                  {[
                    { icon: <VerifiedUserOutlinedIcon sx={{ fontSize: 18, color: '#2563EB' }} />, label: 'Quality Guaranteed' },
                    { icon: <LocalShippingIcon sx={{ fontSize: 18, color: '#F59E0B' }} />, label: 'Fast Delivery' },
                    { icon: <CreditCardIcon sx={{ fontSize: 18, color: '#6366F1' }} />, label: 'Secure Payments' },
                    { icon: <SupportAgentOutlinedIcon sx={{ fontSize: 18, color: '#10B981' }} />, label: '24/7 Support' },
                  ].map((item) => (
                    <Box
                      key={item.label}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                        px: 0.5,
                        borderRight: { sm: '1px solid rgba(0,17,33,0.08)' },
                        '&:nth-of-type(2n)': { borderRight: { xs: 'none', sm: '1px solid rgba(0,17,33,0.08)' } },
                        '&:last-of-type': { borderRight: 'none' },
                      }}
                    >
                      {item.icon}
                      <Typography sx={{ fontWeight: 700, fontSize: '0.72rem', color: 'rgba(0,17,33,0.7)', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>
            ) : (
              <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5 }}>
              <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => {
                  setFlowStage('choose');
                  setStep('search');
                  clearStudent();
                  setCustomNotice(false);
                }}
                sx={{ textTransform: 'none', fontWeight: 700, color: 'primary.main' }}
              >
                Change kit type
              </Button>
            </Box>
            <Typography
              variant="h3"
              sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1.15, mb: 2, textAlign: 'center', fontSize: { xs: '1.85rem', sm: '2.25rem', md: '3rem' } }}
            >
              Order with ShuleKit
            </Typography>

            {step !== 'done' && <StepDots current={currentStepIndex} />}

            {/* ================= STEP 1: FIND STUDENT ================= */}
            {step === 'search' && (
              <Paper component="form" onSubmit={handleLookup} sx={{ ...glassSx, p: { xs: 2.5, md: 4 } }}>
                <StepHeading
                  title="Find the student"
                  subtitle="Enter the student's ShuleCode. We'll load their school, district, class, and year for this ShuleKit order."
                />
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                  <TextField
                    value={studentCode}
                    onChange={(e) => {
                      setStudentCode(e.target.value.toUpperCase());
                      if (student) clearStudent();
                    }}
                    placeholder="e.g. 04001000127"
                    label="ShuleCode"
                    required
                    fullWidth
                    disabled={lookingUp}
                    inputProps={{
                      'aria-label': 'ShuleCode',
                      autoCapitalize: 'characters',
                      spellCheck: false,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2.5,
                        bgcolor: 'rgba(255,255,255,0.6)',
                        '& input': { py: 1.8, fontSize: 17, fontWeight: 600, letterSpacing: '0.02em' },
                      },
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={lookingUp || !studentCode.trim()}
                    fullWidth={false}
                    sx={{ borderRadius: 2.5, px: 3, fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', width: { xs: '100%', sm: 'auto' } }}
                  >
                    {lookingUp ? (
                      <CircularProgress size={20} sx={{ color: 'white' }} />
                    ) : (
                      <>
                        <SearchIcon sx={{ mr: 0.75 }} />
                        Search
                      </>
                    )}
                  </Button>
                </Box>

                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

                {/* Confirmation card — appears right below the search once a student is found */}
                {student && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="overline" sx={{ color: 'rgba(0,31,63,0.5)', fontWeight: 700, letterSpacing: '0.08em' }}>
                      Is this the right student?
                    </Typography>
                    <Card
                      variant="outlined"
                      sx={{ mt: 1, borderRadius: 2.5, borderColor: 'accent.dark', bgcolor: 'accent.main' }}
                    >
                      <Box sx={{ p: { xs: 2, md: 2.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar
                          src={student.photoUrl ?? undefined}
                          alt={student.fullName}
                          slotProps={{ img: { referrerPolicy: 'no-referrer' } }}
                          sx={{ width: 52, height: 52, bgcolor: '#fff', color: 'accent.main', fontWeight: 800, fontSize: 20, border: '2px solid rgba(255,255,255,0.8)', flexShrink: 0 }}
                        >
                          {student.fullName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#001121' }}>
                            {student.fullName}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            {[
                              ['ShuleCode', shuleCodeOf(student)],
                              ['School', student.schoolName],
                              ['School code', student.schoolCode ?? student.organizationCode ?? '—'],
                              ['District', student.district ?? '—'],
                              ['Sector', student.sector ?? '—'],
                              ['Class', student.classLabel ?? student.className ?? 'No class'],
                              ['Year / Term', [student.academicYear, student.term].filter(Boolean).join(' · ') || '—'],
                              ['Gender', student.gender ? student.gender.charAt(0) + student.gender.slice(1).toLowerCase() : '—'],
                              ['Level', student.educationLevel ?? mapGradeLevel(student.classLabel) ?? student.classLabel ?? '—'],
                            ].map(([label, value], idx, arr) => (
                              <Box
                                key={label as string}
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  gap: 1,
                                  py: 0.5,
                                  borderBottom: idx < arr.length - 1 ? '1px dashed rgba(0,17,33,0.18)' : 'none',
                                }}
                              >
                                <Typography variant="body2" sx={{ color: 'rgba(0,17,33,0.55)', fontWeight: 600 }}>{label}:</Typography>
                                <Typography variant="body2" sx={{ color: '#001121', fontWeight: 600, textAlign: 'right' }}>{value}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      </Box>

                      {kits.length === 0 && (
                        <Alert severity="warning" sx={{ mx: 2.5, mb: 2 }}>
                          {orderPath === 'custom'
                            ? 'No custom products are available yet. Please check back later.'
                            : 'No standard kits match this student yet. You can still continue if other kits appear, or contact support.'}
                        </Alert>
                      )}

                      <Box sx={{ display: 'flex', gap: 1.5, p: { xs: 2, md: 2.5 }, pt: 0 }}>
                        <Button variant="text" onClick={clearStudent} sx={{ textTransform: 'none', fontWeight: 700, color: '#001121' }}>
                          Not this student
                        </Button>
                        <Box sx={{ flex: 1 }} />
                        <Button
                          variant="contained"
                          onClick={confirmStudent}
                          sx={{ borderRadius: 2, px: 3, fontWeight: 700, bgcolor: '#001121', '&:hover': { bgcolor: '#000c18' } }}
                        >
                          Yes, continue
                          <ArrowForwardIcon sx={{ ml: 0.75, fontSize: 20 }} />
                        </Button>
                      </Box>
                    </Card>
                  </>
                )}
              </Paper>
            )}

            {/* ================= STEP 2: CHOOSE KIT & ITEMS ================= */}
            {step === 'items' && student && (
              <Paper sx={{ ...glassSx, p: { xs: 2.5, md: 4 }, overflow: 'hidden' }}>
                <StudentProfileHeader student={student} />
                {reviewing && selectedKit ? (
                  <>
                    <StepHeading
                      title="Review your kit"
                      subtitle="Check what's inside this kit. You can change quantities or remove items you don't need."
                    />

                    <Card
                      variant="outlined"
                      sx={{ mb: 2.5, borderRadius: 2.5, borderColor: 'accent.dark', bgcolor: 'accent.main' }}
                    >
                      <Box sx={{ p: { xs: 2, md: 2.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                        {selectedKit.imageUrl ? (
                          <Box
                            component="img"
                            src={selectedKit.imageUrl}
                            alt={selectedKit.name}
                            sx={{ width: 52, height: 52, borderRadius: 2, objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.8)' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Box sx={{ width: 52, height: 52, borderRadius: '50%', bgcolor: '#fff', color: 'accent.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,255,255,0.8)' }}>
                            <StorefrontIcon sx={{ fontSize: 26 }} />
                          </Box>
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#001121' }}>
                            {selectedKit.name}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.5, borderBottom: '1px dashed rgba(0,17,33,0.18)' }}>
                              <Typography variant="body2" sx={{ color: 'rgba(0,17,33,0.55)', fontWeight: 600 }}>Grade:</Typography>
                              <Typography variant="body2" sx={{ color: '#001121', fontWeight: 600, textAlign: 'right' }}>{selectedKit.gradeLevel}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.5, borderBottom: '1px dashed rgba(0,17,33,0.18)' }}>
                              <Typography variant="body2" sx={{ color: 'rgba(0,17,33,0.55)', fontWeight: 600 }}>Items:</Typography>
                              <Typography variant="body2" sx={{ color: '#001121', fontWeight: 600, textAlign: 'right' }}>
                                {uniqueRequirements(selectedKit.requirements).length} item(s)
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.5 }}>
                              <Typography variant="body2" sx={{ color: 'rgba(0,17,33,0.55)', fontWeight: 600 }}>Price:</Typography>
                              <Typography variant="body2" sx={{ color: '#001121', fontWeight: 800, textAlign: 'right' }}>
                                {Number(selectedKit.amount).toLocaleString()} RWF
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                      {selectedKit.description && (
                        <Typography variant="body2" sx={{ color: 'rgba(0,17,33,0.75)', px: { xs: 2, md: 2.5 }, pb: 2 }}>
                          {selectedKit.description}
                        </Typography>
                      )}
                    </Card>

                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                      Items
                    </Typography>
                    <Paper variant="outlined" sx={{ borderRadius: 2, bgcolor: '#ffffff', borderColor: 'rgba(0,31,63,0.14)', mb: 2.5, overflow: 'hidden' }}>
                      {uniqueRequirements(selectedKit.requirements).map((r, i, list) => {
                        const unit = Number(r.unitPrice);
                        const priced = unit > 0;
                        const sel = itemSelections[r.id] ?? { selected: true, quantity: Math.max(1, r.quantity) };
                        const line = unit * Math.max(1, sel.quantity);
                        return (
                          <Box
                            key={r.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: { xs: 1, sm: 1.5 },
                              p: { xs: 1.25, sm: 1.5 },
                              flexWrap: { xs: 'wrap', sm: 'nowrap' },
                              borderBottom: i < list.length - 1 ? '1px solid rgba(0,31,63,0.08)' : 'none',
                              bgcolor: !sel.selected ? 'rgba(0,31,63,0.03)' : 'transparent',
                              opacity: sel.selected ? 1 : 0.5,
                            }}
                          >
                            {resolveMediaUrl(r.imageUrl) ? (
                              <Box
                                component="img"
                                src={resolveMediaUrl(r.imageUrl)!}
                                alt={r.title}
                                onClick={() => openProductImage(resolveMediaUrl(r.imageUrl)!, r.title)}
                                sx={{
                                  width: 46,
                                  height: 46,
                                  borderRadius: 1,
                                  objectFit: 'cover',
                                  flexShrink: 0,
                                  cursor: 'zoom-in',
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Box sx={{ width: 46, height: 46, borderRadius: 1, bgcolor: 'rgba(0,31,63,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <StorefrontIcon sx={{ color: 'rgba(0,31,63,0.35)', fontSize: 22 }} />
                              </Box>
                            )}
                            <Box sx={{ flex: 1, minWidth: 120 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                {r.title}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(0,31,63,0.5)' }}>
                                {priced
                                  ? `${unit.toLocaleString()} RWF × ${sel.selected ? sel.quantity : 0} = ${(unit * (sel.selected ? sel.quantity : 0)).toLocaleString()} RWF`
                                  : 'Included'}
                                {r.notes ? ` · ${r.notes}` : ''}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid rgba(0,31,63,0.18)', borderRadius: 1.5, px: 0.5 }}>
                              <IconButton
                                size="small"
                                disabled={!sel.selected || sel.quantity <= 1}
                                onClick={() => setItemQuantity(r.id, sel.quantity - 1)}
                                sx={{ color: 'primary.main' }}
                              >
                                <RemoveIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                              <Typography sx={{ minWidth: 26, textAlign: 'center', fontWeight: 700, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                                {sel.selected ? sel.quantity : 0}
                              </Typography>
                              <IconButton size="small" onClick={() => setItemQuantity(r.id, sel.quantity + 1)} sx={{ color: 'primary.main' }}>
                                <AddIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                            <Typography sx={{ fontWeight: 700, color: 'primary.main', width: 84, textAlign: 'right', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                              {priced ? `${line.toLocaleString()} RWF` : 'Included'}
                            </Typography>
                            <Tooltip title={sel.selected ? 'Remove from kit' : 'Add back to kit'}>
                              <IconButton
                                size="small"
                                onClick={() => toggleItem(r.id)}
                                sx={{ color: sel.selected ? 'rgba(0,31,63,0.45)' : 'accent.main' }}
                              >
                                {sel.selected ? <RemoveCircleOutlineRoundedIcon sx={{ fontSize: 20 }} /> : <AddCircleOutlineRoundedIcon sx={{ fontSize: 20 }} />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        );
                      })}
                    </Paper>

                    <Box sx={{ mb: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Kit subtotal</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{subtotal.toLocaleString()} RWF</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>Total</Typography>
                        <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>{subtotal.toLocaleString()} RWF</Typography>
                      </Box>
                    </Box>
                  </>
                ) : orderPath === 'custom' && selectedKit ? (
                  <>
                    <StepHeading
                      title="Build your custom kit"
                      subtitle="Browse products and add the items you need."
                    />
                    {selectedKit.requirements.length === 0 ? (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        No products in the catalog yet. Ask Super Admin to add Custom Kit Products.
                      </Alert>
                    ) : (
                      <Paper
                        variant="outlined"
                        sx={{
                          borderRadius: 2.5,
                          bgcolor: '#ffffff',
                          borderColor: 'rgba(0,31,63,0.12)',
                          mb: 2.5,
                          overflow: 'hidden',
                        }}
                      >
                        {uniqueRequirements(selectedKit.requirements).map((r, i, list) => {
                          const unit = Number(r.unitPrice);
                          const sel = itemSelections[r.id] ?? { selected: false, quantity: 1 };
                          const img = resolveMediaUrl(r.imageUrl);
                          return (
                            <Box
                              key={r.id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: { xs: 1.25, sm: 1.75 },
                                px: { xs: 1.5, sm: 2 },
                                py: { xs: 1.5, sm: 1.75 },
                                borderBottom: i < list.length - 1 ? '1px solid rgba(0,31,63,0.08)' : 'none',
                                bgcolor: sel.selected ? 'rgba(252,176,56,0.14)' : 'transparent',
                                transition: 'background-color 0.15s ease',
                              }}
                            >
                              <Box
                                role={img ? 'button' : undefined}
                                tabIndex={img ? 0 : undefined}
                                aria-label={img ? `View ${r.title} image` : undefined}
                                onClick={img ? () => openProductImage(img, r.title) : undefined}
                                onKeyDown={
                                  img
                                    ? (e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          openProductImage(img, r.title);
                                        }
                                      }
                                    : undefined
                                }
                                sx={{
                                  width: { xs: 56, sm: 64 },
                                  height: { xs: 56, sm: 64 },
                                  borderRadius: 2,
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                  bgcolor: 'rgba(0,31,63,0.04)',
                                  border: '1px solid rgba(0,31,63,0.08)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative',
                                  cursor: img ? 'zoom-in' : 'default',
                                  '&:hover .product-zoom-hint': img ? { opacity: 1 } : undefined,
                                }}
                              >
                                {img ? (
                                  <>
                                    <Box
                                      component="img"
                                      src={img}
                                      alt={r.title}
                                      sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <Box
                                      className="product-zoom-hint"
                                      sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        bgcolor: 'rgba(0,17,33,0.35)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        opacity: { xs: 0.85, sm: 0 },
                                        transition: 'opacity 0.15s ease',
                                        pointerEvents: 'none',
                                      }}
                                    >
                                      <ZoomInIcon sx={{ color: '#fff', fontSize: 20 }} />
                                    </Box>
                                  </>
                                ) : (
                                  <Inventory2OutlinedIcon sx={{ color: 'rgba(0,31,63,0.3)', fontSize: 28 }} />
                                )}
                              </Box>

                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 800,
                                    color: '#001121',
                                    fontSize: { xs: '0.9rem', sm: '0.95rem' },
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {r.title}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: 'block',
                                    mt: 0.4,
                                    color: 'rgba(0,31,63,0.55)',
                                    fontWeight: 600,
                                    fontSize: { xs: '0.75rem', sm: '0.8rem' },
                                  }}
                                >
                                  {unit.toLocaleString()} RWF
                                </Typography>
                                {r.notes ? (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: { xs: 'none', sm: 'block' },
                                      mt: 0.25,
                                      color: 'rgba(0,31,63,0.4)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {r.notes}
                                  </Typography>
                                ) : null}
                              </Box>

                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  flexShrink: 0,
                                  ml: 'auto',
                                }}
                              >
                                {sel.selected ? (
                                  <>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.25,
                                        border: '1px solid rgba(0,31,63,0.16)',
                                        borderRadius: 1.5,
                                        bgcolor: '#fff',
                                        px: 0.25,
                                      }}
                                    >
                                      <IconButton
                                        size="small"
                                        aria-label="Decrease quantity"
                                        onClick={() => setItemQuantity(r.id, sel.quantity - 1)}
                                        disabled={sel.quantity <= 1}
                                        sx={{ color: '#001121' }}
                                      >
                                        <RemoveIcon sx={{ fontSize: 18 }} />
                                      </IconButton>
                                      <Typography
                                        sx={{
                                          minWidth: 28,
                                          textAlign: 'center',
                                          fontWeight: 800,
                                          fontVariantNumeric: 'tabular-nums',
                                          color: '#001121',
                                        }}
                                      >
                                        {sel.quantity}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        aria-label="Increase quantity"
                                        onClick={() => setItemQuantity(r.id, sel.quantity + 1)}
                                        sx={{ color: '#001121' }}
                                      >
                                        <AddIcon sx={{ fontSize: 18 }} />
                                      </IconButton>
                                    </Box>
                                    <IconButton
                                      size="small"
                                      aria-label="Remove from kit"
                                      onClick={() => toggleItem(r.id)}
                                      sx={{
                                        border: '1px solid rgba(239,68,68,0.35)',
                                        borderRadius: 1.5,
                                        color: '#dc2626',
                                        bgcolor: 'rgba(254,226,226,0.45)',
                                        '&:hover': { bgcolor: 'rgba(254,226,226,0.9)' },
                                      }}
                                    >
                                      <DeleteOutlinedIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                  </>
                                ) : (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => toggleItem(r.id)}
                                    sx={{
                                      textTransform: 'none',
                                      fontWeight: 800,
                                      bgcolor: '#001121',
                                      color: '#fff',
                                      borderRadius: 1.5,
                                      px: { xs: 2, sm: 2.5 },
                                      minWidth: { xs: 72, sm: 80 },
                                      minHeight: 40,
                                      boxShadow: 'none',
                                      '&:hover': { bgcolor: '#000c18', boxShadow: 'none' },
                                    }}
                                  >
                                    Add
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          );
                        })}
                      </Paper>
                    )}

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        mb: 2.5,
                        px: 0.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            bgcolor: 'rgba(252,176,56,0.2)',
                            color: '#b45309',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ShoppingCartOutlinedIcon sx={{ fontSize: 18 }} />
                        </Box>
                        <Typography sx={{ fontWeight: 700, color: 'rgba(0,31,63,0.7)', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                          Selected subtotal
                        </Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 800, color: '#001121', fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>
                        {subtotal.toLocaleString()} RWF
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5 }}>
                      <Button
                        variant="outlined"
                        onClick={() => setStep('search')}
                        startIcon={<ArrowBackIcon />}
                        sx={{
                          borderRadius: 2,
                          px: { xs: 2, md: 3 },
                          fontWeight: 700,
                          borderColor: 'rgba(0,31,63,0.2)',
                          color: '#001121',
                        }}
                        size="large"
                      >
                        Back
                      </Button>
                      <Button
                        variant="contained"
                        onClick={goToKitDetails}
                        disabled={selectedItemCount === 0}
                        endIcon={<ArrowForwardIcon />}
                        sx={{
                          borderRadius: 2,
                          px: { xs: 2.5, md: 4 },
                          fontWeight: 800,
                          bgcolor: 'accent.main',
                          color: '#001121',
                          boxShadow: 'none',
                          '&:hover': { bgcolor: 'accent.dark', boxShadow: 'none' },
                          '&.Mui-disabled': { bgcolor: 'rgba(0,31,63,0.08)', color: 'rgba(0,31,63,0.35)' },
                        }}
                        size="large"
                      >
                        Review kit
                      </Button>
                    </Box>
                  </>
                ) : (
                  <>
                    <StepHeading
                      title="Choose a standard kit"
                      subtitle="Filter by academic year, term, and kit — only matching Standard Kits are shown."
                    />

                    <Box
                      sx={{
                        mb: 2.5,
                        p: { xs: 1.5, sm: 2 },
                        borderRadius: 2.5,
                        border: '1px solid rgba(0,31,63,0.1)',
                        bgcolor: 'rgba(248,250,252,0.95)',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1.4fr' },
                          gap: 1.5,
                        }}
                      >
                        <FormControl size="small" fullWidth>
                          <InputLabel id="kit-filter-year">Academic year</InputLabel>
                          <Select
                            labelId="kit-filter-year"
                            label="Academic year"
                            value={filterYear}
                            onChange={(e) => {
                              setFilterYear(e.target.value);
                              setFilterKitId('');
                            }}
                          >
                            <MenuItem value="">All years</MenuItem>
                            {yearOptions.map((y) => (
                              <MenuItem key={y} value={y}>
                                {y}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth>
                          <InputLabel id="kit-filter-term">Term</InputLabel>
                          <Select
                            labelId="kit-filter-term"
                            label="Term"
                            value={filterTerm}
                            onChange={(e) => {
                              setFilterTerm(e.target.value);
                              setFilterKitId('');
                            }}
                          >
                            <MenuItem value="">All terms</MenuItem>
                            {termOptions.map((t) => (
                              <MenuItem key={t} value={t}>
                                {t}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth>
                          <InputLabel id="kit-filter-kit">Kit</InputLabel>
                          <Select
                            labelId="kit-filter-kit"
                            label="Kit"
                            value={filterKitId}
                            onChange={(e) => {
                              const id = e.target.value;
                              setFilterKitId(id);
                              if (id) setSelectedKitId(id);
                            }}
                          >
                            <MenuItem value="">All kits</MenuItem>
                            {kitOptions.map((k) => (
                              <MenuItem key={k.id} value={k.id}>
                                {k.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      <FormHelperText sx={{ mx: 0, mt: 1.25, color: 'rgba(0,31,63,0.55)' }}>
                        Showing kits for {filterYear || 'all years'}
                        {filterTerm ? ` · ${filterTerm}` : ''}
                        {filterKitId
                          ? ` · ${kitOptions.find((k) => k.id === filterKitId)?.label ?? 'selected kit'}`
                          : ''}
                      </FormHelperText>
                    </Box>

                    {kitsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={28} />
                      </Box>
                    ) : displayedKits.length === 0 ? (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        No standard kits match these filters. Try another year, term, or kit — or ask Super Admin to import from District ShuleKit.
                      </Alert>
                    ) : (
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                          gap: { xs: 1, sm: 1.5 },
                          mb: 3,
                        }}
                      >
                        {displayedKits.map((kit) => {
                          const recommended =
                            student !== null &&
                            mapGradeLevel(student.classLabel ?? student.className) === kit.gradeLevel;
                          const selected = selectedKitId === kit.id;
                          return (
                            <Card
                              key={kit.id}
                              variant="outlined"
                              sx={{
                                borderRadius: 2,
                                bgcolor: selected ? 'rgba(252,176,56,0.12)' : '#ffffff',
                                borderColor: selected ? 'accent.main' : 'rgba(0,31,63,0.14)',
                                borderWidth: selected ? 2 : 1,
                                overflow: 'hidden',
                                transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                                boxShadow: selected
                                  ? '0 6px 20px rgba(245,158,11,0.22)'
                                  : '0 2px 8px rgba(0,31,63,0.08)',
                              }}
                            >
                              <CardActionArea
                                onClick={() => pickKit(kit)}
                                sx={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'stretch' }}
                              >
                                <Box sx={{ position: 'relative' }}>
                                  {kit.imageUrl ? (
                                    <Box
                                      component="img"
                                      src={kit.imageUrl}
                                      alt={kit.name}
                                      sx={{
                                        width: '100%',
                                        height: { xs: 96, sm: 140 },
                                        objectFit: 'cover',
                                        display: 'block',
                                      }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: '100%',
                                        height: { xs: 96, sm: 140 },
                                        bgcolor: 'rgba(245,158,11,0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <StorefrontIcon sx={{ color: 'accent.main', fontSize: { xs: 32, sm: 44 } }} />
                                    </Box>
                                  )}
                                  {recommended && (
                                    <Box
                                      component="span"
                                      title="Recommended for this grade"
                                      sx={{
                                        position: 'absolute',
                                        top: 6,
                                        left: 6,
                                        bgcolor: 'rgba(255,255,255,0.9)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        p: 0.35,
                                      }}
                                    >
                                      <StarRoundedIcon sx={{ color: 'accent.main', fontSize: 20, display: 'block' }} />
                                    </Box>
                                  )}
                                  <Radio
                                    checked={selected}
                                    size="small"
                                    onClick={(e) => e.stopPropagation()}
                                    sx={{
                                      position: 'absolute',
                                      top: 6,
                                      right: 6,
                                      bgcolor: 'rgba(255,255,255,0.9)',
                                      '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                                      borderRadius: '50%',
                                      color: 'accent.main',
                                      '&.Mui-checked': { color: 'accent.main' },
                                      '& .MuiSvgIcon-root': { fontSize: 22 },
                                    }}
                                  />
                                </Box>
                                <Box sx={{ flex: 1, width: '100%', p: 1.5, pt: 1 }}>
                                  <Typography
                                    noWrap
                                    variant="subtitle2"
                                    sx={{ fontWeight: 700, color: 'primary.main', mb: 0.25, fontSize: '0.85rem' }}
                                  >
                                    {kit.name}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{ color: 'rgba(0,31,63,0.6)', display: 'block', mb: 0.5, fontSize: '0.72rem' }}
                                  >
                                    {kit.gradeLevel} · {kit.requirements.length} item(s)
                                  </Typography>
                                  {(kit.academicYear || kit.term) && (
                                    <Typography
                                      variant="caption"
                                      sx={{ color: 'rgba(0,31,63,0.45)', display: 'block', mb: 1, fontSize: '0.68rem' }}
                                    >
                                      {[kit.term, kit.academicYear].filter(Boolean).join(' · ')}
                                    </Typography>
                                  )}
                                  <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>
                                    {Number(kit.amount).toLocaleString()} RWF
                                  </Typography>
                                </Box>
                              </CardActionArea>
                            </Card>
                          );
                        })}
                      </Box>
                    )}
                  </>
                )}

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {(reviewing || orderPath === 'standard') && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    {reviewing && selectedKit ? (
                      <>
                        <Button variant="outlined" onClick={() => setReviewing(false)} startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, px: { xs: 2, md: 3 } }} size="large">
                          Back
                        </Button>
                        <Button
                          variant="contained"
                          onClick={goToDelivery}
                          disabled={selectedItemCount === 0}
                          sx={{ borderRadius: 2, px: { xs: 2.5, md: 4 } }}
                          size="large"
                        >
                          Confirm and continue
                          <ArrowForwardIcon sx={{ ml: 0.75 }} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outlined" onClick={() => setStep('search')} startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, px: { xs: 2, md: 3 } }} size="large">
                          Back
                        </Button>
                        <Button variant="contained" onClick={goToKitDetails} disabled={!selectedKitId} sx={{ borderRadius: 2, px: { xs: 2.5, md: 4 } }} size="large">
                          Continue
                        </Button>
                      </>
                    )}
                  </Box>
                )}
              </Paper>
            )}

            {/* ================= STEP 4: DELIVERY ================= */}
            {step === 'delivery' && student && (
              <Paper sx={{ ...glassSx, p: { xs: 2.5, md: 4 }, overflow: 'hidden' }}>
                <StudentProfileHeader student={student} />
                <StepHeading title="Delivery" subtitle="Choose how your child should receive the kit." />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      bgcolor: deliveryMethod === 'AT_SCHOOL' ? 'rgba(245,158,11,0.1)' : 'transparent',
                      borderColor: deliveryMethod === 'AT_SCHOOL' ? 'accent.main' : 'rgba(255,255,255,0.7)',
                      flex: 1,
                    }}
                  >
                    <CardActionArea onClick={() => setDeliveryMethod('AT_SCHOOL')} sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Radio checked={deliveryMethod === 'AT_SCHOOL'} size="small" sx={{ color: 'accent.main' }} />
                        <Typography sx={{ fontWeight: 600 }}>Pick up at school</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)', pl: 4 }}>Free</Typography>
                    </CardActionArea>
                  </Card>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      bgcolor: deliveryMethod === 'AT_HOME' ? 'rgba(245,158,11,0.1)' : 'transparent',
                      borderColor: deliveryMethod === 'AT_HOME' ? 'accent.main' : 'rgba(255,255,255,0.7)',
                      flex: 1,
                    }}
                  >
                    <CardActionArea onClick={() => setDeliveryMethod('AT_HOME')} sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Radio checked={deliveryMethod === 'AT_HOME'} size="small" sx={{ color: 'accent.main' }} />
                        <Typography sx={{ fontWeight: 600 }}>Home delivery</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)', pl: 4 }}>{homeDeliveryFee.toLocaleString()} RWF</Typography>
                    </CardActionArea>
                  </Card>
                </Stack>

                {deliveryMethod === 'AT_HOME' ? (
                  <TextField
                    label="Delivery address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="District, sector, street / landmark"
                    fullWidth
                    required
                    sx={{ mb: 2 }}
                  />
                ) : null}

                <TextField
                  label="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. size, special instructions…"
                  fullWidth
                  multiline
                  minRows={2}
                  sx={{ mb: 1 }}
                />

                {error && <Alert severity="error" sx={{ mb: 2, mt: 2 }}>{error}</Alert>}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 3 }}>
                  <Button variant="outlined" onClick={() => setStep('items')} startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, px: { xs: 2, md: 3 } }} size="large">
                    Back
                  </Button>
                  <Button variant="contained" onClick={goToPayment} sx={{ borderRadius: 2, px: { xs: 2.5, md: 4 } }} size="large">
                    Continue to payment
                  </Button>
                </Box>
              </Paper>
            )}

            {/* ================= STEP 4: PAYMENT & REVIEW ================= */}
            {step === 'payment' && student && (
              <Paper component="form" onSubmit={handleSubmit} sx={{ ...glassSx, p: { xs: 2.5, md: 4 }, overflow: 'hidden' }}>
                <StudentProfileHeader student={student} />
                <StepHeading title="Payment" subtitle="Choose how you'd like to pay, then confirm your order." />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
                  {(
                    [
                      { id: 'MOBILE_MONEY' as PaymentMethod, label: 'Mobile Money', icon: <PhoneIphoneIcon fontSize="small" /> },
                      { id: 'CARD' as PaymentMethod, label: 'Card', icon: <CreditCardIcon fontSize="small" /> },
                    ]
                  ).map((opt) => (
                    <Card
                      key={opt.id}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        bgcolor: paymentMethod === opt.id ? 'rgba(245,158,11,0.1)' : 'transparent',
                        borderColor: paymentMethod === opt.id ? 'accent.main' : 'rgba(255,255,255,0.7)',
                        flex: 1,
                      }}
                    >
                      <CardActionArea onClick={() => setPaymentMethod(opt.id)} sx={{ p: 1.75 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Radio checked={paymentMethod === opt.id} size="small" sx={{ color: 'accent.main', p: 0.5 }} />
                          {opt.icon}
                          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</Typography>
                        </Box>
                      </CardActionArea>
                    </Card>
                  ))}
                </Stack>

                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
                  Order summary
                </Typography>
                <Box
                  sx={{
                    p: { xs: 2, md: 2.5 },
                    borderRadius: 2.5,
                    bgcolor: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.7)',
                    mb: 2.5,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.55)' }}>Student</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{student.fullName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.55)' }}>Kit</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedKit?.name}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Kit amount</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{subtotal ? `${subtotal.toLocaleString()} RWF` : '—'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Delivery ({deliveryMethod === 'AT_HOME' ? 'Home' : 'At school'})</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{homeFee ? `${homeFee.toLocaleString()} RWF` : 'Free'}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>Total</Typography>
                    <Typography sx={{ fontWeight: 700, color: 'primary.main' }}>{total ? `${total.toLocaleString()} RWF` : '—'}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(0,31,63,0.5)' }}>Ordering as</Typography>
                    {effectiveParent ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {effectiveParent.name}
                          {effectiveParent.phone ? ` · ${effectiveParent.phone}` : ''}
                        </Typography>
                        <Tooltip title="Change parent / guardian">
                          <IconButton size="small" onClick={openParentModal} sx={{ p: 0.5 }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Button size="small" variant="text" onClick={openParentModal} startIcon={<PersonAddAlt1Icon />} sx={{ textTransform: 'none' }}>
                        Add parent / guardian
                      </Button>
                    )}
                  </Box>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                  <Button variant="outlined" onClick={() => setStep('delivery')} startIcon={<ArrowBackIcon />} sx={{ borderRadius: 2, px: { xs: 2, md: 3 } }} size="large">
                    Back
                  </Button>
                  <Button type="submit" variant="contained" disabled={submitting || !selectedKitId} sx={{ borderRadius: 2, px: { xs: 2.5, md: 4 } }} size="large">
                    {submitting ? <CircularProgress size={20} sx={{ color: 'white' }} /> : `Pay & submit`}
                  </Button>
                </Box>
              </Paper>
            )}

            {/* ================= DONE ================= */}
            {step === 'done' && created && (
              <Paper sx={{ ...glassSx, p: { xs: 2.5, md: 4 }, textAlign: 'center' }}>
                <CheckCircleOutlinedIcon sx={{ fontSize: 56, color: '#16a34a', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.5, fontSize: { xs: '1.5rem', md: '2.125rem' } }}>Request Submitted</Typography>
                <Typography variant="body1" sx={{ color: 'rgba(0,31,63,0.6)', mb: 3 }}>
                  Thank you {created.parentName}! The school has received your kit request.
                </Typography>

                <Box
                  sx={{
                    maxWidth: 460,
                    mx: 'auto',
                    textAlign: 'left',
                    p: { xs: 2, sm: 3 },
                    borderRadius: 2.5,
                    bgcolor: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.7)',
                    boxShadow: 'inset 0 0 0 1px rgba(15,31,61,0.04)',
                    mb: 2.5,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.05rem' }}>ShuleKit Receipt</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(0,31,63,0.5)' }}>{student?.schoolName}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 700, fontFamily: 'Consolas, Menlo, monospace', letterSpacing: 1, fontSize: '0.8rem', color: 'primary.main' }}>
                        {created.requestNumber}
                        {(created as KitRequest & { trackingNumber?: string | null }).trackingNumber
                          ? ` · ${(created as KitRequest & { trackingNumber?: string | null }).trackingNumber}`
                          : ''}
                      </Typography>
                      {statusChip(created.status)}
                      <Typography variant="caption" sx={{ color: 'rgba(0,31,63,0.5)', display: 'block', mt: 0.5 }}>
                        {new Date(created.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ borderStyle: 'dashed', mb: 1.5 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Student</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{created.studentName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Class</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{created.className ?? '—'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>ShuleCode</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'Consolas, Menlo, monospace', textAlign: 'right' }}>{created.studentCode ?? '—'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Parent / guardian</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{created.parentName}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Phone</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{created.parentPhone ?? '—'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Kit</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>{created.kit?.name ?? '—'}</Typography>
                  </Box>

                  <Divider sx={{ borderStyle: 'dashed', my: 1.5 }} />

                  {created.items.length === 0 && (
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.5)', textAlign: 'center', py: 0.5 }}>No items</Typography>
                  )}
                  {created.items.map((it) => (
                    <Box key={it.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(0,31,63,0.5)' }}>
                          {it.quantity} × {Number(it.unitPrice).toLocaleString()} RWF
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{Number(it.lineTotal).toLocaleString()} RWF</Typography>
                    </Box>
                  ))}

                  <Divider sx={{ borderStyle: 'dashed', my: 1.5 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Subtotal</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{Number(created.subtotal).toLocaleString()} RWF</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Delivery ({created.deliveryMethod === 'AT_HOME' ? 'Home' : 'At school'})</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{created.deliveryMethod === 'AT_HOME' ? `${Number(created.homeFee).toLocaleString()} RWF` : 'Free'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.4 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>Payment method</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
                      {paymentLabel || (created.notes?.match(/Payment method:\s*([^—]+)/)?.[1] ?? '—').trim()}
                    </Typography>
                  </Box>
                  <Divider sx={{ borderStyle: 'dashed', my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.05rem' }}>Total</Typography>
                    <Typography sx={{ fontWeight: 800, color: 'primary.main', fontSize: '1.15rem' }}>{Number(created.total).toLocaleString()} RWF</Typography>
                  </Box>
                  {created.notes && (
                    <Typography variant="caption" sx={{ color: 'rgba(0,31,63,0.5)', display: 'block', mt: 1 }}>
                      Notes: {created.notes}
                    </Typography>
                  )}
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'center', flexWrap: 'wrap', rowGap: 1 }}>
                  <Button
                    variant="contained"
                    onClick={() => void downloadReceipt()}
                    startIcon={<FileDownloadOutlinedIcon />}
                    sx={{ borderRadius: 2, px: 3 }}
                  >
                    Download receipt (PDF)
                  </Button>
                  <Button variant="outlined" component={Link} to="/order/status" sx={{ borderRadius: 2, px: 3 }}>
                    Check Order Status
                  </Button>
                  <Button variant="outlined" onClick={resetOrder} sx={{ borderRadius: 2, px: 3 }}>
                    Order Another
                  </Button>
                </Stack>
              </Paper>
            )}

            {/* ================= PARENT / GUARDIAN SETUP + CONSENT ================= */}
            <Dialog
              open={parentModalOpen}
              onClose={parentStep === 'form' ? () => setParentModalOpen(false) : undefined}
              maxWidth="sm"
              fullWidth
            >
              {parentStep === 'form' ? (
                <>
                  <DialogTitle sx={{ fontWeight: 800, color: 'primary.main' }}>
                    Parent / Guardian
                  </DialogTitle>
                  <DialogContent>
                    {student && (
                      <Alert severity="info" sx={{ mb: 1 }}>
                        No parent is linked to <b>{student.fullName}</b>. Add the parent or guardian who is making this order.
                      </Alert>
                    )}
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField label="First name" value={pFirstName} onChange={(e) => setPFirstName(e.target.value)} variant="standard" fullWidth />
                        <TextField label="Last name" value={pLastName} onChange={(e) => setPLastName(e.target.value)} variant="standard" fullWidth />
                      </Stack>
                      <TextField
                        label="Phone number"
                        value={pPhone}
                        onChange={(e) => setPPhone(e.target.value)}
                        placeholder="e.g. 078xxxxxxx"
                        variant="standard"
                        helperText="So the school can reach you about this order"
                      />
                      <TextField
                        label="Email (optional)"
                        value={pEmail}
                        onChange={(e) => setPEmail(e.target.value)}
                        type="email"
                        variant="standard"
                        fullWidth
                      />
                      <FormControl fullWidth variant="standard">
                        <InputLabel>Relationship to student</InputLabel>
                        <Select value={pRole} onChange={(e) => setPRole(e.target.value as ParentRelation)} label="Relationship to student">
                          <MenuItem value="FATHER">Father</MenuItem>
                          <MenuItem value="MOTHER">Mother</MenuItem>
                          <MenuItem value="GUARDIAN">Guardian</MenuItem>
                        </Select>
                        <FormHelperText>How are you related to {student?.fullName ?? 'the student'}?</FormHelperText>
                      </FormControl>
                    </Stack>
                  </DialogContent>
                  <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setParentModalOpen(false)}>Cancel</Button>
                    <Button
                      variant="contained"
                      onClick={openConsent}
                      disabled={!pFirstName.trim() || !pLastName.trim() || !pPhone.trim()}
                    >
                      Continue
                    </Button>
                  </DialogActions>
                </>
              ) : (
                <>
                  <DialogTitle sx={{ fontWeight: 800, color: 'primary.main' }}>
                    Confirm who is ordering
                  </DialogTitle>
                  <DialogContent>
                    <Alert
                      severity="success"
                      icon={<HowToRegOutlinedIcon fontSize="inherit" />}
                      sx={{ mb: 2 }}
                    >
                      <b>Done by:</b> {pFirstName.trim()} {pLastName.trim()} · {relationLabels[pRole]}
                      {pPhone.trim() ? ` · ${pPhone.trim()}` : ''}
                    </Alert>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.85)', mb: 1 }}>
                      I confirm I am the parent/guardian of <b>{student?.fullName}</b>
                      {student?.classLabel ? ` (${student.classLabel})` : ''} and I am making this kit order for them.
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(0,31,63,0.6)' }}>
                      Should <b>{student?.schoolName}</b> save {pFirstName.trim()} {pLastName.trim()} as the parent/guardian of{' '}
                      <b>{student?.fullName}</b> in the school database?
                    </Typography>
                    <Stack spacing={1.5} sx={{ mt: 3 }}>
                      <Button
                        variant="contained"
                        size="large"
                        disabled={pSending || submitting}
                        onClick={() => submitOrder(true)}
                        startIcon={pSending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : undefined}
                      >
                        Yes, send to school
                      </Button>
                      <Button
                        variant="outlined"
                        size="large"
                        disabled={pSending || submitting}
                        onClick={() => submitOrder(false)}
                      >
                        No, keep for this order only
                      </Button>
                    </Stack>
                  </DialogContent>
                  <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button disabled={pSending || submitting} onClick={() => setParentStep('form')}>
                      Back
                    </Button>
                  </DialogActions>
                </>
              )}
            </Dialog>

            <Dialog
              open={Boolean(imagePreview)}
              onClose={closeProductImage}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  bgcolor: '#0b1220',
                  m: { xs: 1.5, sm: 3 },
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  px: { xs: 1.5, sm: 2 },
                  py: 1.25,
                  bgcolor: 'rgba(255,255,255,0.06)',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Typography
                  sx={{
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    pr: 1,
                  }}
                >
                  {imagePreview?.title ?? 'Product image'}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                  <IconButton
                    aria-label="Zoom out"
                    onClick={() => setImageZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                    disabled={imageZoom <= 0.5}
                    sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
                  >
                    <ZoomOutIcon />
                  </IconButton>
                  <Typography
                    sx={{
                      color: 'rgba(255,255,255,0.85)',
                      fontWeight: 700,
                      minWidth: 48,
                      textAlign: 'center',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '0.85rem',
                    }}
                  >
                    {Math.round(imageZoom * 100)}%
                  </Typography>
                  <IconButton
                    aria-label="Zoom in"
                    onClick={() => setImageZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                    disabled={imageZoom >= 3}
                    sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
                  >
                    <ZoomInIcon />
                  </IconButton>
                  <IconButton
                    aria-label="Close"
                    onClick={closeProductImage}
                    sx={{ ml: 0.5, color: '#fff', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' } }}
                  >
                    <CloseIcon />
                  </IconButton>
                </Box>
              </Box>
              <Box
                onWheel={(e) => {
                  e.preventDefault();
                  setImageZoom((z) => {
                    const next = e.deltaY < 0 ? z + 0.1 : z - 0.1;
                    return Math.min(3, Math.max(0.5, Number(next.toFixed(2))));
                  });
                }}
                sx={{
                  height: { xs: '55vh', sm: '65vh' },
                  overflow: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: { xs: 1.5, sm: 2.5 },
                  bgcolor: '#0b1220',
                  cursor: imageZoom > 1 ? 'grab' : 'default',
                }}
              >
                {imagePreview ? (
                  <Box
                    component="img"
                    src={imagePreview.url}
                    alt={imagePreview.title}
                    sx={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      transform: `scale(${imageZoom})`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.15s ease',
                      borderRadius: 1,
                      userSelect: 'none',
                    }}
                    draggable={false}
                  />
                ) : null}
              </Box>
            </Dialog>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}