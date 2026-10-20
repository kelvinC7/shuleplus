export function validateTeacherPassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain one lowercase letter';
  if (!/\d/.test(password)) return 'Password must contain one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain one special character';
  return null;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
