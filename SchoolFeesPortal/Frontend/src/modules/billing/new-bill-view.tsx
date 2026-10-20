'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FeesStepWizard } from '@/components/fees-step-wizard';
import { FeesPageTitle } from '@/components/fees-page-title';
import { FormField, FormInput, FormSelect } from '@/components/form-field';
import { api } from '@/services/api';
import type { FeeStructure } from '@/types';

const STEPS = [
  { title: 'Student', description: 'Who is being billed' },
  { title: 'Structure', description: 'Apply a fee template' },
  { title: 'Adjustments', description: 'Discounts & scholarships' },
  { title: 'Review', description: 'Confirm bill generation' },
];

export function NewBillView() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [form, setForm] = useState({
    studentId: 'stu-new',
    studentCode: '',
    studentName: '',
    className: '',
    academicYear: '2025-2026',
    term: 'Term II',
    studentCategory: 'DAY',
    structureId: '',
    grossAmount: '450000',
    discountAmount: '0',
    scholarshipAmount: '0',
    dueDate: '',
  });

  useEffect(() => {
    void api.get('/structures').then(({ data }) => setStructures(data.data ?? []));
  }, []);

  async function submit() {
    setSaving(true);
    try {
      await api.post('/bills', {
        ...form,
        grossAmount: Number(form.grossAmount),
        discountAmount: Number(form.discountAmount),
        scholarshipAmount: Number(form.scholarshipAmount),
        structureId: form.structureId || undefined,
        lineItems: [
          { category: 'Tuition', description: 'Tuition Fees', amount: Number(form.grossAmount) * 0.7 },
          { category: 'Other', description: 'Other charges', amount: Number(form.grossAmount) * 0.3 },
        ],
      });
      router.push('/billing');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <FeesPageTitle className="text-lg font-bold text-navy">Create Student Bill</FeesPageTitle>
        <p className="text-sm text-muted">Individual billing with discounts & scholarships</p>
      </div>
      <FeesStepWizard
        steps={STEPS}
        currentStep={step}
        onStepClick={setStep}
        onCancel={() => router.push('/billing')}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        onSubmit={() => void submit()}
        isLastStep={step === STEPS.length - 1}
        saving={saving}
        submitLabel="Generate Bill"
      >
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Student name" required className="sm:col-span-2">
              <FormInput value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} />
            </FormField>
            <FormField label="Student code" required>
              <FormInput value={form.studentCode} onChange={(e) => setForm({ ...form, studentCode: e.target.value })} />
            </FormField>
            <FormField label="Class" required>
              <FormInput value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} />
            </FormField>
            <FormField label="Category">
              <FormSelect value={form.studentCategory} onChange={(e) => setForm({ ...form, studentCategory: e.target.value })}>
                <option value="DAY">Day</option>
                <option value="BOARDING">Boarding</option>
                <option value="SCHOLARSHIP">Scholarship</option>
                <option value="TRANSFER">Transfer</option>
              </FormSelect>
            </FormField>
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-4">
            <FormField label="Fee structure">
              <FormSelect
                value={form.structureId}
                onChange={(e) => {
                  const s = structures.find((x) => x.id === e.target.value);
                  setForm({
                    ...form,
                    structureId: e.target.value,
                    grossAmount: s ? String(s.totalAmount) : form.grossAmount,
                  });
                }}
              >
                <option value="">Select structure</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {Number(s.totalAmount).toLocaleString()} RWF</option>
                ))}
              </FormSelect>
            </FormField>
            <FormField label="Gross amount (RWF)">
              <FormInput type="number" value={form.grossAmount} onChange={(e) => setForm({ ...form, grossAmount: e.target.value })} />
            </FormField>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Discount (RWF)">
              <FormInput type="number" value={form.discountAmount} onChange={(e) => setForm({ ...form, discountAmount: e.target.value })} />
            </FormField>
            <FormField label="Scholarship (RWF)">
              <FormInput type="number" value={form.scholarshipAmount} onChange={(e) => setForm({ ...form, scholarshipAmount: e.target.value })} />
            </FormField>
            <FormField label="Due date" className="sm:col-span-2">
              <FormInput type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </FormField>
          </div>
        )}
        {step === 3 && (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm space-y-2">
            <p><strong>{form.studentName}</strong> · {form.className}</p>
            <p>Net: {(Number(form.grossAmount) - Number(form.discountAmount) - Number(form.scholarshipAmount)).toLocaleString()} RWF</p>
          </div>
        )}
      </FeesStepWizard>
    </div>
  );
}
