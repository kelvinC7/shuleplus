import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { captureTokenFromUrl } from '@/shared/auth-token';

export default function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    captureTokenFromUrl();
    navigate('/home', { replace: true });
  }, [navigate]);
  return null;
}
