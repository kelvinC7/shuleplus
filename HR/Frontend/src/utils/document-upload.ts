import { hrApi } from '@/services/hr-api';

export async function downloadEmployeeDocument(docId: string, filename: string) {
  const { data } = await hrApi.downloadDocument(docId);
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function uploadEmployeeDocument(employeeId: string, category: string, file: File) {
  const { data } = await hrApi.uploadDocument(employeeId, category, file);
  return data.data;
}
