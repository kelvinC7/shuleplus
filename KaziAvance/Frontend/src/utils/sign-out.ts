import { clearToken } from "@/shared/auth-token";

export async function performOrgAdminSignOut() {
  clearToken();
  const iamUrl = (process.env.NEXT_PUBLIC_IAM_URL ?? "http://localhost:3000").replace(/\/$/, "");
  window.location.href = `${iamUrl}/login`;
}

export async function performEmployeeSignOut() {
  clearToken();
  const iamUrl = (process.env.NEXT_PUBLIC_IAM_URL ?? "http://localhost:3000").replace(/\/$/, "");
  window.location.href = `${iamUrl}/login`;
}
