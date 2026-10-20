'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Provinces",
    "value": "5"
  },
  {
    "label": "Districts",
    "value": "30"
  },
  {
    "label": "Schools",
    "value": "4,218"
  },
  {
    "label": "Officers",
    "value": "48"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "province": "Kigali",
    "districts": "3",
    "schools": "612"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Provinces"}
      subtitle={"Provincial management overview."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'province', header: 'Province', render: (row) => String(row.province ?? '') },
          { key: 'districts', header: 'Districts', render: (row) => String(row.districts ?? '') },
          { key: 'schools', header: 'Schools', render: (row) => String(row.schools ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}
