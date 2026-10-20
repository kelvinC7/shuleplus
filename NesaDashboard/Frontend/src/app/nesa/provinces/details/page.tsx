'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Schools",
    "value": "612"
  },
  {
    "label": "Circulars",
    "value": "198"
  },
  {
    "label": "Compliance",
    "value": "94%"
  },
  {
    "label": "Officers",
    "value": "9"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "district": "Gasabo",
    "schools": "210"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Province Details"}
      subtitle={"Deep dive into a single province."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'district', header: 'District', render: (row) => String(row.district ?? '') },
          { key: 'schools', header: 'Schools', render: (row) => String(row.schools ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}
