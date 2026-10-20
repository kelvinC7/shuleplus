export const PLAN_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
] as const;

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED'] as const;

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const CATEGORY_DEFAULTS = [
  { name: 'Teaching & Learning', color: '#3b82f6', icon: 'book-open' },
  { name: 'Student Welfare & Attendance', color: '#22c55e', icon: 'heart' },
  { name: 'Teacher Development', color: '#f59e0b', icon: 'users' },
  { name: 'ICT, STEM & Innovation', color: '#8b5cf6', icon: 'monitor' },
  { name: 'Inclusive Education', color: '#ec4899', icon: 'accessibility' },
  { name: 'Infrastructure & Environment', color: '#f97316', icon: 'building' },
  { name: 'Community & Parent Engagement', color: '#14b8a6', icon: 'handshake' },
  { name: 'Career Guidance & Student Development', color: '#6366f1', icon: 'compass' },
  { name: 'Governance & School Management', color: '#6b7280', icon: 'shield' },
];

export const FUNDING_SOURCES = [
  'School Fees',
  'Government Support',
  'Parents',
  'PTA',
  'Donor',
  'NGO',
  'Partner',
  'School Generated Income',
  'Other',
] as const;

export const APPROVAL_ROLES = [
  { level: 1, role: 'Supervisor' },
  { level: 2, role: 'Department Head' },
  { level: 3, role: 'Director' },
  { level: 4, role: 'CEO' },
];

export const TEMPLATE_TYPES = [
  { id: 'government', name: 'Government', description: 'Standard government action plan template' },
  { id: 'ngo', name: 'NGO', description: 'Non-governmental organization template' },
  { id: 'university', name: 'University', description: 'Higher education institution template' },
  { id: 'school', name: 'School', description: 'Primary/secondary school template' },
  { id: 'corporate', name: 'Corporate', description: 'Private sector template' },
];

export const EXPENSE_CATEGORIES = [
  'Transport',
  'Fuel',
  'Materials',
  'Printing',
  'Consultancy',
  'Travel',
  'Training',
  'Other',
];

export const RESOURCE_TYPES = [
  'Vehicle',
  'Equipment',
  'Room',
  'Staff',
  'Budget',
  'Computer',
  'Other',
];
