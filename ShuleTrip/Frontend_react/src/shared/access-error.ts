import axios from 'axios';

export type AccessFailureCode =
  | 'missing_token'
  | 'module_not_licensed'
  | 'session_rejected'
  | 'tenant_missing'
  | 'network'
  | 'unknown';

export function classifySchoolAccessFailure(err: unknown): AccessFailureCode {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'network';
    const status = err.response.status;
    const msg = String(err.response.data?.message ?? '').toLowerCase();

    if (status === 401) return 'session_rejected';
    if (status === 403 && msg.includes('tenant')) return 'tenant_missing';
    if (status === 403 && msg.includes('module')) return 'module_not_licensed';
    if (status === 403) return 'module_not_licensed';
  }
  return 'unknown';
}
