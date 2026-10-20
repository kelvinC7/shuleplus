import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const UNASSIGNED_TEACHER_ID = '00000000-0000-0000-0000-000000000001';
const LEVELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
const STREAMS = ['A', 'B', 'C', 'D'];
/** Config Class warns above this. Originals stay under it; extras are few so they may go over. */
const MAX_WEEKLY_PERIODS = 24;
/** Small extra pool — enough to take work off P6 A teachers, not a full extra staff. */
const EXTRA_TEACHER_COUNT = 8;

const LIGHT_SUBJECTS = new Set(['p.e', 'r.e', 'c.a', 'delf']);

const EXTRA_NAMES = [
  'UWIMANA Claudine', 'NIYONZIMA Patrick', 'MUKAMANA Alice', 'HABIMANA Eric',
  'IRADUKUNDA Belise', 'NSENGIMANA Olivier', 'UWASE Grace', 'MUGISHA Samuel',
];

type SourceCourse = {
  subjectName: string;
  periodsPerWeek: number;
  teacherUserId: string;
  teacherName: string;
  room: string | null;
  schedulingOverrides: unknown;
};

type PoolTeacher = {
  teacherUserId: string;
  teacherName: string;
  extra: boolean;
};

function normalizeClassLabel(s: string) {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
}

function subjectKey(name: string) {
  return name.trim().toLowerCase();
}

function fallbackClasses() {
  return LEVELS.flatMap((level) => STREAMS.map((stream) => `${level} ${stream}`));
}

function isLight(name: string) {
  return LIGHT_SUBJECTS.has(subjectKey(name));
}

function poolId(organizationId: string, slug: string) {
  return `seed-t-${organizationId.slice(0, 8)}-${slug}`;
}

async function resolveTenant() {
  const fromEnv = process.env.SEED_ORG_ID?.trim();
  if (fromEnv) {
    const t = await prisma.tenant.findFirst({
      where: { OR: [{ organizationId: fromEnv }, { organizationCode: fromEnv }] },
    });
    if (t) return t;
  }
  const tenants = await prisma.tenant.findMany();
  const live =
    tenants.find((t) => /st\s*theo/i.test(t.organizationName) && t.organizationCode !== 'STTHEO')
    ?? tenants.find((t) => t.organizationCode === '04001');
  if (live) return live;
  if (!tenants[0]) throw new Error('No Timetable tenant found');
  return tenants[0];
}

async function fetchSmClassLabels(organizationId: string): Promise<string[]> {
  const base = (process.env.ACADEMIC_API_URL ?? 'http://localhost:3052/api').replace(/\/$/, '');
  const key = process.env.SERVICE_API_KEY ?? process.env.PLATFORM_SERVICE_KEY ?? 'dev-service-key';
  try {
    const response = await fetch(`${base}/service/classes?organizationId=${encodeURIComponent(organizationId)}`, {
      headers: { 'Content-Type': 'application/json', 'x-service-key': key },
    });
    if (!response.ok) return [];
    const body = (await response.json()) as {
      data?: Array<{ name?: string; stream?: string | null; label?: string }>;
    };
    return (body.data ?? [])
      .map((c) => c.label?.trim() || [c.name, c.stream].filter(Boolean).join(' ').trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function pickYears(): string[] {
  const raw = process.env.SEED_YEARS?.trim();
  if (raw) return raw.split(',').map((s) => s.trim()).filter(Boolean);
  return ['2025-2026', '2026'];
}

async function sourceCourses(
  organizationId: string,
  term: string,
  academicYear: string,
  fromClass?: string,
): Promise<{ className: string; courses: SourceCourse[] }> {
  const all = await prisma.teacherAssignment.findMany({
    where: { organizationId, term, academicYear, status: 'ACTIVE' },
    orderBy: [{ className: 'asc' }, { subjectName: 'asc' }],
  });

  const byClass = new Map<string, typeof all>();
  for (const row of all) {
    const key = normalizeClassLabel(row.className);
    byClass.set(key, [...(byClass.get(key) ?? []), row]);
  }

  const preferred = fromClass || 'P6 A';
  let sourceRows = all.filter((r) => normalizeClassLabel(r.className) === normalizeClassLabel(preferred));
  let sourceName = sourceRows[0]?.className ?? preferred;

  if (!sourceRows.length) {
    let best: typeof all = [];
    let bestName = '';
    for (const [key, rows] of byClass) {
      const unique = new Map(rows.map((r) => [subjectKey(r.subjectName), r]));
      if (unique.size > best.length) {
        best = [...unique.values()];
        bestName = rows[0]?.className ?? key;
      }
    }
    sourceRows = best;
    sourceName = bestName;
  }

  const uniqueSource = new Map<string, (typeof all)[number]>();
  for (const row of sourceRows) {
    const key = subjectKey(row.subjectName);
    if (!uniqueSource.has(key)) uniqueSource.set(key, row);
  }

  const catalog = await prisma.timetableCourseConfig.findMany({
    where: { organizationId },
    orderBy: { subjectName: 'asc' },
  });

  const courses: SourceCourse[] = [];
  const seen = new Set<string>();

  for (const row of uniqueSource.values()) {
    const key = subjectKey(row.subjectName);
    seen.add(key);
    const catalogRow = catalog.find((c) => subjectKey(c.subjectName) === key);
    courses.push({
      subjectName: catalogRow?.subjectName ?? row.subjectName,
      periodsPerWeek: catalogRow?.periodsPerWeek || row.periodsPerWeek,
      teacherUserId: row.teacherUserId,
      teacherName: row.teacherName,
      room: row.room,
      schedulingOverrides: row.schedulingOverrides ?? {},
    });
  }

  for (const cfg of catalog) {
    const key = subjectKey(cfg.subjectName);
    if (seen.has(key)) continue;
    courses.push({
      subjectName: cfg.subjectName,
      periodsPerWeek: cfg.periodsPerWeek,
      teacherUserId: UNASSIGNED_TEACHER_ID,
      teacherName: 'Unassigned',
      room: null,
      schedulingOverrides: {},
    });
  }

  if (!courses.length) {
    throw new Error('No source courses found. Configure one class in Config Class, then re-run.');
  }

  return { className: sourceName || 'catalog', courses };
}

function buildExtraPool(organizationId: string, courses: SourceCourse[]): {
  pools: Map<string, PoolTeacher[]>;
  extras: PoolTeacher[];
} {
  const extras: PoolTeacher[] = EXTRA_NAMES.slice(0, EXTRA_TEACHER_COUNT).map((teacherName, index) => ({
    teacherUserId: poolId(organizationId, `extra-${index + 1}`),
    teacherName,
    extra: true,
  }));

  const groups = new Set<string>();
  for (const course of courses) {
    groups.add(isLight(course.subjectName) ? 'light' : subjectKey(course.subjectName));
  }

  const pools = new Map<string, PoolTeacher[]>();
  for (const group of groups) {
    pools.set(group, extras);
  }
  return { pools, extras };
}

function pickTeacher(
  pool: PoolTeacher[],
  load: Map<string, number>,
  periods: number,
  prefer?: PoolTeacher,
) {
  if (prefer && (load.get(prefer.teacherUserId) ?? 0) + periods <= MAX_WEEKLY_PERIODS) {
    return prefer;
  }
  const ranked = [...pool].sort(
    (a, b) => (load.get(a.teacherUserId) ?? 0) - (load.get(b.teacherUserId) ?? 0),
  );
  const fit = ranked.find((t) => (load.get(t.teacherUserId) ?? 0) + periods <= MAX_WEEKLY_PERIODS);
  return fit ?? ranked[0] ?? pool[0];
}

async function ensureProfiles(organizationId: string, teachers: PoolTeacher[]) {
  for (const teacher of teachers) {
    await prisma.timetableTeacherProfile.upsert({
      where: {
        organizationId_teacherUserId: {
          organizationId,
          teacherUserId: teacher.teacherUserId,
        },
      },
      create: {
        organizationId,
        teacherUserId: teacher.teacherUserId,
        teacherName: teacher.teacherName,
        maxPeriodsPerDay: 6,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      update: { teacherName: teacher.teacherName },
    });
  }
}

async function main() {
  const tenant = await resolveTenant();
  const organizationId = tenant.organizationId;
  const term = process.env.SEED_TERM?.trim() || 'Term 1';
  const years = pickYears();
  const fromClass = process.env.SEED_FROM_CLASS?.trim();

  const smClasses = await fetchSmClassLabels(organizationId);
  const classes = smClasses.length ? smClasses : fallbackClasses();

  console.log(`School: ${tenant.organizationName} (${organizationId})`);
  console.log(`Term ${term} · years ${years.join(', ')}`);
  console.log(`Classes: ${classes.length}${smClasses.length ? ' (Student Management)' : ' (P1–P6 A–D fallback)'}`);
  console.log(`Max ${MAX_WEEKLY_PERIODS} periods/week per teacher`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const extraNames = new Set<string>();

  for (const academicYear of years) {
    const source = await sourceCourses(organizationId, term, academicYear, fromClass);
    if (!source.courses.length) {
      console.log(`  ${academicYear}: no source courses, skipped`);
      continue;
    }

    const { pools, extras } = buildExtraPool(organizationId, source.courses);
    extras.forEach((t) => extraNames.add(t.teacherName));
    const allPoolTeachers = [...new Map([...pools.values()].flat().map((t) => [t.teacherUserId, t])).values()];
    await ensureProfiles(organizationId, allPoolTeachers);

    const sourceKey = normalizeClassLabel(source.className);
    const orderedClasses = [
      ...classes.filter((c) => normalizeClassLabel(c) === sourceKey),
      ...classes.filter((c) => normalizeClassLabel(c) !== sourceKey),
    ];

    console.log(
      `  ${academicYear}: ${source.courses.length} courses from ${source.className} → ${orderedClasses.length} classes`,
    );
    console.log(`    extras this year: ${extras.length} (${extras.map((t) => t.teacherName).join(', ') || 'none'})`);

    const existing = await prisma.teacherAssignment.findMany({
      where: { organizationId, term, academicYear, status: 'ACTIVE' },
    });
    const load = new Map<string, number>();
    const originalBySubject = new Map(
      source.courses.map((c) => [subjectKey(c.subjectName), {
        teacherUserId: c.teacherUserId,
        teacherName: c.teacherName,
        extra: false as const,
      }]),
    );

    for (const className of orderedClasses) {
      const classKey = normalizeClassLabel(className);
      const isSource = classKey === sourceKey;
      const lightTeacher = isSource
        ? undefined
        : pickTeacher(
            pools.get('light') ?? [],
            load,
            source.courses.filter((c) => isLight(c.subjectName)).reduce((s, c) => s + c.periodsPerWeek, 0),
          );

      for (const course of source.courses) {
        const group = isLight(course.subjectName) ? 'light' : subjectKey(course.subjectName);
        const pool = pools.get(group) ?? [];
        const original = originalBySubject.get(subjectKey(course.subjectName));
        const teacher = isSource && original && original.teacherUserId !== UNASSIGNED_TEACHER_ID
          ? original
          : isLight(course.subjectName) && lightTeacher
            ? lightTeacher
            : pickTeacher(pool, load, course.periodsPerWeek);

        load.set(teacher.teacherUserId, (load.get(teacher.teacherUserId) ?? 0) + course.periodsPerWeek);

        const subjectK = subjectKey(course.subjectName);
        const row = existing.find(
          (a) =>
            normalizeClassLabel(a.className) === classKey
            && subjectKey(a.subjectName) === subjectK,
        );
        if (row) {
          if (
            row.periodsPerWeek === course.periodsPerWeek
            && row.teacherUserId === teacher.teacherUserId
          ) {
            skipped += 1;
            continue;
          }
          await prisma.teacherAssignment.update({
            where: { id: row.id },
            data: {
              periodsPerWeek: course.periodsPerWeek,
              teacherUserId: teacher.teacherUserId,
              teacherName: teacher.teacherName,
              room: course.room,
              className,
            },
          });
          updated += 1;
          continue;
        }
        await prisma.teacherAssignment.create({
          data: {
            organizationId,
            className,
            subjectName: course.subjectName,
            teacherUserId: teacher.teacherUserId,
            teacherName: teacher.teacherName,
            periodsPerWeek: course.periodsPerWeek,
            room: course.room,
            schedulingOverrides: (course.schedulingOverrides as object) ?? {},
            term,
            academicYear,
            status: 'ACTIVE',
          },
        });
        created += 1;
      }
    }

    const extraIds = new Set(extras.map((t) => t.teacherUserId));
    const originalLoads = [...load.entries()].filter(([id]) => !extraIds.has(id));
    const extraLoads = [...load.entries()].filter(([id]) => extraIds.has(id));
    const originalPeak = Math.max(0, ...originalLoads.map(([, n]) => n));
    const extraPeak = Math.max(0, ...extraLoads.map(([, n]) => n));
    console.log(`    P6 A teachers peak ${originalPeak} periods/week (kept on ${source.className} only)`);
    console.log(`    ${extras.length} extra teachers peak ${extraPeak} periods/week`);
    const overloadedOriginals = originalLoads.filter(([, n]) => n > MAX_WEEKLY_PERIODS);
    if (overloadedOriginals.length) {
      console.log(`    warning: ${overloadedOriginals.length} original teacher(s) still over ${MAX_WEEKLY_PERIODS}`);
    }
  }

  console.log(`Done. created=${created} updated=${updated} unchanged=${skipped}`);
  console.log(`Extra teachers seeded: ${extraNames.size} — ${[...extraNames].join(', ') || 'none'}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
