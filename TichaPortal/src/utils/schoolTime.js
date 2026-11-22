const SCHOOL_TIME_ZONE = 'Africa/Kigali';

export function getSchoolDateIso(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  const year = part('year');
  const month = part('month');
  const day = part('day');
  return year && month && day ? `${year}-${month}-${day}` : '';
}

export function getSchoolTimeMinutes(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: SCHOOL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

export function formatSchoolTime(value) {
  if (!value) return '';

  if (value instanceof Date && Number.isNaN(value.getTime())) return '';
  const raw = value instanceof Date ? value.toISOString() : String(value).trim();
  const plainTime = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (plainTime) {
    return `${plainTime[1].padStart(2, '0')}:${plainTime[2]}`;
  }

  const dateTime = raw.match(/^\d{4}-\d{2}-\d{2}[T ](\d{1,2}):(\d{2})/);
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  if (dateTime && !hasTimeZone) {
    return `${dateTime[1].padStart(2, '0')}:${dateTime[2]}`;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SCHOOL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}
