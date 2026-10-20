'use client';

import { useState } from 'react';
import { Building2, Key, Palette, Plug } from 'lucide-react';

import { DeviceFormModal } from '@/components/device-form-modal';
import { FormField } from '@/components/forms/form-field';
import { ModuleHeader } from '@/components/layout/module-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/auth-context';

export function SettingsView() {
  const { summary } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: summary?.organizationName ?? '',
    timezone: 'Africa/Kigali',
  });

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Settings"
        breadcrumbs={['Home', 'Settings']}
        backHref="/dashboard"
        icon={<SettingsIcon />}
        iconClassName="bg-muted-foreground"
      />

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <CardTitle className="text-base">Organization Settings</CardTitle>
              </div>
              <CardDescription>Tenant-scoped configuration for {summary?.organizationName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-muted">Organization Name</dt>
                  <dd className="font-medium text-navy">{summary?.organizationName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted">Organization ID</dt>
                  <dd className="font-mono text-xs">{summary?.organizationId ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted">Timezone</dt>
                  <dd className="font-medium text-navy">Africa/Kigali</dd>
                </div>
              </dl>
              <Button onClick={() => setOrgOpen(true)}>Edit Organization</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="theme" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="size-4 text-primary" />
                <CardTitle className="text-base">Theme & Appearance</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                <div>
                  <p className="text-sm font-medium">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Use navy dark theme across the app</p>
                </div>
                <Checkbox checked={darkMode} onCheckedChange={(v) => setDarkMode(!!v)} />
              </label>
              <div className="flex gap-3">
                {['#FCB038', '#000435', '#F8FAFC'].map((color) => (
                  <div key={color} className="flex flex-col items-center gap-1">
                    <div className="size-10 rounded-xl border border-border/60 shadow-soft" style={{ background: color }} />
                    <span className="text-[10px] text-muted-foreground">{color}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="size-4 text-primary" />
                <CardTitle className="text-base">Permissions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {['View Records', 'Create Records', 'Delete Records', 'Manage Users', 'Export Data', 'View Audit Log'].map((perm) => (
                <label key={perm} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                  <Checkbox defaultChecked />
                  <span className="text-sm font-medium">{perm}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plug className="size-4 text-primary" />
                <CardTitle className="text-base">Integrations</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'IAM / Authentication', status: 'Connected', desc: 'User identity and licensing' },
                { name: 'Email (SMTP)', status: 'Not configured', desc: 'Transactional email delivery' },
                { name: 'Slack', status: 'Not connected', desc: 'Notification webhooks' },
              ].map((int) => (
                <div key={int.name} className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{int.name}</p>
                    <p className="text-xs text-muted-foreground">{int.desc}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${int.status === 'Connected' ? 'bg-success/12 text-success' : 'bg-muted text-muted-foreground'}`}>
                    {int.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeviceFormModal
        open={orgOpen}
        onOpenChange={setOrgOpen}
        title="Organization Settings"
        description={`Tenant-scoped configuration for ${summary?.organizationName ?? 'your organization'}`}
        size="md"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setOrgOpen(false);
          }}
        >
          <FormField label="Organization Name">
            <input
              className="input"
              value={orgForm.name}
              onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
            />
          </FormField>
          <FormField label="Organization ID">
            <input className="input font-mono text-xs" value={summary?.organizationId ?? ''} disabled />
          </FormField>
          <FormField label="Timezone">
            <input
              className="input"
              value={orgForm.timezone}
              onChange={(e) => setOrgForm({ ...orgForm, timezone: e.target.value })}
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOrgOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Organization
            </button>
          </div>
        </form>
      </DeviceFormModal>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
