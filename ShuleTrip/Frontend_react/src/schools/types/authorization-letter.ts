export type AuthorizationLetterPayload = {
  authorizationNo: string;
  issuedAt: string;
  issuedByName?: string | null;
  verificationReference: string;
  conditions: string[];
  responsibleAuthority: string;
  trip: {
    id: string;
    reference: string;
    title: string;
    purpose?: string | null;
    destination?: string | null;
    departAt?: string | null;
    returnAt?: string | null;
    status: string;
    tripLeaderName?: string | null;
  };
  school: {
    name: string;
    code?: string | null;
    district?: string | null;
    sector?: string | null;
  };
  counts: { learners: number; staff: number; consentRecorded: number };
  transport: {
    mode?: string | null;
    plateNumber?: string | null;
    vehicleType?: string | null;
    capacity?: number | null;
    driverName?: string | null;
    driverPhone?: string | null;
  } | null;
  finalApproval: {
    id: string;
    stageLabel: string;
    signatureName?: string | null;
    stampReference?: string | null;
    authorityOffice?: string | null;
    decidedAt?: string | null;
    reason?: string | null;
    hasSignatureFile: boolean;
    hasStampFile: boolean;
  } | null;
};
