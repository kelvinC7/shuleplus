import { PrismaClient, AttendanceStatus, CardStatus, DeviceStatus, TapDirection } from "../src/generated/prisma";

const prisma = new PrismaClient();

const ORG_ID = "org-demo-school";
const ORG_CODE = "KGS";
const ORG_NAME = "Kigali Green Hills School";

const STUDENTS = [
  {
    cardNumber: "SHU-8801-2233",
    studentCode: "KGS-2026-001",
    studentName: "Kevin Uwase",
    className: "Senior 3",
    level: "Senior 3",
  },
  {
    cardNumber: "SHU-8801-3344",
    studentCode: "KGS-2026-002",
    studentName: "Emely Uwase",
    className: "Senior 1",
    level: "Senior 1",
  },
];

function daysFromNow(days: number, hour = 8): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function atTime(day: Date, hour: number, minute: number): Date {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function dateOnly(d = new Date()): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

async function main() {
  console.log("Seeding Attendance RFID demo data…");

  await prisma.$transaction([
    prisma.attendanceRecord.deleteMany({ where: { organizationId: ORG_ID } }),
    prisma.rfidCard.deleteMany({ where: { organizationId: ORG_ID } }),
    prisma.rfidDevice.deleteMany({ where: { organizationId: ORG_ID } }),
    prisma.tenant.deleteMany({ where: { organizationId: ORG_ID } }),
  ]);

  await prisma.tenant.create({
    data: {
      organizationId: ORG_ID,
      organizationCode: ORG_CODE,
      organizationName: ORG_NAME,
      status: "ACTIVE",
    },
  });
  console.log(`Tenant created: ${ORG_NAME}`);

  await prisma.attendanceSettings.upsert({
    where: { organizationId: ORG_ID },
    update: { schoolName: ORG_NAME, academicYear: "2026", term: "Term 1" },
    create: {
      organizationId: ORG_ID,
      schoolName: ORG_NAME,
      academicYear: "2026",
      term: "Term 1",
    },
  });

  await prisma.rfidDevice.createMany({
    data: [
      {
        organizationId: ORG_ID,
        deviceCode: "RFID-001",
        name: "Main Gate Entry",
        location: "Main Gate",
        gateName: "Main Gate",
        status: DeviceStatus.ONLINE,
        direction: TapDirection.ENTRY,
        batteryPercent: 95,
        signalQuality: "Excellent",
        firmwareVersion: "1.0.0",
        lastSeenAt: new Date(),
      },
      {
        organizationId: ORG_ID,
        deviceCode: "RFID-002",
        name: "Main Gate Exit",
        location: "Main Gate",
        gateName: "Main Gate",
        status: DeviceStatus.ONLINE,
        direction: TapDirection.EXIT,
        batteryPercent: 92,
        signalQuality: "Excellent",
        firmwareVersion: "1.0.0",
        lastSeenAt: new Date(),
      },
    ],
  });

  const cards: Record<string, { id: string }> = {};
  for (const s of STUDENTS) {
    const card = await prisma.rfidCard.create({
      data: {
        organizationId: ORG_ID,
        cardNumber: s.cardNumber,
        uid: s.cardNumber,
        studentId: s.studentCode,
        studentCode: s.studentCode,
        studentName: s.studentName,
        className: s.className,
        level: s.level,
        status: CardStatus.ACTIVE,
        issuedAt: new Date(),
        activatedAt: new Date(),
        qrPayload: `RFID:${s.cardNumber}|STUDENT:${s.studentCode}`,
      },
    });
    cards[s.studentCode] = card;
    console.log(`Card created: ${s.studentName} (${s.studentCode}) ${s.cardNumber}`);
  }

  const attendanceStatuses = [
    AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT,
    AttendanceStatus.LATE,
    AttendanceStatus.PRESENT,
    AttendanceStatus.ABSENT,
    AttendanceStatus.PRESENT,
    AttendanceStatus.PRESENT,
    AttendanceStatus.EXCUSED,
    AttendanceStatus.PRESENT,
  ];
  const records: Array<Record<string, unknown>> = [];
  for (let i = 1; i <= 30; i++) {
    const day = daysFromNow(-i, 8);
    if (day.getDay() === 0) continue;

    for (const s of STUDENTS) {
      const isKevin = s.studentCode === "KGS-2026-001";
      const status = isKevin ? attendanceStatuses[i % attendanceStatuses.length] : AttendanceStatus.PRESENT;
      const entryHour = isKevin && status === AttendanceStatus.LATE ? 8 : 7;
      const entryMinute = isKevin && status === AttendanceStatus.LATE ? 20 : isKevin ? 55 : 50;
      const isAbsent = status === AttendanceStatus.ABSENT;

      records.push({
        organizationId: ORG_ID,
        cardId: cards[s.studentCode].id,
        studentId: s.studentCode,
        studentCode: s.studentCode,
        studentName: s.studentName,
        className: s.className,
        level: s.level,
        cardNumber: s.cardNumber,
        deviceCode: isKevin ? "RFID-001" : "RFID-001",
        gateName: "Main Gate",
        schoolName: ORG_NAME,
        academicYear: "2026",
        term: "Term 1",
        direction: TapDirection.ENTRY,
        status,
        lessonDate: dateOnly(day),
        entryTime: isAbsent ? null : atTime(day, entryHour, entryMinute),
        exitTime: isAbsent ? null : atTime(day, 17, 0),
        notes: status === AttendanceStatus.EXCUSED ? "Doctor appointment" : null,
        isWeekend: false,
        isHoliday: false,
      });
    }
  }
  await prisma.attendanceRecord.createMany({ data: records });
  console.log(`Created ${records.length} attendance records for ${ORG_NAME}`);

  console.log("\nSeed complete!");
  console.log("----------------------------------------");
  console.log(`Org: ${ORG_ID} (${ORG_CODE})`);
  console.log(`Kevin Uwase → ${STUDENTS[0].studentCode} / ${STUDENTS[0].cardNumber}`);
  console.log(`Emely Uwase → ${STUDENTS[1].studentCode} / ${STUDENTS[1].cardNumber}`);
  console.log("----------------------------------------");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
