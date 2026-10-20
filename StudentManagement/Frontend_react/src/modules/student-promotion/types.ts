import type { ApiClass, Enrollment, Student } from '@/types';

export type PromotionMode = 'by_class' | 'select_students';

export type PromotionStep = 'setup' | 'review' | 'result';

export type ValidationIssueType =
  | 'already_promoted'
  | 'already_enrolled'
  | 'missing_class'
  | 'withdrawn'
  | 'inactive';

export interface ValidationIssue {
  type: ValidationIssueType;
  message: string;
}

export interface PromotionCandidate {
  student: Student;
  enrollment: Enrollment;
  sourceClass: ApiClass;
  targetClassId: string | null;
  targetClass: ApiClass | null;
  issue: ValidationIssue | null;
}

export interface PromotionStats {
  total: number;
  promoted: number;
  pending: number;
  notPromoted: number;
}

export interface PromotionResult {
  success: PromotionCandidate[];
  skipped: { candidate: PromotionCandidate; reason: string }[];
  review: PromotionCandidate[];
}

export interface PromotionRecord {
  id: string;
  organizationId: string;
  studentId: string;
  classId: string;
  academicYear: string;
  status: string;
  isCurrent: boolean;
  promotedToClassId: string | null;
  promotedToYear: string | null;
  createdAt: string;
  updatedAt: string;
  student: import('@/types').Student;
  class: import('@/types').ApiClass;
  promotedToClass: import('@/types').ApiClass | null;
}

export interface PromotionDetail {
  promotion: PromotionRecord;
  newEnrollment: import('@/types').Enrollment | null;
}

export interface PromotionGroup {
  id: string;
  fromClassId: string;
  toClassId: string;
  fromYear: string;
  toYear: string;
  fromClass: import('@/types').ApiClass;
  toClass: import('@/types').ApiClass | null;
  studentCount: number;
  records: PromotionRecord[];
  updatedAt: string;
}

export interface PromotionRule {
  from: string;
  to: string;
}
