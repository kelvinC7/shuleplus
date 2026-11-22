import type { ToastVariant } from '@/components/ui/toast-provider';

type LoginToastPayload = {
  title: string;
  description: string;
  variant: ToastVariant;
};

export function loginErrorToast(
  status: number | undefined,
  message: string,
  portal: 'school' | 'government',
  code?: string
): LoginToastPayload {
  if (
    portal === 'school' &&
    status === 403 &&
    (code === 'REGISTRATION_PENDING' ||
      message.toLowerCase().includes('waiting for review') ||
      message.toLowerCase().includes('being reviewed'))
  ) {
    return {
      variant: 'warning',
      title: 'Registration under review',
      description: message,
    };
  }

  if (portal === 'school' && status === 403) {
    return {
      variant: 'error',
      title: 'School account not available',
      description: message,
    };
  }

  if (portal === 'school' && status === 401) {
    return {
      variant: 'error',
      title: 'Could not sign in',
      description: message,
    };
  }

  if (status === 401) {
    return {
      variant: 'error',
      title: 'Sign in failed',
      description: message || 'Username or password is incorrect.',
    };
  }

  return {
    variant: 'error',
    title: 'Sign in failed',
    description: message,
  };
}
