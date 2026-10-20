export const TASK_CATEGORIES = [
  'HR',
  'Finance',
  'Inventory',
  'Procurement',
  'Academics',
  'Administration',
  'IT',
  'Marketing',
  'Operations',
  'Cafeteria',
  'Maintenance',
  'Other',
] as const;

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'] as const;

export const APPROVAL_STATUSES = [
  'NOT_REQUIRED',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'RETURNED',
] as const;

export const ASSIGNMENT_TYPES = ['INDIVIDUAL', 'TEAM', 'DEPARTMENT', 'ROLE'] as const;

export const WORKFLOW_TRIGGER_TYPES = [
  'MANUAL',
  'AUTO_ON_CREATE',
  'AUTO_ON_STATUS_CHANGE',
  'EVENT_BASED',
  'SCHEDULED',
] as const;

export const WORKFLOW_STEP_TYPES = [
  'APPROVAL',
  'REVIEW',
  'EXECUTION',
  'NOTIFICATION',
  'CONDITION',
  'PARALLEL_SPLIT',
  'PARALLEL_JOIN',
  'WAIT',
] as const;

export const DEFAULT_DEPARTMENTS = [
  'Administration',
  'Academics',
  'Finance',
  'HR',
  'IT',
  'Procurement',
  'Operations',
  'Marketing',
];

export const WORKFLOW_TEMPLATES = [
  {
    name: 'School Admission Workflow',
    description: 'Standard workflow for processing student admissions',
    category: 'Academics',
    steps: [
      { name: 'Application Review', type: 'REVIEW', order: 1 },
      { name: 'Document Verification', type: 'APPROVAL', order: 2 },
      { name: 'Fee Validation', type: 'APPROVAL', order: 3 },
      { name: 'Principal Approval', type: 'APPROVAL', order: 4 },
      { name: 'Enrollment Confirmation', type: 'NOTIFICATION', order: 5 },
    ],
  },
  {
    name: 'Procurement Approval Workflow',
    description: 'Multi-level procurement request approval',
    category: 'Procurement',
    steps: [
      { name: 'Request Submission', type: 'EXECUTION', order: 1 },
      { name: 'Budget Check', type: 'APPROVAL', order: 2 },
      { name: 'Department Head Approval', type: 'APPROVAL', order: 3 },
      { name: 'Finance Validation', type: 'APPROVAL', order: 4 },
      { name: 'Final Approval', type: 'APPROVAL', order: 5 },
    ],
  },
  {
    name: 'Leave Request Workflow',
    description: 'Employee leave request and approval process',
    category: 'HR',
    steps: [
      { name: 'Employee Submission', type: 'EXECUTION', order: 1 },
      { name: 'Team Leader Review', type: 'APPROVAL', order: 2 },
      { name: 'HR Approval', type: 'APPROVAL', order: 3 },
      { name: 'Notification', type: 'NOTIFICATION', order: 4 },
    ],
  },
  {
    name: 'Payment Approval Workflow',
    description: 'Multi-level payment request approval',
    category: 'Finance',
    steps: [
      { name: 'Payment Request', type: 'EXECUTION', order: 1 },
      { name: 'Finance Review', type: 'APPROVAL', order: 2 },
      { name: 'Manager Approval', type: 'APPROVAL', order: 3 },
      { name: 'Director Approval', type: 'APPROVAL', order: 4 },
      { name: 'Payment Processing', type: 'EXECUTION', order: 5 },
    ],
  },
  {
    name: 'Inventory Request Workflow',
    description: 'Stock request and approval process',
    category: 'Inventory',
    steps: [
      { name: 'Request Submission', type: 'EXECUTION', order: 1 },
      { name: 'Stock Check', type: 'APPROVAL', order: 2 },
      { name: 'Store Manager Approval', type: 'APPROVAL', order: 3 },
      { name: 'Dispatch', type: 'EXECUTION', order: 4 },
    ],
  },
  {
    name: 'Event Planning Workflow',
    description: 'End-to-end event planning and execution',
    category: 'Administration',
    steps: [
      { name: 'Event Proposal', type: 'EXECUTION', order: 1 },
      { name: 'Budget Approval', type: 'APPROVAL', order: 2 },
      { name: 'Venue Booking', type: 'EXECUTION', order: 3 },
      { name: 'Vendor Coordination', type: 'EXECUTION', order: 4 },
      { name: 'Final Review', type: 'REVIEW', order: 5 },
      { name: 'Execution', type: 'EXECUTION', order: 6 },
    ],
  },
];
