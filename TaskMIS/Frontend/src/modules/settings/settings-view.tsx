'use client';

import { useState } from 'react';
import { taskApi } from '@/services/task-api';
import { TaskPageLayout } from '@/components/task-page-layout';
import { Settings, Workflow, Database, Shield, RefreshCw } from 'lucide-react';

export function SettingsView() {
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesCreated, setTemplatesCreated] = useState(0);

  const handleCreateTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const templates = await taskApi.workflowTemplates();
      for (const t of templates.data.data) {
        await taskApi.createWorkflowFromTemplate(t.id);
      }
      setTemplatesCreated(templates.data.data.length);
    } catch {}
    setTemplatesLoading(false);
  };

  return (
    <TaskPageLayout title="Settings" subtitle="Configure your task management module">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Module Info */}
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-ochre" />
            <h3 className="font-semibold text-navy">Module Information</h3>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Module Name</span><span>Task & Workflow Center</span></div>
            <div className="flex justify-between"><span className="text-muted">Version</span><span>1.0.0</span></div>
            <div className="flex justify-between"><span className="text-muted">Backend Port</span><span>3003</span></div>
            <div className="flex justify-between"><span className="text-muted">Frontend Port</span><span>3004</span></div>
            <div className="flex justify-between"><span className="text-muted">Database</span><span>task_module_db</span></div>
          </div>
        </div>

        {/* Workflow Templates */}
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Workflow size={20} className="text-ochre" />
            <h3 className="font-semibold text-navy">Workflow Templates</h3>
          </div>
          <p className="mt-2 text-sm text-muted">
            Create pre-built workflow templates for common processes.
          </p>
          <div className="mt-4 space-y-2">
            {[
              'School Admission Workflow',
              'Procurement Approval Workflow',
              'Leave Request Workflow',
              'Payment Approval Workflow',
              'Inventory Request Workflow',
              'Event Planning Workflow',
            ].map((name) => (
              <div key={name} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <Workflow size={14} className="text-muted" />
                <span>{name}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleCreateTemplates}
            disabled={templatesLoading}
            className="btn-primary mt-4 w-full"
          >
            {templatesLoading ? 'Creating...' : templatesCreated > 0 ? `Created ${templatesCreated} workflows` : 'Create All Templates'}
          </button>
        </div>

        {/* Roles & Permissions */}
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-ochre" />
            <h3 className="font-semibold text-navy">Roles & Permissions</h3>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { role: 'Super Admin', perms: 'Full access to all features' },
              { role: 'Project Manager', perms: 'Create/manage tasks & workflows' },
              { role: 'Team Lead', perms: 'Assign tasks, approve workflows' },
              { role: 'Employee', perms: 'View assigned tasks, log time' },
              { role: 'Approver', perms: 'Approve/reject workflow steps' },
              { role: 'Auditor', perms: 'View reports & audit logs' },
              { role: 'Viewer', perms: 'Read-only access' },
            ].map((r) => (
              <div key={r.role} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-sm font-medium text-navy">{r.role}</p>
                <p className="text-xs text-muted">{r.perms}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Integrations */}
        <div className="rounded-2xl border border-navy/[0.06] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-ochre" />
            <h3 className="font-semibold text-navy">Module Integrations</h3>
          </div>
          <p className="mt-2 text-sm text-muted">
            Connect with other ShulePlus modules.
          </p>
          <div className="mt-4 space-y-2">
            {[
              { module: 'HR Module', status: 'Connect for employee task assignment' },
              { module: 'Finance Module', status: 'Payment approval workflows' },
              { module: 'Inventory Module', status: 'Stock-related task automation' },
              { module: 'Procurement Module', status: 'Purchase approval workflows' },
              { module: 'Action Plan Module', status: 'Convert plans to tasks' },
              { module: 'Notification Service', status: 'Email & SMS alerts' },
            ].map((i) => (
              <div key={i.module} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-sm font-medium text-navy">{i.module}</p>
                <p className="text-xs text-muted">{i.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TaskPageLayout>
  );
}
