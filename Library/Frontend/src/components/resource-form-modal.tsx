'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { LibModal, FormField, ModalFooter } from '@/components/lib-modal';
import { libApi } from '@/services/lib-api';
import type { BookResource, ResourceCategory, Subject, ShelfLocation } from '@/types';

export type ResourceFormData = {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publicationYear: string;
  edition: string;
  language: string;
  description: string;
  categoryId: string;
  subjectId: string;
  shelfLocationId: string;
  totalCopies: string;
  classLevel: string;
  academicYear: string;
  bookCode: string;
};

export const emptyResourceForm = (): ResourceFormData => ({
  title: '',
  author: '',
  isbn: '',
  publisher: '',
  publicationYear: '',
  edition: '',
  language: 'English',
  description: '',
  categoryId: '',
  subjectId: '',
  shelfLocationId: '',
  totalCopies: '1',
  classLevel: '',
  academicYear: '',
  bookCode: '',
});

export function resourceToForm(r: BookResource): ResourceFormData {
  return {
    title: r.title,
    author: r.author ?? '',
    isbn: r.isbn ?? '',
    publisher: r.publisher ?? '',
    publicationYear: r.publicationYear ? String(r.publicationYear) : '',
    edition: r.edition ?? '',
    language: r.language ?? 'English',
    description: r.description ?? '',
    categoryId: r.categoryId ?? '',
    subjectId: r.subjectId ?? '',
    shelfLocationId: r.shelfLocationId ?? '',
    totalCopies: String(r.totalCopies ?? 1),
    classLevel: r.classLevel ?? '',
    academicYear: r.academicYear ?? '',
    bookCode: r.bookCode ?? '',
  };
}

interface ResourceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: BookResource | null;
}

export function ResourceFormModal({ open, onClose, onSaved, editing }: ResourceFormModalProps) {
  const [form, setForm] = useState<ResourceFormData>(emptyResourceForm());
  const [categories, setCategories] = useState<ResourceCategory[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [shelves, setShelves] = useState<ShelfLocation[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(editing ? resourceToForm(editing) : emptyResourceForm());
    setError('');
    Promise.all([
      libApi.getCategories(),
      libApi.getSubjects(),
      libApi.getShelves(),
    ]).then(([cats, subs, sh]) => {
      setCategories(Array.isArray(cats) ? cats : cats.categories ?? []);
      setSubjects(Array.isArray(subs) ? subs : subs.subjects ?? []);
      setShelves(Array.isArray(sh) ? sh : sh.shelves ?? []);
    }).catch(() => {});
  }, [open, editing]);

  const set = (field: keyof ResourceFormData, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        author: form.author || undefined,
        isbn: form.isbn || undefined,
        publisher: form.publisher || undefined,
        publicationYear: form.publicationYear ? Number(form.publicationYear) : undefined,
        edition: form.edition || undefined,
        language: form.language || 'English',
        description: form.description || undefined,
        categoryId: form.categoryId || undefined,
        subjectId: form.subjectId || undefined,
        shelfLocationId: form.shelfLocationId || undefined,
        classLevel: form.classLevel || undefined,
        academicYear: form.academicYear || undefined,
        bookCode: form.bookCode || undefined,
        ...(editing ? {} : { totalCopies: form.totalCopies ? Number(form.totalCopies) : 1 }),
      };
      if (editing) {
        await libApi.updateResource(editing.id, payload);
      } else {
        await libApi.createResource(payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LibModal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Resource' : 'Add Resource'}
      subtitle={editing ? 'Update book details' : 'Add a new book to the catalog'}
      size="xl"
      footer={
        <ModalFooter
          formId="resource-form"
          onCancel={onClose}
          submitLabel={editing ? 'Update Resource' : 'Create Resource'}
          loading={saving}
        />
      }
    >
      <form id="resource-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-danger">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Title" required className="sm:col-span-2">
            <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required autoFocus />
          </FormField>
          <FormField label="Author">
            <input className="input" value={form.author} onChange={(e) => set('author', e.target.value)} />
          </FormField>
          <FormField label="ISBN">
            <input className="input" value={form.isbn} onChange={(e) => set('isbn', e.target.value)} />
          </FormField>
          <FormField label="Publisher">
            <input className="input" value={form.publisher} onChange={(e) => set('publisher', e.target.value)} />
          </FormField>
          <FormField label="Publication Year">
            <input className="input" type="number" value={form.publicationYear} onChange={(e) => set('publicationYear', e.target.value)} />
          </FormField>
          <FormField label="Edition">
            <input className="input" value={form.edition} onChange={(e) => set('edition', e.target.value)} />
          </FormField>
          <FormField label="Language">
            <input className="input" value={form.language} onChange={(e) => set('language', e.target.value)} />
          </FormField>
          {!editing && (
            <FormField label="Number of Copies">
              <input className="input" type="number" min="1" value={form.totalCopies} onChange={(e) => set('totalCopies', e.target.value)} />
            </FormField>
          )}
          <FormField label="Category">
            <select className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Subject">
            <select className="input" value={form.subjectId} onChange={(e) => set('subjectId', e.target.value)}>
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Shelf Location">
            <select className="input" value={form.shelfLocationId} onChange={(e) => set('shelfLocationId', e.target.value)}>
              <option value="">Select shelf</option>
              {shelves.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.building} · {s.section} · {s.shelf}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Class Level">
            <input className="input" value={form.classLevel} onChange={(e) => set('classLevel', e.target.value)} placeholder="e.g. S3" />
          </FormField>
          <FormField label="Academic Year">
            <input className="input" value={form.academicYear} onChange={(e) => set('academicYear', e.target.value)} placeholder="e.g. 2026" />
          </FormField>
          <FormField label="Book Code">
            <input className="input" value={form.bookCode} onChange={(e) => set('bookCode', e.target.value)} />
          </FormField>
          <FormField label="Description" className="sm:col-span-2">
            <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </FormField>
        </div>
      </form>
    </LibModal>
  );
}
