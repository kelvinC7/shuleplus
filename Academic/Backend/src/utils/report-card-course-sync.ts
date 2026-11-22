export interface TimetableClassCourses<Course> {
  classId: string | null;
  className: string;
  courses: Course[];
}

export interface ReportCardCourseName {
  subject: string;
}

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function findTimetableClassRow<Row extends TimetableClassCourses<unknown>>(
  rows: Row[],
  cls: { id: string; name: string; stream: string | null }
): Row | undefined {
  const idMatch = rows.find((row) => row.classId === cls.id);
  if (idMatch) return idMatch;

  const classLabels = [
    [cls.name, cls.stream].filter(Boolean).join(' '),
    cls.name,
  ];
  for (const label of classLabels) {
    const matches = rows.filter((row) => normalize(row.className) === normalize(label));
    if (matches.length === 1) return matches[0];
  }
  return undefined;
}

export function reconcileReportCardCourses<
  Subject extends ReportCardCourseName,
  Course extends { subjectName: string; courseCode?: string | null },
>(
  subjects: Map<string, Subject>,
  courses: readonly Course[],
  createMissing: (course: Course) => Subject
) {
  const configuredNames = new Set(
    courses.map((course) => normalize(course.subjectName)).filter(Boolean)
  );

  for (const [id, subject] of subjects) {
    if (!configuredNames.has(normalize(subject.subject))) subjects.delete(id);
  }

  for (const course of courses) {
    const name = normalize(course.subjectName);
    if (!name || [...subjects.values()].some((subject) => normalize(subject.subject) === name)) continue;

    const code = course.courseCode?.trim() || name.replace(/\s+/g, '-');
    subjects.set(`tt:${code}`, createMissing(course));
  }
}
