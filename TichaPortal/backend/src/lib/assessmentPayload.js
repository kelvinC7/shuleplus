/** Allowlist and enum validation for teacher assessment payloads forwarded to Academic. */
const ASSESSMENT_CATEGORIES = ['BEGINNING_TEST', 'CAT_CONTINUOUS', 'MIDTERM_TEST', 'END_OF_TERM_EXAM'];
const REPORTING_STAGES = ['UNASSIGNED', 'BEGINNING_TERM', 'MID_TERM', 'TERM_FINAL'];
const CAT_ALLOCATION_STAGES = ['BEGINNING_TERM', 'MID_TERM', 'TERM_FINAL'];
const ASSESSMENT_CREATE_FIELDS = [
  'title', 'assessmentCode', 'subjectName', 'subjectId', 'classId', 'className', 'templateId', 'componentId',
  'maxMark', 'assessmentDate', 'assessmentTime', 'duration', 'description', 'academicYear', 'term',
  'assessmentCategory', 'catAllocationStage', 'reportingStage',
];
const ASSESSMENT_UPDATE_FIELDS = [
  'title', 'maxMark', 'assessmentDate', 'assessmentTime', 'duration', 'description',
  'assessmentCategory', 'catAllocationStage', 'reportingStage', 'templateId', 'componentId',
];

/** Keep only known assessment fields and validate classification enums before forwarding to Academic. */
function pickAssessmentPayload(body, allowed) {
  const src = body && typeof body === 'object' ? body : {};
  const out = {};
  for (const key of allowed) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  if (out.assessmentCategory != null && out.assessmentCategory !== '' && !ASSESSMENT_CATEGORIES.includes(out.assessmentCategory)) {
    const err = new Error('Invalid assessment category');
    err.status = 400;
    throw err;
  }
  if (out.catAllocationStage != null && out.catAllocationStage !== '' && !CAT_ALLOCATION_STAGES.includes(out.catAllocationStage)) {
    const err = new Error('Invalid CAT reporting allocation');
    err.status = 400;
    throw err;
  }
  if (out.reportingStage != null && out.reportingStage !== '' && !REPORTING_STAGES.includes(out.reportingStage)) {
    const err = new Error('Invalid reporting stage');
    err.status = 400;
    throw err;
  }
  if (out.maxMark != null) {
    const n = Number(out.maxMark);
    if (!Number.isFinite(n) || n <= 0) {
      const err = new Error('Maximum mark must be greater than 0');
      err.status = 400;
      throw err;
    }
    out.maxMark = n;
  }
  return out;
}

/** Derive reporting classification from a configured template component. */
function classificationFromComponent(component) {
  const stage =
    component?.reportingStage && component.reportingStage !== 'UNASSIGNED'
      ? component.reportingStage
      : null;
  const category =
    component?.assessmentCategory ||
    (stage === 'BEGINNING_TERM'
      ? 'BEGINNING_TEST'
      : stage === 'MID_TERM'
        ? 'MIDTERM_TEST'
        : stage === 'TERM_FINAL'
          ? 'END_OF_TERM_EXAM'
          : '');
  const effectiveStage = stage || (category === 'CAT_CONTINUOUS' ? 'MID_TERM' : null);
  const out = {};
  if (category) out.assessmentCategory = category;
  if (effectiveStage) {
    out.reportingStage = effectiveStage;
    out.catAllocationStage = effectiveStage;
  }
  return out;
}

module.exports = {
  pickAssessmentPayload,
  classificationFromComponent,
  ASSESSMENT_CREATE_FIELDS,
  ASSESSMENT_UPDATE_FIELDS,
};
