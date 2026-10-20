'use client';

import { useMemo, useState } from 'react';
import { Scale, Settings2 } from 'lucide-react';
import {
  licensedCaProductModules,
  parseModuleScope,
  type CaModuleScope,
} from '@/lib/ca-org-module-catalog';
import { type LicensedModule, type OrgChiefAccountantRow } from '@/lib/org-admin-api';
import { ManageOrgChiefAccountantSheet } from '@/components/organization-admin/manage-org-chief-accountant-sheet';

function formatLogin(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function moduleSummary(scope: CaModuleScope, licensed: LicensedModule[]) {
  const product = licensedCaProductModules(licensed);
  const enabled = product.filter((d) => scope[d.slug]?.enabled);
  if (!enabled.length) return 'Finance workspace only';
  const names = enabled.map((d) => licensed.find((m) => m.slug === d.slug)?.name ?? d.label);
  return names.join(', ');
}

type Props = {
  rows: OrgChiefAccountantRow[];
  licensedModules: LicensedModule[];
  loading?: boolean;
  onRowsChange: (rows: OrgChiefAccountantRow[]) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function OrgChiefAccountantsSection({
  rows,
  licensedModules,
  loading = false,
  onRowsChange,
  onError,
  onSuccess,
}: Props) {
  const [editRow, setEditRow] = useState<OrgChiefAccountantRow | null>(null);

  const licensedProductCount = useMemo(
    () => licensedCaProductModules(licensedModules).length,
    [licensedModules]
  );

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
              <Scale className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-navy">Chief Accountant</h2>
              <p className="text-xs text-slate-500">
                {licensedProductCount} licensed module{licensedProductCount === 1 ? '' : 's'} for this school
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            No Chief Accountant assigned to this school.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Accountant</th>
                  <th className="px-4 py-3">Modules & activities</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last login</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const scope = parseModuleScope(row.permissions.moduleScope);
                  return (
                    <tr key={row.userId} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-4 sm:px-5">
                        <p className="font-semibold text-navy">
                          {row.user.firstName} {row.user.lastName}
                        </p>
                        <p className="text-xs text-slate-500">{row.user.email}</p>
                        <span className="mt-1 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-900">
                          Chief Accountant
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        <p className="text-sm text-navy">{moduleSummary(scope, licensedModules)}</p>
                        <p className="mt-0.5 text-xs text-slate-500">Per-school module scope</p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            row.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {row.status === 'ACTIVE' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatLogin(row.user.lastLoginAt)}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setEditRow(row)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-navy shadow-sm hover:bg-slate-50"
                        >
                          <Settings2 className="size-3.5" />
                          Manage modules
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ManageOrgChiefAccountantSheet
        row={editRow}
        licensedModules={licensedModules}
        open={Boolean(editRow)}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
        onSaved={(updated) => {
          onRowsChange(updated);
          onSuccess('Chief Accountant access updated.');
        }}
        onError={onError}
      />
    </>
  );
}
