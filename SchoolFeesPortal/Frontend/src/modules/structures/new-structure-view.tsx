'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FeesStepWizard } from '@/components/fees-step-wizard';
import { FeesPageTitle } from '@/components/fees-page-title';
import { FormField, FormInput, FormSelect } from '@/components/form-field';
import { api } from '@/services/api';

const STEPS = [
  { title: 'Basics', description: 'Name, code and academic period' },
  { title: 'Targeting', description: 'Class, boarding and student status' },
  { title: 'Fee Items', description: 'Mandatory and optional charges' },
  { title: 'Discounts', description: 'Early, sibling and penalty rules' },
  { title: 'Review', description: 'Confirm and publish structure' },
];

interface Category {
  id: string;
  name: string;
  code: string;
}

export function NewStructureView() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: '',
    code: '',
    academicYear: '2025-2026',
    term: 'Term II',
    schoolLevel: 'Secondary',
    className: '',
    boardingType: 'DAY',
    studentType: 'CONTINUING',
    earlyDiscountPct: '5',
    siblingDiscountPct: '10',
    penaltyRatePct: '2',
    notes: '',
    items: [
      { categoryId: '', name: 'Tuition', amount: '300000' },
      { categoryId: '', name: 'Feeding', amount: '80000' },
    ],
  });

  useEffect(() => {
    void api.get('/categories').then(({ data }) => {
      const cats = data.data ?? [];
      setCategories(cats);
      if (cats[0]) {
        setForm((f) => ({
          ...f,
          items: f.items.map((item, i) => ({
            ...item,
            categoryId: cats[Math.min(i, cats.length - 1)].id,
          })),
        }));
      }
    });
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setSaving(true);
    try {
      await api.post('/structures', {
        ...form,
        earlyDiscountPct: Number(form.earlyDiscountPct),
        siblingDiscountPct: Number(form.siblingDiscountPct),
        penaltyRatePct: Number(form.penaltyRatePct),
        status: 'ACTIVE',
        items: form.items.map((i) => ({
          categoryId: i.categoryId || categories[0]?.id,
          name: i.name,
          amount: Number(i.amount),
          itemType: 'MANDATORY',
        })),
      });
      router.push('/structures');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <FeesPageTitle className="text-lg font-bold text-navy">New Fee Structure</FeesPageTitle>
        <p className="text-sm text-muted">Configurable template for billing automation</p>
      </div>
      <FeesStepWizard
        steps={STEPS}
        currentStep={step}
        onStepClick={setStep}
        onCancel={() => router.push('/structures')}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        onSubmit={() => void submit()}
        isLastStep={step === STEPS.length - 1}
        saving={saving}
        submitLabel="Create Structure"
      >
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Structure name" required className="sm:col-span-2">
              <FormInput value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Secondary Day Scholar — Term II" />
            </FormField>
            <FormField label="Code" required>
              <FormInput value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="SEC-DAY-T2" />
            </FormField>
            <FormField label="Academic year" required>
              <FormSelect value={form.academicYear} onChange={(e) => set('academicYear', e.target.value)}>
                <option>2025-2026</option>
                <option>2026-2027</option>
              </FormSelect>
            </FormField>
            <FormField label="Term" required>
              <FormSelect value={form.term} onChange={(e) => set('term', e.target.value)}>
                <option>Term I</option>
                <option>Term II</option>
                <option>Term III</option>
              </FormSelect>
            </FormField>
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="School level">
              <FormSelect value={form.schoolLevel} onChange={(e) => set('schoolLevel', e.target.value)}>
                <option>Primary</option>
                <option>Secondary</option>
                <option>Nursery</option>
              </FormSelect>
            </FormField>
            <FormField label="Class / Grade">
              <FormInput value={form.className} onChange={(e) => set('className', e.target.value)} placeholder="S3" />
            </FormField>
            <FormField label="Boarding type">
              <FormSelect value={form.boardingType} onChange={(e) => set('boardingType', e.target.value)}>
                <option value="DAY">Day Scholar</option>
                <option value="BOARDING">Boarding</option>
              </FormSelect>
            </FormField>
            <FormField label="Student type">
              <FormSelect value={form.studentType} onChange={(e) => set('studentType', e.target.value)}>
                <option value="NEW">New</option>
                <option value="CONTINUING">Continuing</option>
                <option value="TRANSFER">Transfer</option>
                <option value="SCHOLARSHIP">Scholarship</option>
              </FormSelect>
            </FormField>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            {form.items.map((item, idx) => (
              <div key={idx} className="grid gap-3 rounded-2xl border border-border p-3 sm:grid-cols-3">
                <FormField label="Category">
                  <FormSelect
                    value={item.categoryId}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[idx] = { ...items[idx], categoryId: e.target.value };
                      set('items', items);
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </FormSelect>
                </FormField>
                <FormField label="Item name">
                  <FormInput
                    value={item.name}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[idx] = { ...items[idx], name: e.target.value };
                      set('items', items);
                    }}
                  />
                </FormField>
                <FormField label="Amount (RWF)">
                  <FormInput
                    type="number"
                    value={item.amount}
                    onChange={(e) => {
                      const items = [...form.items];
                      items[idx] = { ...items[idx], amount: e.target.value };
                      set('items', items);
                    }}
                  />
                </FormField>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                set('items', [
                  ...form.items,
                  { categoryId: categories[0]?.id ?? '', name: 'Additional charge', amount: '0' },
                ])
              }
            >
              Add fee item
            </button>
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Early payment discount %">
              <FormInput value={form.earlyDiscountPct} onChange={(e) => set('earlyDiscountPct', e.target.value)} />
            </FormField>
            <FormField label="Sibling discount %">
              <FormInput value={form.siblingDiscountPct} onChange={(e) => set('siblingDiscountPct', e.target.value)} />
            </FormField>
            <FormField label="Penalty rate %">
              <FormInput value={form.penaltyRatePct} onChange={(e) => set('penaltyRatePct', e.target.value)} />
            </FormField>
            <FormField label="Notes" className="sm:col-span-3">
              <FormInput value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </FormField>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
            <p><span className="text-muted">Name:</span> <strong>{form.name || '—'}</strong></p>
            <p><span className="text-muted">Period:</span> <strong>{form.academicYear} · {form.term}</strong></p>
            <p><span className="text-muted">Target:</span> <strong>{form.schoolLevel} / {form.boardingType}</strong></p>
            <p><span className="text-muted">Items:</span> <strong>{form.items.length}</strong></p>
            <p>
              <span className="text-muted">Estimated total:</span>{' '}
              <strong>
                {form.items.reduce((s, i) => s + Number(i.amount || 0), 0).toLocaleString()} RWF
              </strong>
            </p>
          </div>
        )}
      </FeesStepWizard>
    </div>
  );
}
