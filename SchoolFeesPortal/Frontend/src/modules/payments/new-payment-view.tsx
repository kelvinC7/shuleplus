'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FeesStepWizard } from '@/components/fees-step-wizard';
import { FeesPageTitle } from '@/components/fees-page-title';
import { FormField, FormInput, FormSelect } from '@/components/form-field';
import { api } from '@/services/api';
import type { StudentBill } from '@/types';

const STEPS = [
  { title: 'Bill', description: 'Select student bill' },
  { title: 'Payment', description: 'Amount and method' },
  { title: 'Confirm', description: 'Verify and issue receipt' },
];

export function NewPaymentView() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [bills, setBills] = useState<StudentBill[]>([]);
  const [form, setForm] = useState({
    billId: '',
    studentId: '',
    studentName: '',
    studentCode: '',
    className: '',
    amount: '',
    method: 'MOBILE_MONEY',
    reference: '',
    payerName: '',
    isPartial: true,
  });

  useEffect(() => {
    void api.get('/bills', { params: { pageSize: 50 } }).then(({ data }) => setBills(data.data ?? []));
  }, []);

  async function submit() {
    setSaving(true);
    try {
      await api.post('/payments', {
        ...form,
        amount: Number(form.amount),
        billId: form.billId || undefined,
      });
      router.push('/payments');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <FeesPageTitle className="text-lg font-bold text-navy">Record Payment</FeesPageTitle>
        <p className="text-sm text-muted">Full, partial, advance or split payment</p>
      </div>
      <FeesStepWizard
        steps={STEPS}
        currentStep={step}
        onStepClick={setStep}
        onCancel={() => router.push('/payments')}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        onSubmit={() => void submit()}
        isLastStep={step === STEPS.length - 1}
        saving={saving}
        submitLabel="Confirm Payment"
      >
        {step === 0 && (
          <FormField label="Outstanding bill" required>
            <FormSelect
              value={form.billId}
              onChange={(e) => {
                const b = bills.find((x) => x.id === e.target.value);
                if (!b) return;
                setForm({
                  ...form,
                  billId: b.id,
                  studentId: b.studentCode,
                  studentCode: b.studentCode,
                  studentName: b.studentName,
                  className: b.className,
                  amount: String(b.balance),
                  isPartial: b.balance < b.netAmount,
                });
              }}
            >
              <option value="">Select bill</option>
              {bills.filter((b) => b.balance > 0).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.studentName} — {b.billNumber} ({Number(b.balance).toLocaleString()} RWF)
                </option>
              ))}
            </FormSelect>
          </FormField>
        )}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Amount (RWF)" required>
              <FormInput type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </FormField>
            <FormField label="Method" required>
              <FormSelect value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="CASH">Cash</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="ONLINE">Online</option>
                <option value="POS">POS</option>
                <option value="QR">QR</option>
                <option value="USSD">USSD</option>
                <option value="CHEQUE">Cheque</option>
                <option value="SCHOOL_WALLET">School Wallet</option>
              </FormSelect>
            </FormField>
            <FormField label="Reference">
              <FormInput value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </FormField>
            <FormField label="Payer name">
              <FormInput value={form.payerName} onChange={(e) => setForm({ ...form, payerName: e.target.value })} />
            </FormField>
          </div>
        )}
        {step === 2 && (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm space-y-2">
            <p>Student: <strong>{form.studentName}</strong></p>
            <p>Amount: <strong>{Number(form.amount || 0).toLocaleString()} RWF</strong></p>
            <p>Method: <strong>{form.method.replace(/_/g, ' ')}</strong></p>
            <p className="text-xs text-muted">A QR-verified receipt will be generated automatically.</p>
          </div>
        )}
      </FeesStepWizard>
    </div>
  );
}
