export interface ProcurementAnalyticsData {
  kpis: {
    totalRequests: number;
    requestedValue: number;
    approvedValue: number;
    purchasedValue: number;
    pendingValue: number;
    rejectedValue: number;
    averageRequest: number;
    completionRate: number;
  };
  pipeline: {
    submitted: number;
    underReview: number;
    approved: number;
    ordered: number;
    received: number;
    completed: number;
  };
  trend: {
    period: string;
    requests: number;
    amount: number;
    approved: number;
    purchased: number;
  }[];
  byCategory: { category: string; total: number; percentage: number }[];
  byDepartment: { department: string; total: number }[];
  topItems: {
    itemName: string;
    requests: number;
    quantity: number;
    requested: number;
    approved: number;
    purchased: number;
  }[];
  alerts: { type: string; message: string; count?: number }[];
  insights: string[];
  budget: {
    annual: number;
    committed: number;
    purchased: number;
    remaining: number;
    utilizationPct: number;
  };
  comparisonNote: string;
}

export interface DepartmentSpendingData {
  kpis: {
    totalDepartments: number;
    totalSpending: number;
    totalApproved: number;
    totalPurchased: number;
    highestSpending: number;
    averageSpend: number;
  };
  ranking: {
    departmentId: string;
    department: string;
    requests: number;
    requested: number;
    approved: number;
    purchased: number;
    utilization: number;
  }[];
  utilization: {
    departmentId: string;
    department: string;
    budget: number;
    requested: number;
    approved: number;
    purchased: number;
    remaining: number;
    utilizationPct: number;
    status: 'healthy' | 'approaching' | 'over';
  }[];
}

export interface DepartmentDetailData {
  topCategories: { category: string; total: number }[];
  topItems: { itemName: string; count: number }[];
  requesters: { name: string; requests: number; value: number; approved: number; purchased: number }[];
  totalRequests: number;
  totalRequested: number;
  totalPurchased: number;
}

export interface RequesterAnalysisData {
  kpis: {
    totalRequesters: number;
    activeRequesters: number;
    totalRequests: number;
    totalRequested: number;
    totalApproved: number;
    totalPurchased: number;
    averageRequest: number;
  };
  topRequesters: {
    requesterId: string;
    name: string;
    department: string;
    requests: number;
    requested: number;
    approved: number;
    purchased: number;
    approvalRate: number;
    rejected: number;
    averageRequest: number;
  }[];
  anomalies: { message: string; requesterId?: string }[];
}

export interface RequesterProfileData {
  name: string;
  department: string;
  requests: number;
  requested: number;
  approved: number;
  purchased: number;
  approvalRate: number;
  rejected: number;
  statusCounts: Record<string, number>;
  monthlyActivity: { month: string; count: number }[];
  topItems: { itemName: string; count: number }[];
  categories: { category: string; total: number; percentage: number }[];
  averageRequestValue: number;
  averageFrequency: number;
}
