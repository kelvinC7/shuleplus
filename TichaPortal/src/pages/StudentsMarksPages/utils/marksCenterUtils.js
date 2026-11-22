const NAVY = '#13213D';

export function markTone(percent) {
  if (percent == null || !Number.isFinite(percent)) return { color: 'rgba(19,33,61,0.35)', bgcolor: 'rgba(19,33,61,0.03)' };
  if (percent >= 90) return { color: '#166534', bgcolor: '#F0FDF4' };
  if (percent >= 70) return { color: '#1E40AF', bgcolor: '#EFF6FF' };
  if (percent >= 50) return { color: NAVY, bgcolor: '#F3F5FA' };
  return { color: '#991B1B', bgcolor: '#FEF2F2' };
}

const GRADE_TONES = {
  A: { color: '#166534', bgcolor: '#DCFCE7' },
  B: { color: '#1E40AF', bgcolor: '#DBEAFE' },
  C: { color: NAVY, bgcolor: '#E3E9F5' },
  D: { color: NAVY, bgcolor: '#F3F5FA' },
  F: { color: '#991B1B', bgcolor: '#FEE2E2' },
};

export function gradeTone(grade) {
  return GRADE_TONES[grade] || { color: 'rgba(19,33,61,0.5)', bgcolor: 'rgba(19,33,61,0.05)' };
}

export function buildFilterParams(filters, studentSearch, studentId) {
  const p = {};
  if (filters.academicYear) p.academic_year = filters.academicYear;
  if (filters.term) p.term = filters.term;
  if (filters.className) p.class_name = filters.className;
  if (filters.course) p.subject_name = filters.course;
  if (filters.assessmentType) p.column_slug = filters.assessmentType;
  if (filters.assessmentId) p.assessment_id = filters.assessmentId;
  if (studentSearch?.trim()) p.student_search = studentSearch.trim();
  if (studentId) p.student_id = studentId;
  return p;
}
