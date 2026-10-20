import type { FlowLang } from './flow-language';

export type AdmissionText = {
  modalBadge: string;
  langTitle: string;
  langSub: string;
  stepLabels: Array<{ label: string; short: string }>;
  stepTitles: string[];
  loading: string;
  back: string;
  edit: string;
  continue: string;
  submit: string;
  done: string;
  select: string;
  availablePlaces: string;
  estFee: string;
  deadline: string;
  admissionLevel: string;
  classGrade: string;
  aLevelCombination: string;
  tvetTrade: string;
  academicYear: string;
  academicYearHint: string;
  academicYearUnset: string;
  termOfEntry: string;
  boardingPreference: string;
  boardingDay: string;
  boardingBoarding: string;
  boardingBoth: string;
  studentGender: string;
  genderMale: string;
  genderFemale: string;
  admissionType: string;
  newStudent: string;
  transferStudent: string;
  previousSchoolOptional: string;
  previousSchoolPlaceholder: string;
  noCombinations: string;
  noTrades: string;
  studentTitle: string;
  studentSub: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  placeOfBirth: string;
  nationalId: string;
  studentPhoto: string;
  prevEducationTitle: string;
  previousSchool: string;
  currentClass: string;
  transferReason: string;
  parentTitle: string;
  parentSub: string;
  guardianName: string;
  relationship: string;
  relFather: string;
  relMother: string;
  relGuardian: string;
  relOther: string;
  phone: string;
  whatsapp: string;
  emailOptional: string;
  homeAddress: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  docsHint: string;
  required: string;
  optional: string;
  upload: string;
  replace: string;
  saveDraft: string;
  savingDraft: string;
  reviewSchool: string;
  reviewStudent: string;
  reviewParent: string;
  reviewDocs: string;
  reviewDocsCount: (n: number) => string;
  estFeeReview: string;
  confirmAccurate: string;
  acceptTerms: string;
  termsLink: string;
  privacyLink: string;
  refPreview: string;
  successTitle: string;
  successSub: string;
  applicationNumber: string;
  statusLabel: string;
  trackingTitle: string;
  statusSubmitted: string;
  statusUnderReview: string;
  statusDocsVerification: string;
  statusAssessment: string;
  statusApproved: string;
  statusFeePayment: string;
  statusEnrolled: string;
  levelNursery: string;
  levelPrimary: string;
  levelOLevel: string;
  levelALevel: string;
  levelTvet: string;
  errSelectLevel: string;
  errSelectClass: string;
  errSelectCombination: string;
  errSelectTrade: string;
  errSelectGender: string;
  errDeadlinePassed: string;
  errFirstName: string;
  errLastName: string;
  errDob: string;
  errTransferReason: string;
  errGuardian: string;
  errRelationship: string;
  errPhone: string;
  errAddress: string;
  errDocs: (names: string) => string;
  errConfirm: string;
  errTerms: string;
  errFileType: string;
  errFileSize: string;
  errLoad: string;
  errSubmit: string;
  errSaveDraft: string;
};

export const ADMISSION_I18N: Record<FlowLang, AdmissionText> = {
  en: {
    modalBadge: 'Online Admission',
    langTitle: 'Choose your language',
    langSub: 'The admission form will be shown in this language.',
    stepLabels: [
      { label: 'Language', short: 'Lang' },
      { label: 'Admission', short: 'Level' },
      { label: 'Student', short: 'Student' },
      { label: 'Parent', short: 'Parent' },
      { label: 'Documents', short: 'Docs' },
      { label: 'Review', short: 'Review' },
    ],
    stepTitles: [
      'Choose Language',
      'Admission Selection',
      'Student Details',
      'Parent & Contact',
      'Documents',
      'Review & Submit',
      'Application Success',
    ],
    loading: 'Loading admission form…',
    back: 'Back',
    edit: 'Edit',
    continue: 'Continue',
    submit: 'Submit Admission Application',
    done: 'Done',
    select: 'Select…',
    availablePlaces: 'Available places',
    estFee: 'Est. admission fee',
    deadline: 'Deadline',
    admissionLevel: 'Admission level',
    classGrade: 'Class / Grade applying for',
    aLevelCombination: 'A-Level combination',
    tvetTrade: 'TVET trade / program',
    academicYear: 'Academic year',
    academicYearHint: 'Set by the school for the current intake',
    academicYearUnset: 'Not configured by school',
    termOfEntry: 'Term of entry',
    boardingPreference: 'Boarding preference',
    boardingDay: 'Day',
    boardingBoarding: 'Boarding',
    boardingBoth: 'Both',
    studentGender: 'Student gender',
    genderMale: 'Male',
    genderFemale: 'Female',
    admissionType: 'Admission type',
    newStudent: 'New Student',
    transferStudent: 'Transfer Student',
    previousSchoolOptional: 'Previous school (optional)',
    previousSchoolPlaceholder: 'Name of previous school',
    noCombinations: 'This school has not published A-Level combinations yet.',
    noTrades: 'This school has not published TVET trades yet.',
    studentTitle: 'Student information',
    studentSub: "Enter the applicant's personal details",
    firstName: 'First name',
    lastName: 'Last name',
    dateOfBirth: 'Date of birth',
    nationality: 'Nationality',
    placeOfBirth: 'Place of birth (optional)',
    nationalId: 'National ID / Passport (if required)',
    studentPhoto: 'Student photo',
    prevEducationTitle: 'Previous education',
    previousSchool: 'Previous school',
    currentClass: 'Current / previous class',
    transferReason: 'Reason for transfer',
    parentTitle: 'Parent / Guardian',
    parentSub: 'Primary contact for this application',
    guardianName: 'Full name',
    relationship: 'Relationship to student',
    relFather: 'Father',
    relMother: 'Mother',
    relGuardian: 'Guardian',
    relOther: 'Other',
    phone: 'Phone number',
    whatsapp: 'WhatsApp number',
    emailOptional: 'Email (optional)',
    homeAddress: 'Home address',
    province: 'Province',
    district: 'District',
    sector: 'Sector',
    cell: 'Cell',
    village: 'Village',
    docsHint: 'Supported formats: PDF, JPG, PNG · Maximum file size: 5 MB',
    required: 'Required',
    optional: 'Optional',
    upload: 'Upload',
    replace: 'Replace',
    saveDraft: 'Save and continue later',
    savingDraft: 'Saving…',
    reviewSchool: 'School & Level',
    reviewStudent: 'Student',
    reviewParent: 'Parent / Guardian',
    reviewDocs: 'Documents',
    reviewDocsCount: (n) => `${n} uploaded`,
    estFeeReview: 'Estimated admission fee',
    confirmAccurate: 'I confirm that the information provided is correct.',
    acceptTerms: "I accept the school's admission terms and privacy policy.",
    termsLink: 'terms',
    privacyLink: 'privacy',
    refPreview: 'Application reference preview',
    successTitle: 'Application submitted successfully',
    successSub: 'Your application is now pending school review',
    applicationNumber: 'Application Number',
    statusLabel: 'Status',
    trackingTitle: 'Application tracking',
    statusSubmitted: 'Submitted',
    statusUnderReview: 'Under Review',
    statusDocsVerification: 'Documents Verification',
    statusAssessment: 'Assessment / Interview',
    statusApproved: 'Admission Approved',
    statusFeePayment: 'Fee Payment',
    statusEnrolled: 'Enrolled',
    levelNursery: 'Nursery',
    levelPrimary: 'Primary',
    levelOLevel: 'O-Level',
    levelALevel: 'A-Level',
    levelTvet: 'TVET',
    errSelectLevel: 'Select admission level',
    errSelectClass: 'Select class / grade',
    errSelectCombination: 'Select an A-Level combination',
    errSelectTrade: 'Select a TVET trade',
    errSelectGender: 'Select student gender',
    errDeadlinePassed: 'Application deadline has passed',
    errFirstName: 'First name is required',
    errLastName: 'Last name is required',
    errDob: 'Date of birth is required',
    errTransferReason: 'Reason for transfer is required',
    errGuardian: 'Parent/guardian name is required',
    errRelationship: 'Relationship is required',
    errPhone: 'Phone number is required',
    errAddress: 'Home address (district & sector) is required',
    errDocs: (names) => `Upload required: ${names}`,
    errConfirm: 'Please confirm the information is correct',
    errTerms: 'Please accept the admission terms',
    errFileType: 'Supported formats: PDF, JPG, PNG',
    errFileSize: 'Maximum file size is 5 MB',
    errLoad: 'Failed to load admissions',
    errSubmit: 'Submission failed',
    errSaveDraft: 'Failed to save draft',
  },
  rw: {
    modalBadge: 'Iyandikisha rya interineti',
    langTitle: 'Hitamo ururimi',
    langSub: 'Ifomu y’iyandikisha izagaragazwa mu rurimi wahisemo.',
    stepLabels: [
      { label: 'Ururimi', short: 'Ururimi' },
      { label: 'Iyandikisha', short: 'Urwego' },
      { label: 'Umunyeshuri', short: 'Umunyeshuri' },
      { label: 'Umubyeyi', short: 'Umubyeyi' },
      { label: 'Inyandiko', short: 'Inyandiko' },
      { label: 'Gusuzuma', short: 'Gusuzuma' },
    ],
    stepTitles: [
      'Hitamo Ururimi',
      'Guhitamo Iyandikisha',
      'Amakuru y’Umunyeshuri',
      'Umubyeyi n’Itumanaho',
      'Inyandiko',
      'Gusuzuma no Kohereza',
      'Iyandikisha Ryakiriwe',
    ],
    loading: 'Ifomu y’iyandikisha irimo gufungura…',
    back: 'Subira',
    edit: 'Hindura',
    continue: 'Komeza',
    submit: 'Ohereza Gusaba Iyandikisha',
    done: 'Birarangiye',
    select: 'Hitamo…',
    availablePlaces: 'Imyanya isigaye',
    estFee: 'Amafaranga y’iyandikisha',
    deadline: 'Itariki ntarengwa',
    admissionLevel: 'Urwego rw’amashuri',
    classGrade: 'Ishuri / icyiciro usaba',
    aLevelCombination: 'Inyigisho za A-Level',
    tvetTrade: 'Umwuga / porogaramu ya TVET',
    academicYear: 'Umwaka w’amashuri',
    academicYearHint: 'Washyizweho n’ikigo cy’ubu',
    academicYearUnset: 'Ntacyashyizweho n’ikigo',
    termOfEntry: 'Igihembwe cyo kwinjira',
    boardingPreference: 'Uburyo bwo kuba mu ishuri',
    boardingDay: 'Umunsi',
    boardingBoarding: 'Ihererekwa',
    boardingBoth: 'Byombi',
    studentGender: 'Igitsina cy’umunyeshuri',
    genderMale: 'Gabo',
    genderFemale: 'Gore',
    admissionType: 'Ubwoko bw’iyandikisha',
    newStudent: 'Umunyeshuri mushya',
    transferStudent: 'Umunyeshuri uva mu kindi kigo',
    previousSchoolOptional: 'Ishuri ryabanjirije (si ngombwa)',
    previousSchoolPlaceholder: 'Izina ry’ishuri ryabanjirije',
    noCombinations: 'Iki kigo ntikiratangaje inyigisho za A-Level.',
    noTrades: 'Iki kigo ntikiratangaje imyuga ya TVET.',
    studentTitle: 'Amakuru y’umunyeshuri',
    studentSub: 'Andika amakuru y’usaba kwiyandikisha',
    firstName: 'Izina ry’imbere',
    lastName: 'Izina ry’umuryango',
    dateOfBirth: 'Itariki y’amavuko',
    nationality: 'Ubwenegihugu',
    placeOfBirth: 'Aho yavukiye (si ngombwa)',
    nationalId: 'Indangamuntu / Pasiporo',
    studentPhoto: 'Ifoto y’umunyeshuri',
    prevEducationTitle: 'Amashuri yabanjirije',
    previousSchool: 'Ishuri ryabanjirije',
    currentClass: 'Icyiciro cyabanjirije',
    transferReason: 'Impamvu yo kwimuka',
    parentTitle: 'Umubyeyi / Umwishingizi',
    parentSub: 'Uwo twabaza ku byerekeye iyi saba',
    guardianName: 'Amazina yuzuye',
    relationship: 'Isano n’umunyeshuri',
    relFather: 'Se',
    relMother: 'Nyina',
    relGuardian: 'Umwishingizi',
    relOther: 'Ikindi',
    phone: 'Telefoni',
    whatsapp: 'WhatsApp',
    emailOptional: 'Imeyili (si ngombwa)',
    homeAddress: 'Aho batuye',
    province: 'Intara',
    district: 'Akarere',
    sector: 'Umurenge',
    cell: 'Akagari',
    village: 'Umudugudu',
    docsHint: 'Ubwoko: PDF, JPG, PNG · Ingano ntarengwa: 5 MB',
    required: 'Ngombwa',
    optional: 'Si ngombwa',
    upload: 'Ohereza',
    replace: 'Simbuza',
    saveDraft: 'Bika ukomeze nyuma',
    savingDraft: 'Birimo kubikwa…',
    reviewSchool: 'Ikigo n’Urwego',
    reviewStudent: 'Umunyeshuri',
    reviewParent: 'Umubyeyi / Umwishingizi',
    reviewDocs: 'Inyandiko',
    reviewDocsCount: (n) => `${n} zoherejwe`,
    estFeeReview: 'Amafaranga y’iyandikisha',
    confirmAccurate: 'Nemeza ko amakuru natanze ari ukuri.',
    acceptTerms: 'Nemeye amategeko y’iyandikisha n’politiki y’ibanga ry’ikigo.',
    termsLink: 'amategeko',
    privacyLink: 'ibanga',
    refPreview: 'Indanganturo y’iyandikisha',
    successTitle: 'Iyandikisha ryoherejwe neza',
    successSub: 'Isaba ryawe ritegereje isuzuma ry’ikigo',
    applicationNumber: 'Nomero y’iyandikisha',
    statusLabel: 'Imiterere',
    trackingTitle: 'Gukurikirana iyandikisha',
    statusSubmitted: 'Ryoherejwe',
    statusUnderReview: 'Riri mu isuzuma',
    statusDocsVerification: 'Isuzuma ry’inyandiko',
    statusAssessment: 'Ikizamini / Ikiganiro',
    statusApproved: 'Byemewe',
    statusFeePayment: 'Kwishyura',
    statusEnrolled: 'Yiyandikishije',
    levelNursery: 'Nursery',
    levelPrimary: 'Primary',
    levelOLevel: 'O-Level',
    levelALevel: 'A-Level',
    levelTvet: 'TVET',
    errSelectLevel: 'Hitamo urwego rw’amashuri',
    errSelectClass: 'Hitamo icyiciro',
    errSelectCombination: 'Hitamo inyigisho za A-Level',
    errSelectTrade: 'Hitamo umwuga wa TVET',
    errSelectGender: 'Hitamo igitsina cy’umunyeshuri',
    errDeadlinePassed: 'Itariki ntarengwa y’iyandikisha yashize',
    errFirstName: 'Izina ry’imbere rirakenewe',
    errLastName: 'Izina ry’umuryango rirakenewe',
    errDob: 'Itariki y’amavuko irakenewe',
    errTransferReason: 'Impamvu yo kwimuka irakenewe',
    errGuardian: 'Izina ry’umubyeyi/umwishingizi rirakenewe',
    errRelationship: 'Isano irakenewe',
    errPhone: 'Telefoni irakenewe',
    errAddress: 'Aderesi (akarere n’umurenge) irakenewe',
    errDocs: (names) => `Ohereza ibisabwa: ${names}`,
    errConfirm: 'Emeza ko amakuru ari ukuri',
    errTerms: 'Emera amategeko y’iyandikisha',
    errFileType: 'Ubwoko: PDF, JPG, PNG',
    errFileSize: 'Ingano ntarengwa ni 5 MB',
    errLoad: 'Ntibyashobotse gufungura iyandikisha',
    errSubmit: 'Kohereza byanze',
    errSaveDraft: 'Kubika byanze',
  },
  fr: {
    modalBadge: 'Admission en ligne',
    langTitle: 'Choisissez la langue',
    langSub: 'Le formulaire d’admission sera affiché dans cette langue.',
    stepLabels: [
      { label: 'Langue', short: 'Langue' },
      { label: 'Admission', short: 'Niveau' },
      { label: 'Élève', short: 'Élève' },
      { label: 'Parent', short: 'Parent' },
      { label: 'Documents', short: 'Docs' },
      { label: 'Revue', short: 'Revue' },
    ],
    stepTitles: [
      'Choisir la langue',
      'Sélection d’admission',
      'Informations de l’élève',
      'Parent et contact',
      'Documents',
      'Revue et envoi',
      'Demande envoyée',
    ],
    loading: 'Chargement du formulaire…',
    back: 'Retour',
    edit: 'Modifier',
    continue: 'Continuer',
    submit: 'Envoyer la demande d’admission',
    done: 'Terminer',
    select: 'Choisir…',
    availablePlaces: 'Places disponibles',
    estFee: 'Frais d’admission estimés',
    deadline: 'Date limite',
    admissionLevel: 'Niveau d’admission',
    classGrade: 'Classe / niveau demandé',
    aLevelCombination: 'Combinaison A-Level',
    tvetTrade: 'Filière / programme TVET',
    academicYear: 'Année scolaire',
    academicYearHint: 'Définie par l’école pour la rentrée en cours',
    academicYearUnset: 'Non configurée par l’école',
    termOfEntry: 'Trimestre d’entrée',
    boardingPreference: 'Préférence d’hébergement',
    boardingDay: 'Externe',
    boardingBoarding: 'Internat',
    boardingBoth: 'Les deux',
    studentGender: 'Genre de l’élève',
    genderMale: 'Masculin',
    genderFemale: 'Féminin',
    admissionType: 'Type d’admission',
    newStudent: 'Nouvel élève',
    transferStudent: 'Élève transféré',
    previousSchoolOptional: 'École précédente (optionnel)',
    previousSchoolPlaceholder: 'Nom de l’école précédente',
    noCombinations: 'Cette école n’a pas encore publié de combinaisons A-Level.',
    noTrades: 'Cette école n’a pas encore publié de filières TVET.',
    studentTitle: 'Informations de l’élève',
    studentSub: 'Saisissez les informations personnelles du candidat',
    firstName: 'Prénom',
    lastName: 'Nom de famille',
    dateOfBirth: 'Date de naissance',
    nationality: 'Nationalité',
    placeOfBirth: 'Lieu de naissance (optionnel)',
    nationalId: 'Carte d’identité / Passeport',
    studentPhoto: 'Photo de l’élève',
    prevEducationTitle: 'Scolarité antérieure',
    previousSchool: 'École précédente',
    currentClass: 'Classe actuelle / précédente',
    transferReason: 'Motif du transfert',
    parentTitle: 'Parent / Tuteur',
    parentSub: 'Contact principal pour cette demande',
    guardianName: 'Nom complet',
    relationship: 'Lien avec l’élève',
    relFather: 'Père',
    relMother: 'Mère',
    relGuardian: 'Tuteur',
    relOther: 'Autre',
    phone: 'Numéro de téléphone',
    whatsapp: 'Numéro WhatsApp',
    emailOptional: 'E-mail (optionnel)',
    homeAddress: 'Adresse du domicile',
    province: 'Province',
    district: 'District',
    sector: 'Secteur',
    cell: 'Cellule',
    village: 'Village',
    docsHint: 'Formats acceptés : PDF, JPG, PNG · Taille max. : 5 Mo',
    required: 'Obligatoire',
    optional: 'Optionnel',
    upload: 'Téléverser',
    replace: 'Remplacer',
    saveDraft: 'Enregistrer et continuer plus tard',
    savingDraft: 'Enregistrement…',
    reviewSchool: 'École et niveau',
    reviewStudent: 'Élève',
    reviewParent: 'Parent / Tuteur',
    reviewDocs: 'Documents',
    reviewDocsCount: (n) => `${n} téléversé(s)`,
    estFeeReview: 'Frais d’admission estimés',
    confirmAccurate: 'Je confirme que les informations fournies sont exactes.',
    acceptTerms: 'J’accepte les conditions d’admission et la politique de confidentialité de l’école.',
    termsLink: 'conditions',
    privacyLink: 'confidentialité',
    refPreview: 'Aperçu de la référence',
    successTitle: 'Demande envoyée avec succès',
    successSub: 'Votre demande est en attente d’examen par l’école',
    applicationNumber: 'Numéro de demande',
    statusLabel: 'Statut',
    trackingTitle: 'Suivi de la demande',
    statusSubmitted: 'Envoyée',
    statusUnderReview: 'En cours d’examen',
    statusDocsVerification: 'Vérification des documents',
    statusAssessment: 'Évaluation / Entretien',
    statusApproved: 'Admission approuvée',
    statusFeePayment: 'Paiement des frais',
    statusEnrolled: 'Inscrit',
    levelNursery: 'Maternelle',
    levelPrimary: 'Primaire',
    levelOLevel: 'O-Level',
    levelALevel: 'A-Level',
    levelTvet: 'TVET',
    errSelectLevel: 'Sélectionnez le niveau d’admission',
    errSelectClass: 'Sélectionnez la classe',
    errSelectCombination: 'Sélectionnez une combinaison A-Level',
    errSelectTrade: 'Sélectionnez une filière TVET',
    errSelectGender: 'Sélectionnez le genre de l’élève',
    errDeadlinePassed: 'La date limite d’admission est dépassée',
    errFirstName: 'Le prénom est obligatoire',
    errLastName: 'Le nom est obligatoire',
    errDob: 'La date de naissance est obligatoire',
    errTransferReason: 'Le motif du transfert est obligatoire',
    errGuardian: 'Le nom du parent/tuteur est obligatoire',
    errRelationship: 'Le lien de parenté est obligatoire',
    errPhone: 'Le numéro de téléphone est obligatoire',
    errAddress: 'L’adresse (district et secteur) est obligatoire',
    errDocs: (names) => `Téléversez les documents requis : ${names}`,
    errConfirm: 'Veuillez confirmer l’exactitude des informations',
    errTerms: 'Veuillez accepter les conditions d’admission',
    errFileType: 'Formats acceptés : PDF, JPG, PNG',
    errFileSize: 'Taille maximale : 5 Mo',
    errLoad: 'Impossible de charger l’admission',
    errSubmit: 'Échec de l’envoi',
    errSaveDraft: 'Échec de l’enregistrement',
  },
};

export function pickAdmissionText(lang: FlowLang | null): AdmissionText {
  return ADMISSION_I18N[lang ?? 'en'];
}

export function levelLabel(level: string, t: AdmissionText): string {
  switch (level) {
    case 'Nursery': return t.levelNursery;
    case 'Primary': return t.levelPrimary;
    case 'O-Level': return t.levelOLevel;
    case 'A-Level': return t.levelALevel;
    case 'TVET': return t.levelTvet;
    default: return level;
  }
}

export function statusLabelKey(status: string, t: AdmissionText): string {
  const map: Record<string, string> = {
    SUBMITTED: t.statusSubmitted,
    UNDER_REVIEW: t.statusUnderReview,
    DOCUMENTS_VERIFICATION: t.statusDocsVerification,
    ASSESSMENT_INTERVIEW: t.statusAssessment,
    ADMISSION_APPROVED: t.statusApproved,
    FEE_PAYMENT: t.statusFeePayment,
    ENROLLED: t.statusEnrolled,
  };
  return map[status] ?? status;
}
