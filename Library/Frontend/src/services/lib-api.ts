import { getToken } from '@/shared/auth-token';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3060/api';

class LibraryApi {
  private serviceKey = 'dev-service-key';

  private headers(token?: string): HeadersInit {
    const t = token ?? getToken();
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-service-key': this.serviceKey,
    };
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  }

  private async request<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: this.headers(token),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.message ?? json?.error ?? `${method} ${path} failed (${res.status})`;
      throw new Error(typeof msg === 'string' ? msg : 'Request failed');
    }
    return json.data ?? json;
  }

  get<T>(path: string, token?: string) { return this.request<T>('GET', path, undefined, token); }
  post<T>(path: string, body?: unknown, token?: string) { return this.request<T>('POST', path, body, token); }
  put<T>(path: string, body?: unknown, token?: string) { return this.request<T>('PUT', path, body, token); }
  del<T>(path: string, token?: string) { return this.request<T>('DELETE', path, undefined, token); }

  // Dashboard
  getDashboard(token?: string) { return this.get<any>('/dashboard', token); }

  // Catalog
  getResources(params?: string, token?: string) { return this.get<any>(`/catalog${params ? `?${params}` : ''}`, token); }
  getResource(id: string, token?: string) { return this.get<any>(`/catalog/${id}`, token); }
  createResource(data: any, token?: string) { return this.post<any>('/catalog', data, token); }
  updateResource(id: string, data: any, token?: string) { return this.put<any>(`/catalog/${id}`, data, token); }
  deleteResource(id: string, token?: string) { return this.del<any>(`/catalog/${id}`, token); }

  // Categories
  getCategories(token?: string) { return this.get<any>('/categories', token); }
  createCategory(data: any, token?: string) { return this.post<any>('/categories', data, token); }
  updateCategory(id: string, data: any, token?: string) { return this.put<any>(`/categories/${id}`, data, token); }
  deleteCategory(id: string, token?: string) { return this.del<any>(`/categories/${id}`, token); }

  // Subjects
  getSubjects(token?: string) { return this.get<any>('/subjects', token); }
  createSubject(data: any, token?: string) { return this.post<any>('/subjects', data, token); }
  updateSubject(id: string, data: any, token?: string) { return this.put<any>(`/subjects/${id}`, data, token); }
  deleteSubject(id: string, token?: string) { return this.del<any>(`/subjects/${id}`, token); }

  // Shelves
  getShelves(token?: string) { return this.get<any>('/shelves', token); }
  createShelf(data: any, token?: string) { return this.post<any>('/shelves', data, token); }
  updateShelf(id: string, data: any, token?: string) { return this.put<any>(`/shelves/${id}`, data, token); }
  deleteShelf(id: string, token?: string) { return this.del<any>(`/shelves/${id}`, token); }

  // Circulation - Loans
  getLoans(params?: string, token?: string) { return this.get<any>(`/circulation/loans${params ? `?${params}` : ''}`, token); }
  borrowBook(data: any, token?: string) { return this.post<any>('/circulation/loans', data, token); }
  returnBook(id: string, data?: any, token?: string) { return this.post<any>(`/circulation/loans/${id}/return`, data ?? {}, token); }
  renewBook(id: string, token?: string) { return this.post<any>(`/circulation/loans/${id}/renew`, {}, token); }
  getOverdue(token?: string) { return this.get<any>('/circulation/overdue', token); }

  // Circulation - Reservations
  getReservations(params?: string, token?: string) { return this.get<any>(`/circulation/reservations${params ? `?${params}` : ''}`, token); }
  createReservation(data: any, token?: string) { return this.post<any>('/circulation/reservations', data, token); }
  cancelReservation(id: string, token?: string) { return this.post<any>(`/circulation/reservations/${id}/cancel`, {}, token); }
  fulfillReservation(id: string, data?: any, token?: string) { return this.post<any>(`/circulation/reservations/${id}/fulfill`, data ?? {}, token); }

  // Members
  getMembers(type?: string, token?: string) { return this.get<any>(`/members${type ? `?type=${type}` : ''}`, token); }

  // Visits
  getVisits(params?: string, token?: string) { return this.get<any>(`/visits${params ? `?${params}` : ''}`, token); }
  checkInVisit(data: any, token?: string) { return this.post<any>('/visits/check-in', data, token); }
  checkOutVisit(id: string, token?: string) { return this.post<any>(`/visits/${id}/check-out`, {}, token); }
  getVisitStats(token?: string) { return this.get<any>('/visits/stats', token); }

  // Requests
  getRequests(params?: string, token?: string) { return this.get<any>(`/requests${params ? `?${params}` : ''}`, token); }
  createRequest(data: any, token?: string) { return this.post<any>('/requests', data, token); }
  reviewRequest(id: string, data: any, token?: string) { return this.post<any>(`/requests/${id}/review`, data, token); }

  // Digital
  getDigitalResources(token?: string) { return this.get<any>('/digital', token); }
  createDigitalResource(data: any, token?: string) { return this.post<any>('/digital', data, token); }
  updateDigitalResource(id: string, data: any, token?: string) { return this.put<any>(`/digital/${id}`, data, token); }
  deleteDigitalResource(id: string, token?: string) { return this.del<any>(`/digital/${id}`, token); }

  // Inventory
  getInventory(params?: string, token?: string) { return this.get<any>(`/inventory${params ? `?${params}` : ''}`, token); }
  updateCopyStatus(id: string, data: any, token?: string) { return this.put<any>(`/inventory/${id}/status`, data, token); }
  getDamaged(token?: string) { return this.get<any>('/inventory/damaged', token); }
  getLost(token?: string) { return this.get<any>('/inventory/lost', token); }
  getTransfers(token?: string) { return this.get<any>('/inventory/transfers', token); }
  createTransfer(data: any, token?: string) { return this.post<any>('/inventory/transfers', data, token); }
  approveTransfer(id: string, data: any, token?: string) { return this.post<any>(`/inventory/transfers/${id}/approve`, data, token); }

  // Settings
  getSettings(token?: string) { return this.get<any>('/settings/library', token); }
  updateSettings(data: any, token?: string) { return this.put<any>('/settings/library', data, token); }

  // Reports
  getReports(token?: string) { return this.get<any>('/reports', token); }

  // Integrations
  searchStudents(q: string, token?: string) {
    return this.get<{ students: Array<{ id: string; fullName: string; studentCode: string; className: string | null }> }>(
      `/integrations/students/search?q=${encodeURIComponent(q)}`, token);
  }
  searchTeachers(q: string, token?: string) {
    return this.get<{ teachers: Array<{ id: string; name: string; department: string | null }> }>(
      `/integrations/teachers/search?q=${encodeURIComponent(q)}`, token);
  }
  searchCopies(q: string, token?: string) {
    return this.get<{ copies: Array<{ id: string; barcode: string; libraryId: string; resource?: { title?: string; author?: string } }> }>(
      `/integrations/copies/search?q=${encodeURIComponent(q)}`, token);
  }
  searchResources(q: string, token?: string) {
    return this.get<{ resources: Array<{ id: string; title: string; author?: string; availableCopies: number; totalCopies: number }> }>(
      `/integrations/resources/search?q=${encodeURIComponent(q)}`, token);
  }

  // Fines
  getFines(params?: string, token?: string) { return this.get<any>(`/fines${params ? `?${params}` : ''}`, token); }
  createFine(data: unknown, token?: string) { return this.post<any>('/fines', data, token); }
  payFine(id: string, data?: unknown, token?: string) { return this.post<any>(`/fines/${id}/pay`, data ?? {}, token); }
  waiveFine(id: string, data?: unknown, token?: string) { return this.post<any>(`/fines/${id}/waive`, data ?? {}, token); }
  deleteFine(id: string, token?: string) { return this.del<any>(`/fines/${id}`, token); }
}

export const libApi = new LibraryApi();
