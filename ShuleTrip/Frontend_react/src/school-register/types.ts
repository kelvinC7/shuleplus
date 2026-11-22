import type { UploadedFileMeta } from '@/components/ui/file-upload';

export type RegistrationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under Review'
  | 'Additional Information Required'
  | 'Approved'
  | 'Rejected'
  | 'Suspended';

export type SchoolRegisterForm = {
  step1: {
    officialName: string;
    schoolCode: string;
    rebNumber: string;
    levels: string[];
    ownership: string;
    schoolType: string;
    email: string;
    phone: string;
    website: string;
  };
  step2: {
    country: string;
    provinceId: string;
    provinceName: string;
    districtId: string;
    districtName: string;
    sectorId: string;
    sectorName: string;
    cellId: string;
    cellName: string;
    village: string;
    physicalAddress: string;
    gps: string;
  };
  step3: {
    headName: string;
    headPosition: string;
    headNationalId: string;
    headPhone: string;
    headEmail: string;
    coordinatorName: string;
    coordinatorPosition: string;
    coordinatorPhone: string;
    coordinatorEmail: string;
  };
  step4: {
    regCertificate: UploadedFileMeta | null;
    schoolIdDoc: UploadedFileMeta | null;
    authLetter: UploadedFileMeta | null;
    headIdDoc: UploadedFileMeta | null;
    stampSignature: UploadedFileMeta | null;
  };
  step5: {
    accountEmail: string;
    username: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
    acceptPrivacy: boolean;
  };
};

export type RegistrationSubmission = {
  reference: string;
  schoolName: string;
  submittedAt: string;
  status: RegistrationStatus;
  form: SchoolRegisterForm;
  confirmationEmailSent?: boolean;
};

export const EMPTY_FORM: SchoolRegisterForm = {
  step1: {
    officialName: '',
    schoolCode: '',
    rebNumber: '',
    levels: [],
    ownership: '',
    schoolType: '',
    email: '',
    phone: '',
    website: '',
  },
  step2: {
    country: 'Rwanda',
    provinceId: '',
    provinceName: '',
    districtId: '',
    districtName: '',
    sectorId: '',
    sectorName: '',
    cellId: '',
    cellName: '',
    village: '',
    physicalAddress: '',
    gps: '',
  },
  step3: {
    headName: '',
    headPosition: 'Head Teacher',
    headNationalId: '',
    headPhone: '',
    headEmail: '',
    coordinatorName: '',
    coordinatorPosition: 'ShuleTrip Coordinator',
    coordinatorPhone: '',
    coordinatorEmail: '',
  },
  step4: {
    regCertificate: null,
    schoolIdDoc: null,
    authLetter: null,
    headIdDoc: null,
    stampSignature: null,
  },
  step5: {
    accountEmail: '',
    username: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptPrivacy: false,
  },
};

export const DRAFT_KEY = 'shuletrip-school-register-draft';
