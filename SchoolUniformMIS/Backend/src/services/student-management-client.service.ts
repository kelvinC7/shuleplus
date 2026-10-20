import { env } from "../config/env";

export interface StudentManagementStudent {
  id: string;
  studentCode: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender: "M" | "F" | null;
  className: string | null;
  status: string;
}

/** Outbound client: pulls student roster from Student Management. */
export class StudentManagementClient {
  private base = env.STUDENT_MANAGEMENT_API_URL.replace(/\/$/, "");

  async listStudents(
    organizationId: string,
    search = "",
  ): Promise<{ ok: boolean; students: StudentManagementStudent[] }> {
    if (!env.STUDENT_MANAGEMENT_API_URL) {
      return { ok: false, students: [] };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const qs = new URLSearchParams({
        organizationId,
        status: "ACTIVE",
      });
      if (search.trim()) qs.set("search", search.trim());

      const res = await fetch(`${this.base}/service/students?${qs}`, {
        headers: {
          "x-service-key": env.SERVICE_API_KEY,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      if (!res.ok) return { ok: false, students: [] };
      const json = (await res.json()) as {
        data?: StudentManagementStudent[];
      };
      return { ok: true, students: json.data ?? [] };
    } catch {
      return { ok: false, students: [] };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const studentManagementClient = new StudentManagementClient();
