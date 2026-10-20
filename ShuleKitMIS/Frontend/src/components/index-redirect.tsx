import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { captureTokenFromUrl, getToken, isTokenExpired } from '@/shared/auth-token';

export default function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    captureTokenFromUrl();
    const token = getToken();
    navigate(token && !isTokenExpired() ? '/home' : '/order', { replace: true });
  }, [navigate]);
  return null;
}
