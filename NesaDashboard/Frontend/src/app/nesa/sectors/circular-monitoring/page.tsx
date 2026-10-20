'use client';

import { ModuleScaffold } from '@/components/ui/module-scaffold';

const KPIS = [
  {
    "label": "Tracked",
    "value": "1,094"
  },
  {
    "label": "Late",
    "value": "27"
  },
  {
    "label": "Compliant",
    "value": "1,010"
  },
  {
    "label": "Escalated",
    "value": "9"
  }
] as const;

const FILTERS = [];

const ROWS: Record<string, unknown>[] = [
  {
    "circular": "BE-8841",
    "sector": "Kacyiru",
    "state": "On time"
  }
];

export default function Page() {
  return (
    <ModuleScaffold
      title={"Circular Monitoring"}
      subtitle={"Monitor circular issuance at sector level."}
      kpis={[...KPIS]}
      filters={FILTERS}
      columns={[
          { key: 'circular', header: 'Circular', render: (row) => String(row.circular ?? '') },
          { key: 'sector', header: 'Sector', render: (row) => String(row.sector ?? '') },
          { key: 'state', header: 'State', render: (row) => String(row.state ?? '') }
      ]}
      rows={ROWS}
      rowKey={(row) => Object.values(row).join('-')}
    />
  );
}
