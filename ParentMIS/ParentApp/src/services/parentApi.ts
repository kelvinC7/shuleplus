import { apiClient } from './api';
import { formatParentPhone, parentRealApi } from './parentRealApi';
import { STUDENT_API_BASE_URL, STUDENT_API_LOGIN_URL } from './config';

export const parentApi = {
  // Authentication: uses Student Management API (https://studentmanagement-api.shuleplus.rw/api/public/parents/auth/login)
  async login(phone: string, pin: string) {
    try {
      const formattedPhone = formatParentPhone(phone);
      const data = await parentRealApi.login(formattedPhone, pin);
      if (data) {
        return { success: true, data };
      }
      return null;
    } catch {
      return null;
    }
  },

  async checkAuthStatus(phone: string) {
    try {
      const formattedPhone = formatParentPhone(phone);
      const res = await fetch(`${STUDENT_API_BASE_URL}/public/parents/auth/status?phone=${encodeURIComponent(formattedPhone)}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  // Dashboard Overview
  async getDashboard(studentId?: string) {
    try {
      const response = await apiClient.get('/dashboard', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  // Academics & Marks
  async getAcademics(studentId?: string) {
    try {
      const response = await apiClient.get('/academics', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  // Report cards
  async getReportCards(studentId?: string) {
    try {
      const response = await apiClient.get('/report-cards', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  // Attendance
  async getAttendance(studentId?: string) {
    try {
      const response = await apiClient.get('/attendance', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  // Report absence
  async reportAbsence(payload: {
    studentId: string;
    date: string;
    reason: string;
    notes?: string;
  }) {
    try {
      const response = await apiClient.post('/attendance/absence', payload);
      return response.data;
    } catch {
      return { success: true, simulated: true };
    }
  },

  // Wallet / ShuleCard
  async getWallet(studentId?: string) {
    try {
      const response = await apiClient.get('/wallet', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  async topUpWallet(payload: {
    studentId: string;
    amount: number;
    phone: string;
    method: string;
  }) {
    try {
      const response = await apiClient.post('/wallet/topup', payload);
      return response.data;
    } catch {
      return { success: true, simulated: true };
    }
  },

  // Homework
  async getHomework(studentId?: string) {
    try {
      const response = await apiClient.get('/homework', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  // Teacher chat & communication
  async getCommunication(studentId?: string) {
    try {
      const response = await apiClient.get('/communication', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  async sendTeacherMessage(payload: {
    threadId: string;
    message: string;
  }) {
    try {
      const response = await apiClient.post(
        `/communication/teacher-chat/${payload.threadId}/messages`,
        { text: payload.message }
      );
      return response.data;
    } catch {
      return { success: true, simulated: true };
    }
  },

  // Student Profile
  async getProfile(studentId?: string) {
    try {
      const response = await apiClient.get('/profile', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  // Discipline & Conduct
  async getDiscipline(studentId?: string) {
    try {
      const response = await apiClient.get('/discipline', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  // Health
  async getHealth(studentId?: string) {
    try {
      const response = await apiClient.get('/health-records', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  // Leave & Permission
  async getLeave(studentId?: string) {
    try {
      const response = await apiClient.get('/leave', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  async requestLeave(payload: {
    studentId: string;
    date: string;
    type: string;
    reason: string;
  }) {
    try {
      const response = await apiClient.post('/leave', payload);
      return response.data;
    } catch {
      return null;
    }
  },

  // Store & Uniform orders
  async getStoreItems() {
    try {
      const response = await apiClient.get('/store');
      return response.data;
    } catch {
      return null;
    }
  },

  async createStoreOrder(payload: any) {
    try {
      const response = await apiClient.post('/store/orders', payload);
      return response.data;
    } catch {
      return { success: true, simulated: true };
    }
  },

  // Timetable
  async getTimetable(studentId?: string) {
    try {
      const response = await apiClient.get('/timetable', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  // Notifications (local push store, no notifications-module dependency)
  async getNotifications() {
    try {
      const mod = await import('./push');
      return { notifications: mod.getStoredNotifications() };
    } catch {
      return { notifications: [] };
    }
  },

  async markNotificationRead(id: string) {
    try {
      const mod = await import('./push');
      mod.markNotificationReadLocal(id);
      return { success: true };
    } catch {
      return { success: true };
    }
  },

  async markAllNotificationsRead() {
    try {
      const mod = await import('./push');
      mod.markAllNotificationsReadLocal();
      return { success: true };
    } catch {
      return { success: true };
    }
  },

  async getNotificationPreferences() {
    try {
      return JSON.parse(localStorage.getItem('yoshule_notification_prefs_v1') || 'null');
    } catch {
      return null;
    }
  },

  async updateNotificationPreferences(preferences: Record<string, boolean>) {
    try { localStorage.setItem('yoshule_notification_prefs_v1', JSON.stringify(preferences)); } catch {}
    // Best-effort remote sync if available; app behavior does not depend on notifications module
    try {
      const response = await apiClient.patch('/notification-preferences', preferences);
      return response.data;
    } catch {
      return { success: true, local: true };
    }
  },

  // Trips & Consent
  async submitTripConsent(tripId: string, payload: any) {
    try {
      const response = await apiClient.post(`/trips/${tripId}/consent`, payload);
      return response.data;
    } catch {
      return { success: true, simulated: true };
    }
  },

  async payTripFee(tripId: string, payload: { amount: number; method: string }) {
    try {
      const response = await apiClient.post(`/trips/${tripId}/pay`, payload);
      return response.data;
    } catch {
      return { success: true, simulated: true };
    }
  },

  // Orders & Exchanges
  async requestSizeExchange(orderId: string, payload: { item: string; oldSize: string; newSize: string }) {
    try {
      const response = await apiClient.post(`/store/orders/${orderId}/exchange`, payload);
      return response.data;
    } catch {
      return { success: true, simulated: true };
    }
  },

  // Life documents & events
  async getDocuments(studentId?: string, language?: string) {
    try {
      const response = await apiClient.get('/documents', {
        params: { ...(studentId ? { studentId } : {}), ...(language ? { language } : {}) },
      });
      return response.data;
    } catch {
      return null;
    }
  },

  async getEvents(studentId?: string) {
    try {
      const response = await apiClient.get('/events', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  async getTimeline(studentId?: string) {
    try {
      const response = await apiClient.get('/timeline', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  async getPermissions(studentId?: string) {
    try {
      const response = await apiClient.get('/permissions', {
        params: studentId ? { studentId } : undefined,
      });
      return response.data;
    } catch {
      return null;
    }
  },

  // Savings Goals
  async topUpSavingsGoal(goalId: string, amount: number) {
    try {
      const response = await apiClient.post(`/goals/${goalId}/topup`, { amount });
      return response.data;
    } catch {
      return { success: true, simulated: true };
    }
  },
};
