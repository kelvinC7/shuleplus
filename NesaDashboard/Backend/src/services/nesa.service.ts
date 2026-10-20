/** In-memory mock data for the NESA national dashboard. */

export interface Province {
  id: string;
  code: string;
  name: string;
  districtCount: number;
}

export interface District {
  id: string;
  provinceId: string;
  code: string;
  name: string;
  sectorCount: number;
}

export interface Sector {
  id: string;
  districtId: string;
  code: string;
  name: string;
}

export interface AcademicYear {
  id: string;
  label: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
}

export interface FeePolicy {
  id: string;
  name: string;
  ownership: 'GOVERNMENT' | 'GOVERNMENT_AIDED' | 'PRIVATE';
  level: string;
  maxAnnualFeeRwf: number;
  academicYearId: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
}

export interface SchoolSummary {
  id: string;
  code: string;
  name: string;
  province: string;
  district: string;
  sector: string;
  ownership: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  studentCount: number;
  complianceScore: number;
}

export interface CircularSummary {
  id: string;
  title: string;
  schoolName: string;
  district: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  academicYear: string;
  submittedAt: string | null;
}

export interface ApprovalItem {
  id: string;
  circularId: string;
  schoolName: string;
  stage: 'DISTRICT' | 'PROVINCE' | 'NESA';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  assignee?: string;
}

const provinces: Province[] = [
  { id: 'prov-1', code: 'KIG', name: 'Kigali City', districtCount: 3 },
  { id: 'prov-2', code: 'EAS', name: 'Eastern Province', districtCount: 7 },
  { id: 'prov-3', code: 'NOR', name: 'Northern Province', districtCount: 5 },
  { id: 'prov-4', code: 'SOU', name: 'Southern Province', districtCount: 8 },
  { id: 'prov-5', code: 'WES', name: 'Western Province', districtCount: 7 },
];

const districts: District[] = [
  { id: 'dist-1', provinceId: 'prov-1', code: 'GAS', name: 'Gasabo', sectorCount: 15 },
  { id: 'dist-2', provinceId: 'prov-1', code: 'KIC', name: 'Kicukiro', sectorCount: 10 },
  { id: 'dist-3', provinceId: 'prov-1', code: 'NYR', name: 'Nyarugenge', sectorCount: 10 },
  { id: 'dist-4', provinceId: 'prov-2', code: 'BUG', name: 'Bugesera', sectorCount: 15 },
  { id: 'dist-5', provinceId: 'prov-2', code: 'KAY', name: 'Kayonza', sectorCount: 12 },
  { id: 'dist-6', provinceId: 'prov-3', code: 'MUS', name: 'Musanze', sectorCount: 15 },
  { id: 'dist-7', provinceId: 'prov-4', code: 'HUY', name: 'Huye', sectorCount: 14 },
  { id: 'dist-8', provinceId: 'prov-5', code: 'RUB', name: 'Rubavu', sectorCount: 12 },
];

const sectors: Sector[] = [
  { id: 'sec-1', districtId: 'dist-1', code: 'REM', name: 'Remera' },
  { id: 'sec-2', districtId: 'dist-1', code: 'KIM', name: 'Kimironko' },
  { id: 'sec-3', districtId: 'dist-2', code: 'GAT', name: 'Gatenga' },
  { id: 'sec-4', districtId: 'dist-3', code: 'NYA', name: 'Nyamirambo' },
  { id: 'sec-5', districtId: 'dist-6', code: 'MUHO', name: 'Muhoza' },
  { id: 'sec-6', districtId: 'dist-7', code: 'NGO', name: 'Ngoma' },
  { id: 'sec-7', districtId: 'dist-8', code: 'GISE', name: 'Gisenyi' },
  { id: 'sec-8', districtId: 'dist-4', code: 'NYAMA', name: 'Nyamata' },
];

const academicYears: AcademicYear[] = [
  {
    id: 'ay-2024',
    label: '2024-2025',
    startsOn: '2024-09-01',
    endsOn: '2025-07-31',
    isCurrent: false,
  },
  {
    id: 'ay-2025',
    label: '2025-2026',
    startsOn: '2025-09-01',
    endsOn: '2026-07-31',
    isCurrent: true,
  },
  {
    id: 'ay-2026',
    label: '2026-2027',
    startsOn: '2026-09-01',
    endsOn: '2027-07-31',
    isCurrent: false,
  },
];

const feePolicies: FeePolicy[] = [
  {
    id: 'fp-1',
    name: 'Government Primary Cap',
    ownership: 'GOVERNMENT',
    level: 'Primary',
    maxAnnualFeeRwf: 0,
    academicYearId: 'ay-2025',
    status: 'ACTIVE',
  },
  {
    id: 'fp-2',
    name: 'Government Aided Secondary Cap',
    ownership: 'GOVERNMENT_AIDED',
    level: 'Secondary',
    maxAnnualFeeRwf: 150000,
    academicYearId: 'ay-2025',
    status: 'ACTIVE',
  },
  {
    id: 'fp-3',
    name: 'Private Secondary Guideline',
    ownership: 'PRIVATE',
    level: 'Secondary',
    maxAnnualFeeRwf: 2500000,
    academicYearId: 'ay-2025',
    status: 'ACTIVE',
  },
  {
    id: 'fp-4',
    name: 'Private Nursery Draft Cap',
    ownership: 'PRIVATE',
    level: 'Nursery',
    maxAnnualFeeRwf: 800000,
    academicYearId: 'ay-2026',
    status: 'DRAFT',
  },
];

const schools: SchoolSummary[] = [
  {
    id: 'sch-1',
    code: 'GS-GAS-001',
    name: 'GS Remera',
    province: 'Kigali City',
    district: 'Gasabo',
    sector: 'Remera',
    ownership: 'GOVERNMENT',
    status: 'ACTIVE',
    studentCount: 1240,
    complianceScore: 96,
  },
  {
    id: 'sch-2',
    code: 'PRIV-KIC-014',
    name: 'Green Hills Academy',
    province: 'Kigali City',
    district: 'Kicukiro',
    sector: 'Gatenga',
    ownership: 'PRIVATE',
    status: 'ACTIVE',
    studentCount: 2100,
    complianceScore: 88,
  },
  {
    id: 'sch-3',
    code: 'GA-MUS-003',
    name: 'Ecole des Sciences de Musanze',
    province: 'Northern Province',
    district: 'Musanze',
    sector: 'Muhoza',
    ownership: 'GOVERNMENT_AIDED',
    status: 'ACTIVE',
    studentCount: 980,
    complianceScore: 91,
  },
  {
    id: 'sch-4',
    code: 'GS-HUY-007',
    name: 'GS Butare',
    province: 'Southern Province',
    district: 'Huye',
    sector: 'Ngoma',
    ownership: 'GOVERNMENT',
    status: 'PENDING',
    studentCount: 1560,
    complianceScore: 72,
  },
  {
    id: 'sch-5',
    code: 'PRIV-RUB-022',
    name: 'Lake Kivu International',
    province: 'Western Province',
    district: 'Rubavu',
    sector: 'Gisenyi',
    ownership: 'PRIVATE',
    status: 'SUSPENDED',
    studentCount: 640,
    complianceScore: 54,
  },
];

const circulars: CircularSummary[] = [
  {
    id: 'cir-1',
    title: 'Fee schedule 2025-2026 — GS Remera',
    schoolName: 'GS Remera',
    district: 'Gasabo',
    status: 'PUBLISHED',
    academicYear: '2025-2026',
    submittedAt: '2025-08-12T10:00:00.000Z',
  },
  {
    id: 'cir-2',
    title: 'Fee schedule 2025-2026 — Green Hills',
    schoolName: 'Green Hills Academy',
    district: 'Kicukiro',
    status: 'SUBMITTED',
    academicYear: '2025-2026',
    submittedAt: '2025-08-20T14:30:00.000Z',
  },
  {
    id: 'cir-3',
    title: 'Fee schedule 2025-2026 — Musanze Sciences',
    schoolName: 'Ecole des Sciences de Musanze',
    district: 'Musanze',
    status: 'APPROVED',
    academicYear: '2025-2026',
    submittedAt: '2025-08-15T09:15:00.000Z',
  },
  {
    id: 'cir-4',
    title: 'Fee schedule 2025-2026 — GS Butare',
    schoolName: 'GS Butare',
    district: 'Huye',
    status: 'DRAFT',
    academicYear: '2025-2026',
    submittedAt: null,
  },
  {
    id: 'cir-5',
    title: 'Fee schedule 2024-2025 — Lake Kivu Int.',
    schoolName: 'Lake Kivu International',
    district: 'Rubavu',
    status: 'REJECTED',
    academicYear: '2024-2025',
    submittedAt: '2024-09-01T11:00:00.000Z',
  },
];

const approvals: ApprovalItem[] = [
  {
    id: 'apr-1',
    circularId: 'cir-2',
    schoolName: 'Green Hills Academy',
    stage: 'NESA',
    status: 'PENDING',
    submittedAt: '2025-08-20T14:30:00.000Z',
    assignee: 'NESA Review Desk',
  },
  {
    id: 'apr-2',
    circularId: 'cir-3',
    schoolName: 'Ecole des Sciences de Musanze',
    stage: 'PROVINCE',
    status: 'APPROVED',
    submittedAt: '2025-08-15T09:15:00.000Z',
  },
  {
    id: 'apr-3',
    circularId: 'cir-5',
    schoolName: 'Lake Kivu International',
    stage: 'DISTRICT',
    status: 'REJECTED',
    submittedAt: '2024-09-01T11:00:00.000Z',
    assignee: 'Rubavu DEO',
  },
];

export class NesaService {
  getDashboard() {
    const activeSchools = schools.filter((s) => s.status === 'ACTIVE').length;
    const pendingApprovals = approvals.filter((a) => a.status === 'PENDING').length;
    const publishedCirculars = circulars.filter((c) => c.status === 'PUBLISHED').length;
    const avgCompliance =
      schools.reduce((sum, s) => sum + s.complianceScore, 0) / (schools.length || 1);

    return {
      generatedAt: new Date().toISOString(),
      academicYear: academicYears.find((y) => y.isCurrent)?.label ?? '2025-2026',
      kpis: {
        totalSchools: schools.length,
        activeSchools,
        suspendedSchools: schools.filter((s) => s.status === 'SUSPENDED').length,
        pendingRegistrations: schools.filter((s) => s.status === 'PENDING').length,
        totalStudents: schools.reduce((sum, s) => sum + s.studentCount, 0),
        publishedCirculars,
        pendingApprovals,
        averageComplianceScore: Math.round(avgCompliance * 10) / 10,
        feePolicyCoveragePct: 87.5,
        nesaCapViolations: 3,
      },
      byOwnership: [
        { ownership: 'GOVERNMENT', schools: 2, students: 2800 },
        { ownership: 'GOVERNMENT_AIDED', schools: 1, students: 980 },
        { ownership: 'PRIVATE', schools: 2, students: 2740 },
      ],
      byProvince: provinces.map((p) => ({
        province: p.name,
        schools: schools.filter((s) => s.province === p.name).length,
        avgCompliance:
          Math.round(
            (schools
              .filter((s) => s.province === p.name)
              .reduce((sum, s) => sum + s.complianceScore, 0) /
              (schools.filter((s) => s.province === p.name).length || 1)) *
              10
          ) / 10,
      })),
      recentActivity: [
        {
          id: 'act-1',
          type: 'APPROVAL_PENDING',
          message: 'Green Hills Academy fee circular awaiting NESA review',
          at: '2025-08-20T14:30:00.000Z',
        },
        {
          id: 'act-2',
          type: 'CIRCULAR_PUBLISHED',
          message: 'GS Remera published 2025-2026 fee schedule',
          at: '2025-08-12T10:00:00.000Z',
        },
        {
          id: 'act-3',
          type: 'POLICY_UPDATED',
          message: 'Government Aided Secondary Cap updated for 2025-2026',
          at: '2025-07-28T08:00:00.000Z',
        },
      ],
      complianceTrend: [
        { month: '2025-03', score: 82 },
        { month: '2025-04', score: 84 },
        { month: '2025-05', score: 86 },
        { month: '2025-06', score: 87 },
        { month: '2025-07', score: 89 },
        { month: '2025-08', score: 90 },
      ],
    };
  }

  listSchools(query: Record<string, string | undefined> = {}) {
    let items = [...schools];
    if (query.province) {
      items = items.filter((s) => s.province.toLowerCase() === query.province!.toLowerCase());
    }
    if (query.district) {
      items = items.filter((s) => s.district.toLowerCase() === query.district!.toLowerCase());
    }
    if (query.status) {
      items = items.filter((s) => s.status === query.status!.toUpperCase());
    }
    return { items, total: items.length };
  }

  listCirculars(query: Record<string, string | undefined> = {}) {
    let items = [...circulars];
    if (query.status) {
      items = items.filter((c) => c.status === query.status!.toUpperCase());
    }
    return { items, total: items.length };
  }

  listApprovals(query: Record<string, string | undefined> = {}) {
    let items = [...approvals];
    if (query.status) {
      items = items.filter((a) => a.status === query.status!.toUpperCase());
    }
    if (query.stage) {
      items = items.filter((a) => a.stage === query.stage!.toUpperCase());
    }
    return { items, total: items.length };
  }

  listProvinces() {
    return { items: provinces, total: provinces.length };
  }

  listDistricts(query: Record<string, string | undefined> = {}) {
    let items = [...districts];
    if (query.provinceId) {
      items = items.filter((d) => d.provinceId === query.provinceId);
    }
    return { items, total: items.length };
  }

  listSectors(query: Record<string, string | undefined> = {}) {
    let items = [...sectors];
    if (query.districtId) {
      items = items.filter((s) => s.districtId === query.districtId);
    }
    return { items, total: items.length };
  }

  listAcademicYears() {
    return { items: academicYears, total: academicYears.length };
  }

  listFeePolicies(query: Record<string, string | undefined> = {}) {
    let items = [...feePolicies];
    if (query.status) {
      items = items.filter((p) => p.status === query.status!.toUpperCase());
    }
    if (query.academicYearId) {
      items = items.filter((p) => p.academicYearId === query.academicYearId);
    }
    return { items, total: items.length };
  }
}

export const nesaService = new NesaService();
