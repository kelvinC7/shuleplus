'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';

import { DeviceFormModal } from '@/components/device-form-modal';
import { FormField } from '@/components/forms/form-field';
import { ModuleHeader } from '@/components/layout/module-header';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { HelperText } from '@/components/typography';
import { api } from '@/services/api';

export function CreateRecordView() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/records', { title: title.trim(), description: description.trim() || null });
      const id = res.data.data?.id;
      setOpen(false);
      router.push(id ? `/records/${id}` : '/records');
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) router.push('/records');
  }

  return (
    <>
      <div className="space-y-6">
        <ModuleHeader
          title="Create Record"
          breadcrumbs={['Home', 'Records', 'Create']}
          backHref="/records"
          icon={<FileIcon />}
          iconClassName="bg-primary"
        />
        <div className="hr-card flex flex-col items-center justify-center p-10 text-center">
          <p className="text-sm text-muted">Create a new record in your tenant workspace.</p>
          <button type="button" className="btn-primary mt-4" onClick={() => setOpen(true)}>
            Open Create Form
          </button>
        </div>
      </div>

      <DeviceFormModal
        open={open}
        onOpenChange={handleOpenChange}
        title="Create Record"
        description="Add a new record to your tenant workspace"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <FormField label="Record Title" required>
              <input
                id="title"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Budget Report"
                required
              />
            </FormField>
            <HelperText>A clear, descriptive title for this record.</HelperText>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FormField label="Department">
                <Select value={department} onValueChange={(v) => setDepartment(v ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="it">IT</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <div className="space-y-2">
              <FormField label="Priority">
                <Select value={priority} onValueChange={(v) => setPriority(v ?? '')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </div>

          <FormField label="Description">
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Optional details about this record…"
            />
          </FormField>

          <div className="flex justify-end gap-3 border-t border-border/60 pt-4">
            <Link href="/records">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving || !title.trim()}>
              <Save className="mr-1.5 size-4" />
              {saving ? 'Saving…' : 'Save Record'}
            </Button>
          </div>
        </form>
      </DeviceFormModal>
    </>
  );
}

function FileIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
