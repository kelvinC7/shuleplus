import { classLabelsMatch, normalizeClassLabel } from './classMatch.js';

export { normalizeClassLabel, classLabelsMatch };

export const ANNUAL_TEMPLATE_TERM = 'Annual';

export function templateTermMatchesSession(templateTerm, sessionTerm) {
  const t = String(templateTerm ?? '').trim();
  const s = String(sessionTerm ?? '').trim();
  if (!s) return true;
  if (t === s) return true;
  if (t === ANNUAL_TEMPLATE_TERM && /^term\s*[123]\b/i.test(s)) return true;
  return false;
}

export function classCategoryMatchesTemplateLevel(classCategory, templateLevel) {
  const cat = String(classCategory ?? '').trim().toUpperCase();
  const level = String(templateLevel ?? '').trim().toUpperCase();
  if (!cat || !level) return false;
  if (cat === level) return true;
  if ((level === 'O_LEVEL' || level === 'A_LEVEL') && cat === 'SECONDARY') return true;
  if (level === 'UNIVERSITY' && cat === 'TVET') return true;
  return false;
}

export function templateMatchesClass(template, cls, sessionTerm) {
  if (!template || template.status !== 'ACTIVE') return false;
  if (sessionTerm && !templateTermMatchesSession(template.term, sessionTerm)) return false;
  if (!cls) return true;

  const level = cls.educationLevel || cls.category || cls.level || cls.education_level;
  if (level && template.academicLevel && !classCategoryMatchesTemplateLevel(level, template.academicLevel)) {
    return false;
  }

  const assignments = template.assignments || [];
  if (assignments.length > 0) {
    return assignments.some((a) => {
      if (a.classId && cls.id && a.classId === cls.id) return true;
      const name = a.class?.stream
        ? `${a.class.name} ${a.class.stream}`
        : a.class?.name || a.className || '';
      return classLabelsMatch(name, cls.label || [cls.name, cls.stream].filter(Boolean).join(' '));
    });
  }

  return true;
}

export function activeTemplateComponents(template) {
  return (template?.components || []).filter((c) => c.isActive !== false);
}
