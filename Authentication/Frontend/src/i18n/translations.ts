import type { AppLang } from './types';

/* ─── Shared / common ─── */

export type CommonText = {
  backToHome: string;
  backToSignIn: string;
  language: string;
  terms: string;
  privacy: string;
  userDataAccess: string;
  managedBy: string;
  allRightsReserved: string;
  openMenu: string;
  closeMenu: string;
};

/* ─── Auth ─── */

export type AuthText = {
  welcomeBack: string;
  signInSubtitle: string;
  mobileTagline: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  forgotLink: string;
  rememberMe: string;
  enter: string;
  loginFailed: string;
  brandQuote: string;
  forgotTitle: string;
  forgotSubtitle: string;
  forgotEmailLabel: string;
  forgotEmailPlaceholder: string;
  sendResetLink: string;
  resetSentTitle: string;
  resetSentBody: string;
  resetDefaultSuccess: string;
  requestFailed: string;
  changePasswordTitle: string;
  changePasswordSubtitle: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordPlaceholderNew: string;
  updatePassword: string;
  passwordsMismatch: string;
  mfaTitle: string;
  mfaSubtitle: string;
  mfaCodeLabel: string;
  mfaCodePlaceholder: string;
  mfaVerify: string;
  mfaResend: string;
  mfaBackToLogin: string;
  mfaAuthenticator: string;
  mfaEmailOtp: string;
  forgotRememberPassword: string;
  signIn: string;
  useDifferentEmail: string;
  returnToSignIn: string;
  backToDashboard: string;
  reqMinChars: string;
  reqMatch: string;
};

/* ─── Landing ─── */

export type LandingText = {
  navHome: string;
  navAbout: string;
  navModules: string;
  navShuleKit: string;
  navSchoolWebsites: string;
  navHowItWorks: string;
  navPayFees: string;
  navLogin: string;
  heroLine1: string;
  heroLine2: string;
  heroLine3: string;
  enterAsSchool: string;
  enterAsParent: string;
  enterAsTeacher: string;
  studentCodeLabel: string;
  studentCodePlaceholder: string;
  lookupStudent: string;
  tapToReopen: string;
  view: string;
  paySchoolFees: string;
  payRequirements: string;
  aboutEyebrow: string;
  aboutTitle: string;
  aboutBody: string;
  exploreModules: string;
  howItWorksLink: string;
  statSchools: string;
  statStudents: string;
  statUptime: string;
  howEyebrow: string;
  howTitlePrefix: string;
  howTitleHighlight: string;
  howTitleSuffix: string;
  howSubtitle: string;
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3Body: string;
  step4Title: string;
  step4Body: string;
  getStartedShule: string;
  partnersEyebrow: string;
  partnersTitle: string;
  partnersDescription: string;
  ctaTitlePrefix: string;
  ctaTitleHighlight: string;
  ctaSubtitle: string;
  ctaGetStarted: string;
  ctaTalkToUs: string;
  footerTagline: string;
  footerProduct: string;
  footerCompany: string;
  footerContact: string;
  footerTrackApplication: string;
  footerInstitutionalHelp: string;
  footerPrivacyPolicy: string;
  footerTermsOfService: string;
  footerCopyright: string;
};

export type AppTranslations = CommonText & AuthText & LandingText;

function t(
  en: AppTranslations,
  rw: AppTranslations,
  fr: AppTranslations,
  sw: AppTranslations,
): Record<AppLang, AppTranslations> {
  return { en, rw, fr, sw };
}

export const TRANSLATIONS = t(
  /* English */
  {
    backToHome: 'Back to home',
    backToSignIn: 'Back to sign in',
    language: 'Language',
    terms: 'Terms',
    privacy: 'Privacy',
    userDataAccess: 'User Data & Access',
    managedBy: 'Managed by',
    allRightsReserved: 'ALL RIGHTS RESERVED.',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    welcomeBack: 'Welcome back',
    signInSubtitle: 'Sign in to manage your organization workspace.',
    mobileTagline: 'Manage Smart .',
    emailLabel: 'Email | Phone Number',
    emailPlaceholder: 'Enter your email or phone number',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    forgotLink: 'Forgot?',
    rememberMe: 'Keep me signed in',
    enter: 'Enter',
    loginFailed: 'Login failed. Please try again.',
    brandQuote: 'Where Smart Administration Meets Active Parenting.',
    forgotTitle: 'Forgot password?',
    forgotSubtitle: 'Enter your email and we\u2019ll send you a reset link.',
    forgotEmailLabel: 'Email address',
    forgotEmailPlaceholder: 'you@school.rw',
    sendResetLink: 'Send reset link',
    resetSentTitle: 'Check your inbox',
    resetSentBody: 'If an account exists for that email, a reset link has been sent.',
    resetDefaultSuccess: 'If an account exists for that email, a reset link has been sent.',
    requestFailed: 'Request failed. Please try again.',
    changePasswordTitle: 'Change your password',
    changePasswordSubtitle: 'You must set a new password before continuing.',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    passwordPlaceholderNew: 'Enter password',
    updatePassword: 'Update password',
    passwordsMismatch: 'Passwords do not match.',
    mfaTitle: 'Two-Factor Authentication',
    mfaSubtitle: 'Enter the verification code to continue.',
    mfaCodeLabel: 'Verification code',
    mfaCodePlaceholder: 'Enter 6-digit code',
    mfaVerify: 'Verify',
    mfaResend: 'Resend code',
    mfaBackToLogin: 'Back to sign in',
    mfaAuthenticator: 'Authenticator app',
    mfaEmailOtp: 'Email / SMS code',
    forgotRememberPassword: 'Remember your password?',
    signIn: 'Sign in',
    useDifferentEmail: 'Use a different email',
    returnToSignIn: 'Return to sign in',
    backToDashboard: 'Back to dashboard',
    reqMinChars: 'At least 8 characters',
    reqMatch: 'Passwords match',
    navHome: 'Home',
    navAbout: 'About us',
    navModules: 'Modules',
    navShuleKit: 'ShuleKit',
    navSchoolWebsites: 'School Websites',
    navHowItWorks: 'How it works',
    navPayFees: 'Pay fees',
    navLogin: 'Login',
    heroLine1: 'An Integrated Digital',
    heroLine2: 'Platform for',
    heroLine3: 'Equitable School Readiness',
    enterAsSchool: 'Enter as School',
    enterAsParent: 'Enter as Parent',
    enterAsTeacher: 'Enter as Teacher',
    studentCodeLabel: 'SDMS Code / ShuleCard ID',
    studentCodePlaceholder: 'Enter student code...',
    lookupStudent: 'Lookup student',
    tapToReopen: 'Tap to reopen',
    view: 'View',
    paySchoolFees: 'Pay school fees',
    payRequirements: 'Pay student requirements',
    aboutEyebrow: 'About us',
    aboutTitle: 'Digital backbone for school readiness in Rwanda.',
    aboutBody:
      'Shule+ is an integrated education platform that connects schools, teachers, parents, and partners - from enrolment and fees to academics, HR, and smart analytics - so every institution can run with clarity and confidence.',
    exploreModules: 'Explore modules',
    howItWorksLink: 'How it works',
    statSchools: 'Schools onboarded',
    statStudents: 'Students managed',
    statUptime: 'Platform uptime',
    howEyebrow: 'How it works',
    howTitlePrefix: 'Managing schools smarter',
    howTitleHighlight: 'starts',
    howTitleSuffix: 'here.',
    howSubtitle: 'Four simple steps - from registration to running your school on Shule+.',
    step1Title: 'Create Your School',
    step1Body: 'Register your institution and set up your secure Shule+ workspace in minutes.',
    step2Title: 'Choose Your Modules',
    step2Body: 'Pick only the tools you need - Academics, Finance, Attendance, and more.',
    step3Title: 'Configure Your Workspace',
    step3Body: 'We help import data, set permissions, and tailor modules to your workflows.',
    step4Title: 'Go Live',
    step4Body: 'Manage admissions, payments, attendance, and reports from one platform.',
    getStartedShule: 'Get started with Shule+',
    partnersEyebrow: 'Partners & institutions',
    partnersTitle: "Trusted by Rwanda's leading organizations.",
    partnersDescription:
      'We work alongside mobile money operators, payment gateways, financial institutions, and national education bodies to power a connected school ecosystem.',
    ctaTitlePrefix: 'Ready to run your school',
    ctaTitleHighlight: 'without the paperwork',
    ctaSubtitle:
      'Set up your institution in minutes - no credit card, no commitment, just the tools your school needs from day one.',
    ctaGetStarted: 'Get Started for free',
    ctaTalkToUs: 'Talk to us',
    footerTagline:
      'Education management for schools in Rwanda: enrolment, academics, finance, HR and operations in one platform.',
    footerProduct: 'Product',
    footerCompany: 'Company',
    footerContact: 'Contact',
    footerTrackApplication: 'Track Application',
    footerInstitutionalHelp: 'Institutional Help',
    footerPrivacyPolicy: 'Privacy Policy',
    footerTermsOfService: 'Terms of Service',
    footerCopyright: '© 2026 Shule+ Global. All rights reserved.',
  },
  /* Kinyarwanda */
  {
    backToHome: 'Subira ahabanza',
    backToSignIn: 'Subira kwinjira',
    language: 'Ururimi',
    terms: 'Amategeko',
    privacy: 'Ubuzima bwite',
    userDataAccess: 'Amakuru n\u2019Uburenganzira',
    managedBy: 'Itangwa na',
    allRightsReserved: 'UBURENGANZA BWA BYOSE BURINDIWE.',
    openMenu: 'Fungura menu',
    closeMenu: 'Funga menu',
    welcomeBack: 'Murakaza neza',
    signInSubtitle: 'Injira kugira ngo ucane ikigo cyawe.',
    mobileTagline: 'Gucunga Neza .',
    emailLabel: 'Imeyili | Telefoni',
    emailPlaceholder: 'Andika imeyili cyangwa telefoni',
    passwordLabel: 'Ijambo ry\u2019ibanga',
    passwordPlaceholder: 'Andika ijambo ry\u2019ibanga',
    forgotLink: 'Wibagiwe?',
    rememberMe: 'Nyamuneka unyibuke',
    enter: 'Injira',
    loginFailed: 'Kwinjira byanze. Ongera ugerageze.',
    brandQuote: 'Aho Ubuyobozi Bwiza Buhura n\u2019Ubuvandimwe bw\u2019Ababyeyi.',
    forgotTitle: 'Wibagiwe ijambo ry\u2019ibanga?',
    forgotSubtitle: 'Andika imeyili yawe tuzohereze link yo guhindura.',
    forgotEmailLabel: 'Aderesi ya imeyili',
    forgotEmailPlaceholder: 'we@ishuri.rw',
    sendResetLink: 'Ohereza link yo guhindura',
    resetSentTitle: 'Reba imeyili yawe',
    resetSentBody: 'Niba konti ihari kuri iyo imeyili, link yo guhindura yoherejwe.',
    resetDefaultSuccess: 'Niba konti ihari kuri iyo imeyili, link yo guhindura yoherejwe.',
    requestFailed: 'Gusaba byanze. Ongera ugerageze.',
    changePasswordTitle: 'Hindura ijambo ry\u2019ibanga',
    changePasswordSubtitle: 'Ugomba gushyiraho ijambo rishya mbere yo gukomeza.',
    currentPassword: 'Ijambo ry\u2019ibanga rya none',
    newPassword: 'Ijambo rishya ry\u2019ibanga',
    confirmPassword: 'Emeza ijambo rishya',
    passwordPlaceholderNew: 'Andika ijambo ry\u2019ibanga',
    updatePassword: 'Hindura ijambo ry\u2019ibanga',
    passwordsMismatch: 'Amagambo y\u2019ibanga ntaho ahura.',
    mfaTitle: 'Kwemeza Kabiri',
    mfaSubtitle: 'Andika kode yo kwemeza kugira ngo ukomeze.',
    mfaCodeLabel: 'Kode yo kwemeza',
    mfaCodePlaceholder: 'Andika kode ya imibare 6',
    mfaVerify: 'Emeza',
    mfaResend: 'Ongera wohereze kode',
    mfaBackToLogin: 'Subira kwinjira',
    mfaAuthenticator: 'Porogaramu y\u2019emeza',
    mfaEmailOtp: 'Kode ya imeyili / SMS',
    forgotRememberPassword: 'Wibuka ijambo ry\u2019ibanga?',
    signIn: 'Injira',
    useDifferentEmail: 'Koresha imeyili itandukanye',
    returnToSignIn: 'Subira kwinjira',
    backToDashboard: 'Subira ku dashboard',
    reqMinChars: 'Byibuze inyuguti 8',
    reqMatch: 'Amagambo y\u2019ibanga ahura',
    navHome: 'Ahabanza',
    navAbout: 'Ibyerekeye',
    navModules: 'Module',
    navShuleKit: 'ShuleKit',
    navSchoolWebsites: 'Urubuga',
    navHowItWorks: 'Uko bikora',
    navPayFees: 'Kwishyura',
    navLogin: 'Injira',
    heroLine1: 'Urubuga rw\u2019Ikoranabuhanga',
    heroLine2: 'Ruhuza Amashuri',
    heroLine3: 'Kugira ngo Yitegure Neza',
    enterAsSchool: 'Injira nk\u2019Ishuri',
    enterAsParent: 'Injira nk\u2019Umubyeyi',
    enterAsTeacher: 'Injira nk\u2019Umwarimu',
    studentCodeLabel: 'Kode ya SDMS / ShuleCard ID',
    studentCodePlaceholder: 'Andika kode y\u2019umunyeshuri...',
    lookupStudent: 'Shakisha umunyeshuri',
    tapToReopen: 'Kanda kugira ngo ufungure',
    view: 'Reba',
    paySchoolFees: 'Kwishyura amafaranga y\u2019ishuri',
    payRequirements: 'Kwishyura ibikenewe',
    aboutEyebrow: 'Turi bande',
    aboutTitle: 'Uruzi rw\u2019ikoranabuhanga rw\u2019itegura amashuri mu Rwanda.',
    aboutBody:
      'Shule+ ni urubuga ruhuza amashuri, abarimu, ababyeyi n\u2019abafatanyabikorwa - kuva kwiyandikisha no kwishyura kugeza ku myigire, HR n\u2019isesengura - kugira ngo buri kigo gicane neza.',
    exploreModules: 'Reba module',
    howItWorksLink: 'Uko bikora',
    statSchools: 'Amashuri yinjiye',
    statStudents: 'Abanyeshuri bacungwa',
    statUptime: 'Uko urubuga rukora',
    howEyebrow: 'Uko bikora',
    howTitlePrefix: 'Gucunga amashuri neza',
    howTitleHighlight: 'bitangirira',
    howTitleSuffix: 'hano.',
    howSubtitle: 'Intambwe enye zoroshye - kuva kwiyandikisha kugeza gucunga ishuri kuri Shule+.',
    step1Title: 'Kurema Ishuri Ryawe',
    step1Body: 'Iyandikishe kandi ushyireho ahantu hawe ha Shule+ mu minota mike.',
    step2Title: 'Hitamo Module Zawe',
    step2Body: 'Hitamo gusa ibikoresho ukeneye - Amashuri, Amafaranga, Kwitabira, n\u2019ibindi.',
    step3Title: 'Tegura Ahantu Hawe',
    step3Body: 'Dufasha kuzana amakuru, gushyiraho uburenganzira no guhuza module n\u2019akazi kawe.',
    step4Title: 'Tangira Gukora',
    step4Body: 'Cunga kwiyandikisha, kwishyura, kwitabira n\u2019raporo kuri urubuga rumwe.',
    getStartedShule: 'Tangira na Shule+',
    partnersEyebrow: 'Abafatanyabikorwa n\u2019ibigo',
    partnersTitle: 'Byizewe n\u2019ibigo by\u2019u Rwanda.',
    partnersDescription:
      'Dukorana n\u2019abakoresha mobile money, payment gateways, ibigo by\u2019imari n\u2019ibigo by\u2019uburezi by\u2019igihugu.',
    ctaTitlePrefix: 'Witeguye gucunga ishuri ryawe',
    ctaTitleHighlight: 'nta mpapuro',
    ctaSubtitle:
      'Tegura ikigo cyawe mu minota - nta karita, nta kintu cyo kwiyemeza, gusa ibikoresho ukeneye.',
    ctaGetStarted: 'Tangira ubuntu',
    ctaTalkToUs: 'Twandikire',
    footerTagline:
      'Gucunga uburezi mu Rwanda: kwiyandikisha, amashuri, imari, HR n\u2019ibikorwa byose kuri urubuga rumwe.',
    footerProduct: 'Igicuruzwa',
    footerCompany: 'Ikigo',
    footerContact: 'Twandikire',
    footerTrackApplication: 'Kurikirana Gusaba',
    footerInstitutionalHelp: 'Ubufasha bw\u2019Ikigo',
    footerPrivacyPolicy: 'Politiki y\u2019Ubuzima Bwite',
    footerTermsOfService: 'Amategeko yo Gukoresha',
    footerCopyright: '© 2026 Shule+ Global. Uburenganzira bwose burindwa.',
  },
  /* French */
  {
    backToHome: 'Retour à l\u2019accueil',
    backToSignIn: 'Retour à la connexion',
    language: 'Langue',
    terms: 'Conditions',
    privacy: 'Confidentialité',
    userDataAccess: 'Données & Accès',
    managedBy: 'Géré par',
    allRightsReserved: 'TOUS DROITS RÉSERVÉS.',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    welcomeBack: 'Bon retour',
    signInSubtitle: 'Connectez-vous pour gérer votre espace organisationnel.',
    mobileTagline: 'Gérer Intelligemment .',
    emailLabel: 'E-mail | Téléphone',
    emailPlaceholder: 'Entrez votre e-mail ou numéro de téléphone',
    passwordLabel: 'Mot de passe',
    passwordPlaceholder: 'Entrez votre mot de passe',
    forgotLink: 'Oublié ?',
    rememberMe: 'Rester connecté',
    enter: 'Entrer',
    loginFailed: 'Échec de la connexion. Veuillez réessayer.',
    brandQuote: 'Là où l\u2019administration intelligente rencontre la parentalité active.',
    forgotTitle: 'Mot de passe oublié ?',
    forgotSubtitle: 'Entrez votre e-mail et nous vous enverrons un lien de réinitialisation.',
    forgotEmailLabel: 'Adresse e-mail',
    forgotEmailPlaceholder: 'vous@ecole.rw',
    sendResetLink: 'Envoyer le lien',
    resetSentTitle: 'Vérifiez votre boîte mail',
    resetSentBody: 'Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.',
    resetDefaultSuccess: 'Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.',
    requestFailed: 'Échec de la demande. Veuillez réessayer.',
    changePasswordTitle: 'Changer votre mot de passe',
    changePasswordSubtitle: 'Vous devez définir un nouveau mot de passe avant de continuer.',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    passwordPlaceholderNew: 'Entrez le mot de passe',
    updatePassword: 'Mettre à jour',
    passwordsMismatch: 'Les mots de passe ne correspondent pas.',
    mfaTitle: 'Authentification à deux facteurs',
    mfaSubtitle: 'Entrez le code de vérification pour continuer.',
    mfaCodeLabel: 'Code de vérification',
    mfaCodePlaceholder: 'Entrez le code à 6 chiffres',
    mfaVerify: 'Vérifier',
    mfaResend: 'Renvoyer le code',
    mfaBackToLogin: 'Retour à la connexion',
    mfaAuthenticator: 'Application d\u2019authentification',
    mfaEmailOtp: 'Code e-mail / SMS',
    forgotRememberPassword: 'Vous souvenez-vous de votre mot de passe ?',
    signIn: 'Se connecter',
    useDifferentEmail: 'Utiliser un autre e-mail',
    returnToSignIn: 'Retour à la connexion',
    backToDashboard: 'Retour au tableau de bord',
    reqMinChars: 'Au moins 8 caractères',
    reqMatch: 'Les mots de passe correspondent',
    navHome: 'Accueil',
    navAbout: 'À propos',
    navModules: 'Modules',
    navShuleKit: 'ShuleKit',
    navSchoolWebsites: 'Sites web',
    navHowItWorks: 'Comment',
    navPayFees: 'Frais',
    navLogin: 'Connexion',
    heroLine1: 'Une Plateforme Numérique',
    heroLine2: 'Intégrée pour',
    heroLine3: 'La Préparation Scolaire Équitable',
    enterAsSchool: 'Entrer en tant qu\u2019école',
    enterAsParent: 'Entrer en tant que parent',
    enterAsTeacher: 'Entrer en tant qu\u2019enseignant',
    studentCodeLabel: 'Code SDMS / ShuleCard ID',
    studentCodePlaceholder: 'Entrez le code élève...',
    lookupStudent: 'Rechercher l\u2019élève',
    tapToReopen: 'Appuyez pour rouvrir',
    view: 'Voir',
    paySchoolFees: 'Payer les frais scolaires',
    payRequirements: 'Payer les fournitures',
    aboutEyebrow: 'À propos',
    aboutTitle: 'L\u2019épine dorsale numérique de la préparation scolaire au Rwanda.',
    aboutBody:
      'Shule+ est une plateforme éducative intégrée qui connecte écoles, enseignants, parents et partenaires - de l\u2019inscription aux frais, aux académiques, RH et analyses - pour que chaque institution fonctionne avec clarté.',
    exploreModules: 'Explorer les modules',
    howItWorksLink: 'Comment ça marche',
    statSchools: 'Écoles intégrées',
    statStudents: 'Élèves gérés',
    statUptime: 'Disponibilité',
    howEyebrow: 'Comment ça marche',
    howTitlePrefix: 'Gérer les écoles plus intelligemment',
    howTitleHighlight: 'commence',
    howTitleSuffix: 'ici.',
    howSubtitle: 'Quatre étapes simples - de l\u2019inscription à la gestion sur Shule+.',
    step1Title: 'Créez Votre École',
    step1Body: 'Inscrivez votre institution et configurez votre espace Shule+ en quelques minutes.',
    step2Title: 'Choisissez Vos Modules',
    step2Body: 'Sélectionnez uniquement les outils dont vous avez besoin - Académique, Finance, Présence, etc.',
    step3Title: 'Configurez Votre Espace',
    step3Body: 'Nous aidons à importer les données, définir les permissions et adapter les modules.',
    step4Title: 'Lancez-vous',
    step4Body: 'Gérez admissions, paiements, présence et rapports depuis une seule plateforme.',
    getStartedShule: 'Commencer avec Shule+',
    partnersEyebrow: 'Partenaires & institutions',
    partnersTitle: 'Approuvé par les organisations leaders du Rwanda.',
    partnersDescription:
      'Nous collaborons avec les opérateurs mobile money, passerelles de paiement, institutions financières et organismes éducatifs nationaux.',
    ctaTitlePrefix: 'Prêt à gérer votre école',
    ctaTitleHighlight: 'sans paperasse',
    ctaSubtitle:
      'Configurez votre institution en minutes - sans carte bancaire, sans engagement, juste les outils dont vous avez besoin.',
    ctaGetStarted: 'Commencer gratuitement',
    ctaTalkToUs: 'Contactez-nous',
    footerTagline:
      'Gestion éducative pour les écoles au Rwanda : inscription, académique, finance, RH et opérations sur une plateforme.',
    footerProduct: 'Produit',
    footerCompany: 'Entreprise',
    footerContact: 'Contact',
    footerTrackApplication: 'Suivre la demande',
    footerInstitutionalHelp: 'Aide institutionnelle',
    footerPrivacyPolicy: 'Politique de confidentialité',
    footerTermsOfService: 'Conditions d\u2019utilisation',
    footerCopyright: '© 2026 Shule+ Global. Tous droits réservés.',
  },
  /* Swahili */
  {
    backToHome: 'Rudi nyumbani',
    backToSignIn: 'Rudi kuingia',
    language: 'Lugha',
    terms: 'Masharti',
    privacy: 'Faragha',
    userDataAccess: 'Data & Ufikiaji',
    managedBy: 'Inaendeshwa na',
    allRightsReserved: 'HAKI ZOTE ZIMEHIFADHIWA.',
    openMenu: 'Fungua menyu',
    closeMenu: 'Funga menyu',
    welcomeBack: 'Karibu tena',
    signInSubtitle: 'Ingia ili kusimamia eneo la shirika lako.',
    mobileTagline: 'Simamia kwa Akili .',
    emailLabel: 'Barua pepe | Simu',
    emailPlaceholder: 'Weka barua pepe au nambari ya simu',
    passwordLabel: 'Nenosiri',
    passwordPlaceholder: 'Weka nenosiri lako',
    forgotLink: 'Umesahau?',
    rememberMe: 'Nikumbuke',
    enter: 'Ingia',
    loginFailed: 'Kuingia kumeshindwa. Jaribu tena.',
    brandQuote: 'Mahali Usimamizi wa Akili Unakutana na Uzazi Hai.',
    forgotTitle: 'Umesahau nenosiri?',
    forgotSubtitle: 'Weka barua pepe yako tutakutumia kiungo cha kubadilisha.',
    forgotEmailLabel: 'Anwani ya barua pepe',
    forgotEmailPlaceholder: 'wewe@shule.rw',
    sendResetLink: 'Tuma kiungo cha kubadilisha',
    resetSentTitle: 'Angalia barua pepe yako',
    resetSentBody: 'Ikiwa akaunti ipo kwa barua pepe hiyo, kiungo cha kubadilisha kimetumwa.',
    resetDefaultSuccess: 'Ikiwa akaunti ipo kwa barua pepe hiyo, kiungo cha kubadilisha kimetumwa.',
    requestFailed: 'Ombi limeshindwa. Jaribu tena.',
    changePasswordTitle: 'Badilisha nenosiri lako',
    changePasswordSubtitle: 'Lazima uweke nenosiri jipya kabla ya kuendelea.',
    currentPassword: 'Nenosiri la sasa',
    newPassword: 'Nenosiri jipya',
    confirmPassword: 'Thibitisha nenosiri',
    passwordPlaceholderNew: 'Weka nenosiri',
    updatePassword: 'Sasisha nenosiri',
    passwordsMismatch: 'Manenosiri hayalingani.',
    mfaTitle: 'Uthibitishaji wa Hatua Mbili',
    mfaSubtitle: 'Weka msimbo wa uthibitishaji ili kuendelea.',
    mfaCodeLabel: 'Msimbo wa uthibitishaji',
    mfaCodePlaceholder: 'Weka msimbo wa tarakimu 6',
    mfaVerify: 'Thibitisha',
    mfaResend: 'Tuma tena msimbo',
    mfaBackToLogin: 'Rudi kuingia',
    mfaAuthenticator: 'Programu ya uthibitishaji',
    mfaEmailOtp: 'Msimbo wa barua pepe / SMS',
    forgotRememberPassword: 'Unakumbuka nenosiri lako?',
    signIn: 'Ingia',
    useDifferentEmail: 'Tumia barua pepe tofauti',
    returnToSignIn: 'Rudi kuingia',
    backToDashboard: 'Rudi kwenye dashibodi',
    reqMinChars: 'Angalau herufi 8',
    reqMatch: 'Manenosiri yanalingana',
    navHome: 'Nyumbani',
    navAbout: 'Kuhusu',
    navModules: 'Moduli',
    navShuleKit: 'ShuleKit',
    navSchoolWebsites: 'Tovuti',
    navHowItWorks: 'Inavyofanya',
    navPayFees: 'Lipa ada',
    navLogin: 'Ingia',
    heroLine1: 'Jukwaa la Kidijitali',
    heroLine2: 'Lililounganishwa kwa',
    heroLine3: 'Uwezo wa Shule Usawa',
    enterAsSchool: 'Ingia kama Shule',
    enterAsParent: 'Ingia kama Mzazi',
    enterAsTeacher: 'Ingia kama Mwalimu',
    studentCodeLabel: 'Msimbo wa SDMS / ShuleCard ID',
    studentCodePlaceholder: 'Weka msimbo wa mwanafunzi...',
    lookupStudent: 'Tafuta mwanafunzi',
    tapToReopen: 'Gusa kufungua tena',
    view: 'Angalia',
    paySchoolFees: 'Lipa ada za shule',
    payRequirements: 'Lipa mahitaji ya mwanafunzi',
    aboutEyebrow: 'Kuhusu sisi',
    aboutTitle: 'Mfumo wa kidijitali wa uwezo wa shule nchini Rwanda.',
    aboutBody:
      'Shule+ ni jukwaa la elimu lililounganishwa linalounganisha shule, walimu, wazazi na washirika - kutoka usajili na ada hadi masomo, HR na uchambuzi - ili kila taasisi isimamiwe kwa uwazi.',
    exploreModules: 'Chunguza moduli',
    howItWorksLink: 'Jinsi inavyofanya kazi',
    statSchools: 'Shule zilizojiunga',
    statStudents: 'Wanafunzi wanaosimamiwa',
    statUptime: 'Uwezo wa jukwaa',
    howEyebrow: 'Jinsi inavyofanya kazi',
    howTitlePrefix: 'Kusimamia shule kwa akili',
    howTitleHighlight: 'huanza',
    howTitleSuffix: 'hapa.',
    howSubtitle: 'Hatua nne rahisi - kutoka usajili hadi kusimamia shule kwenye Shule+.',
    step1Title: 'Unda Shule Yako',
    step1Body: 'Sajili taasisi yako na uweke eneo lako la Shule+ kwa dakika chache.',
    step2Title: 'Chagua Moduli Zako',
    step2Body: 'Chagua zana unazohitaji tu - Masomo, Fedha, Mahudhurio, na zaidi.',
    step3Title: 'Sanidi Eneo Lako',
    step3Body: 'Tunasaidia kuingiza data, kuweka ruhusa na kurekebisha moduli kwa mtiririko wako.',
    step4Title: 'Anza Kutumia',
    step4Body: 'Simamia uandikishaji, malipo, mahudhurio na ripoti kutoka jukwaa moja.',
    getStartedShule: 'Anza na Shule+',
    partnersEyebrow: 'Washirika & taasisi',
    partnersTitle: 'Inaaminika na mashirika makubwa ya Rwanda.',
    partnersDescription:
      'Tunafanya kazi na waendeshaji wa pesa za simu, njia za malipo, taasisi za kifedha na mashirika ya elimu ya kitaifa.',
    ctaTitlePrefix: 'Uko tayari kusimamia shule yako',
    ctaTitleHighlight: 'bila karatasi',
    ctaSubtitle:
      'Sanidi taasisi yako kwa dakika - hakuna kadi ya mkopo, hakuna ahadi, zana tu unazohitaji.',
    ctaGetStarted: 'Anza bure',
    ctaTalkToUs: 'Wasiliana nasi',
    footerTagline:
      'Usimamizi wa elimu kwa shule nchini Rwanda: usajili, masomo, fedha, HR na shughuli zote kwenye jukwaa moja.',
    footerProduct: 'Bidhaa',
    footerCompany: 'Kampuni',
    footerContact: 'Wasiliana',
    footerTrackApplication: 'Fuatilia Maombi',
    footerInstitutionalHelp: 'Msaada wa Taasisi',
    footerPrivacyPolicy: 'Sera ya Faragha',
    footerTermsOfService: 'Masharti ya Huduma',
    footerCopyright: '© 2026 Shule+ Global. Haki zote zimehifadhiwa.',
  },
);

export function pickTranslation(lang: AppLang | null | undefined): AppTranslations {
  return TRANSLATIONS[lang ?? 'en'];
}
