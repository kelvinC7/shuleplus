import type { Employee } from "../generated/prisma";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import type { JwtPayload } from "../middleware/auth";
import { AppError } from "../middleware/error";

function buildEmployeeCode() {
  return `EMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function displayNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "Employee";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mergeSources(existing: string | null | undefined, add: string) {
  const set = new Set(
    (existing ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  set.add(add);
  return [...set].join(",");
}

function positionFromAuth(user: JwtPayload) {
  const pos = (user.position ?? "").trim();
  if (pos) return pos;
  if (user.modules?.includes("teacher-portal")) return "Teacher";
  return "Staff";
}

type IamProfile = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  position?: string | null;
};

async function fetchIamProfile(userId: string): Promise<IamProfile | null> {
  if (!env.IAM_API_URL || !userId) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${env.IAM_API_URL}/internal/users/${encodeURIComponent(userId)}`, {
      headers: {
        "x-service-key": env.SERVICE_API_KEY,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { data?: IamProfile } | IamProfile | null;
    if (!json) return null;
    return "data" in json && json.data ? json.data : (json as IamProfile);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * TichaPortal (and Kazi employee UI) resolve the logged-in IAM user into a Kazi Employee.
 * First Ticha Avance visit creates the roster row — same outcome as org-admin directory sync.
 */
export async function resolveEmployeeFromAuth(user: JwtPayload): Promise<Employee> {
  if (!user.email) {
    throw new AppError(401, "Token is missing email claim");
  }

  const email = user.email.toLowerCase();
  const organizationId = user.organizationId ?? null;
  const emailMatch = organizationId ? { email, organizationId } : { email };

  let employee =
    (await prisma.employee.findFirst({
      where: {
        OR: [{ iamUserId: user.sub }, emailMatch],
      },
    })) ?? null;

  const iam = employee ? null : await fetchIamProfile(user.sub);
  const fullName =
    [iam?.firstName, iam?.lastName].filter(Boolean).join(" ").trim() || displayNameFromEmail(email);
  const position = (iam?.position || positionFromAuth(user)).trim() || "Staff";
  const isTeacher = /teacher/i.test(position) || Boolean(user.modules?.includes("teacher-portal"));

  if (employee && !employee.iamUserId) {
    employee = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        iamUserId: user.sub,
        organizationId: organizationId ?? employee.organizationId,
        directorySources: mergeSources(employee.directorySources, "iam"),
      },
    });
  }

  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        iamUserId: user.sub,
        organizationId,
        employeeCode: buildEmployeeCode(),
        email,
        fullName,
        phone: iam?.phone ?? undefined,
        department: isTeacher ? "Teaching" : "Organization",
        position,
        companyName: "Organization",
        employmentStatus: "Active",
        yearsOfService: 0,
        verificationStatus: "Verified",
        eligibilityStatus: "Eligible",
        allowAdvance: true,
        directorySources: "iam",
        profileCompletion: 60,
        creditScore: 650,
        riskLevel: "Medium",
      },
    });
  } else if (employee.eligibilityStatus === "Pending") {
    // Legacy first-login rows blocked Ticha Avance until an admin flipped status.
    employee = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        eligibilityStatus: "Eligible",
        allowAdvance: employee.allowAdvance,
        directorySources: mergeSources(employee.directorySources, "iam"),
        verificationStatus:
          employee.verificationStatus === "Pending" ? "Verified" : employee.verificationStatus,
      },
    });
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: { lastLoginAt: new Date() },
  });

  return employee;
}
