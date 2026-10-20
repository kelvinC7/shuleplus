export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong') {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  );
}
