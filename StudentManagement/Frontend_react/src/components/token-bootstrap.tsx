import { useEffect } from 'react';
import { captureTokenFromUrl } from '@/shared/auth-token';

export function TokenBootstrap() {
  useEffect(() => {
    captureTokenFromUrl();
  }, []);
  return null;
}
