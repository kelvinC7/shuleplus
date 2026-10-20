import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const ORG_ID = "kaziavance-org-1";

async function main() {
  await prisma.tenant.upsert({
    where: { organizationId: ORG_ID },
    update: { organizationName: "ShulePlus Demo School" },
    create: {
      organizationId: ORG_ID,
      organizationCode: "SHULE-DEMO",
      organizationName: "ShulePlus Demo School",
      status: "ACTIVE",
    },
  });

  await prisma.orgPolicy.upsert({
    where: { organizationId: ORG_ID },
    update: {},
    create: { organizationId: ORG_ID },
  });

  const employees = [
    {
      employeeCode: "EMP-24091",
      email: "jean.dedieu@shuleplus.rw",
      fullName: "Jean de Dieu",
      department: "Operations",
      position: "Field Coordinator",
      netSalary: 780000,
      grossSalary: 950000,
      eligibilityStatus: "Eligible",
    },
    {
      employeeCode: "EMP-24092",
      email: "marie.uwase@shuleplus.rw",
      fullName: "Marie Claire Uwase",
      department: "Human Resources",
      position: "HR Officer",
      netSalary: 720000,
      grossSalary: 880000,
      eligibilityStatus: "Eligible",
    },
    {
      employeeCode: "EMP-24093",
      email: "patrick.habimana@shuleplus.rw",
      fullName: "Patrick Habimana",
      department: "IT",
      position: "Systems Analyst",
      netSalary: 950000,
      grossSalary: 1150000,
      eligibilityStatus: "Blocked",
      allowAdvance: false,
    },
    {
      employeeCode: "EMP-24094",
      email: "grace.mukamana@shuleplus.rw",
      fullName: "Grace Mukamana",
      department: "Finance",
      position: "Accountant",
      netSalary: 850000,
      grossSalary: 1020000,
      eligibilityStatus: "Eligible",
    },
    {
      employeeCode: "EMP-24095",
      email: "eric.nshimiyimana@shuleplus.rw",
      fullName: "Eric Nshimiyimana",
      department: "Sales",
      position: "Sales Executive",
      netSalary: 600000,
      grossSalary: 750000,
      eligibilityStatus: "Eligible",
    },
  ];

  const createdEmployees = [];
  for (const emp of employees) {
    const row = await prisma.employee.upsert({
      where: { email: emp.email },
      update: {
        organizationId: ORG_ID,
        department: emp.department,
        position: emp.position,
        netSalary: emp.netSalary,
        grossSalary: emp.grossSalary,
        eligibilityStatus: emp.eligibilityStatus,
        allowAdvance: emp.allowAdvance ?? true,
      },
      create: {
        organizationId: ORG_ID,
        employeeCode: emp.employeeCode,
        email: emp.email,
        fullName: emp.fullName,
        department: emp.department,
        position: emp.position,
        companyName: "ShulePlus Group",
        employmentStatus: "Active",
        yearsOfService: 2,
        verificationStatus: "Verified",
        profileCompletion: 85,
        creditScore: 720,
        riskLevel: "Low",
        netSalary: emp.netSalary,
        grossSalary: emp.grossSalary,
        taxAmount: Math.round(emp.grossSalary * 0.12),
        eligibilityStatus: emp.eligibilityStatus,
        allowAdvance: emp.allowAdvance ?? true,
      },
    });
    createdEmployees.push(row);
  }

  const marie = createdEmployees.find((e) => e.email === "marie.uwase@shuleplus.rw")!;
  const grace = createdEmployees.find((e) => e.email === "grace.mukamana@shuleplus.rw")!;
  const eric = createdEmployees.find((e) => e.email === "eric.nshimiyimana@shuleplus.rw")!;

  const activeAdvance = await prisma.advanceRequest.upsert({
    where: { requestNumber: "ADV-2026-0094" },
    update: {},
    create: {
      requestNumber: "ADV-2026-0094",
      employeeId: marie.id,
      amount: 250000,
      repaymentMonths: 4,
      purpose: "Medical emergency",
      status: "Disbursed",
      remainingBalance: 125000,
      monthlyDeduction: 62500,
      approvedAt: new Date("2026-05-01"),
      disbursedAt: new Date("2026-05-02"),
    },
  });

  await prisma.advanceRepayment.deleteMany({ where: { advanceRequestId: activeAdvance.id } });
  await prisma.advanceRepayment.createMany({
    data: [
      { advanceRequestId: activeAdvance.id, employeeId: marie.id, installmentNumber: 1, amount: 62500, dueDate: new Date("2026-06-01"), paidAmount: 62500, paidAt: new Date("2026-06-01"), status: "Paid" },
      { advanceRequestId: activeAdvance.id, employeeId: marie.id, installmentNumber: 2, amount: 62500, dueDate: new Date("2026-07-01"), paidAmount: 62500, paidAt: new Date("2026-07-01"), status: "Paid" },
      { advanceRequestId: activeAdvance.id, employeeId: marie.id, installmentNumber: 3, amount: 62500, dueDate: new Date("2026-08-01"), status: "Pending" },
      { advanceRequestId: activeAdvance.id, employeeId: marie.id, installmentNumber: 4, amount: 62500, dueDate: new Date("2026-09-01"), status: "Pending" },
    ],
  });

  await prisma.advanceRequest.upsert({
    where: { requestNumber: "ADV-2026-0142" },
    update: {},
    create: {
      requestNumber: "ADV-2026-0142",
      employeeId: eric.id,
      amount: 300000,
      repaymentMonths: 3,
      purpose: "School fees",
      status: "Pending",
    },
  });

  await prisma.advanceRequest.upsert({
    where: { requestNumber: "ADV-2026-0141" },
    update: {},
    create: {
      requestNumber: "ADV-2026-0141",
      employeeId: grace.id,
      amount: 200000,
      repaymentMonths: 4,
      purpose: "Home repair",
      status: "Under Review",
    },
  });

  await prisma.advanceRequest.upsert({
    where: { requestNumber: "ADV-2026-0138" },
    update: {},
    create: {
      requestNumber: "ADV-2026-0138",
      employeeId: createdEmployees[0].id,
      amount: 400000,
      repaymentMonths: 3,
      purpose: "Personal",
      status: "Approved",
      remainingBalance: 400000,
      monthlyDeduction: 136000,
      approvedAt: new Date("2026-07-05"),
    },
  });

  await prisma.auditLog.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.auditLog.createMany({
    data: [
      { organizationId: ORG_ID, userEmail: "admin@shuleplus.rw", action: "Request Approved", target: "ADV-2026-0138" },
      { organizationId: ORG_ID, userEmail: "admin@shuleplus.rw", action: "Employee Blocked", target: "Patrick Habimana" },
      { organizationId: ORG_ID, userEmail: "admin@shuleplus.rw", action: "Policy Changed", target: "Max Advance %" },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
