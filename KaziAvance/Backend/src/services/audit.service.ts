import { prisma } from "../config/prisma";

export async function logAudit(input: {
  organizationId: string;
  userEmail: string;
  action: string;
  target: string;
}) {
  return prisma.auditLog.create({ data: input });
}
