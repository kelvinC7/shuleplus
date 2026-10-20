import {
  AlertSeverity,
  AlertType,
  BoardingType,
  BusStatus,
  CardStatus,
  DeviceStatus,
  FeeStatus,
  MaintenanceKind,
  NotificationChannel,
  PassengerMark,
  StudentTransportState,
  TripDirection,
  TripStatus,
} from "@prisma/client";
import { prisma } from "../config/database";

const EXTRA_NAMES = [
  "Diane Mukamana",
  "Eric Habimana",
  "Grace Uwimana",
  "Kevin Niyonzima",
  "Sandra Iradukunda",
  "Patrick?skip",
  "Aline Mugisha",
  "Bruno Hakizimana",
  "Chantal Uwase",
  "David Mugabo",
  "Eliane Ingabire",
  "Frank Ndayisaba",
  "Gloria Mukeshimana",
  "Henry Twagirimana",
  "Irene Uwamahoro",
  "Jacques Nkurunziza",
  "Keza Mutoni",
  "Louis Bizimana",
  "Martha Nyirahabimana",
  "Nathan Rwema",
  "Olive Mukundwa",
  "Peter Kayitare",
  "Queen Uwera",
  "Roger Mugisha",
  "Solange Mukamazera",
  "Thierry Nsengiyumva",
  "Uwase Keza",
  "Vincent Habineza",
  "Winnie Mutoni",
  "Yves Niyomugabo",
  "Zoe Mukamana",
  "Ange Imanishimwe",
  "Benjamin Uwitonze",
  "Claire Mutesi",
  "Daniel Nsabimana",
  "Esther Mukamana",
  "Fiona Uwase",
];

export async function seedTenantData(organizationId: string) {
  await prisma.transportSettings.upsert({
    where: { organizationId },
    update: {},
    create: {
      organizationId,
      schoolName: "School",
      academicYear: "2026-2027",
      term: "Term 1",
    },
  });

  const existingBuses = await prisma.bus.count({ where: { organizationId, deletedAt: null } });
  if (existingBuses > 0) return;

  const jean = await prisma.driver.create({
    data: {
      organizationId,
      name: "Jean",
      phone: "+250788111014",
      licenseNumber: "RW-DL-014882",
      licenseExpiry: new Date("2027-06-30"),
    },
  });
  const claude = await prisma.driver.create({
    data: {
      organizationId,
      name: "Claude Habimana",
      phone: "+250788111009",
      licenseNumber: "RW-DL-009441",
      licenseExpiry: new Date("2026-12-15"),
    },
  });

  const marie = await prisma.attendant.create({
    data: { organizationId, name: "Marie", phone: "+250788222014" },
  });
  const diane = await prisma.attendant.create({
    data: { organizationId, name: "Diane Uwase", phone: "+250788222009" },
  });

  const kicukiro = await prisma.route.create({
    data: {
      organizationId,
      name: "Kicukiro Route",
      code: "KCK-AM",
      direction: "Kicukiro → School",
      distanceKm: 12.4,
      etaMinutes: 42,
      stops: {
        create: [
          { organizationId, name: "Sonatubes", sequence: 1, etaMinutes: 8 },
          { organizationId, name: "Kicukiro Centre", sequence: 2, etaMinutes: 14 },
          { organizationId, name: "KK 15", sequence: 3, etaMinutes: 22 },
          { organizationId, name: "Gikondo", sequence: 4, etaMinutes: 30 },
          { organizationId, name: "School", sequence: 5, etaMinutes: 42 },
        ],
      },
    },
    include: { stops: { orderBy: { sequence: "asc" } } },
  });

  const homeRoute = await prisma.route.create({
    data: {
      organizationId,
      name: "Kicukiro Afternoon",
      code: "KCK-PM",
      direction: "School → Kicukiro",
      distanceKm: 12.4,
      etaMinutes: 45,
    },
  });

  const bus014 = await prisma.bus.create({
    data: {
      organizationId,
      code: "BUS-014",
      plateNumber: "RAD 123 A",
      busType: "School Bus",
      capacity: 40,
      status: BusStatus.ACTIVE,
      gpsDevice: "GPS-014",
      lastLocation: "Gikondo",
      lastLat: -1.9706,
      lastLng: 30.1044,
      speedKmh: 32,
      mileageKm: 48240,
      nextServiceKm: 49480,
      insuranceValidTo: new Date("2027-03-31"),
      inspectionValidTo: new Date("2026-11-15"),
      driverId: jean.id,
      attendantId: marie.id,
      routeId: kicukiro.id,
    },
  });

  const bus009 = await prisma.bus.create({
    data: {
      organizationId,
      code: "BUS-009",
      plateNumber: "RAD 209 B",
      busType: "School Bus",
      capacity: 40,
      status: BusStatus.ACTIVE,
      gpsDevice: "GPS-009",
      lastLocation: "School yard",
      mileageKm: 36110,
      nextServiceKm: 38000,
      insuranceValidTo: new Date("2027-01-20"),
      inspectionValidTo: new Date("2026-10-01"),
      driverId: claude.id,
      attendantId: diane.id,
      routeId: homeRoute.id,
    },
  });

  await prisma.bus.create({
    data: {
      organizationId,
      code: "BUS-008",
      plateNumber: "RAD 088 C",
      busType: "School Bus",
      capacity: 35,
      status: BusStatus.MAINTENANCE,
      lastLocation: "Depot",
      mileageKm: 61200,
      nextServiceKm: 61200,
    },
  });

  const sonatubes = kicukiro.stops[0];
  const named = [
    {
      studentCode: "STU-2026-00124",
      studentName: "Jean Claude",
      className: "P5",
      liveState: StudentTransportState.ON_BUS,
      guardianName: "Mother",
      cardNumber: "RFID-004821",
    },
    {
      studentCode: "STU-2026-00125",
      studentName: "Alice",
      className: "P5",
      liveState: StudentTransportState.MISSING,
      guardianName: "Father",
      cardNumber: "RFID-004822",
    },
    {
      studentCode: "STU-2026-00126",
      studentName: "Patrick",
      className: "P6",
      liveState: StudentTransportState.MISSING,
      guardianName: "Mother",
      cardNumber: "RFID-004823",
    },
  ];

  const extras = EXTRA_NAMES.filter((n) => !n.includes("?")).slice(0, 37).map((name, i) => ({
    studentCode: `STU-2026-${String(200 + i).padStart(5, "0")}`,
    studentName: name,
    className: i % 2 === 0 ? "P5" : "P6",
    liveState: StudentTransportState.ON_BUS,
    guardianName: i % 2 === 0 ? "Mother" : "Father",
    cardNumber: `RFID-${String(5000 + i).padStart(6, "0")}`,
  }));

  const allStudents = [...named, ...extras];
  const assignments: { id: string; studentCode: string; studentName: string; className: string }[] = [];

  for (const s of allStudents) {
    const assignment = await prisma.studentAssignment.create({
      data: {
        organizationId,
        studentId: s.studentCode,
        studentCode: s.studentCode,
        studentName: s.studentName,
        className: s.className,
        level: s.className,
        pickupStopId: sonatubes.id,
        dropoffStopId: sonatubes.id,
        morningBusId: bus014.id,
        afternoonBusId: bus009.id,
        routeId: kicukiro.id,
        guardianName: s.guardianName,
        liveState: s.liveState,
        academicYear: "2026-2027",
        term: "Term 1",
      },
    });
    assignments.push({
      id: assignment.id,
      studentCode: s.studentCode,
      studentName: s.studentName,
      className: s.className,
    });

    await prisma.rfidCard.create({
      data: {
        organizationId,
        cardNumber: s.cardNumber,
        uid: s.cardNumber,
        status: CardStatus.ACTIVE,
        assignmentId: assignment.id,
        studentCode: s.studentCode,
        studentName: s.studentName,
        className: s.className,
        issuedAt: new Date("2026-01-12"),
        activatedAt: new Date("2026-01-12"),
        usageCount: s.studentCode === "STU-2026-00124" ? 1284 : 40 + Math.floor(Math.random() * 80),
        lastUsedAt: s.liveState === StudentTransportState.ON_BUS ? new Date() : null,
        qrPayload: `RFID:${s.cardNumber}|STUDENT:${s.studentCode}`,
      },
    });

    await prisma.parentContact.create({
      data: {
        organizationId,
        assignmentId: assignment.id,
        studentCode: s.studentCode,
        studentName: s.studentName,
        parentName: `${s.guardianName} of ${s.studentName}`,
        relationship: s.guardianName.toUpperCase(),
        phone: "+250788300000",
        email: `${s.studentCode.toLowerCase()}@parent.school.rw`,
      },
    });

    await prisma.transportFee.create({
      data: {
        organizationId,
        assignmentId: assignment.id,
        studentName: s.studentName,
        studentCode: s.studentCode,
        academicYear: "2026-2027",
        term: "Term 1",
        routeName: "Kicukiro",
        amountRwf: 180000,
        paidRwf: s.studentCode === "STU-2026-00124" ? 120000 : 180000,
        status: s.studentCode === "STU-2026-00124" ? FeeStatus.PARTIAL : FeeStatus.PAID,
      },
    });
  }

  await prisma.rfidDevice.createMany({
    data: [
      {
        organizationId,
        deviceCode: "BUS-014-RFID",
        name: "BUS-014 Reader",
        busId: bus014.id,
        status: DeviceStatus.ONLINE,
        batteryPercent: 92,
        signalQuality: "Excellent",
        firmwareVersion: "2.1.0",
        lastSeenAt: new Date(),
      },
      {
        organizationId,
        deviceCode: "BUS-009-RFID",
        name: "BUS-009 Reader",
        busId: bus009.id,
        status: DeviceStatus.ONLINE,
        batteryPercent: 88,
        signalQuality: "Good",
        firmwareVersion: "2.1.0",
        lastSeenAt: new Date(),
      },
    ],
  });

  const today = new Date();
  const tripDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const trip = await prisma.trip.create({
    data: {
      organizationId,
      busId: bus014.id,
      routeId: kicukiro.id,
      driverId: jean.id,
      attendantId: marie.id,
      direction: TripDirection.TO_SCHOOL,
      status: TripStatus.BOARDING,
      tripDate,
      lastLocation: "Gikondo",
      lastLat: -1.9706,
      lastLng: 30.1044,
      speedKmh: 0,
      etaAt: new Date(Date.now() + 25 * 60_000),
      lastRfidAt: new Date(),
      lastRfidName: "Jean Claude",
      expectedCount: assignments.length,
      boardedCount: assignments.filter((a) => a.studentCode !== "STU-2026-00125" && a.studentCode !== "STU-2026-00126").length,
      missingCount: 2,
      reconciled: false,
    },
  });

  const device = await prisma.rfidDevice.findFirst({
    where: { organizationId, deviceCode: "BUS-014-RFID" },
  });

  for (const a of assignments) {
    const missing = a.studentCode === "STU-2026-00125" || a.studentCode === "STU-2026-00126";
    await prisma.tripPassenger.create({
      data: {
        organizationId,
        tripId: trip.id,
        assignmentId: a.id,
        studentCode: a.studentCode,
        studentName: a.studentName,
        className: a.className,
        mark: missing ? PassengerMark.MISSING : PassengerMark.BOARDED,
        boardedAt: missing ? null : new Date(Date.now() - 40 * 60_000),
      },
    });
    if (!missing) {
      await prisma.boardingEvent.create({
        data: {
          organizationId,
          tripId: trip.id,
          deviceId: device?.id,
          studentCode: a.studentCode,
          studentName: a.studentName,
          className: a.className,
          busCode: "BUS-014",
          routeName: "Kicukiro Morning Route",
          stopName: "Sonatubes",
          driverName: "Jean",
          deviceCode: "BUS-014-RFID",
          type: BoardingType.BOARDING,
          outcome: "OK",
          academicYear: "2026-2027",
          term: "Term 1",
          scannedAt: new Date(Date.now() - 40 * 60_000),
        },
      });
    }
  }

  await prisma.safetyAlert.create({
    data: {
      organizationId,
      type: AlertType.MISSING_STUDENT,
      severity: AlertSeverity.WARNING,
      title: "Passenger check",
      message: "BUS-014 expected 40, boarded 38. Missing: Alice, Patrick.",
      relatedType: "trip",
      relatedId: trip.id,
    },
  });

  await prisma.maintenanceRecord.createMany({
    data: [
      {
        organizationId,
        busId: bus014.id,
        kind: MaintenanceKind.SERVICE,
        title: "Next service",
        mileageKm: 49480,
        notes: "Due in 1,240 km",
      },
      {
        organizationId,
        busId: bus014.id,
        kind: MaintenanceKind.BRAKES,
        title: "Brake service",
        dueAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        notes: "Due in 8 days",
      },
    ],
  });

  await prisma.fuelRecord.create({
    data: {
      organizationId,
      busId: bus014.id,
      litres: 48,
      costRwf: 86400,
      mileageKm: 48240,
      driverName: "Jean",
    },
  });

  await prisma.busDocument.createMany({
    data: [
      { organizationId, busId: bus014.id, kind: "INSURANCE", title: "Insurance", validTo: new Date("2027-03-31") },
      { organizationId, busId: bus014.id, kind: "INSPECTION", title: "Inspection", validTo: new Date("2026-11-15") },
    ],
  });

  const jeanClaude = assignments.find((a) => a.studentCode === "STU-2026-00124");
  const parent = await prisma.parentContact.findFirst({
    where: { organizationId, studentCode: "STU-2026-00124" },
  });
  if (jeanClaude && parent) {
    await prisma.parentNotification.create({
      data: {
        organizationId,
        parentId: parent.id,
        studentName: "Jean Claude",
        channel: NotificationChannel.PUSH,
        title: "Boarded",
        message: "Jean Claude boarded Bus 014 at 06:47 AM.",
        sentAt: new Date(),
        status: "SENT",
      },
    });
  }
}

export async function writeAudit(
  organizationId: string,
  action: string,
  opts?: { actorUserId?: string; entityType?: string; entityId?: string; detail?: string }
) {
  await prisma.auditLog.create({
    data: {
      organizationId,
      action,
      actorUserId: opts?.actorUserId,
      entityType: opts?.entityType,
      entityId: opts?.entityId,
      detail: opts?.detail,
    },
  });
}
