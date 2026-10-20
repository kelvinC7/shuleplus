'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Sectors",
    "value": "416"
  },
  {
    "label": "Officers",
    "value": "380"
  },
  {
    "label": "Schools",
    "value": "4,218"
  },
  {
    "label": "Open cases",
    "value": "55"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "sector": "Kacyiru",
    "schools": "18",
    "status": "Healthy"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Sector Offices"}
      subtitle={"Sector-level monitoring dashboard."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'sector', header: 'Sector', render: (row) => String(row.sector ?? '') },
          { key: 'schools', header: 'Schools', render: (row) => String(row.schools ?? '') },
          { key: 'status', header: 'Status', render: (row) => String(row.status ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}
