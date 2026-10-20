export type StaffSource = 'hr' | 'iam' | 'timetable';

export function staffSourceLabel(source?: StaffSource) {
  if (source === 'hr') return 'HR';
  if (source === 'iam') return 'Users & Access';
  if (source === 'timetable') return 'Timetable';
  return '';
}
