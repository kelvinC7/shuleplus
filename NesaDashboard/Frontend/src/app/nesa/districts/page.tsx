'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Districts",
    "value": "30"
  },
  {
    "label": "Officers",
    "value": "90"
  },
  {
    "label": "Schools",
    "value": "4,218"
  },
  {
    "label": "Open tasks",
    "value": "63"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "district": "Gasabo",
    "schools": "210",
    "status": "On track"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"District Offices"}
      subtitle={"District office coordination dashboard."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'district', header: 'District', render: (row) => String(row.district ?? '') },
          { key: 'schools', header: 'Schools', render: (row) => String(row.schools ?? '') },
          { key: 'status', header: 'Status', render: (row) => String(row.status ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}
