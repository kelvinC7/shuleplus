import { PrismaClient } from '../src/generated/prisma-client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

const ORG_ID = 'org-demo-school';
const ORG_CODE = 'KGS';
const ORG_NAME = 'Kigali Green Hills School';
const PARENT_PHONE = '250788123456';
const PARENT_PASSWORD = '24680';

function daysFromNow(days: number, hour = 8): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding ParentMIS demo data…');

  await prisma.$transaction([
    prisma.activityLog.deleteMany(),
    prisma.storeOrderItem.deleteMany(),
    prisma.storeOrder.deleteMany(),
    prisma.storeProduct.deleteMany(),
    prisma.timetableSlot.deleteMany(),
    prisma.leaveRequest.deleteMany(),
    prisma.homework.deleteMany(),
    prisma.healthRecord.deleteMany(),
    prisma.schoolEvent.deleteMany(),
    prisma.studentDocument.deleteMany(),
    prisma.disciplineRecord.deleteMany(),
    prisma.teacherContact.deleteMany(),
    prisma.message.deleteMany(),
    prisma.announcement.deleteMany(),
    prisma.walletTransaction.deleteMany(),
    prisma.wallet.deleteMany(),
    prisma.feePayment.deleteMany(),
    prisma.feeStatement.deleteMany(),
    prisma.attendanceRecord.deleteMany(),
    prisma.exam.deleteMany(),
    prisma.grade.deleteMany(),
    prisma.subject.deleteMany(),
    prisma.term.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.parentCommunicationPreference.deleteMany(),
    prisma.parentStudentLink.deleteMany(),
    prisma.student.deleteMany(),
    prisma.parentAccount.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.report.deleteMany(),
    prisma.record.deleteMany(),
    prisma.userCache.deleteMany(),
    prisma.tenant.deleteMany(),
  ]);

  const tenant = await prisma.tenant.create({
    data: {
      organizationId: ORG_ID,
      organizationCode: ORG_CODE,
      organizationName: ORG_NAME,
      status: 'ACTIVE',
    },
  });
  console.log(`Tenant created: ${ORG_NAME}`);

  const parent = await prisma.parentAccount.create({
    data: {
      organizationId: ORG_ID,
      firstName: 'Alice',
      lastName: 'Uwase',
      phone: PARENT_PHONE,
      email: 'alice.uwase@example.com',
      passwordHash: hashPassword(PARENT_PASSWORD),
      hasPassword: true,
    },
  });
  console.log(`Parent created: Alice Uwase (${PARENT_PHONE})`);

  const [term1, term2] = await Promise.all([
    prisma.term.create({
      data: { organizationId: ORG_ID, name: 'Term 1', academicYear: '2026', isCurrent: true },
    }),
    prisma.term.create({
      data: { organizationId: ORG_ID, name: 'Term 2', academicYear: '2026', isCurrent: false },
    }),
  ]);

  const subjects = await Promise.all([
    prisma.subject.create({ data: { organizationId: ORG_ID, name: 'Mathematics', shortName: 'MATH' } }),
    prisma.subject.create({ data: { organizationId: ORG_ID, name: 'English', shortName: 'ENG' } }),
    prisma.subject.create({ data: { organizationId: ORG_ID, name: 'Kinyarwanda', shortName: 'KIN' } }),
    prisma.subject.create({ data: { organizationId: ORG_ID, name: 'Physics', shortName: 'PHY' } }),
    prisma.subject.create({ data: { organizationId: ORG_ID, name: 'Chemistry', shortName: 'CHE' } }),
    prisma.subject.create({ data: { organizationId: ORG_ID, name: 'Biology', shortName: 'BIO' } }),
    prisma.subject.create({ data: { organizationId: ORG_ID, name: 'Geography', shortName: 'GEO' } }),
    prisma.subject.create({ data: { organizationId: ORG_ID, name: 'History', shortName: 'HIS' } }),
    prisma.subject.create({ data: { organizationId: ORG_ID, name: 'ICT', shortName: 'ICT' } }),
    prisma.subject.create({ data: { organizationId: ORG_ID, name: 'French', shortName: 'FR' } }),
  ]);
  const byName = (n: string) => subjects.find((s) => s.name === n)!;

  const studentKevin = await prisma.student.create({
    data: {
      organizationId: ORG_ID,
      firstName: 'Kevin',
      lastName: 'Uwase',
      dateOfBirth: new Date('2010-03-14'),
      gender: 'Male',
      nationality: 'Rwandan',
      religion: 'Christian',
      shuleCode: 'KGS-2026-001',
      cardNumber: 'SHU-8801-2233',
      className: 'Senior 3',
      stream: 'A',
      academicYear: '2026',
      classTeacher: 'Mr. Jean Mugabo',
      house: 'Green House',
      admissionDate: new Date('2021-01-10'),
      isBoarding: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=11',
      transportRoute: 'Kicukiro – Remera Route',
      busNumber: 'KBA 123 A',
      driverName: 'Jean Bosco',
      driverPhone: '250788000111',
      pickupTime: '06:15',
      boardingStatus: 'FULL BOARDING',
      dormitoryName: 'Kigali Dormitory',
      roomNumber: 'B-204',
      dormitoryPatron: 'Mrs. Diane Mukamana',
      patronPhone: '250788000222',
      bloodGroup: 'O+',
      genotype: 'AA',
      allergies: ['Peanuts'],
      chronicConditions: 'Mild asthma',
      fatherName: 'Eric Uwase',
      fatherPhone: '250788333444',
      fatherEmail: 'eric.uwase@example.com',
      fatherAddress: 'Kicukiro, Kigali',
      motherName: 'Alice Uwase',
      motherPhone: PARENT_PHONE,
      motherEmail: 'alice.uwase@example.com',
      motherAddress: 'Kicukiro, Kigali',
      emergencyName: 'Marie Claire',
      emergencyRelation: 'Aunt',
      emergencyPhone: '250788555666',
    },
  });

  const studentEmely = await prisma.student.create({
    data: {
      organizationId: ORG_ID,
      firstName: 'Emely',
      lastName: 'Uwase',
      dateOfBirth: new Date('2012-07-02'),
      gender: 'Female',
      nationality: 'Rwandan',
      religion: 'Christian',
      shuleCode: 'KGS-2026-002',
      cardNumber: 'SHU-8801-3344',
      className: 'Senior 1',
      stream: 'B',
      academicYear: '2026',
      classTeacher: 'Ms. Claudine Uwimana',
      house: 'Yellow House',
      admissionDate: new Date('2024-01-08'),
      isBoarding: true,
      avatarUrl: 'https://i.pravatar.cc/150?img=45',
      transportRoute: 'Kicukiro – Remera Route',
      busNumber: 'KBA 123 A',
      driverName: 'Jean Bosco',
      driverPhone: '250788000111',
      pickupTime: '06:30',
      boardingStatus: 'FULL BOARDING',
      dormitoryName: 'Rwanda Dormitory',
      roomNumber: 'A-101',
      dormitoryPatron: 'Mrs. Peace Uwera',
      patronPhone: '250788000333',
      bloodGroup: 'A+',
      genotype: 'AA',
      allergies: [],
      chronicConditions: null,
      fatherName: 'Eric Uwase',
      fatherPhone: '250788333444',
      fatherEmail: 'eric.uwase@example.com',
      fatherAddress: 'Kicukiro, Kigali',
      motherName: 'Alice Uwase',
      motherPhone: PARENT_PHONE,
      motherEmail: 'alice.uwase@example.com',
      motherAddress: 'Kicukiro, Kigali',
      emergencyName: 'Marie Claire',
      emergencyRelation: 'Aunt',
      emergencyPhone: '250788555666',
    },
  });

  await prisma.parentStudentLink.create({
    data: { parentId: parent.id, studentId: studentKevin.id, relationship: 'MOTHER', isPrimary: true },
  });
  await prisma.parentStudentLink.create({
    data: { parentId: parent.id, studentId: studentEmely.id, relationship: 'MOTHER', isPrimary: false },
  });

  const gradeSpec: Array<[string, number, number]> = [
    ['Mathematics', 78, 72],
    ['English', 82, 74],
    ['Kinyarwanda', 88, 80],
    ['Physics', 74, 68],
    ['Chemistry', 70, 65],
    ['Biology', 80, 76],
    ['Geography', 85, 78],
    ['History', 79, 71],
    ['ICT', 90, 86],
    ['French', 72, 66],
  ];

  for (const [subjectName, ca, exam] of gradeSpec) {
    const total = ca + exam;
    const grade =
      total >= 90 ? 'A+' : total >= 80 ? 'A' : total >= 70 ? 'B' : total >= 60 ? 'C' : total >= 50 ? 'D' : 'F';
    await prisma.grade.create({
      data: {
        organizationId: ORG_ID,
        studentId: studentKevin.id,
        termId: term1.id,
        subjectId: byName(subjectName).id,
        subjectName,
        ca,
        exam,
        total,
        grade,
      },
    });
    await prisma.grade.create({
      data: {
        organizationId: ORG_ID,
        studentId: studentEmely.id,
        termId: term1.id,
        subjectId: byName(subjectName).id,
        subjectName,
        ca: ca - 6,
        exam: exam - 5,
        total: ca - 6 + exam - 5,
        grade,
      },
    });
  }

  await prisma.exam.createMany({
    data: [
      { organizationId: ORG_ID, studentId: studentKevin.id, subject: 'Mathematics', date: daysFromNow(12), type: 'Mid-Term' },
      { organizationId: ORG_ID, studentId: studentKevin.id, subject: 'Physics', date: daysFromNow(15), type: 'Mid-Term' },
      { organizationId: ORG_ID, studentId: studentKevin.id, subject: 'English', date: daysFromNow(19), type: 'End of Term' },
      { organizationId: ORG_ID, studentId: studentEmely.id, subject: 'Kinyarwanda', date: daysFromNow(14), type: 'Mid-Term' },
      { organizationId: ORG_ID, studentId: studentEmely.id, subject: 'ICT', date: daysFromNow(21), type: 'End of Term' },
    ],
  });

  const attendanceStatuses = ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'PRESENT', 'ABSENT', 'PRESENT', 'PRESENT', 'EXCUSED', 'PRESENT'] as const;
  for (let i = 1; i <= 30; i++) {
    const date = daysFromNow(-i, 8);
    if (date.getDay() === 0) continue;
    const status = attendanceStatuses[i % attendanceStatuses.length];
    await prisma.attendanceRecord.create({
      data: {
        organizationId: ORG_ID,
        studentId: studentKevin.id,
        date,
        checkInTime: status === 'LATE' ? '08:20' : '07:55',
        checkOutTime: '17:00',
        status,
        notes: status === 'EXCUSED' ? 'Doctor appointment' : null,
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        organizationId: ORG_ID,
        studentId: studentEmely.id,
        date,
        checkInTime: '07:50',
        checkOutTime: '17:00',
        status: 'PRESENT',
      },
    });
  }

  await prisma.feeStatement.createMany({
    data: [
      { organizationId: ORG_ID, studentId: studentKevin.id, term: 'Term 1 2026', description: 'Tuition & Boarding Fees', amount: 1500000, paid: 1200000, balance: 300000, status: 'PARTIAL', dueDate: daysFromNow(-15) },
      { organizationId: ORG_ID, studentId: studentKevin.id, term: 'Term 1 2026', description: 'Learning Materials', amount: 120000, paid: 120000, balance: 0, status: 'PAID', dueDate: daysFromNow(-20) },
      { organizationId: ORG_ID, studentId: studentEmely.id, term: 'Term 1 2026', description: 'Tuition & Boarding Fees', amount: 1300000, paid: 1300000, balance: 0, status: 'PAID', dueDate: daysFromNow(-10) },
    ],
  });

  await prisma.feePayment.createMany({
    data: [
      { organizationId: ORG_ID, studentId: studentKevin.id, date: daysFromNow(-18), description: 'Term 1 tuition installment', amount: 600000, method: 'Mobile Money', reference: 'MM-8841' },
      { organizationId: ORG_ID, studentId: studentKevin.id, date: daysFromNow(-4), description: 'Term 1 tuition installment', amount: 600000, method: 'Mobile Money', reference: 'MM-9912' },
      { organizationId: ORG_ID, studentId: studentEmely.id, date: daysFromNow(-9), description: 'Term 1 full payment', amount: 1300000, method: 'Bank Transfer', reference: 'BT-1022' },
    ],
  });

  await prisma.wallet.create({
    data: {
      organizationId: ORG_ID,
      studentId: studentKevin.id,
      cardNumber: 'SHU-8801-2233',
      balance: 45000,
      currency: 'RWF',
      transactions: {
        create: [
          { organizationId: ORG_ID, date: daysFromNow(-20), description: 'Parent top-up via MTN', amount: 50000, type: 'CREDIT', balanceAfter: 50000 },
          { organizationId: ORG_ID, date: daysFromNow(-6), description: 'Canteen purchase', amount: 5000, type: 'DEBIT', balanceAfter: 45000 },
        ],
      },
    },
  });

  await prisma.wallet.create({
    data: {
      organizationId: ORG_ID,
      studentId: studentEmely.id,
      cardNumber: 'SHU-8801-3344',
      balance: 15000,
      currency: 'RWF',
      transactions: {
        create: [
          { organizationId: ORG_ID, date: daysFromNow(-15), description: 'Parent top-up via Airtel', amount: 20000, type: 'CREDIT', balanceAfter: 20000 },
          { organizationId: ORG_ID, date: daysFromNow(-2), description: 'Bookshop purchase', amount: 5000, type: 'DEBIT', balanceAfter: 15000 },
        ],
      },
    },
  });

  await prisma.announcement.createMany({
    data: [
      { organizationId: ORG_ID, title: 'Mid-Term Examinations Next Week', body: 'Mid-term exams for S1–S6 begin on the 20th. Please ensure students revise over the weekend and are on time.', date: daysFromNow(-1), priority: 'IMPORTANT', author: 'Director of Studies' },
      { organizationId: ORG_ID, title: 'School Open Day & Parents Meeting', body: 'We invite all parents to our Open Day on the first Saturday of next month. Meeting starts at 9:00 AM in the main hall.', date: daysFromNow(-4), priority: 'NORMAL', author: 'Head Teacher' },
      { organizationId: ORG_ID, title: 'Fee Payment Reminder', body: 'Term 2 fee payments open next week. Parents can pay via mobile money, bank transfer, or at the accounts office.', date: daysFromNow(-8), priority: 'NORMAL', author: 'Bursar' },
    ],
  });

  await prisma.message.createMany({
    data: [
      { organizationId: ORG_ID, parentId: parent.id, studentId: studentKevin.id, fromName: 'Mr. Jean Mugabo', fromRole: 'Class Teacher', subject: 'Kevin is doing great in class', body: 'Dear Parent, Kevin has shown great improvement this term, particularly in Mathematics and ICT. He is an active participant in class.', date: daysFromNow(-2), isRead: false, direction: 'INBOUND' },
      { organizationId: ORG_ID, parentId: parent.id, studentId: studentKevin.id, fromName: 'Nurse Grace', fromRole: 'School Nurse', subject: 'Asthma action plan update', body: 'Kevin has been feeling fine. Please ensure his inhaler is kept in the dormitory for emergencies. His emergency contact list is up to date.', date: daysFromNow(-5), isRead: false, direction: 'INBOUND' },
      { organizationId: ORG_ID, parentId: parent.id, studentId: studentEmely.id, fromName: 'Ms. Claudine Uwimana', fromRole: 'Class Teacher', subject: 'Emely joins the Debate Club', body: 'Emely has been selected to represent Senior 1 in the upcoming inter-house debate competition. Congratulations!', date: daysFromNow(-3), isRead: true, direction: 'INBOUND' },
      { organizationId: ORG_ID, parentId: parent.id, studentId: studentKevin.id, fromName: 'Alice Uwase', fromRole: 'Parent', subject: 'Uniform top-up request', body: 'Good morning, please let me know if Kevin needs a new school jumper before the cold season.', date: daysFromNow(-1), isRead: true, direction: 'OUTBOUND' },
    ],
  });

  await prisma.teacherContact.createMany({
    data: [
      { organizationId: ORG_ID, name: 'Mr. Jean Mugabo', subject: 'Class Teacher (S3)', role: 'Class Teacher', phone: '250788111222', email: 'j.mugabo@greenhills.rw' },
      { organizationId: ORG_ID, name: 'Ms. Claudine Uwimana', subject: 'Class Teacher (S1)', role: 'Class Teacher', phone: '250788222333', email: 'c.uwimana@greenhills.rw' },
      { organizationId: ORG_ID, name: 'Mr. Patrick Niyonzima', subject: 'Mathematics', role: 'Subject Teacher', phone: '250788333111', email: 'p.niyonzima@greenhills.rw' },
      { organizationId: ORG_ID, name: 'Nurse Grace Uwamahoro', subject: 'School Clinic', role: 'School Nurse', phone: '250788444222', email: 'clinic@greenhills.rw' },
    ],
  });

  await prisma.disciplineRecord.createMany({
    data: [
      { organizationId: ORG_ID, studentId: studentKevin.id, date: daysFromNow(-12), type: 'MERIT', description: 'Helped organize the class library and volunteered for peer tutoring.', points: 10, status: 'RECORDED' },
      { organizationId: ORG_ID, studentId: studentKevin.id, date: daysFromNow(-25), type: 'MERIT', description: 'Won the inter-house Mathematics quiz.', points: 15, status: 'RECORDED' },
    ],
  });

  await prisma.studentDocument.createMany({
    data: [
      { organizationId: ORG_ID, studentId: studentKevin.id, title: 'Term 1 Report Card', category: 'REPORT_CARD', description: 'First term progress report', date: daysFromNow(-30), url: '/documents/report-card-term1-kevin.pdf' },
      { organizationId: ORG_ID, studentId: studentKevin.id, title: 'Birth Certificate', category: 'CERTIFICATE', date: daysFromNow(-90), url: '/documents/birth-certificate-kevin.pdf' },
      { organizationId: ORG_ID, studentId: studentEmely.id, title: 'Term 1 Report Card', category: 'REPORT_CARD', date: daysFromNow(-30), url: '/documents/report-card-term1-emely.pdf' },
    ],
  });

  await prisma.schoolEvent.createMany({
    data: [
      { organizationId: ORG_ID, title: 'Inter-house Sports Day', date: daysFromNow(8), time: '08:00 – 16:00', location: 'School Sports Ground', description: 'Annual athletics competition across all houses. Parents welcome.', category: 'Sports' },
      { organizationId: ORG_ID, title: 'Parent-Teacher Meeting', date: daysFromNow(16), time: '09:00 – 12:00', location: 'Main Hall', description: 'Meet your child’s teachers and discuss progress.', category: 'Academic' },
      { organizationId: ORG_ID, title: 'Mid-Term Break', date: daysFromNow(23), time: 'All day', location: '—', description: 'Students go home for the mid-term break.', category: 'Holiday' },
    ],
  });

  await prisma.healthRecord.createMany({
    data: [
      { organizationId: ORG_ID, studentId: studentKevin.id, date: daysFromNow(-6), type: 'CHECKUP', description: 'Routine school clinic checkup. Vitals normal.', status: 'RESOLVED' },
      { organizationId: ORG_ID, studentId: studentKevin.id, date: daysFromNow(-2), type: 'MEDICATION', description: 'Inhaler administered for mild asthma episode after PE.', treatment: 'Salbutamol inhaler', status: 'RESOLVED' },
    ],
  });

  await prisma.homework.createMany({
    data: [
      { organizationId: ORG_ID, studentId: studentKevin.id, subject: 'Mathematics', title: 'Quadratic Equations Worksheet', description: 'Complete problems 1–20 from the worksheet.', teacher: 'Mr. Patrick Niyonzima', assignedDate: daysFromNow(-2), dueDate: daysFromNow(2), status: 'PENDING' },
      { organizationId: ORG_ID, studentId: studentKevin.id, subject: 'Physics', title: 'Chapter 6 Summary', description: 'Write a summary of the chapter and prepare 5 questions.', teacher: 'Mr. Eric Habimana', assignedDate: daysFromNow(-1), dueDate: daysFromNow(4), status: 'PENDING' },
      { organizationId: ORG_ID, studentId: studentKevin.id, subject: 'English', title: 'Essay: The Role of Youth', description: 'Write a 500-word essay.', teacher: 'Ms. Diane Uwase', assignedDate: daysFromNow(-5), dueDate: daysFromNow(-1), status: 'SUBMITTED' },
      { organizationId: ORG_ID, studentId: studentEmely.id, subject: 'ICT', title: 'Typing Practice', description: 'Practice touch typing for 20 minutes daily.', teacher: 'Mr. Samuel', assignedDate: daysFromNow(-3), dueDate: daysFromNow(3), status: 'PENDING' },
    ],
  });

  await prisma.leaveRequest.createMany({
    data: [
      { organizationId: ORG_ID, studentId: studentKevin.id, date: daysFromNow(5), type: 'Permission', reason: 'Family event in Huye – will be away for the weekend.', status: 'APPROVED', submittedAt: daysFromNow(-4) },
      { organizationId: ORG_ID, studentId: studentKevin.id, date: daysFromNow(12), type: 'Medical', reason: 'Dental appointment.', status: 'PENDING', submittedAt: daysFromNow(-1) },
    ],
  });

  await prisma.storeProduct.createMany({
    data: [
      { organizationId: ORG_ID, name: 'School Uniform Set', category: 'Uniform', price: 45000, stock: 120, imageUrl: '/store/uniform.png' },
      { organizationId: ORG_ID, name: 'Exercise Books (Pack of 5)', category: 'Stationery', price: 6000, stock: 300, imageUrl: '/store/books.png' },
      { organizationId: ORG_ID, name: 'Mathematics Set', category: 'Stationery', price: 8000, stock: 150, imageUrl: '/store/maths-set.png' },
      { organizationId: ORG_ID, name: 'School Blazer', category: 'Uniform', price: 35000, stock: 80, imageUrl: '/store/blazer.png' },
      { organizationId: ORG_ID, name: 'Gym Kit (Shirt + Shorts)', category: 'Sports', price: 18000, stock: 90, imageUrl: '/store/gym-kit.png' },
      { organizationId: ORG_ID, name: 'Water Bottle (School Brand)', category: 'General', price: 5000, stock: 200, imageUrl: '/store/bottle.png' },
    ],
  });

  const mathsSet = await prisma.storeProduct.findFirst({
    where: { organizationId: ORG_ID, name: 'Mathematics Set' },
  });
  const books = await prisma.storeProduct.findFirst({
    where: { organizationId: ORG_ID, name: 'Exercise Books (Pack of 5)' },
  });
  if (mathsSet && books) {
    await prisma.storeOrder.create({
      data: {
        organizationId: ORG_ID,
        parentId: parent.id,
        studentId: studentKevin.id,
        date: daysFromNow(-5),
        total: 20000,
        status: 'PAID',
        items: {
          create: [
            { productId: mathsSet.id, quantity: 1, price: mathsSet.price },
            { productId: books.id, quantity: 2, price: books.price },
          ],
        },
      },
    });
    await prisma.storeProduct.update({ where: { id: mathsSet.id }, data: { stock: { decrement: 1 } } });
    await prisma.storeProduct.update({ where: { id: books.id }, data: { stock: { decrement: 2 } } });
  }

  const subjectsForTimetable = ['Mathematics', 'English', 'Kinyarwanda', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History', 'ICT', 'French'];
  const teachers = {
    Mathematics: 'Mr. Patrick Niyonzima',
    English: 'Ms. Diane Uwase',
    Kinyarwanda: 'Mr. Emmanuel',
    Physics: 'Mr. Eric Habimana',
    Chemistry: 'Ms. Jane',
    Biology: 'Mr. Alfred',
    Geography: 'Mrs. Florence',
    History: 'Mr. Claude',
    ICT: 'Mr. Samuel',
    French: 'Ms. Camille',
  };
  const rooms = ['Room 12', 'Room 14', 'Lab 1', 'Lab 2', 'Room 8', 'Comp Lab'];
  const periods = [
    { period: 1, start: '07:30', end: '08:20' },
    { period: 2, start: '08:20', end: '09:10' },
    { period: 3, start: '09:30', end: '10:20' },
    { period: 4, start: '10:20', end: '11:10' },
    { period: 5, start: '11:10', end: '12:00' },
  ];
  const slots: Array<Record<string, unknown>> = [];
  for (let day = 1; day <= 5; day++) {
    subjectsForTimetable.forEach((subject, idx) => {
      const p = periods[(idx + day) % periods.length];
      slots.push({
        organizationId: ORG_ID,
        studentId: studentKevin.id,
        day,
        period: p.period,
        startTime: p.start,
        endTime: p.end,
        subject,
        teacher: teachers[subject as keyof typeof teachers],
        room: rooms[(idx + day) % rooms.length],
      });
    });
  }
  await prisma.timetableSlot.createMany({ data: slots });

  await prisma.activityLog.createMany({
    data: [
      { organizationId: ORG_ID, userId: parent.id, action: 'PARENT_LOGIN', description: 'Alice Uwase signed in to Parent Portal', createdAt: daysFromNow(-1, 7) },
      { organizationId: ORG_ID, userId: parent.id, action: 'FEES_VIEW', description: 'Viewed fee statements', createdAt: daysFromNow(-1, 8) },
      { organizationId: ORG_ID, userId: parent.id, action: 'WALLET_TOPUP', description: 'Toped up Kevin’s wallet by 50,000 RWF', createdAt: daysFromNow(-1, 9) },
    ],
  });

  console.log('\nSeed complete!');
  console.log('----------------------------------------');
  console.log(`Parent phone: ${PARENT_PHONE}`);
  console.log(`Parent password: ${PARENT_PASSWORD}`);
  console.log(`Students: Kevin Uwase (${studentKevin.shuleCode}), Emely Uwase (${studentEmely.shuleCode})`);
  console.log('----------------------------------------');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
