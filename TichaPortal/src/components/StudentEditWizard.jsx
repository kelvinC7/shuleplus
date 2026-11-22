import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import api from '../services/api';

const STEPS = ['Personal', 'Family', 'Medical', 'Academic', 'Review'];
const inputClass =
  'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-[#F5A623] focus:outline-none';
const roles = ['FATHER', 'MOTHER', 'GUARDIAN'];

function parentName(parent) {
  return [parent?.firstName, parent?.lastName].filter(Boolean).join(' ').trim() || 'Parent';
}

function initialValues(student) {
  return {
    firstName: student.firstName || '',
    lastName: student.lastName || '',
    gender: student.gender || '',
    dateOfBirth: student.dateOfBirth ? String(student.dateOfBirth).slice(0, 10) : '',
    sdmCode: student.sdmCode || '',
    nationality: student.nationality || '',
    district: student.district || '',
    sector: student.sector || '',
    cell: student.cell || '',
    village: student.village || '',
    bloodGroup: student.bloodGroup || '',
    allergies: student.allergies || '',
    hasMedicalCondition: Boolean(student.hasMedicalCondition),
    medicalConditionDetails: student.medicalConditionDetails || '',
    fatherLiving: student.fatherLiving !== false,
    motherLiving: student.motherLiving !== false,
    formerSchool: student.formerSchool || '',
    leavingReason: student.leavingReason || '',
    isBoarding: Boolean(student.isBoarding),
    parents: (student.studentParents || []).map((link) => ({
      parentId: link.parentId || link.parent?.id,
      role: link.role,
      parent: link.parent,
    })).filter((link) => link.parentId && roles.includes(link.role)),
  };
}

function Field({ label, children, className = '' }) {
  return <label className={`block text-xs font-semibold text-slate-600 ${className}`}>{label}{children}</label>;
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

export default function StudentEditWizard({ student, className, onClose, onSaved }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => initialValues(student));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [parentQuery, setParentQuery] = useState('');
  const [parentResults, setParentResults] = useState([]);
  const [searchingParents, setSearchingParents] = useState(false);
  const [parentError, setParentError] = useState('');
  const [parentRole, setParentRole] = useState('GUARDIAN');
  const [showNewParent, setShowNewParent] = useState(false);
  const [newParent, setNewParent] = useState({ firstName: '', lastName: '', phone: '', email: '' });
  const [creatingParent, setCreatingParent] = useState(false);
  const [editingParentId, setEditingParentId] = useState('');
  const [parentDraft, setParentDraft] = useState(null);
  const [updatingParent, setUpdatingParent] = useState(false);

  useEffect(() => {
    const query = parentQuery.trim();
    if (query.length < 2) {
      return undefined;
    }
    let active = true;
    const timer = setTimeout(async () => {
      setSearchingParents(true);
      setParentError('');
      try {
        const response = await api.get('/class-students/parents/search', {
          params: { className, q: query },
        });
        if (active) setParentResults(Array.isArray(response.data?.data) ? response.data.data : []);
      } catch (error) {
        if (active) {
          setParentResults([]);
          setParentError(error.response?.data?.message || 'Could not search parents.');
        }
      } finally {
        if (active) setSearchingParents(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [parentQuery, className]);

  const currentClass = useMemo(() => {
    const enrollment = (student.enrollments || []).find((entry) => entry.isCurrent) || student.enrollments?.[0];
    const cls = enrollment?.class;
    return cls ? [cls.name, cls.stream].filter(Boolean).join(' ') : className || 'Current class';
  }, [student, className]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const addParent = (parent, role = parentRole) => {
    if (form.parents.some((entry) => entry.parentId === parent.id || entry.role === role)) {
      setParentError('This parent is already linked or this relationship is already assigned.');
      return;
    }
    update('parents', [...form.parents, { parentId: parent.id, role, parent }]);
    setParentQuery('');
    setParentResults([]);
    setParentError('');
  };

  const removeParent = (parentId) => update('parents', form.parents.filter((entry) => entry.parentId !== parentId));

  const editParent = (entry) => {
    setEditingParentId(entry.parentId);
    setParentDraft({
      firstName: entry.parent?.firstName || '',
      lastName: entry.parent?.lastName || '',
      phone: entry.parent?.phone || '',
      email: entry.parent?.email || '',
      nationalId: entry.parent?.nationalId || '',
      occupation: entry.parent?.occupation || '',
      address: entry.parent?.address || '',
    });
    setParentError('');
  };

  const saveParent = async (event, parentId) => {
    event.preventDefault();
    if (!parentDraft?.firstName.trim() || !parentDraft?.lastName.trim()) {
      setParentError('Parent first and last names are required.');
      return;
    }
    setUpdatingParent(true);
    setParentError('');
    try {
      const response = await api.put(
        `/class-students/${student.id}/parents/${parentId}`,
        parentDraft
      );
      const updatedParent = response.data?.data;
      update('parents', form.parents.map((entry) =>
        entry.parentId === parentId ? { ...entry, parent: updatedParent } : entry
      ));
      setEditingParentId('');
      setParentDraft(null);
    } catch (error) {
      setParentError(error.response?.data?.message || 'Could not update parent information.');
    } finally {
      setUpdatingParent(false);
    }
  };

  const createParent = async (event) => {
    event.preventDefault();
    if (!newParent.firstName.trim() || !newParent.lastName.trim()) {
      setParentError('Enter the parent’s first and last name.');
      return;
    }
    setCreatingParent(true);
    setParentError('');
    try {
      const response = await api.post('/class-students/parents', {
        ...newParent,
        className,
      });
      const created = response.data?.data;
      if (!created?.id) throw new Error('Parent was created but no parent ID was returned.');
      addParent(created, parentRole);
      setNewParent({ firstName: '', lastName: '', phone: '', email: '' });
      setShowNewParent(false);
    } catch (error) {
      setParentError(error.response?.data?.message || error.message || 'Could not create parent.');
    } finally {
      setCreatingParent(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await api.put(`/class-students/${student.id}`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        sdmCode: form.sdmCode.trim(),
        nationality: form.nationality.trim(),
        district: form.district.trim(),
        sector: form.sector.trim(),
        cell: form.cell.trim(),
        village: form.village.trim(),
        bloodGroup: form.bloodGroup.trim(),
        allergies: form.allergies.trim(),
        hasMedicalCondition: form.hasMedicalCondition,
        medicalConditionDetails: form.medicalConditionDetails.trim(),
        fatherLiving: form.fatherLiving,
        motherLiving: form.motherLiving,
        formerSchool: form.formerSchool.trim(),
        leavingReason: form.leavingReason.trim(),
        isBoarding: form.isBoarding,
        parents: form.parents.map(({ parentId, role }) => ({ parentId, role })),
      });
      await onSaved();
    } catch (error) {
      setSaveError(error.response?.data?.message || error.message || 'Could not save student information.');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key) => (event) => update(key, event.target.value);
  const name = `${student.firstName || ''} ${student.lastName || ''}`.trim();

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[#13213D]/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-edit-title"
        className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F5A623]">Student profile · {name}</p>
            <h2 id="student-edit-title" className="mt-1 text-lg font-bold text-[#13213D]">Edit student information</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        <nav aria-label="Student information steps" className="grid grid-cols-5 border-b border-slate-100 px-3 py-3 sm:px-7">
          {STEPS.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`flex min-w-0 flex-col items-center gap-1 text-[10px] font-semibold sm:flex-row sm:justify-center sm:gap-2 sm:text-xs ${
                index === step ? 'text-[#13213D]' : index < step ? 'text-emerald-700' : 'text-slate-400'
              }`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                index === step ? 'border-[#F5A623] bg-[#F5A623]/15' : index < step ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'
              }`}>
                {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="truncate">{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name"><input className={inputClass} value={form.firstName} onChange={setField('firstName')} required /></Field>
              <Field label="Last name"><input className={inputClass} value={form.lastName} onChange={setField('lastName')} required /></Field>
              <Field label="Gender">
                <select className={inputClass} value={form.gender} onChange={setField('gender')}>
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option>
                </select>
              </Field>
              <Field label="Date of birth"><input type="date" className={inputClass} value={form.dateOfBirth} onChange={setField('dateOfBirth')} /></Field>
              <Field label="Student code"><input className={inputClass} value={student.studentCode || student.studentUid || student.id} disabled /></Field>
              <Field label="School ID / SDM code"><input className={inputClass} value={form.sdmCode} onChange={setField('sdmCode')} /></Field>
              <Field label="Nationality"><input className={inputClass} value={form.nationality} onChange={setField('nationality')} /></Field>
              <Field label="District"><input className={inputClass} value={form.district} onChange={setField('district')} /></Field>
              <Field label="Sector"><input className={inputClass} value={form.sector} onChange={setField('sector')} /></Field>
              <Field label="Cell"><input className={inputClass} value={form.cell} onChange={setField('cell')} /></Field>
              <Field label="Village"><input className={inputClass} value={form.village} onChange={setField('village')} /></Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle label="Father is living" checked={form.fatherLiving} onChange={(value) => update('fatherLiving', value)} />
                <Toggle label="Mother is living" checked={form.motherLiving} onChange={(value) => update('motherLiving', value)} />
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-[#13213D]">Parents and guardians</h3>
                <p className="mt-1 text-xs text-slate-500">Search this school’s parent list, then assign a relationship.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <select className={`${inputClass} !mt-0 sm:w-40`} value={parentRole} onChange={(event) => setParentRole(event.target.value)}>
                    {roles.map((role) => <option key={role} value={role}>{role[0]}{role.slice(1).toLowerCase()}</option>)}
                  </select>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className={`${inputClass} !mt-0 !pl-9`}
                      placeholder="Search by name, phone or ID"
                      value={parentQuery}
                      onChange={(event) => {
                        const value = event.target.value;
                        setParentQuery(value);
                        if (value.trim().length < 2) {
                          setParentResults([]);
                          setSearchingParents(false);
                          setParentError('');
                        }
                      }}
                    />
                  </div>
                </div>
                {searchingParents && <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…</p>}
                {parentResults.length > 0 && (
                  <ul className="mt-2 max-h-36 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-100">
                    {parentResults.map((parent) => (
                      <li key={parent.id}>
                        <button type="button" onClick={() => addParent(parent)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50">
                          <span><span className="font-medium text-slate-800">{parentName(parent)}</span><span className="ml-2 text-xs text-slate-500">{parent.phone || parent.email || ''}</span></span>
                          <Plus className="h-4 w-4 text-[#13213D]" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {parentQuery.trim().length >= 2 && !searchingParents && !parentResults.length && !parentError && <p className="mt-2 text-xs text-slate-500">No matching parents found.</p>}
                {parentError && <p className="mt-2 text-xs text-red-700">{parentError}</p>}
                <button type="button" onClick={() => setShowNewParent((value) => !value)} className="mt-3 text-xs font-semibold text-[#13213D] underline">
                  {showNewParent ? 'Cancel adding parent' : 'Create a new parent'}
                </button>
                {showNewParent && (
                  <form onSubmit={createParent} className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
                    <Field label="First name"><input className={inputClass} value={newParent.firstName} onChange={(event) => setNewParent({ ...newParent, firstName: event.target.value })} required /></Field>
                    <Field label="Last name"><input className={inputClass} value={newParent.lastName} onChange={(event) => setNewParent({ ...newParent, lastName: event.target.value })} required /></Field>
                    <Field label="Phone"><input className={inputClass} value={newParent.phone} onChange={(event) => setNewParent({ ...newParent, phone: event.target.value })} /></Field>
                    <Field label="Email"><input type="email" className={inputClass} value={newParent.email} onChange={(event) => setNewParent({ ...newParent, email: event.target.value })} /></Field>
                    <button type="submit" disabled={creatingParent} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#13213D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 sm:col-span-2">
                      {creatingParent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add and link parent
                    </button>
                  </form>
                )}
              </div>
              <div className="space-y-2">
                {form.parents.map((entry) => (
                  <div key={entry.parentId} className="rounded-lg border border-slate-200 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div><p className="text-sm font-semibold text-slate-800">{parentName(entry.parent)}</p><p className="text-xs text-slate-500">{entry.role} {entry.parent?.phone ? `· ${entry.parent.phone}` : ''}</p></div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => editParent(entry)} className="rounded-md px-2 py-1 text-xs font-semibold text-[#13213D] hover:bg-slate-100">Edit details</button>
                        <button type="button" onClick={() => removeParent(entry.parentId)} aria-label={`Remove ${parentName(entry.parent)}`} className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                    {editingParentId === entry.parentId && parentDraft && (
                      <form onSubmit={(event) => saveParent(event, entry.parentId)} className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
                        {[
                          ['firstName', 'First name'],
                          ['lastName', 'Last name'],
                          ['phone', 'Phone'],
                          ['email', 'Email'],
                          ['nationalId', 'National ID'],
                          ['occupation', 'Occupation'],
                        ].map(([key, label]) => (
                          <Field key={key} label={label}>
                            <input
                              type={key === 'email' ? 'email' : 'text'}
                              className={inputClass}
                              value={parentDraft[key]}
                              onChange={(event) => setParentDraft({ ...parentDraft, [key]: event.target.value })}
                            />
                          </Field>
                        ))}
                        <Field label="Address" className="sm:col-span-2">
                          <input className={inputClass} value={parentDraft.address} onChange={(event) => setParentDraft({ ...parentDraft, address: event.target.value })} />
                        </Field>
                        <div className="flex justify-end gap-2 sm:col-span-2">
                          <button type="button" onClick={() => { setEditingParentId(''); setParentDraft(null); }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button>
                          <button type="submit" disabled={updatingParent} className="inline-flex items-center gap-2 rounded-lg bg-[#13213D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                            {updatingParent && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save parent
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
                {!form.parents.length && <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">No parent or guardian is linked to this student.</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Blood group">
                <select className={inputClass} value={form.bloodGroup} onChange={setField('bloodGroup')}>
                  <option value="">Select blood group</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group}>{group}</option>)}
                </select>
              </Field>
              <Field label="Allergies"><input className={inputClass} value={form.allergies} onChange={setField('allergies')} /></Field>
              <Toggle label="Has a medical condition" checked={form.hasMedicalCondition} onChange={(value) => update('hasMedicalCondition', value)} />
              {form.hasMedicalCondition && <Field label="Medical condition details" className="sm:col-span-2"><textarea rows={4} className={inputClass} value={form.medicalConditionDetails} onChange={setField('medicalConditionDetails')} /></Field>}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-[#13213D]">Class placement is locked</h3>
                <p className="mt-1 text-xs text-slate-700">Class teachers can update student details, but class and enrollment placement remain unchanged.</p>
                <p className="mt-3 text-sm font-semibold text-[#13213D]">{currentClass}</p>
              </div>
              <Toggle label="Student is a boarder" checked={form.isBoarding} onChange={(value) => update('isBoarding', value)} />
              <Field label="Former school"><input className={inputClass} value={form.formerSchool} onChange={setField('formerSchool')} /></Field>
              <Field label="Reason for leaving former school"><textarea rows={3} className={inputClass} value={form.leavingReason} onChange={setField('leavingReason')} /></Field>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-[#13213D]">Personal</h3>
                <p className="mt-2 text-sm text-slate-700">{form.firstName} {form.lastName} · {form.gender || 'Gender not set'} · {form.dateOfBirth || 'Date of birth not set'}</p>
                <p className="mt-1 text-xs text-slate-500">{[form.nationality, form.district, form.sector, form.cell, form.village].filter(Boolean).join(' · ') || 'No residence details'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-[#13213D]">Family</h3>
                <p className="mt-2 text-sm text-slate-700">{form.parents.length ? form.parents.map((entry) => `${entry.role}: ${parentName(entry.parent)}`).join(' · ') : 'No parents or guardians linked'}</p>
                <p className="mt-1 text-xs text-slate-500">Father {form.fatherLiving ? 'living' : 'not living'} · Mother {form.motherLiving ? 'living' : 'not living'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-[#13213D]">Medical and academic</h3>
                <p className="mt-2 text-sm text-slate-700">{form.bloodGroup || 'Blood group not set'} · {form.allergies || 'No allergies listed'} · {form.hasMedicalCondition ? form.medicalConditionDetails || 'Medical condition noted' : 'No medical condition noted'}</p>
                <p className="mt-1 text-xs text-slate-500">{currentClass} · {form.isBoarding ? 'Boarding' : 'Day student'} · placement will not change</p>
              </div>
            </div>
          )}

          {saveError && <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{saveError}</p>}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3 sm:px-7">
          <button type="button" onClick={step ? () => setStep(step - 1) : onClose} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            {step ? <><ChevronLeft className="h-4 w-4" />Back</> : 'Cancel'}
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep(step + 1)} disabled={step === 0 && (!form.firstName.trim() || !form.lastName.trim())} className="inline-flex items-center gap-1 rounded-lg bg-[#F5A623] px-4 py-2 text-sm font-semibold text-[#13213D] disabled:opacity-50">
              Continue<ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#13213D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save changes
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
