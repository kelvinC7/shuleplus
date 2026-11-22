import { Navigate, useLocation } from 'react-router-dom';

/** IAM opens most modules at `/dashboard?token=...` · ShuleTrip school UI lives under `/school`. */
export function IamSchoolEntryRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/school/dashboard${search}`} replace />;
}

export function IamHomeEntryRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/school/dashboard${search}`} replace />;
}
