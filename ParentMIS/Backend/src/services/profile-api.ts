import { env } from '../config/env';

export interface StudentProfileResponse {
  student: {
    id: string;
    studentCode: string;
    fullName: string;
    firstName: string;
    lastName: string;
    gender: string | null;
    dateOfBirth: string | null;
    nationality: string | null;
    bloodGroup: string | null;
    allergies: string[];
    className: string | null;
    stream: string | null;
    academicYear: string | null;
    photoUrl: string | null;
    isBoarding?: boolean;
  };
  parents: {
    father: { role: string; name: string; phone: string; email: string; address: string } | null;
    mother: { role: string; name: string; phone: string; email: string; address: string } | null;
    guardians: { role: string; name: string; phone: string; email: string; address: string }[];
  };
}

export class ProfileApiClient {
  private baseUrl: string;
  private serviceKey: string;

  constructor() {
    this.baseUrl = env.STUDENT_MANAGEMENT_API_URL;
    this.serviceKey = env.SERVICE_API_KEY;
  }

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': this.serviceKey,
        'x-source-service': 'parentmis',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`Student Management module API ${res.status}: ${text}`);
    }

    const json: any = await res.json();
    return json.data ?? json;
  }

  async getProfile(organizationId: string, studentCode: string): Promise<StudentProfileResponse> {
    return this.request<StudentProfileResponse>(
      `/service/student-profile?organizationId=${encodeURIComponent(organizationId)}&studentCode=${encodeURIComponent(studentCode)}`
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const profileApi = new ProfileApiClient();
