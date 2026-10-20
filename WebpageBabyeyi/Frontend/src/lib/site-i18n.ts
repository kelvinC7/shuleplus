export type SiteLang = 'rw' | 'en' | 'fr';

export type SiteText = {
  topBarLinks: [string, string, string];
  nav: {
    explore: string;
    search: string;
    studyChina: string;
    jobsNews: string;
    about: string;
    signIn: string;
    registerSchool: string;
    tagline: string;
    menu: string;
  };
  logoTagline: string;
  iam: {
    prefix: string;
    selectRole: string;
    school: string;
    teacher: string;
    parent: string;
    schoolPlaceholder: string;
    teacherPlaceholder: string;
    parentPlaceholder: string;
    changeRole: string;
    lookup: string;
  };
  hero: {
    badge: string;
    titleBefore: string;
    titleHighlight: string;
    subtitle: string;
    subtitleActions: string;
    searchPlaceholder: string;
    allProvinces: string;
    allLevels: string;
    allCurricula: string;
    searchBtn: string;
    stats: [string, string, string];
    studentAlt: string;
  };
  filters: {
    title: string;
    titleSub: string;
    clearFilters: string;
    clearAll: string;
    totalAvailable: string;
    schoolsMatch: string;
    filterByName: string;
    province: string;
    provinceNote: string;
    district: string;
    districtNote: string;
    sector: string;
    sectorNote: string;
    category: string;
    schoolType: string;
    curriculum: string;
    combination: string;
    gender: string;
    schoolMode: string;
    feesPerTerm: string;
    applyFilters: string;
    showResults: string;
    allProvinces: string;
    allDistricts: string;
    allSectors: string;
    selectProvinceFirst: string;
    selectDistrictFirst: string;
    allCategories: string;
    allTypes: string;
    allCurricula: string;
    allCombinations: string;
    sheetBadge: string;
    sheetTitle: string;
    sheetSubtitle: (count: number) => string;
    closeFilters: string;
    close: string;
    dialogLabel: string;
  };
  gender: { Male: string; Female: string; Mixed: string };
  mode: { Boarding: string; Day: string; Both: string };
  schoolTypes: {
    Government: string;
    'Government-aided': string;
    Private: string;
    International: string;
  };
  results: {
    allSchools: string;
    resultsFor: (name: string) => string;
    loading: string;
    unavailable: string;
    showing: (from: number, to: number, total: number) => string;
    none: string;
    sortBy: string;
    filters: string;
    sortRelevant: string;
    sortFeesAsc: string;
    sortName: string;
    gridView: string;
    listView: string;
    registryError: string;
    tryAgain: string;
    noMatch: string;
    noMatchHint: string;
    loadError: string;
  };
  card: {
    getBabyeyi: string;
    payFees: string;
    admission: string;
    verified: string;
    viewSite: string;
    viewDetails: (name: string) => string;
    save: (name: string) => string;
    unsave: (name: string) => string;
  };
  pagination: { prev: string; next: string };
  showcase: {
    ariaLabel: string;
    prev: string;
    next: string;
    goTo: (n: number) => string;
    slides: Array<{ tag: string; title: string; desc: string; cta: string }>;
  };
  cta: { title: string; desc: string; button: string };
  footer: {
    blurb: string;
    forParents: string;
    forSchools: string;
    company: string;
    parentLinks: [string, string, string, string];
    schoolLinks: [string, string, string, string];
    companyLinks: [string, string, string, string];
    copyright: string;
    motto: string;
  };
  schoolInfo: {
    verified: string;
    curriculum: string;
    about: string;
    levels: string;
    combinations: string;
    tvetTrades: string;
    contact: string;
    payFees: string;
    visitSite: string;
    locationMissing: string;
    locationMissingHint: string;
    mapOf: (name: string) => string;
    close: string;
    details: (name: string) => string;
  };
};

export const SITE_I18N: Record<SiteLang, SiteText> = {
  rw: {
    topBarLinks: ['Ku babyeyi', 'Ku mashuri', 'Ubufasha'],
    nav: {
      explore: 'Shaka amashuri',
      search: 'Shakisha',
      studyChina: 'Wiga mu Bushinwa',
      jobsNews: 'Akazi n\u2019amakuru',
      about: 'Ibyerekeye',
      signIn: 'Injira',
      registerSchool: 'Andika ikigo cyawe',
      tagline: 'babyeyi.rw \u2014 ubufasha bw\u2019ababyeyi',
      menu: 'Ibikubiyemo',
    },
    logoTagline: 'Ubufasha bw\u2019ababyeyi',
    iam: {
      prefix: 'Ndi',
      selectRole: 'Hitamo uruhare',
      school: 'Ikigo',
      teacher: 'Umwarimu',
      parent: 'Umubyeyi',
      schoolPlaceholder: 'ShuleCode',
      teacherPlaceholder: 'ShuleTicha Code',
      parentPlaceholder: 'Kode ya SDMS / ShuleCard',
      changeRole: 'Hindura uruhare',
      lookup: 'Shakisha',
    },
    hero: {
      badge: 'Dufite imirenge yose 30 y\u2019u Rwanda',
      titleBefore: 'Amashuri, ',
      titleHighlight: 'Byateguwe.',
      subtitle:
        'Menya ishuri rikwiriye. Menya amashuri. Bona Babyeyi yawe. Huza n\u2019amashuri. Andikisha byoroshye. Ishyura neza. Urugendo rwawe rwose rw\u2019ishuri, byateguwe.',
      subtitleActions: 'Shakira. Menya. Huza. Andikisha. Gucunga. Ishyura.',
      searchPlaceholder: 'Izina ry\u2019ikigo, urug. Green Hills Academy',
      allProvinces: 'Intara zose',
      allLevels: 'Amashuri yose',
      allCurricula: 'Inyigisho zose',
      searchBtn: 'Shakisha',
      stats: ['Uturere', 'Amashuri ahuze', 'Live'],
      studentAlt: 'Abanyeshuri b\u2019u Rwanda bishimye',
    },
    filters: {
      title: 'Shaka ikigo',
      titleSub: 'Shaka Ikigo',
      clearFilters: 'Siba ibyo ushakisha',
      clearAll: 'Siba byose',
      totalAvailable: 'Amashuri yose aboneka',
      schoolsMatch: 'amashuri ahura',
      filterByName: 'Shakisha ku izina\u2026',
      province: 'Intara',
      provinceNote: 'Intara',
      district: 'Akarere',
      districtNote: 'Akarere',
      sector: 'Umurenge',
      sectorNote: 'Umurenge',
      category: 'Icyiciro',
      schoolType: 'Ubwoko bw\u2019ikigo',
      curriculum: 'Inyigisho',
      combination: 'Inyigisho z\u2019A-Level',
      gender: 'Igitsina',
      schoolMode: 'Uburyo bw\u2019ikigo',
      feesPerTerm: 'Amafaranga ku gihembwe (RWF)',
      applyFilters: 'Shyira mu bikorwa',
      showResults: 'Erekana ibisubizo',
      allProvinces: 'Intara zose',
      allDistricts: 'Uturere twose',
      allSectors: 'Imirenge yose',
      selectProvinceFirst: 'Hitamo intara mbere',
      selectDistrictFirst: 'Hitamo akarere mbere',
      allCategories: 'Ibyiciro byose',
      allTypes: 'Ubwoko bwose',
      allCurricula: 'Inyigisho zose',
      allCombinations: 'Inyigisho zose',
      sheetBadge: 'Ibikoresho',
      sheetTitle: 'Shaka ikigo',
      sheetSubtitle: (n) => `Shaka Ikigo \u00b7 amashuri ${n}`,
      closeFilters: 'Funga ibikoresho',
      close: 'Funga',
      dialogLabel: 'Shakisha no guhitamo amashuri',
    },
    gender: { Male: 'Abahungu', Female: 'Abakobwa', Mixed: 'Byombi' },
    mode: { Boarding: 'Icyiciro cyo kurara', Day: 'Amasaha', Both: 'Byombi' },
    schoolTypes: {
      Government: 'Leta',
      'Government-aided': 'Leta ifasha',
      Private: 'Abikorera',
      International: 'Mpuzamahanga',
    },
    results: {
      allSchools: 'Amashuri yose',
      resultsFor: (n) => `Ibisubizo bya \u201c${n}\u201d`,
      loading: 'Gutegura amashuri\u2026',
      unavailable: 'Amakuru ntiboneka',
      showing: (from, to, total) => `Byerekana ${from}\u2013${to} muri ${total} ibisubizo`,
      none: 'Nta bisubizo bibonetse',
      sortBy: 'Shiraho',
      filters: 'Ibikoresho',
      sortRelevant: 'Bikwiye cyane',
      sortFeesAsc: 'Amafaranga: hasi hejuru',
      sortName: 'Izina A\u2013Z',
      gridView: 'Imbonerahamwe',
      listView: 'Urutonde',
      registryError: 'Ntitwashoboye kugera ku rutonde',
      tryAgain: 'Ongera ugerageze',
      noMatch: 'Nta mashuri ahura n\u2019ibyo ushakisha',
      noMatchHint: 'Gerageza kugabanya ibyo ushakisha \u2014 siba imwe cyangwa ongera amafaranga.',
      loadError: 'Ntitwashoboye gutegura amashuri. Reba interineti hanyuma ongera ugerageze.',
    },
    card: {
      getBabyeyi: 'Fata Babyeyi',
      payFees: 'Ishyura amafaranga',
      admission: 'Iyandikisha',
      verified: 'Byemejwe',
      viewSite: 'Reba urubuga',
      viewDetails: (n) => `Reba ${n}`,
      save: (n) => `Bika ${n}`,
      unsave: (n) => `Kuraho ${n}`,
    },
    pagination: { prev: 'Ipaji iheruka', next: 'Ipaji ikurikira' },
    showcase: {
      ariaLabel: 'Amatangazo',
      prev: 'Itangazo riheruka',
      next: 'Itangazo rikurikira',
      goTo: (n) => `Jya ku tangazo ${n}`,
      slides: [
        {
          tag: 'Itangazo \u00b7 Ishyura amafaranga',
          title: 'Ishyura amafaranga y\u2019ishuri kuri Bank of Africa',
          desc: 'Kwishyura byizewe kandi byihuse uhereye aho aho \u2014 ikigo cyakira icyemezo ako kanya.',
          cta: 'Ishyura nonaha',
        },
        {
          tag: 'Itangazo \u00b7 Isoko',
          title: 'Fata ShuleKit \u2014 ibikoresho byose byo gutangira ishuri',
          desc: 'Impapuro, amakarita, ibikoresho bya geometry n\u2019isakoshi \u2014 igiciro cyiza kimwe.',
          cta: 'Tumiza ShuleKit',
        },
        {
          tag: 'Itangazo \u00b7 Ishuri ridafite amafaranga',
          title: 'Fata ShuleCard \u2014 ikarita imwe y\u2019amafaranga yose',
          desc: 'Kwishyura ifunguro, isomero n\u2019ubwikorezi nta cash \u2014 ababyeyi babona ubutumwa ako kanya.',
          cta: 'Fata ShuleCard',
        },
      ],
    },
    cta: {
      title: 'Tunganya umwirondoro w\u2019ikigo cyawe kuri babyeyi.rw',
      desc: 'Andika ikigo cyawe kugira ngo uhindure urutonde, utange inyigisho za A-Level, utange amatangazo, kandi wishyure ibibazo by\u2019ababyeyi \u2014 byose mu dashibodi imwe.',
      button: 'Andika ikigo cyawe',
    },
    footer: {
      blurb:
        'Urutonde rw\u2019amashuri abanza, ayisumbuye, TVET n\u2019amashuri makuru mu turere twose 30 tw\u2019u Rwanda \u2014 mu Cyongereza no mu Kinyarwanda.',
      forParents: 'Ku babyeyi',
      forSchools: 'Ku mashuri',
      company: 'Ikigo',
      parentLinks: ['Shaka amashuri', 'Shakisha ku nyigisho', 'Gereranya amashuri', 'Inyandiko y\u2019iyandikisha'],
      schoolLinks: ['Andika ikigo', 'Dashibodi y\u2019ikigo', 'Tanga itangazo', 'Tunganya inyigisho'],
      companyLinks: ['Ibyerekeye', 'Twandikire', 'Politiki y\u2019ibanga', 'Amategeko yo gukoresha'],
      copyright: '\u00a9 2026 babyeyi.rw. Uburenganzira bwose burabitswe.',
      motto: 'Yego \u2014 kwiga neza biratangirira ku ishuri ryiza. EN \u00b7 RW \u00b7 FR',
    },
    schoolInfo: {
      verified: 'Byemejwe',
      curriculum: 'Inyigisho',
      about: 'Ibyerekeye',
      levels: 'Amashuri',
      combinations: 'Inyigisho za A-Level',
      tvetTrades: 'Umwuga wa TVET',
      contact: 'Twandikire',
      payFees: 'Ishyura amafaranga',
      visitSite: 'Sura urubuga',
      locationMissing: 'Aho ikigo giherereye ntihari',
      locationMissingHint: 'Intara, akarere n\u2019ikarita biboneka iyo ikigo ryarangije aho giherereye.',
      mapOf: (n) => `Ikarita ya ${n}`,
      close: 'Funga',
      details: (n) => `Amakuru ya ${n}`,
    },
  },
  en: {
    topBarLinks: ['For parents', 'For schools', 'Help centre'],
    nav: {
      explore: 'Explore schools',
      search: 'Search',
      studyChina: 'Study in China',
      jobsNews: 'Jobs & News',
      about: 'About',
      signIn: 'Sign in',
      registerSchool: 'Register school',
      tagline: 'babyeyi.rw — parents convenience',
      menu: 'Menu',
    },
    logoTagline: 'Parents Convenience',
    iam: {
      prefix: 'I am',
      selectRole: 'Select role',
      school: 'School',
      teacher: 'Teacher',
      parent: 'Parent',
      schoolPlaceholder: 'ShuleCode',
      teacherPlaceholder: 'ShuleTicha Code',
      parentPlaceholder: 'SDMS code / ShuleCard ID',
      changeRole: 'Change role',
      lookup: 'Look up',
    },
    hero: {
      badge: 'Covering all 30 districts of Rwanda',
      titleBefore: 'Schools, ',
      titleHighlight: 'Sorted',
      subtitle:
        'Discover the right school. Explore programmes. Get your Babyeyi. Connect with schools. Enrol with ease. Pay securely. Your entire school journey, sorted.',
      subtitleActions: 'Find. Explore. Connect. Enrol. Manage. Pay.',
      searchPlaceholder: 'School name, e.g. Green Hills Academy',
      allProvinces: 'All provinces',
      allLevels: 'All levels',
      allCurricula: 'All curricula',
      searchBtn: 'Search',
      stats: ['Districts', 'Schools connected', 'Live'],
      studentAlt: 'Happy Rwandan students in school uniforms',
    },
    filters: {
      title: 'Search school',
      titleSub: 'Shaka Ikigo',
      clearFilters: 'Clear filters',
      clearAll: 'Clear all',
      totalAvailable: 'Total schools available',
      schoolsMatch: 'schools match',
      filterByName: 'Filter by name\u2026',
      province: 'Province',
      provinceNote: 'Intara',
      district: 'District',
      districtNote: 'Akarere',
      sector: 'Sector',
      sectorNote: 'Umurenge',
      category: 'Category',
      schoolType: 'School type',
      curriculum: 'Curriculum',
      combination: 'Combination',
      gender: 'Gender',
      schoolMode: 'School mode',
      feesPerTerm: 'Fees per term (RWF)',
      applyFilters: 'Apply filters',
      showResults: 'Show results',
      allProvinces: 'All provinces',
      allDistricts: 'All districts',
      allSectors: 'All sectors',
      selectProvinceFirst: 'Select province first',
      selectDistrictFirst: 'Select district first',
      allCategories: 'All categories',
      allTypes: 'All types',
      allCurricula: 'All curricula',
      allCombinations: 'All combinations',
      sheetBadge: 'Filters',
      sheetTitle: 'Search school',
      sheetSubtitle: (n) => `Shaka Ikigo \u00b7 ${n} schools`,
      closeFilters: 'Close filters',
      close: 'Close',
      dialogLabel: 'Search and filter schools',
    },
    gender: { Male: 'Male', Female: 'Female', Mixed: 'Mixed' },
    mode: { Boarding: 'Boarding', Day: 'Day', Both: 'Both' },
    schoolTypes: {
      Government: 'Government',
      'Government-aided': 'Government-aided',
      Private: 'Private',
      International: 'International',
    },
    results: {
      allSchools: 'All schools',
      resultsFor: (n) => `Results for \u201c${n}\u201d`,
      loading: 'Loading schools\u2026',
      unavailable: 'Data unavailable',
      showing: (from, to, total) => `Showing ${from}\u2013${to} of ${total} results`,
      none: 'No results found',
      sortBy: 'Sort by',
      filters: 'Filters',
      sortRelevant: 'Most relevant',
      sortFeesAsc: 'Fees: low to high',
      sortName: 'Name A\u2013Z',
      gridView: 'Grid view',
      listView: 'List view',
      registryError: 'We couldn\u2019t reach the registry',
      tryAgain: 'Try again',
      noMatch: 'No schools match your filters',
      noMatchHint: 'Try widening your search — clear a few filters or increase the fees range.',
      loadError: 'Could not load onboarded schools. Check your connection and try again.',
    },
    card: {
      getBabyeyi: 'Get Babyeyi',
      payFees: 'Pay Fees',
      admission: 'Admission',
      verified: 'Verified',
      viewSite: 'View School Site',
      viewDetails: (n) => `View ${n} details`,
      save: (n) => `Save ${n}`,
      unsave: (n) => `Remove ${n} from saved`,
    },
    pagination: { prev: 'Previous page', next: 'Next page' },
    showcase: {
      ariaLabel: 'Announcements',
      prev: 'Previous announcement',
      next: 'Next announcement',
      goTo: (n) => `Go to announcement ${n}`,
      slides: [
        {
          tag: 'Announcement \u00b7 Pay Fees',
          title: 'Pay school fees directly to Bank ',
          desc: 'Conveniently pay school fees and other school-related bills through your preferred bank or payment gateway of choice',
          cta: 'Pay Fees Now',
        },
        {
          tag: 'Announcement \u00b7 Marketplace',
          title: 'Get ShuleKit  the complete back-to-school bundle',
          desc: "We have transformed the traditional Babyeyi into digital online catalogs specially customized for your school's requirements",
          cta: 'Order ShuleKit',
        },
        {
          tag: 'Announcement \u00b7 Cashless School',
          title: 'Get the ShuleCard the one card for every school payment',
          desc: 'ShuleCard is a smart student card that consolidates cashless payments, transport access, attendance, and academic and medical data into one seamless NFC-enabled experience, while also teaching financial literacy through saving and budgeting lessons',
          cta: 'Get ShuleCard',
        },
      ],
    },
    cta: {
      title: 'Manage your school\u2019s profile on babyeyi.rw',
      desc: 'Register your school to update your listing, publish A-Level combinations, post adverts, and respond to enquiries from parents — all from one dashboard.',
      button: 'Register your school',
    },
    footer: {
      blurb:
        'The official-style directory of primary, secondary, TVET and university institutions across all 30 districts of Rwanda — in English and Kinyarwanda.',
      forParents: 'For parents',
      forSchools: 'For schools',
      company: 'Company',
      parentLinks: ['Browse schools', 'Search by combination', 'Compare schools', 'Admissions guide'],
      schoolLinks: ['Register your school', 'School dashboard', 'Post an advert', 'Manage combinations'],
      companyLinks: ['About us', 'Contact', 'Privacy policy', 'Terms of use'],
      copyright: '\u00a9 2026 babyeyi.rw. All rights reserved.',
      motto: 'Yego — kwiga neza biratangirira ku ishuri ryiza. EN \u00b7 RW \u00b7 FR',
    },
    schoolInfo: {
      verified: 'Verified',
      curriculum: 'Curriculum',
      about: 'About',
      levels: 'Education levels',
      combinations: 'A-Level combinations',
      tvetTrades: 'TVET trades',
      contact: 'Contact',
      payFees: 'Pay Fees',
      visitSite: 'Visit site',
      locationMissing: 'Location not registered',
      locationMissingHint: 'Province, district, and map appear when the school completes onboarding location.',
      mapOf: (n) => `Map of ${n}`,
      close: 'Close',
      details: (n) => `${n} details`,
    },
  },
  fr: {
    topBarLinks: ['Pour les parents', 'Pour les écoles', 'Centre d\u2019aide'],
    nav: {
      explore: 'Écoles',
      search: 'Rechercher',
      studyChina: 'Chine',
      jobsNews: 'Actualités',
      about: 'À propos',
      signIn: 'Se connecter',
      registerSchool: 'Inscrire école',
      tagline: 'babyeyi.rw — confort des parents',
      menu: 'Menu',
    },
    logoTagline: 'Confort des parents',
    iam: {
      prefix: 'Je suis',
      selectRole: 'Choisir rôle',
      school: 'École',
      teacher: 'Enseignant',
      parent: 'Parent',
      schoolPlaceholder: 'ShuleCode',
      teacherPlaceholder: 'Code ShuleTicha',
      parentPlaceholder: 'Code SDMS / ShuleCard',
      changeRole: 'Changer de rôle',
      lookup: 'Rechercher',
    },
    hero: {
      badge: 'Couvrant les 30 districts du Rwanda',
      titleBefore: 'Écoles, ',
      titleHighlight: 'simplifiées.',
      subtitle:
        'Découvrez la bonne école. Explorez les programmes. Obtenez votre Babyeyi. Connectez-vous aux écoles. Inscrivez-vous facilement. Payez en toute sécurité. Tout votre parcours scolaire, simplifié.',
      subtitleActions: 'Trouver. Explorer. Connecter. S\u2019inscrire. Gérer. Payer.',
      searchPlaceholder: 'Nom de l\u2019école, ex. Green Hills Academy',
      allProvinces: 'Toutes les provinces',
      allLevels: 'Tous les niveaux',
      allCurricula: 'Tous les programmes',
      searchBtn: 'Rechercher',
      stats: ['Districts', 'Écoles connectées', 'Live'],
      studentAlt: 'Élèves rwandais en uniforme scolaire',
    },
    filters: {
      title: 'Rechercher une école',
      titleSub: 'Shaka Ikigo',
      clearFilters: 'Effacer les filtres',
      clearAll: 'Tout effacer',
      totalAvailable: 'Total des écoles disponibles',
      schoolsMatch: 'écoles correspondent',
      filterByName: 'Filtrer par nom\u2026',
      province: 'Province',
      provinceNote: 'Intara',
      district: 'District',
      districtNote: 'Akarere',
      sector: 'Secteur',
      sectorNote: 'Umurenge',
      category: 'Catégorie',
      schoolType: 'Type d\u2019école',
      curriculum: 'Programme',
      combination: 'Combinaison',
      gender: 'Genre',
      schoolMode: 'Mode scolaire',
      feesPerTerm: 'Frais par trimestre (RWF)',
      applyFilters: 'Appliquer les filtres',
      showResults: 'Voir les résultats',
      allProvinces: 'Toutes les provinces',
      allDistricts: 'Tous les districts',
      allSectors: 'Tous les secteurs',
      selectProvinceFirst: 'Sélectionnez d\u2019abord la province',
      selectDistrictFirst: 'Sélectionnez d\u2019abord le district',
      allCategories: 'Toutes les catégories',
      allTypes: 'Tous les types',
      allCurricula: 'Tous les programmes',
      allCombinations: 'Toutes les combinaisons',
      sheetBadge: 'Filtres',
      sheetTitle: 'Rechercher une école',
      sheetSubtitle: (n) => `Shaka Ikigo \u00b7 ${n} écoles`,
      closeFilters: 'Fermer les filtres',
      close: 'Fermer',
      dialogLabel: 'Rechercher et filtrer les écoles',
    },
    gender: { Male: 'Garçons', Female: 'Filles', Mixed: 'Mixte' },
    mode: { Boarding: 'Internat', Day: 'Externat', Both: 'Les deux' },
    schoolTypes: {
      Government: 'Publique',
      'Government-aided': 'Soutenue par l\u2019État',
      Private: 'Privée',
      International: 'Internationale',
    },
    results: {
      allSchools: 'Toutes les écoles',
      resultsFor: (n) => `Résultats pour \u00ab\u00a0${n}\u00a0\u00bb`,
      loading: 'Chargement des écoles\u2026',
      unavailable: 'Données indisponibles',
      showing: (from, to, total) => `Affichage ${from}\u2013${to} sur ${total} résultats`,
      none: 'Aucun résultat',
      sortBy: 'Trier par',
      filters: 'Filtres',
      sortRelevant: 'Plus pertinents',
      sortFeesAsc: 'Frais : croissant',
      sortName: 'Nom A\u2013Z',
      gridView: 'Vue grille',
      listView: 'Vue liste',
      registryError: 'Impossible d\u2019accéder au registre',
      tryAgain: 'Réessayer',
      noMatch: 'Aucune école ne correspond à vos filtres',
      noMatchHint: 'Élargissez votre recherche — effacez quelques filtres ou augmentez la fourchette de frais.',
      loadError: 'Impossible de charger les écoles. Vérifiez votre connexion et réessayez.',
    },
    card: {
      getBabyeyi: 'Obtenir Babyeyi',
      payFees: 'Payer les frais',
      admission: 'Admission',
      verified: 'Vérifié',
      viewSite: 'Voir le site',
      viewDetails: (n) => `Voir ${n}`,
      save: (n) => `Enregistrer ${n}`,
      unsave: (n) => `Retirer ${n}`,
    },
    pagination: { prev: 'Page précédente', next: 'Page suivante' },
    showcase: {
      ariaLabel: 'Annonces',
      prev: 'Annonce précédente',
      next: 'Annonce suivante',
      goTo: (n) => `Aller à l\u2019annonce ${n}`,
      slides: [
        {
          tag: 'Annonce \u00b7 Payer les frais',
          title: 'Payez les frais scolaires via Bank of Africa',
          desc: 'Paiements sécurisés et instantanés partout au Rwanda — confirmation envoyée directement à l\u2019école.',
          cta: 'Payer maintenant',
        },
        {
          tag: 'Annonce \u00b7 Marketplace',
          title: 'Obtenez ShuleKit — la trousse complète de rentrée',
          desc: 'Cahiers, stylos, matériel de géométrie et sac solide — un prix avantageux.',
          cta: 'Commander ShuleKit',
        },
        {
          tag: 'Annonce \u00b7 École sans cash',
          title: 'Obtenez la ShuleCard — une carte pour tous les paiements',
          desc: 'Cantine, bibliothèque et transport sans espèces — alertes de solde instantanées pour les parents.',
          cta: 'Obtenir ShuleCard',
        },
      ],
    },
    cta: {
      title: 'Gérez le profil de votre école sur babyeyi.rw',
      desc: 'Inscrivez votre école pour mettre à jour votre fiche, publier les combinaisons A-Level, poster des annonces et répondre aux parents — depuis un seul tableau de bord.',
      button: 'Inscrire votre école',
    },
    footer: {
      blurb:
        'Répertoire des établissements primaires, secondaires, TVET et universitaires dans les 30 districts du Rwanda — en anglais et kinyarwanda.',
      forParents: 'Pour les parents',
      forSchools: 'Pour les écoles',
      company: 'Entreprise',
      parentLinks: ['Parcourir les écoles', 'Recherche par combinaison', 'Comparer les écoles', 'Guide d\u2019admission'],
      schoolLinks: ['Inscrire votre école', 'Tableau de bord', 'Publier une annonce', 'Gérer les combinaisons'],
      companyLinks: ['À propos', 'Contact', 'Politique de confidentialité', 'Conditions d\u2019utilisation'],
      copyright: '\u00a9 2026 babyeyi.rw. Tous droits réservés.',
      motto: 'Yego — kwiga neza biratangirira ku ishuri ryiza. EN \u00b7 RW \u00b7 FR',
    },
    schoolInfo: {
      verified: 'Vérifié',
      curriculum: 'Programme',
      about: 'À propos',
      levels: 'Niveaux d\u2019éducation',
      combinations: 'Combinaisons A-Level',
      tvetTrades: 'Métiers TVET',
      contact: 'Contact',
      payFees: 'Payer les frais',
      visitSite: 'Visiter le site',
      locationMissing: 'Localisation non enregistrée',
      locationMissingHint: 'Province, district et carte apparaissent lorsque l\u2019école complète son emplacement.',
      mapOf: (n) => `Carte de ${n}`,
      close: 'Fermer',
      details: (n) => `Détails de ${n}`,
    },
  },
};

export function pickSiteText(lang: SiteLang | null): SiteText {
  return SITE_I18N[lang ?? 'en'];
}

export const LANG_STORAGE_KEY = 'babyeyi-site-lang';
