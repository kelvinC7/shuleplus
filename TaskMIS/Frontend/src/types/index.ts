export interface JwtUser {
  sub: string;
  email: string;
  organizationId: string;
  roles: string[];
  modules: string[];
}

export interface DashboardSummary {
  organizationId: string;
  organizationName: string;
  status: string;
  kpis: {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    overdueTasks: number;
    pendingApprovals: number;
    completionRate: number;
    avgCompletionTime: number;
    slaCompliance: number;
  };
  tasksByPriority: Record<string, number>;
  tasksByStatus: Record<string, number>;
  recentTasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    assignedToName: string | null;
    dueDate: string | null;
    progress: number;
    createdAt: string;
  }[];
  departmentWorkload: {
    departmentId: string;
    departmentName: string;
    activeTasks: number;
    completedTasks: number;
    totalTasks: number;
  }[];
  employeeWorkload: {
    userId: string;
    userName: string;
    activeTasks: number;
  }[];
  workflowStats: {
    totalWorkflows: number;
    activeInstances: number;
    completedInstances: number;
    failedInstances: number;
    executionRate: number;
  };
  bottleneckWorkflows: {
    instanceId: string;
    workflowName: string;
    currentStep: string;
    assignee: string;
    startedAt: string;
    daysInQueue: number;
  }[];
  dailyActivity: {
    date: string;
    created: number;
    completed: number;
  }[];
  recentActivity: {
    id: string;
    userId: string | null;
    userName: string | null;
    entityType: string;
    entityId: string;
    action: string;
    details: unknown;
    createdAt: string;
  }[];
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  approvalStatus: string;
  createdById: string;
  createdByName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  assignedType: string;
  departmentId: string | null;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
  progress: number;
  tags: string[];
  parentTaskId: string | null;
  workflowId: string | null;
  isRecurring: boolean;
  subtaskCount: number;
  completedSubtasks: number;
  checklistTotal: number;
  checklistCompleted: number;
  commentCount: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetail extends Task {
  subtasks: Task[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  dependencies: TaskDependency[];
  dependentOn: TaskDependency[];
  checklistItems: ChecklistItem[];
  timeEntries: TimeEntry[];
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  mentions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  filename: string;
  filePath: string;
  mimeType: string | null;
  fileSize: number | null;
  uploadedById: string;
  uploadedByName: string | null;
  createdAt: string;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnId: string;
  dependsOnTitle?: string;
  taskTitle?: string;
  taskStatus?: string;
}

export interface ChecklistItem {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  triggerEvent: string | null;
  isActive: boolean;
  version: number;
  createdBy: string;
  steps: WorkflowStep[];
  instances?: WorkflowInstance[];
  instanceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  order: number;
  assigneeRole: string | null;
  assigneeId: string | null;
  conditions: unknown;
  config: unknown;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName?: string;
  taskId: string | null;
  status: string;
  startedBy: string;
  startedAt: string;
  completedAt: string | null;
  steps: WorkflowStepInstance[];
}

export interface WorkflowStepInstance {
  id: string;
  stepId?: string;
  stepName?: string;
  status: string;
  assigneeName: string | null;
  decidedAt: string | null;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  steps: { name: string; type: string; order: number }[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  taskId: string | null;
  workflowId: string | null;
  isRead: boolean;
  metadata: unknown;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  userName: string | null;
  entryType: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  description: string | null;
  isBillable: boolean;
  createdAt: string;
}

export interface RunningTimer {
  id: string;
  taskId: string;
  taskTitle: string;
  startTime: string;
  elapsedSeconds: number;
}
