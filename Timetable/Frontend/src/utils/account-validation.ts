export interface PasswordCheck {
  label: string;
  ok: boolean;
}

export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'One uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'One number', ok: /\d/.test(password) },
    { label: 'One special character', ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function validatePassword(password: string): string | null {
  const failed = passwordChecks(password).find((c) => !c.ok);
  return failed ? `Password must meet: ${failed.label.toLowerCase()}` : null;
}

/** Admin manual reset — minimum length only (IAM policy). */
export function validateManualPassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

export function passwordStrength(password: string): { score: number; label: string } {
  const checks = passwordChecks(password);
  const score = checks.filter((c) => c.ok).length;
  if (score <= 2) return { score: score / checks.length, label: 'Weak' };
  if (score <= 4) return { score: score / checks.length, label: 'Fair' };
  return { score: score / checks.length, label: 'Strong' };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function normalizeRwandaPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('250') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('07') && digits.length === 10) return `+250${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith('7')) return `+250${digits}`;
  return null;
}

export function isValidRwandaPhone(input: string): boolean {
  return normalizeRwandaPhone(input) !== null;
}
