'use client';

import { useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { EmployeeImportModal } from '@/components/employee-import-modal';
import { PayrollPageLayout } from '@/components/payroll-page-layout';
import { downloadTemplate } from '@/utils/payrollEmployeeImportTemplate';

export function EmployeeImportView() {
  const [importOpen, setImportOpen] = useState(true);

  return (
    <>
      <PayrollPageLayout
        title="Employee Import"
        subtitle="Bulk import payroll staff from Excel with salary and allowance columns"
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={() => downloadTemplate('minimal')}>
              <FileSpreadsheet size={16} /> Download template
            </button>
            <button type="button" className="btn-primary" onClick={() => setImportOpen(true)}>
              <Upload size={16} /> Import Excel
            </button>
          </>
        }
        kpis={[
          { label: 'Format', value: 'Excel' },
          { label: 'Profile', value: 'Payroll' },
        ]}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="hr-card p-8">
            <h2 className="text-lg font-bold text-navy">Payroll bulk import</h2>
            <p className="mt-2 text-sm text-muted">
              Import employees directly into the Payroll roster. Each row creates or updates staff with
              basic salary and allowances ready for payroll runs.
            </p>
            <ol className="mt-6 space-y-4 text-sm">
              {[
                'Download the payroll Excel template (minimal or full)',
                'Fill employee details: name, NID/RSSB, department, bank, salary',
                'Upload and review validation (duplicates, updates, incomplete rows)',
                'Confirm import — staff appear in Employee Directory',
                'Adjust salary packages in Staff Salary Setup if needed',
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold text-white">{i + 1}</span>
                  <span className="text-muted">{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="hr-card p-8">
            <h2 className="font-bold text-navy">Required columns</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>First Name, Last Name, Gender</li>
              <li>National ID or RSSB Number</li>
              <li>Basic Salary (recommended)</li>
              <li>Transport / Housing / Other allowances (optional)</li>
              <li>Bank Name and Account Number (optional)</li>
            </ul>
            <p className="mt-6 text-xs text-muted">
              Existing employees are matched by National ID, RSSB, email, or phone and updated on import.
            </p>
          </div>
        </div>
      </PayrollPageLayout>

      <EmployeeImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        accountantMode
      />
    </>
  );
}
