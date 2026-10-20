'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Officers",
    "value": "90"
  },
  {
    "label": "Active",
    "value": "84"
  },
  {
    "label": "Leave",
    "value": "4"
  },
  {
    "label": "Vacant posts",
    "value": "2"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "name": "Jeanne Uwase",
    "district": "Gasabo",
    "role": "District Officer"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Officer Management"}
      subtitle={"Assign and manage district officers."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'name', header: 'Officer', render: (row) => String(row.name ?? '') },
          { key: 'district', header: 'District', render: (row) => String(row.district ?? '') },
          { key: 'role', header: 'Role', render: (row) => String(row.role ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}
