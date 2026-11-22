import { useAuth } from '../../auth/AuthContext';

export function useToken() {
  const { token } = useAuth();
  return token;
}
