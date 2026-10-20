'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { TermYearBar } from '@/components/term-year-bar';
import { HrPageLayout } from '@/components/hr-page-layout';
import { AvatarInitials, HrDataTable, PillBadge, type HrTableColumn } from '@/components/hr-data-table';
import { StatusBadge } from '@/components/status-badge';
import { FormField, SelectField, TextField } from '@/components/form-fields';
import { timetableApi } from '@/services/timetable-api';
import { classOptionLabel } from '@/utils/class-label';
import { useAcademicSettings } from '@/contexts/academic-settings-context';
import type { TeacherAssignment } from '@/types';
import { currentAcademicYear } from '@/types';

const EMPTY_FORM_BASE = {
  teacherUserId: '',
  teacherName: '',
  className: '',
  subjectName: '',
  periodsPerWeek: 3,
  room: '',
  term: 'Term 1',
  academicYear: currentAcademicYear(),
};

export function TeacherAssignmentsView() {
  const { term, academicYear, setTerm, setAcademicYear, settings: academicSettings } =
    useAcademicSettings();
  const [rows, setRows] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM_BASE, term, academicYear });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [academicClasses, setAcademicClasses] = useState<{ value: string; label: string }[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [{ data }, academic] = await Promise.all([
        timetableApi.listAssignments({ term, academic_year: academicYear }),
        timetableApi.academicClasses(term, academicYear).catch(() => null),
      ]);
      setRows(data.data);
      const fromAcademic = (academic?.data.data.classes ?? []).map((c) => ({
        value: classOptionLabel(c),
        label: classOptionLabel(c),
      }));
      setAcademicClasses(fromAcademic);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [term, academicYear]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.className.toLowerCase().includes(q) ||
        r.subjectName.toLowerCase().includes(q) ||
        r.teacherName.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPeriods = rows.reduce((s, r) => s + r.periodsPerWeek, 0);

  async function handleSubmit() {
    setBusy(true);
    try {
      if (editingId) {
        await timetableApi.updateAssignment(editingId, form);
        toast.success('Assignment updated');
      } else {
        await timetableApi.createAssignment(form);
        toast.success('Assignment created');
      }
      setForm({ ...EMPTY_FORM_BASE, term, academicYear });
      setEditingId(null);
      setShowForm(false);
      await load();
    } catch {
      toast.error('Failed to save assignment');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(row: TeacherAssignment) {
    setEditingId(row.id);
    setForm({
      teacherUserId: row.teacherUserId,
      teacherName: row.teacherName,
      className: row.className,
      subjectName: row.subjectName,
      periodsPerWeek: row.periodsPerWeek,
      room: row.room ?? '',
      term: row.term,
      academicYear: row.academicYear,
    });
    setShowForm(true);
  }

  const columns: HrTableColumn<TeacherAssignment>[] = [
    {
      key: 'class',
      header: 'Class',
      sortable: true,
      render: (row) => <PillBadge tone="blue">{row.className}</PillBadge>,
    },
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      render: (row) => <span className="font-semibold text-navy">{row.subjectName}</span>,
    },
    {
      key: 'teacher',
      header: 'Teacher',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <AvatarInitials name={row.teacherName} seed={row.teacherUserId} />
          <div>
            <p className="font-semibold text-navy">{row.teacherName}</p>
            <p className="text-xs text-muted">{row.teacherUserId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'periods',
      header: 'Periods / Week',
      sortable: true,
      render: (row) => <span className="font-bold text-primary">{row.periodsPerWeek}</span>,
    },
    {
      key: 'room',
      header: 'Room',
      render: (row) => <span className="text-muted">{row.room ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <TermYearBar
        term={term}
        academicYear={academicYear}
        onTermChange={setTerm}
        onYearChange={setAcademicYear}
        terms={academicSettings?.terms}
        academicYears={academicSettings?.academicYears}
      />

      <HrPageLayout
        actions={
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setForm({ ...EMPTY_FORM_BASE, term, academicYear });
            }}
          >
            <Plus size={16} /> Add assignment
          </button>
        }
        kpis={[
          { label: 'Assignments', value: rows.length },
          { label: 'Periods / Week', value: totalPeriods },
          { label: 'Classes', value: new Set(rows.map((r) => r.className)).size },
          { label: 'Teachers', value: new Set(rows.map((r) => r.teacherUserId)).size },
        ]}
      >
        <div className="hr-card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="input pl-9"
              placeholder="Search class, subject, teacher…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {showForm ? (
          <div className="hr-card space-y-4 p-5 sm:p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-navy">
              {editingId ? 'Edit assignment' : 'New assignment'}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                label="Teacher name"
                required
                value={form.teacherName}
                onChange={(v) => setForm({ ...form, teacherName: v })}
              />
              <TextField
                label="Teacher user ID"
                required
                value={form.teacherUserId}
                onChange={(v) => setForm({ ...form, teacherUserId: v })}
              />
              {academicClasses.length > 0 ? (
                <SelectField
                  label="Class"
                  required
                  value={form.className}
                  onChange={(v) => setForm({ ...form, className: v })}
                  options={academicClasses}
                  placeholder="Select class (e.g. N1 or P1 A)"
                />
              ) : (
                <TextField
                  label="Class"
                  required
                  value={form.className}
                  onChange={(v) => setForm({ ...form, className: v })}
                  placeholder="e.g. N1 or P1 A (Student Management offline)"
                />
              )}
              <TextField
                label="Subject"
                required
                value={form.subjectName}
                onChange={(v) => setForm({ ...form, subjectName: v })}
              />
              <TextField
                label="Periods per week"
                required
                type="number"
                min={1}
                value={form.periodsPerWeek}
                onChange={(v) => setForm({ ...form, periodsPerWeek: Number(v) || 1 })}
              />
              <TextField
                label="Room"
                value={form.room}
                onChange={(v) => setForm({ ...form, room: v })}
                placeholder="Optional"
              />
              <SelectField
                label="Term"
                value={form.term}
                onChange={(v) => setForm({ ...form, term: v })}
                options={['Term 1', 'Term 2', 'Term 3'].map((t) => ({ value: t, label: t }))}
                placeholder=""
              />
              <TextField
                label="Academic year"
                value={form.academicYear}
                onChange={(v) => setForm({ ...form, academicYear: v })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleSubmit()}>
                Save assignment
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <HrDataTable
          columns={columns}
          data={paged}
          rowKey={(row) => row.id}
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          loading={loading}
          emptyMessage="No teacher assignments yet"
          emptyAction={
            <button type="button" className="btn-primary" onClick={() => setShowForm(true)}>
              Add first assignment
            </button>
          }
          onEdit={startEdit}
          onMore={async (row) => {
            if (confirm('Archive this assignment?')) {
              await timetableApi.archiveAssignment(row.id);
              await load();
            }
          }}
        />
      </HrPageLayout>
    </div>
  );
}
