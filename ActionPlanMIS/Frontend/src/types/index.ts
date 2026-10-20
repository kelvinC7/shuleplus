export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface OrganizationProfile {
  organizationId: string;
  organizationCode: string | null;
  schoolName: string;
  email: string | null;
  phone: string | null;
  poBox: string | null;
  website: string | null;
  address: string | null;
  country: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  cell: string | null;
  village: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
  ownershipType: string | null;
  schoolCategory: string | null;
  schoolProgram: string | null;
  educationLevels: string[];
  academicYear: string | null;
  curriculum: string | null;
  schoolMotto: string | null;
  description: string | null;
  schoolShift: string | null;
  principalName: string | null;
  deputyHeadName: string | null;
  bursarName: string | null;
  secretaryName: string | null;
  leadershipPhone: string | null;
  leadershipEmail: string | null;
}

export interface DashboardSummary {
  organizationId: string;
  organizationName: string;
  status: string;
  total: number;
  active: number;
  completed: number;
  delayed: number;
  overdue?: number;
  cancelled: number;
  draft: number;
  pendingApproval: number;
  notStarted?: number;
  inProgress?: number;
  highPriority?: number;
  dueThisMonth?: number;
  totalAnnualObjectives?: number;
  totalActivities?: number;
  completedActivities?: number;
  activitiesDueThisMonth?: number;
  totalBudget: number;
  totalSpent: number;
  remainingBudget?: number;
  avgProgress: number;
  totalTasks: number;
  completedTasks: number;
  pillarProgress?: { name: string; count: number; averageProgress: number; completed: number }[];
  monthlyImplementation?: { month: string; completed: number; created: number }[];
  plannedVsAchieved?: { name: string; target: number; achieved: number; performance: number; unit: string }[];
  delayedActivityAlerts?: {
    id: string;
    title: string;
    planTitle: string;
    dueDate?: string | Date | null;
    progress: number;
    status: string;
    owner?: string | null;
  }[];
  upcomingDeadlines: { id: string; title: string; dueDate: string; progress: number; priority: string }[];
  departmentPerformance: { name: string; count: number; averageProgress: number; completed: number }[];
  priorityDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  recentActivities: AuditLog[];
  approvalQueue: ApprovalQueueItem[];
  riskHeatMap: { low: number; medium: number; high: number; critical: number };
  budgetUtilization: { title: string; budget: number; spent: number; utilization: number }[];
  monthlyActivity: { createdAt: Date; _count: { id: number } }[];
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface ApprovalQueueItem {
  id: string;
  actionPlanId: string;
  level: number;
  role: string;
  status: string;
  actionPlan: { id?: string; title: string; department?: string; priority: string };
}

export interface ActionPlan {
  id: string;
  title: string;
  description?: string;
  categoryId?: string;
  category?: { id: string; name: string; color: string };
  department?: string;
  priority: string;
  responsiblePerson?: string;
  teamMembers: string[];
  startDate: string;
  dueDate: string;
  budget: number;
  actualCost: number;
  expectedOutcome?: string;
  progress: number;
  status: string;
  version: number;
  strategicGoalId?: string;
  objectiveId?: string;
  periodType?: string;
  periodYear?: number;
  periodQuarter?: number;
  periodMonth?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  tasks: ActionPlanTask[];
  comments: ActionPlanComment[];
  attachments: ActionPlanAttachment[];
  milestones: Milestone[];
  budgets: Budget[];
  risks: Risk[];
  issues: Issue[];
  kpis: Kpi[];
  expenses?: Expense[];
  approvals: ActionPlanApproval[];
  statusHistory: StatusHistoryEntry[];
  assignments: ActionPlanAssignment[];
  resourceAllocations: ResourceAllocation[];
  _count?: { comments: number; attachments: number };
}

export interface ActionPlanTask {
  id: string;
  actionPlanId: string;
  parentId?: string;
  title: string;
  description?: string;
  owner?: string;
  startDate?: string;
  dueDate?: string;
  progress: number;
  status: string;
  sortOrder: number;
  estimatedHours?: number;
  actualHours?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  subtasks: ActionPlanTask[];
  dependencies: TaskDependency[];
  dependents: TaskDependency[];
  assignments: ActionPlanAssignment[];
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnId: string;
  type: string;
  lagDays: number;
}

export interface ActionPlanComment {
  id: string;
  actionPlanId: string;
  parentId?: string;
  content: string;
  author?: string;
  mentions: string[];
  reactions: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
  replies: ActionPlanComment[];
}

export interface ActionPlanAttachment {
  id: string;
  filename: string;
  originalName?: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
  category?: string;
  taskId?: string;
  uploadedBy?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface Milestone {
  id: string;
  actionPlanId: string;
  title: string;
  description?: string;
  targetDate: string;
  completedDate?: string;
  responsiblePerson?: string;
  evidence?: string;
  progress: number;
  isCompleted: boolean;
  sortOrder: number;
}

export interface Budget {
  id: string;
  actionPlanId: string;
  category: string;
  allocated: number;
  spent: number;
  committed: number;
  currency: string;
  fiscalYear?: number;
}

export interface Expense {
  id: string;
  actionPlanId: string;
  category: string;
  description?: string;
  amount: number;
  expenseDate: string;
  paidTo?: string;
  receiptUrl?: string;
  receiptNumber?: string;
  fundingSource?: string;
  budgetLineId?: string;
  budgetLineLabel?: string;
  status: string;
}

export interface BudgetLine {
  id: string;
  label: string;
  category?: string;
  allocated?: number;
  spent?: number;
  budgetId?: string;
}

export interface PeriodReview {
  id: string;
  reviewType: string;
  periodYear: number;
  periodMonth?: number;
  periodQuarter?: number;
  planned?: string;
  completed?: string;
  delayed?: string;
  reason?: string;
  corrective?: string;
  newDeadline?: string;
  responsible?: string;
  createdBy?: string;
  createdAt: string;
}

export interface ApPermissionsInfo {
  roles: string[];
  primaryRole: string;
}

export interface Risk {
  id: string;
  actionPlanId: string;
  title: string;
  description?: string;
  category?: string;
  impact: string;
  probability: string;
  mitigation?: string;
  contingency?: string;
  owner?: string;
  status: string;
}

export interface Issue {
  id: string;
  actionPlanId: string;
  title: string;
  description?: string;
  severity: string;
  priority: string;
  assignedTo?: string;
  resolution?: string;
  status: string;
  resolvedAt?: string;
}

export interface Kpi {
  id: string;
  actionPlanId: string;
  name: string;
  description?: string;
  target: number;
  currentValue: number;
  unit: string;
  trend: string;
  measurementDate?: string;
}

export interface ActionPlanApproval {
  id: string;
  actionPlanId: string;
  level: number;
  approverId?: string;
  approverName?: string;
  role?: string;
  status: string;
  comments?: string;
  digitalSignature?: string;
  signedAt?: string;
  createdAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus?: string;
  toStatus: string;
  changedBy?: string;
  reason?: string;
  createdAt: string;
}

export interface ActionPlanAssignment {
  id: string;
  actionPlanId?: string;
  taskId?: string;
  assigneeId: string;
  assigneeName?: string;
  assignmentType: string;
  assignedBy?: string;
  acceptedAt?: string;
  progress: number;
  task?: ActionPlanTask;
}

export interface ResourceAllocation {
  id: string;
  actionPlanId: string;
  resourceType: string;
  resourceName: string;
  quantity: number;
  allocatedFrom: string;
  allocatedTo?: string;
  cost: number;
  status: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sortOrder: number;
  _count?: { actionPlans: number };
}

export interface Meeting {
  id: string;
  actionPlanId?: string;
  title: string;
  description?: string;
  agenda: string[];
  location?: string;
  meetingDate: string;
  startTime?: string;
  endTime?: string;
  participants: string[];
  status: string;
  minutes: MeetingMinute[];
}

export interface MeetingMinute {
  id: string;
  meetingId: string;
  content: string;
  author?: string;
  decision: boolean;
  actionItem?: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  type: string;
  categoryId?: string;
  ownership: 'official' | 'school' | 'personal';
  templateData: TemplateData;
  isDefault: boolean;
  isOfficial?: boolean;
  officialSlug?: string;
  sourcePlanId?: string;
  schoolType?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface TemplateData {
  goals?: string[];
  objectives?: string[];
  suggestedActivities?: { title: string; defaultSelected?: boolean; frequency?: string; verification?: string }[];
  suggestedKpis?: { name: string; baseline?: number; target: number; unit: string }[];
  evidenceRequirements?: string[];
  suggestedTimelineMonths?: number;
  budgetCategories?: string[];
  strategicPillars?: string[];
  schoolTypes?: string[];
  sourcePlanTitle?: string;
}

export interface TemplateCategory {
  id: string;
  label: string;
  icon: string;
  count: number;
}

export interface TemplateCatalog {
  categories: TemplateCategory[];
  schoolTemplates: number;
  personalTemplates: number;
  totalOfficial: number;
}

export interface TemplateRecommendation {
  templateId?: string;
  slug: string;
  name: string;
  categoryId: string;
  metricLabel: string;
  currentValue: number | string;
  targetValue: number | string;
  unit: string;
  severity: 'high' | 'medium' | 'low';
  reason: string;
}

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  message?: string;
  type: string;
  referenceType?: string;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}
