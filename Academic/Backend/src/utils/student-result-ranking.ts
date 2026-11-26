export function rankStudentResults(
  results: Array<{ studentId: string; percentage: number | null }>
): { positions: Map<string, number>; classSize: number } {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const result of results) {
    const total = totals.get(result.studentId) ?? { sum: 0, count: 0 };
    total.sum += result.percentage ?? 0;
    total.count += 1;
    totals.set(result.studentId, total);
  }

  const ranked = [...totals.entries()]
    .map(([studentId, total]) => ({
      studentId,
      average: total.count ? total.sum / total.count : 0,
    }))
    .sort((a, b) => b.average - a.average);

  const positions = new Map<string, number>();
  let previousAverage: number | null = null;
  let previousPosition = 0;
  ranked.forEach((student, index) => {
    const average = Math.round(student.average * 100) / 100;
    if (previousAverage === null || average !== previousAverage) {
      previousPosition = index + 1;
      previousAverage = average;
    }
    positions.set(student.studentId, previousPosition);
  });

  return { positions, classSize: ranked.length };
}
