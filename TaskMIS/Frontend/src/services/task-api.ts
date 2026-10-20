import { api } from './api';
import type {
  DashboardSummary,
  Task,
  TaskDetail,
  Workflow,
  WorkflowInstance,
  WorkflowTemplate,
  Notification,
  TimeEntry,
  RunningTimer,
} from '@/types';

export const taskApi = {
  dashboard: () => api.get<{ data: DashboardSummary }>('/dashboard'),

  tasks: (params?: Record<string, string | undefined>) =>
    api.get<{ data: Task[]; pagination: Record<string, number> }>(
      '/tasks',
      { params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '')) }
    ),

  getTask: (id: string) => api.get<{ data: TaskDetail }>(`/tasks/${id}`),
  createTask: (data: Record<string, unknown>) => api.post<{ data: TaskDetail }>('/tasks', data),
  updateTask: (id: string, data: Record<string, unknown>) => api.put<{ data: TaskDetail }>(`/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete(`/tasks/${id}`),
  updateTaskStatus: (id: string, status: string) => api.patch<{ data: TaskDetail }>(`/tasks/${id}/status`, { status }),

  board: () => api.get<{ data: Record<string, Task[]> }>('/tasks/board'),

  subtasks: (taskId: string) => api.get<{ data: Task[] }>(`/tasks/${taskId}/subtasks`),
  createSubtask: (taskId: string, data: Record<string, unknown>) =>
    api.post<{ data: Task }>(`/tasks/${taskId}/subtasks`, data),

  comments: (taskId: string) => api.get<{ data: any[] }>(`/tasks/${taskId}/comments`),
  addComment: (taskId: string, content: string, mentions: string[] = []) =>
    api.post<{ data: any }>(`/tasks/${taskId}/comments`, { content, mentions }),

  workflows: (params?: Record<string, string | undefined>) =>
    api.get<{ data: Workflow[] }>(
      '/workflows',
      { params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '')) }
    ),

  getWorkflow: (id: string) => api.get<{ data: Workflow }>(`/workflows/${id}`),
  createWorkflow: (data: Record<string, unknown>) => api.post<{ data: Workflow }>('/workflows', data),
  updateWorkflow: (id: string, data: Record<string, unknown>) => api.put<{ data: Workflow }>(`/workflows/${id}`, data),
  deleteWorkflow: (id: string) => api.delete(`/workflows/${id}`),
  startWorkflow: (id: string, taskId?: string) =>
    api.post<{ data: WorkflowInstance }>(`/workflows/${id}/start`, { taskId }),

  workflowTemplates: () => api.get<{ data: WorkflowTemplate[] }>('/workflows/templates'),
  createWorkflowFromTemplate: (templateId: string) =>
    api.post<{ data: Workflow }>('/workflows/from-template', { templateId }),

  workflowInstances: (params?: Record<string, string | undefined>) =>
    api.get<{ data: WorkflowInstance[] }>(
      '/workflows/instances/all',
      { params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '')) }
    ),

  getWorkflowInstance: (instanceId: string) =>
    api.get<{ data: WorkflowInstance }>(`/workflows/instances/${instanceId}`),

  decideWorkflowStep: (workflowId: string, stepId: string, decision: string, comments?: string) =>
    api.post<{ data: WorkflowInstance }>(`/workflows/${workflowId}/decide/${stepId}`, { decision, comments }),

  notifications: (params?: Record<string, string | undefined>) =>
    api.get<{ data: Notification[]; unreadCount: number; pagination: Record<string, number> }>(
      '/notifications',
      { params: Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null && v !== '')) }
    ),

  unreadCount: () => api.get<{ data: { count: number } }>('/notifications/unread-count'),
  markNotificationRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllNotificationsRead: () => api.post('/notifications/read-all'),

  startTimer: (taskId: string) => api.post<{ data: TimeEntry }>('/time-tracking/start', { taskId }),
  stopTimer: (id: string) => api.patch<{ data: TimeEntry }>(`/time-tracking/${id}/stop`),
  runningTimer: () => api.get<{ data: RunningTimer | null }>('/time-tracking/running'),
  timeSummary: (startDate?: string, endDate?: string) =>
    api.get<{ data: { totalHours: number; billableHours: number; nonBillableHours: number; totalEntries: number } }>(
      '/time-tracking/summary',
      { params: Object.fromEntries(Object.entries({ startDate, endDate }).filter(([, v]) => v != null)) }
    ),
  taskTimeEntries: (taskId: string) => api.get<{ data: TimeEntry[] }>(`/time-tracking/task/${taskId}`),
  addTimeEntry: (taskId: string, data: Record<string, unknown>) =>
    api.post<{ data: TimeEntry }>(`/time-tracking/task/${taskId}`, data),
};
