import { getSchoolDateIso } from './schoolTime';

export function periodAttendanceHref(lesson, date) {
  const query = new URLSearchParams();
  const values = {
    className: lesson?.className,
    date: /^\d{4}-\d{2}-\d{2}/.test(String(date || '')) ? String(date).slice(0, 10) : getSchoolDateIso(),
    rollName: [lesson?.subjectName, lesson?.periodLabel].filter(Boolean).join(' · ') || 'Class attendance',
    subject: lesson?.subjectName,
    periodLabel: lesson?.periodLabel,
  };
  Object.entries(values).forEach(([key, value]) => {
    if (value) query.set(key, String(value));
  });
  return `/period-attendance?${query.toString()}`;
}
