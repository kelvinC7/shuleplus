export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardSummary {
  organizationId: string;
  organizationName: string;
  status: string;
  kpis: {
    totalEmployees: number;
    activeEmployees: number;
    activeRate: number;
    teachers: number;
    teacherRate: number;
    onLeave: number;
    onLeaveRate: number;
    attendanceRateToday: number;
    attendanceRateMonth: number;
  };
  departmentBreakdown: { name: string; count: number; percentage: number }[];
  genderDistribution: { MALE: number; FEMALE: number; OTHER: number };
  growthTrend: { month: string; hires: number }[];
  alerts: {
    expiringContracts: number;
    missingDocuments: number;
    probationEnding: number;
  };
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  email?: string | null;
  phone: string;
  address?: string | null;
  nationalId?: string | null;
  photoUrl?: string | null;
  departmentId?: string | null;
  department?: string | null;
  categoryId?: string | null;
  category?: string | null;
  position: string;
  contractType: string;
  status: string;
  hireDate: string;
  contractEnd?: string | null;
  ongoingContract: boolean;
  basicSalary?: number | null;
  netSalary?: number | null;
  yearsOfService: number;
  contractStatus: string;
  daysLeft?: number | null;
  isProtected?: boolean;
  hrProfile?: Record<string, unknown>;
  qualifications?: Qualification[];
  documents?: EmployeeDocument[];
}

export interface Qualification {
  id: string;
  level: string;
  field?: string | null;
  institution?: string | null;
  year?: number | null;
  grade?: string | null;
  verified: boolean;
  employeeId?: string;
  employeeName?: string;
  employeeNumber?: string;
}

export interface EmployeeDocument {
  id: string;
  category: string;
  filename: string;
  mimeType?: string | null;
  verified: boolean;
  hasFile?: boolean;
  createdAt?: string;
  employeeId?: string;
  employeeName?: string;
}

export interface DepartmentEmployeePreview {
  id: string;
  name: string;
  position: string;
}

export interface Department {
  id: string;
  name: string;
  code?: string | null;
  headName?: string | null;
  budget?: number | null;
  status: string;
  departmentType?: string | null;
  branch?: string | null;
  parentDepartmentId?: string | null;
  parentDepartment?: string | null;
  employees: number;
  male: number;
  female: number;
  maxEmployees?: number | null;
  openPositions?: number | null;
  capacityPercent?: number | null;
  tags?: string[];
  description?: string | null;
  officialEmail?: string | null;
  phoneNumber?: string | null;
  costCenter?: string | null;
  assistantManager?: string | null;
  accessModules?: string[];
  departmentProfile?: Record<string, unknown>;
  employeePreview?: DepartmentEmployeePreview[];
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentStats {
  totalDepartments: number;
  activeDepartments: number;
  inactiveDepartments: number;
  totalEmployees: number;
  headsAssigned: number;
  openPositions: number;
}

export interface EmploymentCategory {
  id: string;
  name: string;
  description?: string | null;
  employeeCount: number;
  percentage: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  department?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  appliedOn: string;
  reason?: string | null;
}

export interface ContractRow {
  contractId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  contractType: string;
  position: string;
  startDate: string;
  endDate?: string | null;
  ongoingContract: boolean;
  basicSalary?: number | null;
  netSalary?: number | null;
  status: string;
  daysLeft?: number | null;
}

export * from './leave';
