export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export type BudgetStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'closed';

export interface IncomeDeduction {
  label?: string;
  amount?: number;
}

export interface IncomeConfig {
  calculationType?: 'fixed' | 'per_student' | string;
  quantity?: number;
  unitAmount?: number;
  deductions?: IncomeDeduction[];
}

export interface BudgetIncomeSource {
  id?: string;
  incomeSourceKey: string;
  expectedAmountRwf: number;
  configJson?: IncomeConfig | null;
}

export interface BudgetLine {
  id: string;
  budgetId: string;
  lineName: string;
  category: string;
  department: string;
  priority?: string | null;
  plannedAmountRwf: number;
  usedAmountRwf: number;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  isFrozen: boolean;
  remainingRwf?: number;
  usagePercent?: number;
  severity?: string;
  createdAt?: string;
  updatedAt?: string;
  usages?: BudgetLineUsage[];
}

export interface BudgetLineUsage {
  id: string;
  budgetLineId: string;
  amountRwf: number;
  usageDate: string;
  expenseCategory?: string | null;
  paymentMethod?: string | null;
  paymentBankName?: string | null;
  paymentPhone?: string | null;
  description?: string | null;
  receiptName?: string | null;
  source?: string | null;
  createdById?: string | null;
  createdAt?: string;
  budgetLine?: {
    id: string;
    lineName: string;
    department: string;
    category: string;
    budgetId: string;
  };
}

export interface SchoolBudget {
  id: string;
  organizationId: string;
  budgetCode: string;
  title: string;
  academicYear: string;
  term: string;
  budgetType: string;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  preparedByName?: string | null;
  status: BudgetStatus;
  totalExpectedIncomeRwf: number;
  totalAllocatedRwf: number;
  unallocatedRwf?: number;
  totalSpentRwf?: number;
  availableRwf?: number;
  allocationPercent?: number;
  submittedAt?: string | null;
  managerReviewedByName?: string | null;
  managerReviewedAt?: string | null;
  managerNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  incomeSources?: BudgetIncomeSource[];
  lines?: BudgetLine[];
}

export interface DashboardKpis {
  expected: number;
  allocated: number;
  spent: number;
  available: number;
  unallocated: number;
  budgets: number;
  pending: number;
}

export interface DepartmentAgg {
  label?: string;
  department?: string;
  planned: number;
  used: number;
  remaining?: number;
  lines?: number;
  usagePercent?: number;
}

export interface CategoryAgg {
  label: string;
  planned: number;
  used: number;
}

export interface BudgetAlert {
  lineId: string;
  lineName: string;
  severity: string;
  used: number;
  planned: number;
}

export interface DashboardSummary {
  organizationName?: string;
  activeBudgetId: string | null;
  budget?: SchoolBudget;
  kpis: DashboardKpis;
  byDepartment: DepartmentAgg[];
  byCategory: CategoryAgg[];
  alerts: BudgetAlert[];
  recentBudgets: SchoolBudget[];
  lines: BudgetLine[];
}

export interface BudgetOptions {
  budgetTypes: string[];
  terms: string[];
  statuses: string[];
  incomePresets: string[];
  categories: string[];
  departments: string[];
  academicYears: string[];
  currentAcademicYear?: string | null;
  currentTerm?: string | null;
  nextCode: string;
}

export interface LineOptions {
  categories: string[];
  departments: string[];
  paymentMethods: string[];
  priorities: string[];
}

export interface LinesSummary {
  totals: {
    planned: number;
    used: number;
    remaining: number;
    lines: number;
    frozen: number;
  };
  lines: BudgetLine[];
}

export interface VsActualRow {
  id: string;
  lineName: string;
  category: string;
  department: string;
  planned: number;
  actual: number;
  variance: number;
  variancePercent: number;
  severity: string;
  isFrozen: boolean;
}

export interface ManagerOverview {
  pending: SchoolBudget[];
  approved: SchoolBudget[];
  counts: {
    pending: number;
    approved: number;
    rejected: number;
  };
}

export interface AuditLog {
  id: string;
  organizationId: string;
  budgetId?: string | null;
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  details?: unknown;
  createdAt: string;
}

export interface AnalyticsData {
  kpis: DashboardKpis;
  byDepartment: DepartmentAgg[];
  byCategory: CategoryAgg[];
  alerts: BudgetAlert[];
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CreateBudgetPayload {
  title: string;
  academicYear: string;
  term: string;
  budgetType: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  preparedByName?: string;
  submit?: boolean;
  incomeSources: Array<{
    incomeSourceKey: string;
    expectedAmountRwf?: number;
    configJson?: IncomeConfig | null;
  }>;
}

export interface CreateLinePayload {
  budgetId: string;
  lineName: string;
  category: string;
  department: string;
  priority?: string;
  plannedAmountRwf: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface CreateUsagePayload {
  budgetLineId: string;
  amountRwf: number;
  usageDate?: string;
  expenseCategory?: string;
  paymentMethod?: string;
  paymentBankName?: string;
  paymentPhone?: string;
  description?: string;
  receiptName?: string;
}
