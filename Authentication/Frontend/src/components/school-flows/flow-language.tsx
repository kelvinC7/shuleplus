'use client';

import { cn } from '@/lib/utils';
import { flowSectionSubClass, flowSectionTitleClass } from './flow-modal-shell';

export type FlowLang = 'rw' | 'en' | 'fr';

export const FLOW_LANGUAGES: { code: FlowLang; name: string; native: string }[] = [
  { code: 'rw', name: 'Kinyarwanda', native: 'Ikinyarwanda' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'fr', name: 'Français', native: 'Français' },
];

export function FlowLanguageStep({
  lang,
  onSelect,
  title,
  subtitle,
  variant = 'card',
}: {
  lang: FlowLang | null;
  onSelect: (code: FlowLang) => void;
  title?: string;
  subtitle?: string;
  variant?: 'card' | 'chip';
}) {
  const t = pickFlowText(lang, PAY_FEES_I18N);
  return (
    <div>
      <h3 className={flowSectionTitleClass}>{title ?? t.langTitle}</h3>
      <p className={flowSectionSubClass}>{subtitle ?? t.langSub}</p>
      {variant === 'chip' ? (
        <div className="mt-[18px] grid grid-cols-3 gap-2.5">
          {FLOW_LANGUAGES.map((l) => {
            const selected = lang === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => onSelect(l.code)}
                className={cn(
                  'rounded-[14px] border-[1.5px] px-2.5 py-5 text-center text-[13px] font-bold transition-all active:scale-[0.98]',
                  selected
                    ? 'border-sky-600 bg-sky-50 text-sky-700 shadow-[0_0_0_3px_rgba(14,165,233,0.15)]'
                    : 'border-ink-200 bg-white text-ink-700 hover:border-sky-300',
                )}
              >
                {l.native}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {FLOW_LANGUAGES.map((l) => {
          const selected = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => onSelect(l.code)}
              className={cn(
                'flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98]',
                selected
                  ? 'border-sky-500 bg-sky-50 shadow-sm ring-1 ring-sky-200'
                  : 'border-ink-200 bg-white hover:border-sky-200 hover:bg-sky-50/40',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium',
                  selected ? 'bg-sky-600 text-white' : 'bg-ink-100 text-ink-600',
                )}
              >
                {l.code.toUpperCase()}
              </span>
              <span className="mt-1 text-[13.5px] font-medium text-ink-900">{l.native}</span>
              <span className="text-[11px] text-ink-500">{l.name}</span>
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}

export function pickFlowText<T>(lang: FlowLang | null, table: Record<FlowLang, T>): T {
  return table[lang ?? 'en'];
}

/* ─── Pay Fees translations ─── */

export type PayFeesText = {
  langTitle: string;
  langSub: string;
  modalBadge: string;
  modalTitle: string;
  stepLabels: Array<{ label: string; short: string }>;
  studentTitle: string;
  studentSub: string;
  studentCodeLabel: string;
  studentCodePlaceholder: string;
  scanTip: string;
  scanHint: string;
  scanCancel: string;
  lookingUp: string;
  back: string;
  close: string;
  continue: string;
  findStudent: string;
  loading: string;
  reviewPay: string;
  payAmount: (amount: string) => string;
  requestLoan: string;
  payIntro: (school: string) => string;
  studentDetails: string;
  classNotSet: string;
  classLabel: string;
  studentCodeBadge: string;
  academicYear: string;
  term: string;
  selectOption: string;
  reloadFees: string;
  loadingFees: string;
  feeStructure: string;
  chooseFees: string;
  selectAll: string;
  duePaid: (due: string, paid: string) => string;
  selectYearTerm: string;
  remainingBalance: string;
  selectedAmount: string;
  settleQuestion: (amount: string, name: string, school: string) => string;
  payNow: string;
  payNowDesc: string;
  selected: string;
  instantSettlement: string;
  requestLoanTitle: string;
  requestLoanDesc: string;
  flexibleRepayment: string;
  loanHandoffNote: string;
  chooseProceed: string;
  outstandingSelected: string;
  payFull: string;
  payFullDesc: string;
  payCustom: string;
  payCustomDesc: string;
  enterAmount: (max: string) => string;
  amountCapped: (max: string) => string;
  amountToPayNow: string;
  choosePayment: string;
  momoLabel: string;
  momoSub: string;
  cardLabel: string;
  cardSub: string;
  bankLabel: string;
  bankSub: string;
  paymentSent: string;
  checkPhone: (phone: string) => string;
  waitingConfirm: string;
  momoPayment: string;
  phoneNumber: string;
  network: string;
  mtnMomo: string;
  airtelMoney: string;
  amount: string;
  cardPayment: string;
  cardNumber: string;
  cardholder: string;
  expiry: string;
  cvv: string;
  cardSecureNote: string;
  bankPayment: string;
  selectBank: string;
  chooseBank: string;
  accountNumber: string;
  accountHolder: string;
  bankConfirmNote: string;
  checkAgain: string;
  changePayment: string;
  reviewStudent: string;
  name: string;
  school: string;
  classField: string;
  period: string;
  selectedFees: string;
  partPaymentNote: (amount: string, total: string) => string;
  paymentMethod: string;
  method: string;
  phone: string;
  bankConfirmReview: (amount: string, bank: string) => string;
  totalToPay: string;
  paymentRecorded: string;
  paymentSuccess: string;
  pendingNote: string;
  paidSummary: (amount: string, name: string, year: string, term: string) => string;
  reference: string;
  remaining: string;
  checkAgainFunds: string;
  downloadReceipt: string;
  downloadReceiptDesc: string;
  anotherPayment: string;
  anotherPaymentDesc: string;
  backToSchool: string;
  backToSchoolDesc: string;
  verified: string;
  purposeDefault: string;
  guarantorName: string;
  guarantorPhone: string;
  guarantorRelation: string;
  guarantorNamePh: string;
  guarantorPhonePh: string;
  guarantorRelationPh: string;
  applicantOptional: string;
};

export const PAY_FEES_I18N: Record<FlowLang, PayFeesText> = {
  rw: {
    langTitle: 'Hitamo Ururimi',
    langSub: 'Hitamo ururimi uzakoresha mu kwishyura amafaranga.',
    modalBadge: 'Kwishyura Amafaranga',
    modalTitle: 'Kwishyura Amafaranga y\u2019Ishuri',
    stepLabels: [
      { label: 'Ururimi', short: 'Ururimi' },
      { label: 'Umunyeshuri', short: 'Umunyeshuri' },
      { label: 'Amafaranga', short: 'Amafaranga' },
      { label: 'Hitamo', short: 'Hitamo' },
      { label: 'Umubare', short: 'Umubare' },
      { label: 'Kwishyura', short: 'Kwishyura' },
      { label: 'Gusuzuma', short: 'Gusuzuma' },
    ],
    studentTitle: 'Amakuru y\u2019Umunyeshuri',
    studentSub: 'Andika kode y\u2019umunyeshuri (ShuleCode / SDMS) kugira ngo ufungure konti ye.',
    studentCodeLabel: 'Kode y\u2019Umunyeshuri (ShuleCode / SDMS)',
    studentCodePlaceholder: 'urugero: SDM-2026-004821',
    scanTip: 'Scan QR ikoresha kamera yawe gusoma kode ya ShuleCode.',
    scanHint: 'Shyira kamera ku kode ya QR y\u2019umunyeshuri.',
    scanCancel: 'Hagarika',
    lookingUp: 'Birimo gushakisha umunyeshuri…',
    back: 'Subira',
    close: 'Funga',
    continue: 'Komeza',
    findStudent: 'Shaka umunyeshuri',
    loading: 'Birimo gupakira…',
    reviewPay: 'Gusuzuma & Kwishyura',
    payAmount: (a) => `Kwishyura · ${a}`,
    requestLoan: 'Saba Inguzanyo',
    payIntro: (s) => `Urimo kwishyura amafaranga kuri ${s}. Andika kode y\u2019umunyeshuri kugira ngo ufungure konti ye.`,
    studentDetails: 'Amakuru y\u2019umunyeshuri',
    classNotSet: 'Icyiciro ntikiboneka',
    classLabel: 'Icyiciro',
    studentCodeBadge: 'Kode y\u2019umunyeshuri',
    academicYear: 'Umwaka w\u2019Amashuri',
    term: 'Igihembwe',
    selectOption: 'Hitamo…',
    reloadFees: 'Ongera gupakira amafaranga',
    loadingFees: 'Birimo gupakira amafaranga…',
    feeStructure: 'Uburyo bw\u2019amafaranga',
    chooseFees: 'Hitamo amafaranga ushaka kwishyura',
    selectAll: 'Hitamo byose',
    duePaid: (d, p) => `${d} yishyurwa · ${p} yishyuwe`,
    selectYearTerm: 'Hitamo umwaka n\u2019igihembwe kugira ngo upakire amafaranga.',
    remainingBalance: 'Asigaye kwishyurwa',
    selectedAmount: 'Amafaranga wahisemo',
    settleQuestion: (a, n, s) => `Ushaka gute kwishyura ${a} y\u2019amafaranga wahisemo kuri ${n} muri ${s}?`,
    payNow: 'Kwishyura Nonaha',
    payNowDesc: 'Kwishyura amafaranga wahisemo ukoresheje mobile money, ikarita cyangwa banki.',
    selected: '✓ Wahisemo',
    instantSettlement: 'Kwishyura ako kanya',
    requestLoanTitle: 'Saba Inguzanyo',
    requestLoanDesc: 'Bona inguzanyo yo kwishyura amafaranga y\u2019ishuri, wishyure mu ntambwe.',
    flexibleRepayment: 'Kwishyura mu buryo bworoshye',
    loanHandoffNote: 'Uzakomeza mu gusaba inguzanyo. Amakuru y\u2019umunyeshuri azakomeza.',
    chooseProceed: 'Hitamo uko ushaka gukomeza.',
    outstandingSelected: 'Amafaranga asigaye ku byahiswemo',
    payFull: 'Kwishyura yose',
    payFullDesc: 'Kwishyura byose ubu',
    payCustom: 'Kwishyura amafaranga runaka',
    payCustomDesc: 'Kwishyura igice',
    enterAmount: (m) => `Andika amafaranga (ntarenze ${m})`,
    amountCapped: (m) => `Amafaranga ntarenze ${m}.`,
    amountToPayNow: 'Amafaranga wishyura ubu',
    choosePayment: 'Hitamo uburyo bwo kwishyura',
    momoLabel: 'Mobile Money',
    momoSub: 'MTN · Airtel',
    cardLabel: 'Ikarita ya Banki',
    cardSub: 'Visa · Mastercard',
    bankLabel: 'Konti ya Banki',
    bankSub: 'Kohereza muri banki',
    paymentSent: 'Ubusabe bwo kwishyura bwoherejwe',
    checkPhone: (p) => `Reba telefoni yawe ${p} wemeze ukoresheje PIN ya Mobile Money.`,
    waitingConfirm: 'Birimo gutegereza kwemezwa…',
    momoPayment: 'Kwishyura na Mobile Money',
    phoneNumber: 'Numero ya Telefoni',
    network: 'Umuyoboro',
    mtnMomo: 'MTN Mobile Money',
    airtelMoney: 'Airtel Money',
    amount: 'Amafaranga',
    cardPayment: 'Kwishyura n\u2019Ikarita',
    cardNumber: 'Numero y\u2019Ikarita',
    cardholder: 'Izina kuri ikarita',
    expiry: 'Itariki isohora',
    cvv: 'CVV',
    cardSecureNote: 'Amakuru y\u2019ikarita arinzwe  ShulePlus ntayabika.',
    bankPayment: 'Kwishyura na Banki',
    selectBank: 'Hitamo Banki',
    chooseBank: 'Hitamo banki yawe…',
    accountNumber: 'Numero ya Konti',
    accountHolder: 'Izina rya Konti',
    bankConfirmNote: 'Uzakomeza kwemeza kohereza muri banki.',
    checkAgain: 'Ongera ugerageze',
    changePayment: 'Hindura uburyo bwo kwishyura',
    reviewStudent: 'Umunyeshuri',
    name: 'Izina',
    school: 'Ikigo',
    classField: 'Icyiciro',
    period: 'Igihe',
    selectedFees: 'Amafaranga wahisemo',
    partPaymentNote: (a, t) => `Kwishyura igice ${a} ku ${t} yose.`,
    paymentMethod: 'Uburyo bwo kwishyura',
    method: 'Uburyo',
    phone: 'Telefoni',
    bankConfirmReview: (a, b) => `Emeza kwishyura ${a} biva muri ${b}.`,
    totalToPay: 'Yose wishyura ubu',
    paymentRecorded: 'Kwishyura byanditswe',
    paymentSuccess: 'Kwishyura byagenze neza',
    pendingNote: 'Ubusabe bwabitswe ariko amafaranga ntabwo arakiriwe. Biba PAID iyo byemezwa.',
    paidSummary: (a, n, y, t) => `${a} yishyuwe kuri ${n} · ${y} ${t}`,
    reference: 'Referanse',
    remaining: 'Asigaye',
    checkAgainFunds: 'Reba niba amafaranga arakiriwe',
    downloadReceipt: 'Kuramo inyemezabwishyu',
    downloadReceiptDesc: 'Bika inyemezabwishyu nka PDF',
    anotherPayment: 'Kwishyura indi nshuro',
    anotherPaymentDesc: 'Tangira kwishyura gushya',
    backToSchool: 'Subira ku kigo',
    backToSchoolDesc: 'Garuka ku rutonde rw\u2019amashuri',
    verified: 'Byemejwe',
    purposeDefault: 'Kwishyura amafaranga asigaye',
    guarantorName: 'Izina ry\u2019uwishyura',
    guarantorPhone: 'Telefoni y\u2019uwishyura',
    guarantorRelation: 'Isano n\u2019umunyeshuri',
    guarantorNamePh: 'Izina ryuzuye',
    guarantorPhonePh: '07…',
    guarantorRelationPh: 'urugero: So, Nyina',
    applicantOptional: 'Byihuse kwemezwa',
  },
  en: {
    langTitle: 'Choose Your Language',
    langSub: 'Select the language you want to use for paying school fees.',
    modalBadge: 'Pay Fees',
    modalTitle: 'Pay School Fees',
    stepLabels: [
      { label: 'Language', short: 'Lang' },
      { label: 'Student', short: 'Student' },
      { label: 'Fees', short: 'Fees' },
      { label: 'How to settle', short: 'Choose' },
      { label: 'Amount', short: 'Amount' },
      { label: 'Payment', short: 'Payment' },
      { label: 'Review & Pay', short: 'Review' },
    ],
    studentTitle: 'Student Details',
    studentSub: 'Enter the student\u2019s ShuleCode or SDMS code to open their fee account.',
    studentCodeLabel: 'Student code (ShuleCode / SDMS)',
    studentCodePlaceholder: 'e.g. SDM-2026-004821',
    scanTip: 'Scan QR uses your device camera to read the student\u2019s ShuleCode QR card.',
    scanHint: 'Point the camera at the student\u2019s ShuleCode QR code.',
    scanCancel: 'Cancel',
    lookingUp: 'Looking up student…',
    back: 'Back',
    close: 'Close',
    continue: 'Continue',
    findStudent: 'Find student',
    loading: 'Loading…',
    reviewPay: 'Review & Pay',
    payAmount: (a) => `Pay · ${a}`,
    requestLoan: 'Request Loan',
    payIntro: (s) => `Paying fees for ${s}. Enter the student\u2019s ShuleCode or SDMS code to open their fee account.`,
    studentDetails: 'Student details',
    classNotSet: 'Class not set',
    classLabel: 'Class',
    studentCodeBadge: 'Student code',
    academicYear: 'Academic Year',
    term: 'Term',
    selectOption: 'Select…',
    reloadFees: 'Reload fees for this period',
    loadingFees: 'Loading fee structure…',
    feeStructure: 'Fee structure',
    chooseFees: 'Choose which fees to pay',
    selectAll: 'Select all',
    duePaid: (d, p) => `${d} due · ${p} paid`,
    selectYearTerm: 'Select a year and term to load the fee structure.',
    remainingBalance: 'Remaining balance',
    selectedAmount: 'Selected amount',
    settleQuestion: (a, n, s) => `How would you like to settle ${a} against the selected fees for ${n} at ${s}?`,
    payNow: 'Pay Now',
    payNowDesc: 'Pay the selected fees now using mobile money, card or bank transfer.',
    selected: '✓ Selected',
    instantSettlement: 'Instant settlement',
    requestLoanTitle: 'Request Loan',
    requestLoanDesc: 'Get an education loan to clear these fees, repaid in flexible instalments.',
    flexibleRepayment: 'Flexible repayment',
    loanHandoffNote: 'You\u2019ll continue in a loan application. Your verified student details carry over automatically.',
    chooseProceed: 'Choose how you\u2019d like to proceed.',
    outstandingSelected: 'Outstanding balance for selected fees',
    payFull: 'Pay full amount',
    payFullDesc: 'Clear the selected balance now',
    payCustom: 'Pay a custom amount',
    payCustomDesc: 'Make an installment payment',
    enterAmount: (m) => `Enter amount (max ${m})`,
    amountCapped: (m) => `Amount capped at the outstanding balance of ${m}.`,
    amountToPayNow: 'Amount to pay now',
    choosePayment: 'Choose how you\u2019d like to pay',
    momoLabel: 'Mobile Money',
    momoSub: 'MTN · Airtel',
    cardLabel: 'Bank Card',
    cardSub: 'Visa · Mastercard',
    bankLabel: 'Bank Account',
    bankSub: 'Direct transfer',
    paymentSent: 'Payment request sent',
    checkPhone: (p) => `Check your phone ${p} and approve the request using your Mobile Money PIN.`,
    waitingConfirm: 'Waiting for confirmation…',
    momoPayment: 'Mobile Money Payment',
    phoneNumber: 'Phone Number',
    network: 'Network',
    mtnMomo: 'MTN Mobile Money',
    airtelMoney: 'Airtel Money',
    amount: 'Amount',
    cardPayment: 'Card Payment',
    cardNumber: 'Card Number',
    cardholder: 'Cardholder Name',
    expiry: 'Expiry Date',
    cvv: 'CVV',
    cardSecureNote: 'Card details are processed securely ShulePlus never stores your card number or CVV.',
    bankPayment: 'Bank Payment',
    selectBank: 'Select Bank',
    chooseBank: 'Choose your bank…',
    accountNumber: 'Account Number',
    accountHolder: 'Account Holder Name',
    bankConfirmNote: 'You will confirm the transfer on the next screen before it is sent to your bank.',
    checkAgain: 'Check again',
    changePayment: 'Change payment details',
    reviewStudent: 'Student',
    name: 'Name',
    school: 'School',
    classField: 'Class',
    period: 'Period',
    selectedFees: 'Selected fees',
    partPaymentNote: (a, t) => `Part payment installment of ${a} against the selected total of ${t}.`,
    paymentMethod: 'Payment method',
    method: 'Method',
    phone: 'Phone',
    bankConfirmReview: (a, b) => `Confirm bank payment  authorize ${a} from ${b}.`,
    totalToPay: 'Total to pay now',
    paymentRecorded: 'Payment recorded',
    paymentSuccess: 'Payment successful',
    pendingNote: 'The payment request is saved but funds have not arrived yet. It turns to PAID once confirmed.',
    paidSummary: (a, n, y, t) => `${a} paid for ${n} · ${y} ${t}`,
    reference: 'Reference',
    remaining: 'Remaining balance',
    checkAgainFunds: 'Confirm if the funds have arrived',
    downloadReceipt: 'Download receipt',
    downloadReceiptDesc: 'Save the fee receipt as PDF',
    anotherPayment: 'Make another payment',
    anotherPaymentDesc: 'Start a new fee payment',
    backToSchool: 'Back to school',
    backToSchoolDesc: 'Return to the school directory',
    verified: 'Verified',
    purposeDefault: 'Clear outstanding school fees',
    guarantorName: 'Guarantor name',
    guarantorPhone: 'Guarantor phone',
    guarantorRelation: 'Relationship to student',
    guarantorNamePh: 'Full name',
    guarantorPhonePh: '07…',
    guarantorRelationPh: 'e.g. Father, Mother, Aunt',
    applicantOptional: 'Optional but speeds up approval',
  },
  fr: {
    langTitle: 'Choisissez la langue',
    langSub: 'Choisissez la langue pour payer les frais scolaires.',
    modalBadge: 'Payer les frais',
    modalTitle: 'Payer les frais scolaires',
    stepLabels: [
      { label: 'Langue', short: 'Langue' },
      { label: 'Élève', short: 'Élève' },
      { label: 'Frais', short: 'Frais' },
      { label: 'Règlement', short: 'Choix' },
      { label: 'Montant', short: 'Montant' },
      { label: 'Paiement', short: 'Paiement' },
      { label: 'Vérifier', short: 'Vérifier' },
    ],
    studentTitle: 'Informations de l\u2019élève',
    studentSub: 'Saisissez le ShuleCode ou le code SDMS de l\u2019élève pour ouvrir son compte.',
    studentCodeLabel: 'Code élève (ShuleCode / SDMS)',
    studentCodePlaceholder: 'ex : SDM-2026-004821',
    scanTip: 'Scan QR utilise l\u2019appareil photo pour lire la carte QR ShuleCode.',
    scanHint: 'Pointez la caméra vers le code QR ShuleCode de l\u2019élève.',
    scanCancel: 'Annuler',
    lookingUp: 'Recherche de l\u2019élève…',
    back: 'Retour',
    close: 'Fermer',
    continue: 'Continuer',
    findStudent: 'Rechercher l\u2019élève',
    loading: 'Chargement…',
    reviewPay: 'Vérifier et payer',
    payAmount: (a) => `Payer · ${a}`,
    requestLoan: 'Demander un prêt',
    payIntro: (s) => `Paiement des frais pour ${s}. Saisissez le ShuleCode ou le code SDMS de l\u2019élève.`,
    studentDetails: 'Détails de l\u2019élève',
    classNotSet: 'Classe non définie',
    classLabel: 'Classe',
    studentCodeBadge: 'Code élève',
    academicYear: 'Année scolaire',
    term: 'Trimestre',
    selectOption: 'Sélectionner…',
    reloadFees: 'Recharger les frais pour cette période',
    loadingFees: 'Chargement des frais…',
    feeStructure: 'Structure des frais',
    chooseFees: 'Choisissez les frais à payer',
    selectAll: 'Tout sélectionner',
    duePaid: (d, p) => `${d} dû · ${p} payé`,
    selectYearTerm: 'Sélectionnez une année et un trimestre pour charger les frais.',
    remainingBalance: 'Solde restant',
    selectedAmount: 'Montant sélectionné',
    settleQuestion: (a, n, s) => `Comment souhaitez-vous régler ${a} pour ${n} à ${s} ?`,
    payNow: 'Payer maintenant',
    payNowDesc: 'Payez les frais sélectionnés par mobile money, carte ou virement bancaire.',
    selected: '✓ Sélectionné',
    instantSettlement: 'Règlement instantané',
    requestLoanTitle: 'Demander un prêt',
    requestLoanDesc: 'Obtenez un prêt scolaire remboursable en plusieurs versements.',
    flexibleRepayment: 'Remboursement flexible',
    loanHandoffNote: 'Vous continuerez dans une demande de prêt. Les détails de l\u2019élève seront conservés.',
    chooseProceed: 'Choisissez comment continuer.',
    outstandingSelected: 'Solde restant pour les frais sélectionnés',
    payFull: 'Payer le montant total',
    payFullDesc: 'Régler le solde sélectionné maintenant',
    payCustom: 'Payer un montant personnalisé',
    payCustomDesc: 'Effectuer un paiement partiel',
    enterAmount: (m) => `Saisir le montant (max ${m})`,
    amountCapped: (m) => `Montant plafonné au solde restant de ${m}.`,
    amountToPayNow: 'Montant à payer maintenant',
    choosePayment: 'Choisissez votre mode de paiement',
    momoLabel: 'Mobile Money',
    momoSub: 'MTN · Airtel',
    cardLabel: 'Carte bancaire',
    cardSub: 'Visa · Mastercard',
    bankLabel: 'Compte bancaire',
    bankSub: 'Virement direct',
    paymentSent: 'Demande de paiement envoyée',
    checkPhone: (p) => `Vérifiez votre téléphone ${p} et approuvez avec votre PIN Mobile Money.`,
    waitingConfirm: 'En attente de confirmation…',
    momoPayment: 'Paiement Mobile Money',
    phoneNumber: 'Numéro de téléphone',
    network: 'Réseau',
    mtnMomo: 'MTN Mobile Money',
    airtelMoney: 'Airtel Money',
    amount: 'Montant',
    cardPayment: 'Paiement par carte',
    cardNumber: 'Numéro de carte',
    cardholder: 'Nom sur la carte',
    expiry: 'Date d\u2019expiration',
    cvv: 'CVV',
    cardSecureNote: 'Les données de carte sont traitées de façon sécurisée  ShulePlus ne les stocke pas.',
    bankPayment: 'Paiement bancaire',
    selectBank: 'Sélectionner la banque',
    chooseBank: 'Choisissez votre banque…',
    accountNumber: 'Numéro de compte',
    accountHolder: 'Nom du titulaire',
    bankConfirmNote: 'Vous confirmerez le virement à l\u2019écran suivant.',
    checkAgain: 'Vérifier à nouveau',
    changePayment: 'Modifier le paiement',
    reviewStudent: 'Élève',
    name: 'Nom',
    school: 'École',
    classField: 'Classe',
    period: 'Période',
    selectedFees: 'Frais sélectionnés',
    partPaymentNote: (a, t) => `Paiement partiel de ${a} sur un total de ${t}.`,
    paymentMethod: 'Mode de paiement',
    method: 'Mode',
    phone: 'Téléphone',
    bankConfirmReview: (a, b) => `Confirmez le paiement de ${a} depuis ${b}.`,
    totalToPay: 'Total à payer maintenant',
    paymentRecorded: 'Paiement enregistré',
    paymentSuccess: 'Paiement réussi',
    pendingNote: 'La demande est enregistrée mais les fonds ne sont pas encore arrivés. Passe à PAYÉ une fois confirmé.',
    paidSummary: (a, n, y, t) => `${a} payé pour ${n} · ${y} ${t}`,
    reference: 'Référence',
    remaining: 'Solde restant',
    checkAgainFunds: 'Vérifier si les fonds sont arrivés',
    downloadReceipt: 'Télécharger le reçu',
    downloadReceiptDesc: 'Enregistrer le reçu en PDF',
    anotherPayment: 'Nouveau paiement',
    anotherPaymentDesc: 'Commencer un nouveau paiement',
    backToSchool: 'Retour à l\u2019école',
    backToSchoolDesc: 'Retour à l\u2019annuaire',
    verified: 'Vérifié',
    purposeDefault: 'Régler les frais scolaires restants',
    guarantorName: 'Nom du garant',
    guarantorPhone: 'Téléphone du garant',
    guarantorRelation: 'Lien avec l\u2019élève',
    guarantorNamePh: 'Nom complet',
    guarantorPhonePh: '07…',
    guarantorRelationPh: 'ex : Père, Mère, Tante',
    applicantOptional: 'Facultatif mais accélère l\u2019approbation',
  },
};

/* ─── Loan translations ─── */

export type LoanText = {
  langTitle: string;
  langSub: string;
  modalBadge: string;
  modalTitle: string;
  stepLabels: Array<{ label: string; short: string }>;
  applicantTitle: string;
  applicantSub: string;
  fromFeesNote: string;
  studentCodeLabel: string;
  studentCodePlaceholder: string;
  scanHint: string;
  scanCancel: string;
  lookingUp: string;
  back: string;
  close: string;
  continue: string;
  findStudent: string;
  loading: string;
  requestVerification: string;
  verifySubmit: string;
  submitting: string;
  done: string;
  loanIntro: (school: string) => string;
  verified: string;
  purposeOfLoan: string;
  purposePh: string;
  purposeDefault: string;
  student: string;
  school: string;
  classField: string;
  studentCode: string;
  classNotSet: string;
  scanQr: string;
  statusUnderReview: string;
  submittedSummary: (amount: string) => string;
  backToSchool: string;
  guarantorName: string;
  guarantorPhone: string;
  guarantorRelation: string;
  guarantorNamePh: string;
  guarantorPhonePh: string;
  guarantorRelationPh: string;
  applicantOptional: string;
  applicant: string;
  checkingLoan: string;
  chooseLoan: string;
  matchesFees: string;
  general: string;
  interest: string;
  processingFee: string;
  period: string;
  months: string;
  monthCount: (n: number) => string;
  outstandingFees: string;
  outstandingRecommend: string;
  noOutstanding: string;
  loanAmountPlan: string;
  amountBorrow: string;
  limits: (min: string, max: string) => string;
  repaymentPeriod: string;
  periodBetween: (min: number, max: number) => string;
  paymentFrequency: string;
  freqMonthly: string;
  freqMonthlySub: string;
  freqBiWeekly: string;
  freqBiWeeklySub: string;
  freqWeekly: string;
  freqWeeklySub: string;
  freqQuarterly: string;
  freqQuarterlySub: string;
  youBorrow: string;
  eachInstallment: string;
  almostThere: string;
  repaymentSchedule: string;
  principal: string;
  totalPayable: string;
  installments: string;
  each: string;
  dueDate: string;
  amountCol: string;
  receiveMoney: string;
  disbPaySchool: string;
  disbPaySchoolSub: string;
  disbMomo: string;
  disbMomoSub: string;
  disbBank: string;
  disbBankSub: string;
  recommended: string;
  momoNumber: string;
  momoHint: string;
  momoPh: string;
  bank: string;
  selectBank: string;
  accountHolder: string;
  accountNumber: string;
  fullName: string;
  reviewTitle: string;
  loanDetails: string;
  loanType: string;
  amount: string;
  frequency: string;
  installment: string;
  disbursement: string;
  method: string;
  toMobile: string;
  account: string;
  destination: string;
  agreeTerms: (total: string) => string;
  confirmInfo: string;
  verifyTitle: string;
  verifySub: (phone: string) => string;
  verifyDemo: string;
  applicationSubmitted: string;
  applicationNumber: string;
  totalRepay: string;
  viewApplication: string;
  viewApplicationDesc: string;
  checkLater: string;
  checkLaterDesc: string;
  backToSchoolDesc: string;
  valNoStudent: string;
  valNoLoanType: string;
  valMinAmount: (min: string) => string;
  valMaxAmount: (max: string) => string;
  valExceedOutstanding: (out: string) => string;
  valPeriod: (min: number, max: number) => string;
};

export const LOAN_I18N: Record<FlowLang, LoanText> = {
  rw: {
    langTitle: 'Hitamo Ururimi',
    langSub: 'Hitamo ururimi uzakoresha mu gusaba inguzanyo.',
    modalBadge: 'Saba Inguzanyo',
    modalTitle: 'Bona Inguzanyo y\u2019Ishuri',
    stepLabels: [
      { label: 'Ururimi', short: 'Ururimi' },
      { label: 'Uwasabye', short: 'Uwasabye' },
      { label: 'Amafaranga', short: 'Amafaranga' },
      { label: 'Kwishyura', short: 'Kwishyura' },
      { label: 'Gusuzuma', short: 'Gusuzuma' },
      { label: 'Kwemeza', short: 'Kwemeza' },
      { label: 'Byoherejwe', short: 'Byarangiye' },
    ],
    applicantTitle: 'Uwasabye n\u2019amakuru y\u2019inyongera',
    applicantSub: 'Inyongera zijyanye n\u2019umunyeshuri. Shyiramo kode ye kugira ngo wemeze.',
    fromFeesNote: 'Uwasabye yamaze kwemezwa binyuze mu Kwishyura Amafaranga kuri',
    studentCodeLabel: 'Kode y\u2019Umunyeshuri (ShuleCode / SDMS)',
    studentCodePlaceholder: 'urugero: SDM-2026-004821',
    scanHint: 'Shyira kamera ku kode ya QR y\u2019umunyeshuri.',
    scanCancel: 'Hagarika',
    lookingUp: 'Birimo gushakisha umunyeshuri…',
    back: 'Subira',
    close: 'Funga',
    continue: 'Komeza',
    findStudent: 'Shaka umunyeshuri',
    loading: 'Birimo gupakira…',
    requestVerification: 'Saba kwemezwa',
    verifySubmit: 'Emeza & Ohereza',
    submitting: 'Birimo koherezwa…',
    done: 'Byarangiye',
    loanIntro: (s) => `Inyongera zijyanye n\u2019umunyeshuri. Andika ShuleCode cyangwa SDMS kugira ngo wemeze kuri ${s}.`,
    verified: 'Byemejwe',
    purposeOfLoan: 'Intego y\u2019inguzanyo',
    purposePh: 'urugero: Kwishyura amafaranga asigaye',
    purposeDefault: 'Kwishyura amafaranga asigaye',
    student: 'Umunyeshuri',
    school: 'Ikigo',
    classField: 'Icyiciro',
    studentCode: 'Kode y\u2019umunyeshuri',
    classNotSet: 'Icyiciro ntikiboneka',
    scanQr: 'Scan QR',
    statusUnderReview: 'BIRIMO GUSUZUMWA',
    submittedSummary: (a) => `Inguzanyo y\u2019amafaranga y\u2019ishuri ya ${a} yakiriwe. Ikigo rizayisuzuma vuba.`,
    backToSchool: 'Subira ku kigo',
    guarantorName: 'Izina ry\u2019uwishyura',
    guarantorPhone: 'Telefoni y\u2019uwishyura',
    guarantorRelation: 'Isano n\u2019umunyeshuri',
    guarantorNamePh: 'Izina ryuzuye',
    guarantorPhonePh: '07…',
    guarantorRelationPh: 'urugero: So, Nyina',
    applicantOptional: 'Byihuse kwemezwa',
    applicant: 'Uwasabye',
    checkingLoan: 'Birimo kureba inguzanyo…',
    chooseLoan: 'Hitamo inguzanyo yawe',
    matchesFees: 'BIHUJE N\u2019AMAFARANGA',
    general: 'RUSANGE',
    interest: 'Inyungu',
    processingFee: 'Amafaranga yo gutunganya',
    period: 'Igihe',
    months: 'amezi',
    monthCount: (n) => `${n} amezi`,
    outstandingFees: 'Amafaranga asigaye',
    outstandingRecommend: 'Turagusaba kugera kuri iyi mali kugira ngo wishyure byose.',
    noOutstanding: 'Nta mafaranga asigaye. Urashobora gusaba inguzanyo y\u2019ibindi bisabwa.',
    loanAmountPlan: 'Amafaranga n\u2019gahunda yo kwishyura',
    amountBorrow: 'Amafaranga usaba',
    limits: (min, max) => `Imipaka: ${min} – ${max}`,
    repaymentPeriod: 'Igihe cyo kwishyura',
    periodBetween: (min, max) => `Hagati ya ${min} na ${max} amezi`,
    paymentFrequency: 'Inshuro zo kwishyura',
    freqMonthly: 'Buri kwezi',
    freqMonthlySub: 'Buri kwezi',
    freqBiWeekly: 'Buri byumweru 2',
    freqBiWeeklySub: 'Buri byumweru 2',
    freqWeekly: 'Buri cyumweru',
    freqWeeklySub: 'Buri cyumweru',
    freqQuarterly: 'Buri gihembwe',
    freqQuarterlySub: 'Buri mezi 3',
    youBorrow: 'Uzafata',
    eachInstallment: 'Buri ntambwe',
    almostThere: 'Hafi aho',
    repaymentSchedule: 'Gahunda yo kwishyura',
    principal: 'Inguzanyo',
    totalPayable: 'Yose wishyura',
    installments: 'Intambwe',
    each: 'buri imwe',
    dueDate: 'Itariki',
    amountCol: 'Amafaranga',
    receiveMoney: 'Uko uzakira amafaranga',
    disbPaySchool: 'Kwishyura ikigo',
    disbPaySchoolSub: 'Kuraho amafaranga ku kigo',
    disbMomo: 'Mobile Money yanjye',
    disbMomoSub: 'MTN · Airtel',
    disbBank: 'Konti yanjye ya banki',
    disbBankSub: 'Kohereza muri banki',
    recommended: 'Byasabwa',
    momoNumber: 'Numero ya Mobile Money',
    momoHint: 'Ntitwabaza PIN yawe',
    momoPh: 'urugero: 0788123456',
    bank: 'Banki',
    selectBank: 'Hitamo banki…',
    accountHolder: 'Umunyamakonti',
    accountNumber: 'Numero ya konti',
    fullName: 'Izina ryuzuye',
    reviewTitle: 'Gusuzuma icyifuzo cyawe',
    loanDetails: 'Amakuru y\u2019inguzanyo',
    loanType: 'Ubwoko bw\u2019inguzanyo',
    amount: 'Amafaranga',
    frequency: 'Inshuro',
    installment: 'Intambwe',
    disbursement: 'Kohereza',
    method: 'Uburyo',
    toMobile: 'Kuri telefoni',
    account: 'Konti',
    destination: 'Aho bigeze',
    agreeTerms: (t) => `Nemeye amategeko n\u2019ko nzishyura ${t} nk\u2019uko byateganyijwe.`,
    confirmInfo: 'Nemeza ko amakuru y\u2019uwasabye ari ukuri.',
    verifyTitle: 'Emeza umwirondoro wawe',
    verifySub: (p) => `Twohereje kode ya imibare 6 kuri ${p}. Yinjire hasi.`,
    verifyDemo: 'Iyi demo  kode iemezwa mbere yo kohereza.',
    applicationSubmitted: 'Icyifuzo cyoherejwe',
    applicationNumber: 'Nomero y\u2019icyifuzo',
    totalRepay: 'Yose wishyura',
    viewApplication: 'Reba icyifuzo',
    viewApplicationDesc: 'Reba amakuru y\u2019icyifuzo cyawe',
    checkLater: 'Reba nyuma',
    checkLaterDesc: 'Reba uko bigenda nyuma',
    backToSchoolDesc: 'Garuka ku rutonde rw\u2019amashuri',
    valNoStudent: 'Umunyeshuri ntiyemewe.',
    valNoLoanType: 'Ubwoko bw\u2019inguzanyo ntibuboneka.',
    valMinAmount: (m) => `Inguzanyo ntigirengeranye na ${m}.`,
    valMaxAmount: (m) => `Inguzanyo irenze ${m}.`,
    valExceedOutstanding: (o) => `Ntirenze amafaranga asigaye ${o}.`,
    valPeriod: (min, max) => `Igihe cyo kwishyura kigomba kuba ${min}–${max} amezi.`,
  },
  en: {
    langTitle: 'Choose Your Language',
    langSub: 'Select the language you want to use for your loan application.',
    modalBadge: 'Request Loan',
    modalTitle: 'Get a School Loan',
    stepLabels: [
      { label: 'Language', short: 'Lang' },
      { label: 'Applicant', short: 'Applicant' },
      { label: 'Amount', short: 'Amount' },
      { label: 'Repayment', short: 'Repayment' },
      { label: 'Review', short: 'Review' },
      { label: 'Verification', short: 'Verify' },
      { label: 'Submitted', short: 'Done' },
    ],
    applicantTitle: 'Applicant & supporting details',
    applicantSub: 'Loan applications are linked to a student. Verify the applicant below.',
    fromFeesNote: 'Applicant already verified from Pay Fees at',
    studentCodeLabel: 'Student code (ShuleCode / SDMS)',
    studentCodePlaceholder: 'e.g. SDM-2026-004821',
    scanHint: 'Point the camera at the student\u2019s ShuleCode QR code.',
    scanCancel: 'Cancel',
    lookingUp: 'Looking up student…',
    back: 'Back',
    close: 'Close',
    continue: 'Continue',
    findStudent: 'Find student',
    loading: 'Loading…',
    requestVerification: 'Request verification',
    verifySubmit: 'Verify & Submit',
    submitting: 'Submitting…',
    done: 'Done',
    loanIntro: (s) => `Loan applications are linked to a student. Enter the ShuleCode or SDMS code to verify at ${s}.`,
    verified: 'Verified',
    purposeOfLoan: 'Purpose of loan',
    purposePh: 'e.g. Clear outstanding school fees',
    purposeDefault: 'Clear outstanding school fees',
    student: 'Student',
    school: 'School',
    classField: 'Class',
    studentCode: 'Student code',
    classNotSet: 'Class not set',
    scanQr: 'Scan QR',
    statusUnderReview: 'UNDER REVIEW',
    submittedSummary: (a) => `Your School Fees Loan of ${a} has been received. The school will review it shortly.`,
    backToSchool: 'Back to school',
    guarantorName: 'Guarantor name',
    guarantorPhone: 'Guarantor phone',
    guarantorRelation: 'Relationship to student',
    guarantorNamePh: 'Full name',
    guarantorPhonePh: '07…',
    guarantorRelationPh: 'e.g. Father, Mother, Aunt',
    applicantOptional: 'Optional but speeds up approval',
    applicant: 'Applicant',
    checkingLoan: 'Checking loan availability…',
    chooseLoan: 'Choose your loan',
    matchesFees: 'MATCHES FEES',
    general: 'GENERAL',
    interest: 'Interest',
    processingFee: 'Processing fee',
    period: 'Period',
    months: 'mo',
    monthCount: (n) => `${n} mo`,
    outstandingFees: 'Outstanding fees balance',
    outstandingRecommend: 'We recommend borrowing this amount to clear the balance in full.',
    noOutstanding: 'No outstanding fees right now. You can still borrow for other school needs.',
    loanAmountPlan: 'Loan amount & repayment plan',
    amountBorrow: 'Amount to borrow',
    limits: (min, max) => `Limits: ${min} – ${max}`,
    repaymentPeriod: 'Repayment period',
    periodBetween: (min, max) => `Between ${min} and ${max} months`,
    paymentFrequency: 'Payment frequency',
    freqMonthly: 'Monthly',
    freqMonthlySub: 'Every month',
    freqBiWeekly: 'Bi-weekly',
    freqBiWeeklySub: 'Every 2 weeks',
    freqWeekly: 'Weekly',
    freqWeeklySub: 'Every week',
    freqQuarterly: 'Quarterly',
    freqQuarterlySub: 'Every 3 months',
    youBorrow: 'You borrow',
    eachInstallment: 'Each installment',
    almostThere: 'Almost there',
    repaymentSchedule: 'Your repayment schedule',
    principal: 'Principal',
    totalPayable: 'Total payable',
    installments: 'Installments',
    each: 'each',
    dueDate: 'Due date',
    amountCol: 'Amount',
    receiveMoney: 'How you\u2019ll receive the money',
    disbPaySchool: 'Pay school directly',
    disbPaySchoolSub: 'Clear fees at the school',
    disbMomo: 'My Mobile Money',
    disbMomoSub: 'MTN · Airtel',
    disbBank: 'My Bank Account',
    disbBankSub: 'Direct deposit',
    recommended: 'Recommended',
    momoNumber: 'Mobile Money number',
    momoHint: 'We never ask for your PIN',
    momoPh: 'e.g. 0788123456',
    bank: 'Bank',
    selectBank: 'Select bank…',
    accountHolder: 'Account holder',
    accountNumber: 'Account number',
    fullName: 'Full name',
    reviewTitle: 'Review your loan application',
    loanDetails: 'Loan details',
    loanType: 'Loan type',
    amount: 'Amount',
    frequency: 'Frequency',
    installment: 'Installment',
    disbursement: 'Disbursement',
    method: 'Method',
    toMobile: 'To mobile number',
    account: 'Account',
    destination: 'Destination',
    agreeTerms: (t) => `I agree to the loan terms and to repay the total of ${t} as scheduled.`,
    confirmInfo: 'I confirm the applicant information is correct.',
    verifyTitle: 'Verify your identity',
    verifySub: (p) => `We sent a 6-digit code to ${p}. Enter it below to submit your application.`,
    verifyDemo: 'This is a demo  the code is validated before submission.',
    applicationSubmitted: 'Application submitted',
    applicationNumber: 'Application number',
    totalRepay: 'Total repayable',
    viewApplication: 'View application',
    viewApplicationDesc: 'See your application summary',
    checkLater: 'Check status later',
    checkLaterDesc: 'Track review progress anytime',
    backToSchoolDesc: 'Return to the school page',
    valNoStudent: 'Student has not been verified.',
    valNoLoanType: 'Loan type is not available.',
    valMinAmount: (m) => `The loan amount must be at least ${m}.`,
    valMaxAmount: (m) => `The loan amount is above the ${m} limit.`,
    valExceedOutstanding: (o) => `The loan amount cannot exceed the outstanding fees of ${o}.`,
    valPeriod: (min, max) => `The repayment period must be ${min}–${max} months.`,
  },
  fr: {
    langTitle: 'Choisissez la langue',
    langSub: 'Choisissez la langue pour votre demande de prêt.',
    modalBadge: 'Demander un prêt',
    modalTitle: 'Obtenir un prêt scolaire',
    stepLabels: [
      { label: 'Langue', short: 'Langue' },
      { label: 'Demandeur', short: 'Demandeur' },
      { label: 'Montant', short: 'Montant' },
      { label: 'Remboursement', short: 'Remb.' },
      { label: 'Vérifier', short: 'Vérifier' },
      { label: 'Validation', short: 'Valider' },
      { label: 'Envoyé', short: 'Fini' },
    ],
    applicantTitle: 'Demandeur et informations complémentaires',
    applicantSub: 'Les demandes de prêt sont liées à un élève. Vérifiez le demandeur ci-dessous.',
    fromFeesNote: 'Demandeur déjà vérifié via Payer les frais à',
    studentCodeLabel: 'Code élève (ShuleCode / SDMS)',
    studentCodePlaceholder: 'ex : SDM-2026-004821',
    scanHint: 'Pointez la caméra vers le code QR ShuleCode de l\u2019élève.',
    scanCancel: 'Annuler',
    lookingUp: 'Recherche de l\u2019élève…',
    back: 'Retour',
    close: 'Fermer',
    continue: 'Continuer',
    findStudent: 'Rechercher l\u2019élève',
    loading: 'Chargement…',
    requestVerification: 'Demander la vérification',
    verifySubmit: 'Vérifier et envoyer',
    submitting: 'Envoi en cours…',
    done: 'Terminé',
    loanIntro: (s) => `Les demandes de prêt sont liées à un élève. Saisissez le ShuleCode ou SDMS pour vérifier à ${s}.`,
    verified: 'Vérifié',
    purposeOfLoan: 'Objet du prêt',
    purposePh: 'ex : Régler les frais scolaires restants',
    purposeDefault: 'Régler les frais scolaires restants',
    student: 'Élève',
    school: 'École',
    classField: 'Classe',
    studentCode: 'Code élève',
    classNotSet: 'Classe non définie',
    scanQr: 'Scan QR',
    statusUnderReview: 'EN COURS D\u2019EXAMEN',
    submittedSummary: (a) => `Votre prêt scolaire de ${a} a été reçu. L\u2019école l\u2019examinera sous peu.`,
    backToSchool: 'Retour à l\u2019école',
    guarantorName: 'Nom du garant',
    guarantorPhone: 'Téléphone du garant',
    guarantorRelation: 'Lien avec l\u2019élève',
    guarantorNamePh: 'Nom complet',
    guarantorPhonePh: '07…',
    guarantorRelationPh: 'ex : Père, Mère, Tante',
    applicantOptional: 'Facultatif mais accélère l\u2019approbation',
    applicant: 'Demandeur',
    checkingLoan: 'Vérification de la disponibilité du prêt…',
    chooseLoan: 'Choisissez votre prêt',
    matchesFees: 'CORRESPOND AUX FRAIS',
    general: 'GÉNÉRAL',
    interest: 'Intérêt',
    processingFee: 'Frais de dossier',
    period: 'Durée',
    months: 'mois',
    monthCount: (n) => `${n} mois`,
    outstandingFees: 'Solde de frais restants',
    outstandingRecommend: 'Nous recommandons d\u2019emprunter ce montant pour tout régler.',
    noOutstanding: 'Aucun frais en attente. Vous pouvez emprunter pour d\u2019autres besoins.',
    loanAmountPlan: 'Montant et plan de remboursement',
    amountBorrow: 'Montant à emprunter',
    limits: (min, max) => `Limites : ${min} – ${max}`,
    repaymentPeriod: 'Période de remboursement',
    periodBetween: (min, max) => `Entre ${min} et ${max} mois`,
    paymentFrequency: 'Fréquence de paiement',
    freqMonthly: 'Mensuel',
    freqMonthlySub: 'Chaque mois',
    freqBiWeekly: 'Bi-hebdomadaire',
    freqBiWeeklySub: 'Toutes les 2 semaines',
    freqWeekly: 'Hebdomadaire',
    freqWeeklySub: 'Chaque semaine',
    freqQuarterly: 'Trimestriel',
    freqQuarterlySub: 'Tous les 3 mois',
    youBorrow: 'Vous empruntez',
    eachInstallment: 'Chaque versement',
    almostThere: 'Presque terminé',
    repaymentSchedule: 'Votre calendrier de remboursement',
    principal: 'Capital',
    totalPayable: 'Total à rembourser',
    installments: 'Versements',
    each: 'chacun',
    dueDate: 'Date d\u2019échéance',
    amountCol: 'Montant',
    receiveMoney: 'Comment vous recevrez l\u2019argent',
    disbPaySchool: 'Payer l\u2019école directement',
    disbPaySchoolSub: 'Régler les frais à l\u2019école',
    disbMomo: 'Mon Mobile Money',
    disbMomoSub: 'MTN · Airtel',
    disbBank: 'Mon compte bancaire',
    disbBankSub: 'Dépôt direct',
    recommended: 'Recommandé',
    momoNumber: 'Numéro Mobile Money',
    momoHint: 'Nous ne demandons jamais votre PIN',
    momoPh: 'ex : 0788123456',
    bank: 'Banque',
    selectBank: 'Sélectionner la banque…',
    accountHolder: 'Titulaire du compte',
    accountNumber: 'Numéro de compte',
    fullName: 'Nom complet',
    reviewTitle: 'Vérifier votre demande de prêt',
    loanDetails: 'Détails du prêt',
    loanType: 'Type de prêt',
    amount: 'Montant',
    frequency: 'Fréquence',
    installment: 'Versement',
    disbursement: 'Versement',
    method: 'Mode',
    toMobile: 'Vers le mobile',
    account: 'Compte',
    destination: 'Destination',
    agreeTerms: (t) => `J\u2019accepte les conditions et de rembourser ${t} selon l\u2019échéancier.`,
    confirmInfo: 'Je confirme que les informations du demandeur sont correctes.',
    verifyTitle: 'Vérifiez votre identité',
    verifySub: (p) => `Nous avons envoyé un code à 6 chiffres au ${p}. Saisissez-le ci-dessous.`,
    verifyDemo: 'Démo  le code est validé avant l\u2019envoi.',
    applicationSubmitted: 'Demande envoyée',
    applicationNumber: 'Numéro de demande',
    totalRepay: 'Total à rembourser',
    viewApplication: 'Voir la demande',
    viewApplicationDesc: 'Consulter le résumé de votre demande',
    checkLater: 'Vérifier plus tard',
    checkLaterDesc: 'Suivre l\u2019avancement de l\u2019examen',
    backToSchoolDesc: 'Retour à la page de l\u2019école',
    valNoStudent: 'L\u2019élève n\u2019a pas été vérifié.',
    valNoLoanType: 'Le type de prêt n\u2019est pas disponible.',
    valMinAmount: (m) => `Le montant doit être au moins ${m}.`,
    valMaxAmount: (m) => `Le montant dépasse la limite de ${m}.`,
    valExceedOutstanding: (o) => `Le montant ne peut pas dépasser les frais restants de ${o}.`,
    valPeriod: (min, max) => `La durée doit être entre ${min} et ${max} mois.`,
  },
};
