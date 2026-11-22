import type { SvgIconComponent } from '@mui/icons-material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ApartmentIcon from '@mui/icons-material/Apartment';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import LiveTvOutlinedIcon from '@mui/icons-material/LiveTvOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import DirectionsBusOutlinedIcon from '@mui/icons-material/DirectionsBusOutlined';
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined';
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import HistoryEduOutlinedIcon from '@mui/icons-material/HistoryEduOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import FeedbackOutlinedIcon from '@mui/icons-material/FeedbackOutlined';

export interface NavItem {
  label: string;
  href: string;
  icon: SvgIconComponent;
  /** badge key: 'approvals' | 'notifications' | 'tasks' | null */
  badge?: 'approvals' | 'notifications' | 'tasks';
}

export interface NavGroup {
  id: string;
  label: string;
  /** icon shown on the collapsible group row in the sidebar */
  icon: SvgIconComponent;
  items: NavItem[];
}

/**
 * Director Console sidebar hierarchy (spec §5).
 * Groups mirror the executive structure; every page keeps the selected
 * branch/academic period context while navigating.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'executive',
    icon: TrendingUpIcon,
    label: 'Executive',
    items: [
      { label: 'Overview', href: '/director/overview', icon: DashboardOutlinedIcon },
      { label: 'Console', href: '/director/console', icon: AppsOutlinedIcon },
      { label: 'yoInfo', href: '/director/yoinfo', icon: FeedbackOutlinedIcon },
      { label: 'Daily Briefing', href: '/director/briefing', icon: WbSunnyOutlinedIcon },
      { label: 'Performance Insights', href: '/director/insights', icon: TrendingUpIcon },
    ],
  },
  {
    id: 'schools',
    icon: ApartmentIcon,
    label: 'School Management',
    items: [
      { label: 'Schools & Branches', href: '/director/schools', icon: ApartmentIcon },
      { label: 'Student Management', href: '/director/students', icon: PeopleOutlineIcon },
      { label: 'Academic Management', href: '/director/academics', icon: SchoolOutlinedIcon },
      { label: 'Timetable', href: '/director/timetable', icon: CalendarMonthOutlinedIcon },
      { label: 'Teaching Now', href: '/director/teaching-now', icon: LiveTvOutlinedIcon, badge: 'tasks' },
      { label: 'Discipline', href: '/director/discipline', icon: GavelOutlinedIcon },
    ],
  },
  {
    id: 'finance',
    icon: AccountBalanceWalletOutlinedIcon,
    label: 'Finance & Resources',
    items: [
      { label: 'School Fees', href: '/director/fees', icon: AccountBalanceWalletOutlinedIcon },
      { label: 'School Budget', href: '/director/budget', icon: PieChartOutlineIcon },
      { label: 'HR & Payroll', href: '/director/hr', icon: WorkOutlineIcon },
    ],
  },
  {
    id: 'operations',
    icon: ChecklistOutlinedIcon,
    label: 'Operations & Governance',
    items: [
      { label: 'Attendance', href: '/director/attendance', icon: EventAvailableOutlinedIcon },
      { label: 'Smart Transport', href: '/director/transport', icon: DirectionsBusOutlinedIcon },
      { label: 'Live Campus / Cameras', href: '/director/live-campus', icon: VideocamOutlinedIcon },
      { label: 'Requests', href: '/director/requests', icon: AssignmentOutlinedIcon },
      { label: 'Approvals', href: '/director/approvals', icon: CheckCircleOutlineIcon, badge: 'approvals' },
      { label: 'Action Plan', href: '/director/action-plan', icon: ChecklistOutlinedIcon, badge: 'tasks' },
    ],
  },
  {
    id: 'communication',
    icon: ChatOutlinedIcon,
    label: 'Communication & Services',
    items: [
      { label: 'Parent MIS', href: '/director/parents', icon: PhoneIphoneOutlinedIcon },
      { label: 'ShuleChat', href: '/director/messages', icon: ChatOutlinedIcon, badge: 'notifications' },
      { label: 'Circulars & Broadcasts', href: '/director/circulars', icon: CampaignOutlinedIcon },
      { label: 'School Services', href: '/director/services', icon: ShoppingBagOutlinedIcon },
    ],
  },
  {
    id: 'governance',
    icon: GavelOutlinedIcon,
    label: 'Governance',
    items: [
      { label: 'Reports & Exports', href: '/director/reports', icon: AssessmentOutlinedIcon },
      { label: 'Audit Trail', href: '/director/audit', icon: HistoryEduOutlinedIcon },
      { label: 'Settings', href: '/director/settings', icon: SettingsOutlinedIcon },
    ],
  },
];

export function pageTitleFromPath(pathname: string): { title: string; description: string } {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return { title: item.label, description: DESCRIPTIONS[item.href] ?? '' };
      }
    }
  }
  if (pathname.startsWith('/director/overview')) {
    return { title: 'Overview', description: DESCRIPTIONS['/director/overview'] };
  }
  return { title: 'Director Console', description: '' };
}

const DESCRIPTIONS: Record<string, string> = {
  '/director/overview': 'Group performance at a glance — students, attendance, fees and approvals.',
  '/director/console': 'Every page in the Director Console, one tap away.',
  '/director/yoinfo': 'Swipeable news for leaders — policy, economy, education, research and more.',
  '/director/briefing': "What needs the Director's attention today, from verified school records.",
  '/director/insights': 'Branch comparison across attendance, academics, fees and staffing.',
  '/director/schools': 'Manage and compare all branches from one executive workspace.',
  '/director/students': 'Learner records and enrolment information (permission-controlled).',
  '/director/academics': 'Teaching quality, results and marking progress across levels.',
  '/director/timetable': 'Teaching schedules, coverage and workload by class and teacher.',
  '/director/teaching-now': 'Classes in session now — teaching, covers, gaps and late starts.',
  '/director/discipline': 'Conduct cases and positive behaviour across branches.',
  '/director/fees': 'Fee collection monitoring — billed, collected and outstanding.',
  '/director/budget': 'Approved budget versus actual expenditure by vote line.',
  '/director/hr': 'Staff, attendance, leave, workload and payroll overview.',
  '/director/attendance': 'Student and staff attendance with capture sources.',
  '/director/transport': 'Buses, routes, delays and students on board.',
  '/director/live-campus': 'CCTV cameras, zones and security (authorized access).',
  '/director/requests': 'Transport and procurement requests — review, approve or reject with a recorded decision.',
  '/director/approvals': 'Requests that require the Director’s decision.',
  '/director/action-plan': 'School improvement commitments with owners and deadlines.',
  '/director/parents': 'Parent accounts, engagement and enquiries.',
  '/director/messages': 'ShuleChat conversations and escalations.',
  '/director/circulars': 'Announcements, broadcasts and delivery results.',
  '/director/services': 'ShuleKit, ShuleMart, Uniforms, Dining and ShuleTrip.',
  '/director/reports': 'Build and export consolidated reports by branch and term.',
  '/director/audit': 'Who decided what, when — the immutable accountability log.',
  '/director/settings': 'Profile, permissions and console preferences.',
};

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== '/director' && pathname.startsWith(`${href}/`));
}

export function navHasActivePath(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isNavActive(pathname, item.href));
}

/**
 * Main (tab) views on mobile. Only these show the bottom navigation and the
 * full top bar. Every other page is a "sub view": no bottom nav, a navy top
 * bar with a back button and refresh only.
 */
export const MAIN_ROUTES = [
  '/director/overview',
  '/director/teaching-now',
  '/director/approvals',
  '/director/yoinfo',
  '/director/console',
] as const;

export function isMainRoute(pathname: string): boolean {
  return MAIN_ROUTES.some((href) => pathname === href);
}

/** Standalone views render full-bleed: no top bar and no scope bar. */
export const STANDALONE_ROUTES = ['/director/yoinfo'] as const;

export function isStandaloneRoute(pathname: string): boolean {
  return STANDALONE_ROUTES.some((href) => pathname === href);
}
