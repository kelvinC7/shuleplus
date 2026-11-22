export const ASSESSMENT_CATEGORY_OPTIONS = [
  { value: 'BEGINNING_TEST', label: 'Beginning Test (Beginning Term Report)' },
  { value: 'CAT_CONTINUOUS', label: 'CAT / Continuous Assessment' },
  { value: 'MIDTERM_TEST', label: 'Mid-Term Test (Mid-Term Report)' },
  { value: 'END_OF_TERM_EXAM', label: 'End-of-Term Examination (Termly Report)' },
];

export const CAT_ALLOCATION_OPTIONS = [
  { value: 'BEGINNING_TERM', label: 'Count in Beginning Term' },
  { value: 'MID_TERM', label: 'Count in Mid-Term' },
  { value: 'TERM_FINAL', label: 'Count in Termly/Final only' },
];

export function stageForCategory(category, allocation) {
  if (category === 'BEGINNING_TEST') return 'BEGINNING_TERM';
  if (category === 'MIDTERM_TEST') return 'MID_TERM';
  if (category === 'END_OF_TERM_EXAM') return 'TERM_FINAL';
  if (category === 'CAT_CONTINUOUS') return allocation || 'MID_TERM';
  return 'UNASSIGNED';
}

export function categoryForStage(stage) {
  if (stage === 'BEGINNING_TERM') return 'BEGINNING_TEST';
  if (stage === 'MID_TERM') return 'MIDTERM_TEST';
  if (stage === 'TERM_FINAL') return 'END_OF_TERM_EXAM';
  return '';
}

/** Name/code heuristic used only when the template component has no configured classification. */
export function guessCategoryFromName(name, code) {
  const blob = `${name || ''} ${code || ''}`.toLowerCase();
  if (/begin|\bbot\b/.test(blob)) return 'BEGINNING_TEST';
  if (/\bmid/.test(blob)) return 'MIDTERM_TEST';
  if (/\bend\b|final|eot|exam/.test(blob)) return 'END_OF_TERM_EXAM';
  if (/cat|quiz|test|continuous|assignment|classwork|\bcw\b/.test(blob)) return 'CAT_CONTINUOUS';
  return '';
}

/**
 * Template component is the central source of reporting classification.
 * Returns locked=true when the admin configured the component, so teachers cannot change it.
 */
export function componentClassification(component) {
  if (!component) return { locked: false, category: '', stage: 'UNASSIGNED' };
  const stage = component.reportingStage && component.reportingStage !== 'UNASSIGNED' ? component.reportingStage : null;
  const category = component.assessmentCategory || (stage ? categoryForStage(stage) : '');
  if (!stage && !category) return { locked: false, category: '', stage: 'UNASSIGNED' };
  return {
    locked: true,
    category,
    stage: stage || stageForCategory(category, 'MID_TERM'),
  };
}
