import { env } from '../config/env';
import { AppError } from '../middleware/error.middleware';

export interface StudentManagementStudent {
  id: string;
  studentCode: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender: 'M' | 'F' | null;
  photoUrl: string | null;
  classId: string | null;
  className: string | null;
  stream: string | null;
  rollNumber: string;
  status: string;
  educationLevel?: string | null;
}

export interface StudentManagementStudentLink {
  studentId: string | null;
  studentCode: string | null;
  studentName: string | null;
  className: string | null;
  role: 'FATHER' | 'MOTHER' | 'GUARDIAN';
}

export interface StudentManagementParent {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  occupation: string | null;
  address: string | null;
  students: StudentManagementStudentLink[];
}

export interface StudentManagementLookupResult {
  id: string;
  organizationId: string;
  studentUid: string;
  shuleCode?: string | null;
  studentCode: string | null;
  sdmCode: string | null;
  registrationNumber: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | null;
  photoUrl: string | null;
  status: string;
  schoolName: string;
  schoolCode?: string | null;
  organizationCode?: string | null;
  district?: string | null;
  province?: string | null;
  sector?: string | null;
  className: string | null;
  classLabel: string | null;
  classId: string | null;
  educationLevel?: string | null;
  academicYear: string | null;
  term: string | null;
  parents: Array<{
    role: 'FATHER' | 'MOTHER' | 'GUARDIAN';
    name: string;
    phone: string | null;
    email: string | null;
  }>;
  outstandingBalance: number | null;
  lastPayment: { amount: number; date: string; reference: string } | null;
}

/** Outbound client: pulls student + parent master data from Student Management. */
export class StudentManagementClient {
  private base = env.STUDENT_MANAGEMENT_API_URL.replace(/\/$/, '');

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}${qs}`, {
        headers: {
          'x-service-key': env.SERVICE_API_KEY,
          Accept: 'application/json',
        },
      });
    } catch {
      throw new AppError(
        502,
        'Student Management module unreachable — check STUDENT_MANAGEMENT_API_URL (default http://localhost:3052/api) and that the service is running.'
      );
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AppError(502, `Student Management sync failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { data: T };
    return json.data;
  }

  async listStudents(organizationId: string): Promise<StudentManagementStudent[]> {
    return this.get<StudentManagementStudent[]>('/service/students', {
      organizationId,
      status: 'ACTIVE',
    });
  }

  async searchStudents(organizationId: string, search: string): Promise<StudentManagementStudent[]> {
    return this.get<StudentManagementStudent[]>('/service/students', {
      organizationId,
      status: 'ACTIVE',
      search,
    });
  }

  async listParents(organizationId: string): Promise<StudentManagementParent[]> {
    return this.get<StudentManagementParent[]>('/service/parents', { organizationId });
  }

  async parentsForStudent(organizationId: string, studentId: string): Promise<StudentManagementParent[]> {
    return this.get<StudentManagementParent[]>('/service/parents', { organizationId, studentId });
  }

  async lookupByCode(code: string): Promise<StudentManagementLookupResult> {
    const qs = `?${new URLSearchParams({ code }).toString()}`;
    let res: Response;
    try {
      res = await fetch(`${this.base}/public/students/lookup${qs}`, {
        headers: { Accept: 'application/json' },
      });
    } catch {
      throw new AppError(
        502,
        'Student Management module unreachable — check STUDENT_MANAGEMENT_API_URL (default http://localhost:3052/api) and that the service is running.'
      );
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AppError(502, `Student lookup failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as { data: StudentManagementLookupResult };
    return json.data;
  }

  async claimParent(data: {
    studentCode: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    role: 'FATHER' | 'MOTHER' | 'GUARDIAN';
  }) {
    let res: Response;
    try {
      res = await fetch(`${this.base}/public/parents/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      throw new AppError(
        502,
        'Student Management module unreachable — check STUDENT_MANAGEMENT_API_URL (default http://localhost:3052/api) and that the service is running.'
      );
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new AppError(502, `Parent claim failed (${res.status}): ${text}`);
    }
    const json = (await res.json()) as {
      data: {
        studentId: string;
        organizationId: string;
        parentId: string;
        fullName: string;
        phone: string | null;
        email: string | null;
        role: 'FATHER' | 'MOTHER' | 'GUARDIAN';
      };
    };
    return json.data;
  }
}

export const studentManagementClient = new StudentManagementClient();
