import { useState } from 'react';
import { Pencil, Plus, UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CheckboxField, Field, Input, Select } from '@/components/ui/form-field';
import { Modal, ModalActions } from '@/components/ui/modal';

export type StaffRow = { fullName: string; role: string; isLeader: boolean };

const ROLES = ['Teacher', 'Trip leader', 'Accompanying adult', 'Nurse', 'Security'];

export function StaffStep({
  rows,
  onChange,
  onLeaderName,
}: {
  rows: StaffRow[];
  onChange: (next: StaffRow[]) => void;
  onLeaderName: (name: string) => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<StaffRow>({ fullName: '', role: 'Teacher', isLeader: false });

  function openAdd() {
    setEditIndex(null);
    setDraft({ fullName: '', role: 'Teacher', isLeader: rows.every((r) => !r.isLeader) });
    setModalOpen(true);
  }

  function openEdit(index: number) {
    setEditIndex(index);
    setDraft({ ...rows[index] });
    setModalOpen(true);
  }

  function saveDraft() {
    if (!draft.fullName.trim()) return;
    let next: StaffRow[];
    if (editIndex === null) {
      next = [...rows, { ...draft, fullName: draft.fullName.trim() }];
    } else {
      next = rows.map((r, i) => (i === editIndex ? { ...draft, fullName: draft.fullName.trim() } : r));
    }
    const leaderIdx = editIndex === null ? next.length - 1 : editIndex;
    if (draft.isLeader) {
      next = next.map((r, i) => ({ ...r, isLeader: i === leaderIdx }));
      onLeaderName(draft.fullName.trim());
    } else if (editIndex !== null && rows[editIndex]?.isLeader) {
      next = next.map((r, i) => (i === editIndex ? { ...r, isLeader: false } : r));
    }
    onChange(next);
    setModalOpen(false);
  }

  function remove(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Add teachers and adults supervising the trip. One person must be marked as trip leader.</p>
        <Button variant="amber" type="button" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Add staff
        </Button>
      </div>

      <ul className="mt-4 space-y-3">
        {rows.filter((r) => r.fullName.trim()).length === 0 ? (
          <li className="rounded-2xl border border-dashed border-line bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No staff added yet. Use <strong className="text-navy">Add staff</strong> to open the form.
          </li>
        ) : (
          rows.map((row, idx) =>
            row.fullName.trim() ? (
              <li
                key={`${row.fullName}-${idx}`}
                className="flex items-center gap-4 rounded-2xl border border-line bg-white px-4 py-3 shadow-sm"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy/5 text-navy">
                  <UserCircle2 className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{row.fullName}</p>
                  <p className="text-sm text-slate-500">
                    {row.role}
                    {row.isLeader ? (
                      <span className="ml-2 rounded-full bg-amber-soft px-2 py-0.5 text-xs font-bold text-amber-900">Trip leader</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => openEdit(idx)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <Button variant="ghost" type="button" className="text-red-600 hover:bg-red-50" onClick={() => remove(idx)}>
                    Remove
                  </Button>
                </div>
              </li>
            ) : null
          )
        )}
      </ul>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editIndex === null ? 'Add supervising staff' : 'Edit staff member'}
        description="Details are saved when you confirm · use Save draft on the wizard to persist."
        footer={<ModalActions onCancel={() => setModalOpen(false)} onConfirm={saveDraft} confirmLabel="Add to trip" />}
      >
        <div className="space-y-4">
          <Field label="Full name" required>
            <Input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} placeholder="e.g. Jean Pierre Uwimana" autoFocus />
          </Field>
          <Field label="Role">
            <Select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <CheckboxField
            label="Designated trip leader"
            description="Only one leader per trip. Checking this updates the trip leader on step 1."
            checked={draft.isLeader}
            onChange={(checked) => setDraft({ ...draft, isLeader: checked })}
          />
        </div>
      </Modal>
    </div>
  );
}
