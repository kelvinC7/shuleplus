'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive, Copy, Pencil, Send } from 'lucide-react';
import { smsBulkApi, type SmsTemplate } from '@/lib/sms-bulk-api';
import { useToast } from '@/shared/notifications/toast/toast';
import { SmsCard, SmsDataPanel, SmsPageShell, SmsStatusPill, smsBtnOutline, smsBtnPrimary, smsInputClass, smsSelectClass } from './sms-page-shell';

const CATEGORIES = ['Fees', 'Academic', 'Attendance', 'Gate', 'Discipline', 'Announcements', 'Events', 'Congratulations', 'Exams', 'Parent'] as const;

const CATEGORY_ICON: Record<string, string> = {
  Fees: '💰',
  Academic: '🎓',
  Attendance: '🕐',
  Gate: '🚪',
  Discipline: '⚠️',
  Announcements: '📢',
  Events: '📅',
  Congratulations: '🎉',
  Exams: '📝',
  Parent: '👨‍👩‍👧',
};

export function TemplatesView() {
  const toast = useToast();
  const [rows, setRows] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [editing, setEditing] = useState<SmsTemplate | null>(null);
  const [draft, setDraft] = useState({ name: '', category: 'Fees' as SmsTemplate['category'], body: '' });

  useEffect(() => {
    smsBulkApi
      .templates()
      .then(setRows)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [toast]);

  const filtered = useMemo(() => {
    if (category === 'All') return rows;
    return rows.filter((t) => t.category === category);
  }, [rows, category]);

  function useTemplate(t: SmsTemplate) {
    toast.info(`Template loaded into the composer — ${t.name}.`);
    window.location.href = `/super-admin/sms-bulk/send`;
  }

  function startEdit(t: SmsTemplate) {
    setEditing(t);
    setDraft({ name: t.name, category: t.category, body: t.body });
  }

  function saveEdit() {
    if (!draft.name.trim() || !draft.body.trim()) {
      toast.error('Name and body are required.');
      return;
    }
    setRows((prev) =>
      prev.map((t) => (t.id === editing?.id ? { ...t, ...draft } : t))
    );
    toast.success('Template updated.');
    setEditing(null);
  }

  function duplicate(t: SmsTemplate) {
    setRows((prev) => [...prev, { ...t, id: `tpl-copy-${Date.now()}`, name: `${t.name} (Copy)`, usage: 0 }]);
    toast.success(`“${t.name}” duplicated.`);
  }

  function archive(t: SmsTemplate) {
    setRows((prev) => prev.map((r) => (r.id === t.id ? { ...r, status: r.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED' } : r)));
    toast.success(`“${t.name}” ${t.status === 'ARCHIVED' ? 'restored' : 'archived'}.`);
  }

  return (
    <SmsPageShell
      title="SMS Templates"
      description="A reusable library of personalized message templates."
      actions={
        <button
          type="button"
          className={smsBtnPrimary}
          onClick={() => {
            setEditing({ id: 'new', name: '', category: 'Fees', body: '', status: 'ACTIVE', usage: 0 });
            setDraft({ name: '', category: 'Fees', body: '' });
          }}
        >
          + New Template
        </button>
      }
    >
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory('All')}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${category === 'All' ? 'border-primary bg-primary text-navy' : 'border-border bg-white text-muted hover:border-primary/40'}`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${category === c ? 'border-primary bg-primary text-navy' : 'border-border bg-white text-muted hover:border-primary/40'}`}
          >
            {CATEGORY_ICON[c]} {c}
          </button>
        ))}
      </div>

      <SmsDataPanel loading={loading} loadingLabel="Loading templates…">
        {filtered.length === 0 ? (
          <div className="py-14 text-center text-sm text-muted">No templates in this category.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => (
              <SmsCard key={t.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-navy">{CATEGORY_ICON[t.category]} {t.name}</p>
                    <p className="text-[11px] text-muted">{t.category} · used {t.usage.toLocaleString()}×</p>
                  </div>
                  <SmsStatusPill status={t.status} />
                </div>
                <p className="mt-3 flex-1 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-navy">{t.body}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => useTemplate(t)} className={smsBtnPrimary}>
                    <Send className="h-3.5 w-3.5" /> Use
                  </button>
                  <button type="button" onClick={() => startEdit(t)} className={smsBtnOutline}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button type="button" onClick={() => duplicate(t)} className={smsBtnOutline}>
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  <button type="button" onClick={() => archive(t)} className={smsBtnOutline}>
                    <Archive className="h-3.5 w-3.5" /> {t.status === 'ARCHIVED' ? 'Restore' : 'Archive'}
                  </button>
                </div>
              </SmsCard>
            ))}
          </div>
        )}
      </SmsDataPanel>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-navy">{editing.id === 'new' ? 'New template' : `Edit template — ${editing.name}`}</h2>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-muted">Name</span>
                <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className={`${smsInputClass} mt-1`} />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Category</span>
                <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as SmsTemplate['category'] }))} className={`${smsSelectClass} mt-1 w-full`}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted">Message body</span>
                <textarea value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} rows={4} className={`${smsInputClass} mt-1`} />
              </label>
              <p className="text-[11px] text-muted">
                Variables: {'{{parent_name}}'} {'{{student_name}}'} {'{{balance}}'} {'{{school_name}}'} {'{{academic_year}}'} {'{{term}}'}
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={smsBtnOutline} onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className={smsBtnPrimary} onClick={saveEdit}>{editing.id === 'new' ? 'Create template' : 'Save changes'}</button>
            </div>
          </div>
        </div>
      )}
    </SmsPageShell>
  );
}
