/** Parent SMS wording (Kinyarwanda). */

export const SMS_TEMPLATE_SINGLE =
  "Mubyeyi, {message}. Kumubyeyi w'umunyeshuri witwa {student_line}, wiga mu ishuri rya {school_name}. | Shule+";

export const SMS_TEMPLATE_MULTI =
  "Mubyeyi, {message}. Kumubyeyi w'umunyeshuri witwa {students_list}, wiga mu ishuri rya {school_name}. | Shule+";

export const SMS_SIGNATURE_SUFFIX = 'Shule+';

export function formatStudentLine(student: {
  studentName: string;
  className: string | null;
  studentCode: string;
}): string {
  const cls = student.className?.trim();
  if (cls) return `${student.studentName} (${cls}), ${student.studentCode}`;
  return `${student.studentName}, ${student.studentCode}`;
}

/** @deprecated use formatStudentLine */
export function formatStudentRef(student: {
  studentName: string;
  className: string | null;
  studentCode: string;
}): string {
  return formatStudentLine(student);
}
