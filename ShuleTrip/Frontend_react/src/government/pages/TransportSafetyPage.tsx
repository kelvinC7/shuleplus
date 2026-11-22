import { GovApplicationsWorkspace } from '@/government/components/gov-applications-workspace';
import { Card } from '@/components/ui/card';
import { cn } from '@/shared/cn';

const TRANSPORT_CHECKS = [
  { key: 'vehicle_licence', label: 'Vehicle type & licence category' },
  { key: 'roadworthiness', label: 'Roadworthiness certificate / report' },
  { key: 'insurance', label: 'Motor third-party insurance' },
  { key: 'capacity', label: 'Seating capacity vs manifest' },
  { key: 'driver_licence', label: 'Driver credentials & validity' },
  { key: 'route', label: 'Route, stops & emergency plan' },
];

export default function TransportSafetyPage() {
  return (
    <div className="space-y-6">
      <GovApplicationsWorkspace
        title="Transport & road-safety verification"
        description="After education sign-off · verify vehicle, driver, insurance, capacity, and route evidence before final authorization."
        stage="transport"
        signActionLabel="Sign transport gate"
        emptyMessage="No applications currently assigned to transport verification."
      />
      <Card>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Verification checklist reference</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {TRANSPORT_CHECKS.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
              <span className="font-medium text-slate-800">{c.label}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', 'bg-slate-100 text-slate-600')}>
                On review
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
