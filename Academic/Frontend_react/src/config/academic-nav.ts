export interface AcademicNavLink {
  label: string;
  href: string;
  icon: AcademicNavIcon;
  tileIcon?: string;
}

export type AcademicNavIcon =
  | 'home'
  | 'dashboard'
  | 'subjects'
  | 'exams'
  | 'marks'
  | 'templates'
  | 'assessments'
  | 'assignments'
  | 'reports'
  | 'grading'
  | 'analytics'
  | 'competency'
  | 'corrections'
  | 'graduation'
  | 'students'
  | 'classes'
  | 'seating'
  | 'invigilators'
  | 'live'
  | 'calendar'
  | 'qr'
  | 'print'
  | 'conflicts'
  | 'rooms'
  | 'schedule'
  | 'settings';

export interface AcademicNavChild {
  label: string;
  href: string;
}

export interface AcademicNavItem {
  label: string;
  href?: string;
  icon: AcademicNavIcon;
  children?: AcademicNavChild[];
}

export const ACADEMIC_TILES: AcademicNavLink[] = [
  { label: 'Academic Dashboard', href: '/academic-dashboard', icon: 'dashboard', tileIcon: '/svg-shapes/dashboard.svg' },
  { label: 'Courses', href: '/courses/catalog', icon: 'subjects', tileIcon: '/svg-shapes/subjects.svg' },
  { label: 'Marks Entry', href: '/marks', icon: 'marks', tileIcon: '/svg-shapes/marks-entry.svg' },
  { label: 'Assessments', href: '/assessments', icon: 'assessments', tileIcon: '/svg-shapes/assessments.svg' },
  { label: 'Examinations', href: '/exams', icon: 'exams', tileIcon: '/svg-shapes/examination.svg' },
  { label: 'Invigilator Desk', href: '/exams/invigilator-desk', icon: 'invigilators', tileIcon: '/svg-shapes/attendance.svg' },
  { label: 'Report Cards', href: '/report-cards/v2', icon: 'reports', tileIcon: '/svg-shapes/report-cards.svg' },
  { label: 'Analytics', href: '/analytics', icon: 'analytics', tileIcon: '/svg-shapes/analytics.svg' },
];

/** Sidebar navigation — flat groups (max two levels), aligned with Student Management layout. */
export const ACADEMIC_NAV: AcademicNavItem[] = [
  { label: 'Home', href: '/home', icon: 'home' },
  { label: 'Academic Dashboard', href: '/academic-dashboard', icon: 'dashboard' },
  {
    label: 'Courses',
    icon: 'subjects',
    children: [
      { label: 'Course catalog', href: '/courses/catalog' },
      { label: 'By class', href: '/courses/by-class' },
    ],
  },
  {
    label: 'Assessment',
    icon: 'assessments',
    children: [
      { label: 'Marks Entry', href: '/marks' },
      { label: 'Marks records', href: '/marks-records' },
      { label: 'Assessments', href: '/assessments' },
      { label: 'Templates', href: '/assessment-templates' },
    ],
  },
  {
    label: 'Examinations',
    icon: 'exams',
    children: [
      { label: 'Overview', href: '/exams' },
      { label: 'Exam Sessions', href: '/exams/sessions' },
      { label: 'Timetable', href: '/exams/timetable' },
      { label: 'Seating', href: '/exams/seating' },
      { label: 'Invigilators', href: '/exams/invigilators' },
      { label: 'Invigilator Desk', href: '/exams/invigilator-desk' },
      { label: 'Live Center', href: '/exams/live' },
      { label: 'Published Schedule', href: '/exams/published' },
      { label: 'Reports', href: '/exams/reports' },
    ],
  },
  {
    label: 'Results',
    icon: 'reports',
    children: [
      { label: 'Report Cards', href: '/report-cards/v2' },
      { label: 'Grading Scales', href: '/grading-scales' },
      { label: 'Competency', href: '/competency' },
      { label: 'Mark Corrections', href: '/mark-corrections' },
      { label: 'Teachers permission', href: '/teachers-permission' },
      { label: 'Round roll call', href: '/round-roll-call' },
      { label: 'Graduation', href: '/graduation' },
    ],
  },
  { label: 'Analytics', href: '/analytics', icon: 'analytics' },
];

export function isAssessmentGroupActive(pathname: string): boolean {
  return (
    pathname.startsWith('/marks-records') ||
    pathname.startsWith('/marks') ||
    pathname.startsWith('/assessments') ||
    pathname.startsWith('/assessment-templates') ||
    pathname.startsWith('/mark-entry') ||
    pathname.startsWith('/examinations')
  );
}

export function isExaminationsGroupActive(pathname: string): boolean {
  return pathname.startsWith('/exams');
}

export function isResultsGroupActive(pathname: string): boolean {
  return (
    pathname.startsWith('/report-cards') ||
    pathname.startsWith('/grading-scales') ||
    pathname.startsWith('/competency') ||
    pathname.startsWith('/mark-corrections') ||
    pathname.startsWith('/teachers-permission') ||
    pathname.startsWith('/round-roll-call') ||
    pathname.startsWith('/graduation')
  );
}

export function isCoursesGroupActive(pathname: string): boolean {
  return pathname.startsWith('/courses') || pathname.startsWith('/subjects');
}

export function isAcademicNavGroupActive(label: string, pathname: string): boolean {
  if (label === 'Assessment') return isAssessmentGroupActive(pathname);
  if (label === 'Examinations') return isExaminationsGroupActive(pathname);
  if (label === 'Results') return isResultsGroupActive(pathname);
  if (label === 'Courses') return isCoursesGroupActive(pathname);
  return false;
}

export function isAcademicNavActive(pathname: string, href: string): boolean {
  if (href === '/home') return pathname === '/home';
  if (href === '/academic-dashboard') return pathname.startsWith('/academic-dashboard');
  if (href === '/assessment-templates') return pathname.startsWith('/assessment-templates');
  if (href === '/assessments') {
    return pathname.startsWith('/assessments') || pathname.startsWith('/mark-entry');
  }
  if (href === '/report-cards/v2' || href === '/report-cards') {
    return pathname.startsWith('/report-cards');
  }
  if (href === '/courses/catalog') return pathname.startsWith('/courses/catalog') || pathname === '/courses';
  if (href === '/courses/by-class') return pathname.startsWith('/courses/by-class');
  if (href === '/courses') return pathname.startsWith('/courses') || pathname.startsWith('/subjects');
  if (href === '/subjects') return pathname.startsWith('/subjects') || pathname.startsWith('/courses');
  if (href === '/examinations') return pathname.startsWith('/examinations');
  if (href === '/marks-records') return pathname.startsWith('/marks-records');
  if (href === '/marks') return pathname === '/marks' || (pathname.startsWith('/marks/') && !pathname.startsWith('/marks-records'));
  if (href === '/students') return pathname.startsWith('/students');
  if (href === '/classes') return pathname.startsWith('/classes');
  if (href === '/exams') return pathname === '/exams';
  if (href === '/exams/invigilator-desk') return pathname.startsWith('/exams/invigilator-desk');
  if (href === '/exams/seating') return pathname.startsWith('/exams/seating');
  if (href === '/exams/invigilators') return pathname.startsWith('/exams/invigilators');
  if (href === '/exams/live') return pathname.startsWith('/exams/live');
  if (href === '/exams/reports') return pathname.startsWith('/exams/reports');
  if (href === '/analytics') return pathname.startsWith('/analytics');
  if (href === '/assignments') return pathname.startsWith('/assignments');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitleFromPath(pathname: string): string {
  if (pathname === '/home' || pathname === '/' || pathname === '/dashboard') return 'Home';
  if (pathname.startsWith('/academic-dashboard')) return 'Academic Dashboard';
  if (/^\/assessment-templates\/[^/]+\/edit/.test(pathname)) return 'Edit Template';
  if (pathname.startsWith('/assessment-templates/new')) return 'New Template';
  if (pathname.startsWith('/assessment-templates')) return 'Assessment Templates';
  if (pathname.startsWith('/mark-entry')) return 'Mark Entry';
  if (pathname.startsWith('/assessments')) return 'Assessments';
  if (pathname.startsWith('/assignments')) return 'Assignments';
  if (pathname.startsWith('/report-cards')) return 'Report Cards';
  if (pathname.startsWith('/grading-scales')) return 'Grading Scales';
  if (pathname.startsWith('/courses/catalog') || pathname === '/courses') return 'Course catalog';
  if (pathname.startsWith('/courses/by-class')) return 'Class courses';
  if (pathname.startsWith('/courses') || pathname.startsWith('/subjects')) return 'Courses';
  if (pathname.startsWith('/examinations')) return 'Marks Examinations';
  if (pathname.startsWith('/marks-records')) return 'Marks records';
  if (pathname.startsWith('/marks')) return 'Marks Entry';
  if (pathname.startsWith('/students')) return 'Students';
  if (pathname.startsWith('/classes')) return 'Classes';
  if (pathname.startsWith('/analytics')) return 'Analytics';
  if (pathname.startsWith('/competency')) return 'Competency';
  if (pathname.startsWith('/mark-corrections')) return 'Corrections';
  if (pathname.startsWith('/graduation')) return 'Graduation';
  if (pathname.startsWith('/exams/invigilator-desk')) return 'Invigilator Dashboard';
  if (pathname.startsWith('/exams/sessions/new') || /\/exams\/sessions\/.+\/setup/.test(pathname)) return 'Create Examination';
  if (pathname.startsWith('/exams/sessions')) return 'Examination Sessions';
  if (pathname.startsWith('/exams/timetable')) return 'Smart Timetable';
  if (pathname.startsWith('/exams/seating')) return 'Seating Arrangement';
  if (pathname.startsWith('/exams/invigilators')) return 'Invigilator Management';
  if (pathname.startsWith('/exams/live')) return 'Live Examinations';
  if (pathname.startsWith('/exams/published')) return 'Published Timetable';
  if (pathname.startsWith('/exams/reports')) return 'Examination Reports';
  if (pathname.startsWith('/exams')) return 'Examinations';
  return 'Academic';
}
