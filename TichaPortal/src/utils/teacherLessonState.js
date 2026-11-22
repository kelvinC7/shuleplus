import { formatSchoolTime } from './schoolTime';

function timeMinutes(value) {
  const match = formatSchoolTime(value).match(/^(\d{2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

export function getTeacherLessonState(lesson, schoolMinutes) {
  if (lesson?.lessonStatus === 'COMPLETED' || lesson?.phase === 'done') {
    return { label: 'Done', tone: 'green' };
  }
  if (['MISSED', 'ABSENT'].includes(String(lesson?.lessonStatus || '').toUpperCase())) {
    return { label: 'Missed', tone: 'red' };
  }

  const start = timeMinutes(lesson?.startTime);
  const end = timeMinutes(lesson?.endTime);
  const attended = Boolean(
    lesson?.qrVerified || lesson?.scannedAt || lesson?.entryTime || lesson?.entry_time
  );
  if (schoolMinutes != null && start != null) {
    if (schoolMinutes < start) return { label: 'Next', tone: 'navy' };
    if (end != null && schoolMinutes >= end) {
      return attended
        ? { label: 'Attended', tone: 'green' }
        : { label: 'Missed', tone: 'red' };
    }
    return attended
      ? { label: 'In class', tone: 'green' }
      : { label: 'Now', tone: 'amber' };
  }

  if (lesson?.phase === 'current') {
    return attended
      ? { label: 'In class', tone: 'green' }
      : { label: 'Now', tone: 'amber' };
  }
  return { label: 'Next', tone: 'navy' };
}
