import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { resolveActiveStudent } from './parent-context.service';
import { profileApi, StudentProfileResponse } from './profile-api';
import { getChildTransport } from '../clients/transport.client';
import { env } from '../config/env';
import type { StudentSelector } from '../utils/student-param';

function smartCardQr(studentCode: string) {
  const payloadUrl = `${env.PUBLIC_SITE_URL.replace(/\/$/, '')}/v/${encodeURIComponent(studentCode)}`;
  return {
    payloadUrl,
    qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=0&data=${encodeURIComponent(payloadUrl)}`,
  };
}

function resolveSmAssetUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const value = url.trim();
  if (/^(data:|blob:)/i.test(value)) return value;

  const publicOrigin = env.STUDENT_MANAGEMENT_PUBLIC_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
        return `${publicOrigin}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      /* keep original */
    }
    return value;
  }

  const loopbackOrigin = env.STUDENT_MANAGEMENT_API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
  const origin = /localhost|127\.0\.0\.1/i.test(loopbackOrigin) ? publicOrigin : loopbackOrigin;
  return value.startsWith('/') ? `${origin}${value}` : `${origin}/${value}`;
}

function classWithoutDuplicateStream(className: string, stream: string) {
  const name = className.trim();
  const extra = stream.trim();
  if (!extra) return name;
  const last = name.split(/[\s·]+/).filter(Boolean).pop()?.toLowerCase();
  if (last === extra.toLowerCase()) return name;
  return `${name} ${extra}`.trim();
}

export class ProfileService {
  async get(organizationId: string, parentId: string, requestedStudentId?: StudentSelector) {
    let student;
    try {
      student = await resolveActiveStudent(organizationId, parentId, requestedStudentId);
    } catch (error) {
      if (error instanceof AppError && (error.statusCode === 403 || error.statusCode === 404)) {
        return emptyProfile();
      }
      throw error;
    }

    const [remote, transport] = await Promise.all([
      profileApi.getProfile(organizationId, student.shuleCode).catch((error) => {
        console.warn(
          `[profile] Student Management module unreachable (${(error as Error).message}); falling back to local data`
        );
        return null;
      }),
      getChildTransport(organizationId, student.shuleCode),
    ]);

    const base = remote ? this.merge(localProfile(student), remote) : localProfile(student);
    if (transport) {
      base.logistics.transport = {
        subscriptionStatus: transport.subscriptionStatus,
        transportMode: transport.transportMode,
        routeDetails: transport.routeDetails || transport.pickupStop,
        busNumber: transport.busNumber,
        driverName: transport.driverName,
        driverPhone: transport.driverPhone,
        pickupTime: transport.pickupTime,
      };
    }
    if (typeof remote?.student?.isBoarding === 'boolean') {
      base.student.isBoarding = remote.student.isBoarding;
      base.logistics.boarding.boardingStatus = remote.student.isBoarding
        ? 'Boarding Scholar'
        : 'Day Scholar';
    }

    if (base.student.avatarUrl || base.student.className) {
      await prisma.student.update({
        where: { id: student.id },
        data: {
          ...(base.student.avatarUrl ? { avatarUrl: base.student.avatarUrl } : {}),
          ...(base.student.className ? { className: base.student.className } : {}),
          ...(typeof base.student.isBoarding === 'boolean' ? { isBoarding: base.student.isBoarding } : {}),
        },
      }).catch(() => undefined);
    }

    return base;
  }

  private merge(local: ReturnType<typeof localProfile>, remote: StudentProfileResponse) {
    const rStudent = remote?.student;
    const rParents = remote?.parents ?? { father: null, mother: null, guardians: [] };
    if (!rStudent) return local;

    const pick = (value: string | null | undefined, fallback: string | null): string => {
      if (typeof value === 'string' && value.trim()) return value;
      return fallback ?? '';
    };

    return {
      student: {
        id: local.student.id,
        firstName: pick(rStudent.firstName, local.student.firstName),
        lastName: pick(rStudent.lastName, local.student.lastName),
        fullName: pick(rStudent.fullName, local.student.fullName),
        dateOfBirth: rStudent.dateOfBirth ?? local.student.dateOfBirth,
        age: local.student.age,
        gender: pick(rStudent.gender, local.student.gender),
        nationality: pick(rStudent.nationality, local.student.nationality),
        nationalId: local.student.nationalId,
        religion: local.student.religion,
        shuleCode: local.student.shuleCode,
        cardNumber: local.student.cardNumber,
        className: classWithoutDuplicateStream(
          pick(rStudent.className, local.student.className),
          pick(rStudent.stream, '')
        ),
        stream: '',
        academicYear: pick(rStudent.academicYear, local.student.academicYear),
        classTeacher: local.student.classTeacher,
        house: local.student.house,
        admissionDate: local.student.admissionDate,
        isBoarding: typeof rStudent.isBoarding === 'boolean' ? rStudent.isBoarding : local.student.isBoarding,
        avatarUrl: resolveSmAssetUrl(rStudent.photoUrl) || resolveSmAssetUrl(local.student.avatarUrl),
      },
      smartCard: local.smartCard,
      parents: {
        father: {
          name: rParents.father?.name || local.parents.father.name,
          phone: rParents.father?.phone || local.parents.father.phone,
          email: rParents.father?.email || local.parents.father.email,
          address: rParents.father?.address || local.parents.father.address,
        },
        mother: {
          name: rParents.mother?.name || local.parents.mother.name,
          phone: rParents.mother?.phone || local.parents.mother.phone,
          email: rParents.mother?.email || local.parents.mother.email,
          address: rParents.mother?.address || local.parents.mother.address,
        },
        emergency: local.parents.emergency,
      },
      medical: {
        bloodGroup: pick(rStudent.bloodGroup, local.medical.bloodGroup),
        genotype: local.medical.genotype,
        allergies:
          Array.isArray(rStudent.allergies) && rStudent.allergies.length > 0
            ? rStudent.allergies
            : local.medical.allergies,
        chronicConditions: local.medical.chronicConditions,
      },
      logistics: local.logistics,
    };
  }
}

function emptyProfile() {
  return localProfile({
    id: '',
    firstName: '',
    lastName: '',
    dateOfBirth: null,
    gender: null,
    nationality: null,
    nationalId: null,
    religion: null,
    shuleCode: '',
    cardNumber: null,
    className: '',
    stream: null,
    academicYear: null,
    classTeacher: null,
    house: null,
    admissionDate: null,
    isBoarding: false,
    avatarUrl: null,
    fatherName: null,
    fatherPhone: null,
    fatherEmail: null,
    fatherAddress: null,
    motherName: null,
    motherPhone: null,
    motherEmail: null,
    motherAddress: null,
    emergencyName: null,
    emergencyRelation: null,
    emergencyPhone: null,
    bloodGroup: null,
    genotype: null,
    allergies: [],
    chronicConditions: null,
    transportRoute: null,
    busNumber: null,
    driverName: null,
    driverPhone: null,
    pickupTime: null,
    dormitoryName: null,
    roomNumber: null,
    dormitoryPatron: null,
    patronPhone: null,
  });
}

function localProfile(student: {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  gender: string | null;
  nationality: string | null;
  nationalId: string | null;
  religion: string | null;
  shuleCode: string;
  cardNumber: string | null;
  className: string;
  stream: string | null;
  academicYear: string | null;
  classTeacher: string | null;
  house: string | null;
  admissionDate: Date | null;
  isBoarding: boolean;
  avatarUrl: string | null;
  fatherName: string | null;
  fatherPhone: string | null;
  fatherEmail: string | null;
  fatherAddress: string | null;
  motherName: string | null;
  motherPhone: string | null;
  motherEmail: string | null;
  motherAddress: string | null;
  emergencyName: string | null;
  emergencyRelation: string | null;
  emergencyPhone: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  allergies: string[];
  chronicConditions: string | null;
  transportRoute: string | null;
  busNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  pickupTime: string | null;
  dormitoryName: string | null;
  roomNumber: string | null;
  dormitoryPatron: string | null;
  patronPhone: string | null;
}) {
  const age = student.dateOfBirth
    ? Math.floor((Date.now() - student.dateOfBirth.getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return {
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`,
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : null,
      age,
      gender: student.gender ?? '',
      nationality: student.nationality ?? '',
      nationalId: student.nationalId ?? '',
      religion: student.religion ?? '',
      shuleCode: student.shuleCode,
      cardNumber: student.cardNumber ?? '',
      className: student.className,
      stream: student.stream ?? '',
      academicYear: student.academicYear ?? '',
      classTeacher: student.classTeacher ?? '',
      house: student.house ?? '',
      admissionDate: student.admissionDate ? student.admissionDate.toISOString() : null,
      isBoarding: student.isBoarding,
        avatarUrl: resolveSmAssetUrl(student.avatarUrl),
    },
    smartCard: student.shuleCode ? smartCardQr(student.shuleCode) : { payloadUrl: '', qrImageUrl: '' },
    parents: {
      father: {
        name: student.fatherName ?? '',
        phone: student.fatherPhone ?? '',
        email: student.fatherEmail ?? '',
        address: student.fatherAddress ?? '',
      },
      mother: {
        name: student.motherName ?? '',
        phone: student.motherPhone ?? '',
        email: student.motherEmail ?? '',
        address: student.motherAddress ?? '',
      },
      emergency: {
        name: student.emergencyName ?? '',
        relationship: student.emergencyRelation ?? '',
        phone: student.emergencyPhone ?? '',
      },
    },
    medical: {
      bloodGroup: student.bloodGroup ?? '',
      genotype: student.genotype ?? '',
      allergies: student.allergies,
      chronicConditions: student.chronicConditions ?? '',
    },
    logistics: {
      transport: {
        subscriptionStatus: student.transportRoute ? 'Active Subscription' : 'No Subscription',
        transportMode: student.busNumber ? 'School Bus' : 'Private',
        routeDetails: student.transportRoute ?? '',
        busNumber: student.busNumber ?? '',
        driverName: student.driverName ?? '',
        driverPhone: student.driverPhone ?? '',
        pickupTime: student.pickupTime ?? '',
      },
      boarding: {
        boardingStatus: student.isBoarding ? 'Boarding Scholar' : 'Day Scholar',
        dormitoryName: student.dormitoryName ?? '',
        roomNumber: student.roomNumber ?? '',
        dormitoryPatron: student.dormitoryPatron ?? '',
        patronPhone: student.patronPhone ?? '',
      },
    },
  };
}

export const profileService = new ProfileService();
