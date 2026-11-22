export type LessonSourceContent = {
  engine?: string;
  tools?: string[];
  requirements?: string[];
  teacherActivities?: string[];
  learnerActivities?: string[];
  pupilActivities?: string[];
  exercises?: string[];
  intelligenceNotes?: string[];
  mergedAt?: string;
  teachersGuide?: { teacherActivities?: string[]; learnerActivities?: string[]; pages?: number[] };
  pupilsBook?: { activities?: string[]; exercises?: string[]; pages?: number[] } | null;
};

export type LessonIntelRow = {
  id: string;
  lessonNumber?: string | null;
  title: string;
  sourcePages?: number[];
  materials?: unknown;
  sourceContent?: unknown;
  objectives: Array<{ statement: string }>;
};

export type ParsedLessonIntelligence = {
  tools: string[];
  requirements: string[];
  materials: string[];
  pbActivities: string[];
  pbExercises: string[];
  intelligenceNotes: string[];
  pbAligned: boolean;
  mergeEngine: boolean;
  pbPageCount: number;
};

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x).trim()).filter((x) => x.length > 2);
}

export function parseLessonIntelligence(lesson: LessonIntelRow): ParsedLessonIntelligence {
  const sc = (lesson.sourceContent ?? {}) as LessonSourceContent;
  const fromMaterials = asStringList(lesson.materials);
  const tools = [...asStringList(sc.tools)];
  const requirements = asStringList(sc.requirements);
  const materials = fromMaterials.filter((m) => !tools.some((t) => t.toLowerCase() === m.toLowerCase()));

  const pbActivities = [
    ...asStringList(sc.pupilsBook?.activities),
    ...asStringList(sc.pupilActivities),
  ];
  const pbExercises = [...asStringList(sc.pupilsBook?.exercises), ...asStringList(sc.exercises)];

  const pbPages = sc.pupilsBook?.pages?.filter((n) => n > 0) ?? [];
  const pbAligned = Boolean(sc.mergedAt || sc.pupilsBook || pbActivities.length || pbExercises.length);
  const mergeEngine = sc.engine === 'shuleplus-merge-v1';

  return {
    tools: dedupe(tools),
    requirements: dedupe(requirements),
    materials: dedupe(materials.length ? materials : fromMaterials),
    pbActivities: dedupe(pbActivities),
    pbExercises: dedupe(pbExercises),
    intelligenceNotes: dedupe(asStringList(sc.intelligenceNotes)),
    pbAligned,
    mergeEngine,
    pbPageCount: pbPages.length,
  };
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().slice(0, 100);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export function countLessonsWithPbAlignment(units: Array<{ lessons: LessonIntelRow[] }>): number {
  let n = 0;
  for (const u of units) {
    for (const l of u.lessons) {
      if (parseLessonIntelligence(l).pbAligned) n += 1;
    }
  }
  return n;
}
