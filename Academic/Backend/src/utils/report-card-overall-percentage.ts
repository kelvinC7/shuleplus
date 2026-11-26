type OverallSubjectRow = {
  totalScore?: number | null;
  studentMarksOnDefault?: number | null;
  totalMax?: number | null;
  marksEntered?: boolean;
  hasComponentMarks?: boolean;
};

function roundReportMark(value: number): number {
  return Math.round(Number(value) * 10) / 10;
}

/**
 * Calculate the overall percentage from report-card subject rows.
 * Stage reports can include unmarked subjects in the denominator so missing
 * marks count as zero instead of improving a student's percentage.
 */
export function overallPercentageFromSubjects(
  subjects: OverallSubjectRow[],
  useDisplayedMarks: boolean,
  includeUnmarkedSubjects = false
): number {
  const included = includeUnmarkedSubjects
    ? subjects
    : subjects.filter((subject) =>
        Boolean(subject.marksEntered ?? subject.hasComponentMarks)
      );
  let scored = 0;
  let possible = 0;
  for (const subject of included) {
    const rawScore = useDisplayedMarks
      ? subject.studentMarksOnDefault ?? subject.totalScore
      : subject.totalScore;
    const score = Number(rawScore ?? 0);
    const max = Number(subject.totalMax ?? 0);
    if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) continue;
    scored += useDisplayedMarks ? roundReportMark(score) : score;
    possible += useDisplayedMarks ? roundReportMark(max) : max;
  }
  return possible > 0 ? Math.round((scored / possible) * 10000) / 100 : 0;
}
