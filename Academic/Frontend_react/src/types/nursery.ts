export type NurseryReportKind = 'standard' | 'midterm' | 'beginning';

export type NurseryPerformanceBand = {
  label: string;
  minPercentage: number;
  maxPercentage: number;
  color: string;
};

export type NurseryTemplateSettings = {
  title: string;
  subtitle: string;
  showLogo: boolean;
  showHeaderLines: boolean;
  showStudentPhoto: boolean;
  showStudentDetails: boolean;
  showPerformanceLegend: boolean;
  showTotals: boolean;
  showClassAverage: boolean;
  showPosition: boolean;
  showQR: boolean;
  showTeacherSignature: boolean;
  showHeadTeacherSignature: boolean;
  showStamp: boolean;
  showParentSignature: boolean;
  teacherTitle: string;
  headTeacherName: string;
  headTeacherTitle: string;
  parentLabel: string;
  footerNote: string;
  accentColor: string;
};

export type NurserySettings = {
  performance: NurseryPerformanceBand[];
  template: NurseryTemplateSettings;
  learningAreas: string[];
  defaults: {
    performance: NurseryPerformanceBand[];
    template: NurseryTemplateSettings;
    learningAreas: string[];
  };
};

export type NurseryClassRow = {
  classId: string;
  name: string;
  stream: string | null;
  label: string;
  category: string | null;
  source: 'student-management' | 'academic';
  configured: boolean;
  enabled: boolean;
  templateKey: string;
  configId: string | null;
  configYear: string | null;
  subjectCount: number;
};

export type NurserySubjectRow = {
  subjectId: string;
  subjectName: string;
  learningArea: string;
  maxMark: number;
  isVisible: boolean;
  contributesToTotal: boolean;
  sortOrder: number;
  configId: string | null;
};

export type NurserySubjectsResponse = {
  classId: string;
  className: string;
  academicYear: string;
  learningAreas: string[];
  bands: NurseryPerformanceBand[];
  subjects: NurserySubjectRow[];
};

export type NurseryStudentReportRow = {
  studentId: string;
  name: string;
  studentCode: string | null;
  gender: string | null;
  photoUrl: string | null;
  reportId: string | null;
  status: 'PENDING' | 'GENERATED' | 'PUBLISHED' | string;
  average: number | null;
  totalScore: number | null;
  position: number | null;
  classAverage: number | null;
  generatedAt: string | null;
  publishedAt: string | null;
  hasMarks: boolean;
};

export type NurseryReportsResponse = {
  classId: string;
  className: string;
  academicYear: string;
  term: string;
  reportKind: NurseryReportKind;
  bands: NurseryPerformanceBand[];
  students: NurseryStudentReportRow[];
  stats: {
    totalStudents: number;
    generated: number;
    published: number;
    pending: number;
    generatedTotal: number;
    classAverage: number | null;
  };
};

export type NurseryReportSubject = {
  subjectId: string;
  subjectName: string;
  learningArea: string;
  maxMark: number;
  percentage: number | null;
  score: number | null;
  band: NurseryPerformanceBand | null;
  isVisible: boolean;
  contributesToTotal: boolean;
};

export type NurseryReportSnapshot = {
  kind: 'nursery';
  reportKind?: NurseryReportKind;
  school: {
    name: string;
    logoUrl?: string | null;
    stampUrl?: string | null;
    signatureUrl?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
    motto?: string | null;
    organizationCode?: string | null;
    headerLines?: string[];
    rightLogoUrl?: string | null;
  };
  student: {
    id: string;
    name: string;
    studentCode: string | null;
    gender: string | null;
    photoUrl: string | null;
  };
  class: { id: string; name: string };
  academicYear: string;
  term: string;
  template: NurseryTemplateSettings;
  bands: NurseryPerformanceBand[];
  subjects: NurseryReportSubject[];
  groups: Array<{ learningArea: string; subjects: NurseryReportSubject[] }>;
  totals: {
    totalScore: number | null;
    totalMax: number;
    average: number | null;
    classAverage: number | null;
    position: number | null;
    classSize: number;
  };
  comments: { teacher: string | null; headTeacher: string | null };
  meta: {
    reportNumber: string;
    verificationCode: string;
    verifyUrl: string;
    generatedAt: string;
  };
};

export type NurseryReport = {
  id: string;
  organizationId: string;
  studentId: string;
  classId: string;
  academicYear: string;
  term: string;
  reportKind: NurseryReportKind;
  status: 'GENERATED' | 'PUBLISHED' | string;
  studentName: string | null;
  className: string | null;
  totalScore: number | null;
  average: number | null;
  classAverage: number | null;
  teacherComment: string | null;
  headTeacherComment: string | null;
  verificationCode: string;
  snapshot: NurseryReportSnapshot;
  generatedAt: string;
  generatedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  publishedByName: string | null;
  updatedAt: string;
};
