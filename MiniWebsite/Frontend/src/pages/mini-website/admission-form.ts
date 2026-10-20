export type AdmissionFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'date'
  | 'select'
  | 'textarea'
  | 'file';

export interface AdmissionFormField {
  id: string;
  label: string;
  type: AdmissionFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export const DEFAULT_ADMISSION_FORM: AdmissionFormField[] = [
  { id: 'fullName', label: 'Full name', type: 'text', required: true, placeholder: 'Enter your full name' },
  { id: 'phone', label: 'Phone number', type: 'phone', required: true, placeholder: '078...' },
  { id: 'email', label: 'Email address', type: 'email', placeholder: 'your@email.com' },
  {
    id: 'gradeAppliedFor',
    label: 'Grade applying for',
    type: 'select',
    options: ['Nursery 1', 'Nursery 2', 'Nursery 3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  },
  { id: 'birthDate', label: 'Date of birth', type: 'date' },
  { id: 'parentName', label: 'Parent / guardian name', type: 'text' },
  { id: 'previousSchool', label: 'Previous school', type: 'text' },
  { id: 'message', label: 'Message', type: 'textarea' },
];

export const FIELD_TYPE_LABELS: Record<AdmissionFieldType, string> = {
  text: 'Short text',
  email: 'Email',
  phone: 'Phone',
  date: 'Date',
  select: 'Dropdown',
  textarea: 'Long text',
  file: 'File upload',
};

function slugifyId(label: string) {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return base || `field_${Date.now()}`;
}

export function createAdmissionField(partial?: Partial<AdmissionFormField>): AdmissionFormField {
  const label = partial?.label?.trim() || 'New field';
  return {
    id: partial?.id?.trim() || slugifyId(label),
    label,
    type: partial?.type ?? 'text',
    required: Boolean(partial?.required),
    placeholder: partial?.placeholder,
    options: partial?.options,
  };
}

export function normalizeAdmissionForm(raw: unknown): AdmissionFormField[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_ADMISSION_FORM;
  return raw
    .filter((f) => f && typeof f === 'object' && typeof (f as AdmissionFormField).id === 'string')
    .map((f) => {
      const field = f as AdmissionFormField;
      return {
        id: String(field.id).trim(),
        label: String(field.label ?? field.id).trim(),
        type: (['text', 'email', 'phone', 'date', 'select', 'textarea', 'file'].includes(field.type)
          ? field.type
          : 'text') as AdmissionFieldType,
        required: Boolean(field.required),
        placeholder: field.placeholder ? String(field.placeholder) : undefined,
        options: Array.isArray(field.options) ? field.options.map(String) : undefined,
      };
    })
    .filter((f) => f.id && f.label);
}
