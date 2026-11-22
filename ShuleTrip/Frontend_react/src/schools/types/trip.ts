export interface TripApprovalFeedback {
  id: string;
  stageKey?: string;
  stageLabel: string;
  decision: string;
  reason?: string | null;
  decidedAt?: string | null;
  decidedByName?: string | null;
  officialRole?: string | null;
  authorityOffice?: string | null;
}

export interface SmStudentRow {
  id: string;
  studentCode: string;
  fullName: string;
  className?: string | null;
  photoUrl?: string | null;
  parentPhone?: string | null;
}

export interface ReadinessReport {
  score: number;
  blockers: Array<{ key: string; label: string; level: string; message: string }>;
  warnings: Array<{ key: string; label: string; level: string; message: string }>;
  advisories: Array<{ key: string; label: string; level: string; message: string }>;
}

export interface TripDetail {
  id: string;
  reference: string;
  title: string;
  purpose?: string | null;
  learningObjectives?: string | null;
  category?: string;
  academicYear?: string | null;
  term?: string | null;
  departAt?: string | null;
  returnAt?: string | null;
  destination?: string | null;
  itinerary?: string | null;
  tripLeaderName?: string | null;
  emergencyContact?: Record<string, string> | null;
  routeDetails?: Record<string, unknown> | null;
  safetyDetails?: Record<string, unknown> | null;
  status: string;
  currentStageKey?: string | null;
  submittedAt?: string | null;
  correctionNote?: string | null;
  correctionDueAt?: string | null;
  wizardStep?: number;
  approvals?: TripApprovalFeedback[];
  participants: Array<{
    studentId: string;
    studentCode?: string | null;
    fullName: string;
    classLabel?: string | null;
    guardianPhone?: string | null;
    guardianEmail?: string | null;
    photoUrl?: string | null;
    guardianConsent: boolean;
  }>;
  staff: Array<{ fullName: string; role: string; isLeader: boolean }>;
  vehicles: Array<{
    mode?: string | null;
    plateNumber?: string | null;
    vehicleType?: string | null;
    capacity?: number | null;
    driverName?: string | null;
    driverPhone?: string | null;
    driverLicenseCategory?: string | null;
    driverLicenseNumber?: string | null;
  }>;
  documents: Array<{
    id?: string;
    documentType: string;
    fileName?: string | null;
    storageKey?: string | null;
    fileSize?: number;
  }>;
  authorizations?: Array<{ authorizationNo: string; issuedAt: string }>;
}
