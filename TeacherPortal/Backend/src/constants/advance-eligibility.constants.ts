export type AdvanceEligibilityStatus =
  | 'payroll_not_connected'
  | 'profile_not_linked'
  | 'advance_not_enabled'
  | 'salary_pending'
  | 'cap_reached'
  | 'ready';

export const ADVANCE_ELIGIBILITY_MESSAGES: Record<AdvanceEligibilityStatus, string> = {
  payroll_not_connected:
    'Your school has not connected Payroll yet. Salary Advance becomes available after HR registers staff and Payroll syncs salaries to Teacher Portal.',
  profile_not_linked:
    'Your employee record is not linked yet. Ask HR to register you using the same email you use to sign in, then ask Payroll to save your salary package.',
  advance_not_enabled:
    'Salary Advance is not enabled on your employee record. Contact HR or your payroll administrator.',
  salary_pending:
    'Your net salary has not been received from Payroll yet. It updates when payroll saves your package or marks a salary run as paid.',
  cap_reached: 'You have reached your monthly salary advance limit.',
  ready: 'You can request a salary advance.',
};
