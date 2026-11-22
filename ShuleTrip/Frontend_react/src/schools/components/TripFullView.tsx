import { useState } from 'react';
import {
  Bus,
  FileText,
  Shield,
  Users,
  UserCircle2,
  MapPin,
  CheckCircle2,
  Circle,
  AlertCircle,
} from 'lucide-react';
import {
  isSchoolTripAuthorized,
  SchoolAuthorizationBanner,
} from '@/schools/components/SchoolAuthorizationActions';
import type { ReadinessReport, TripDetail } from '@/schools/types/trip';
import { TripPassQr } from '@/components/trip-pass-qr';
import { tripVerifyUrl } from '@/shared/trip-qr';
import { TRIP_DOC_TYPES } from '@/schools/components/DocumentsConsentStep';
import { formatTripDateTime } from '@/schools/utils/trip-display';
import { cn } from '@/shared/cn';
import { StatusBadge } from '@/components/ui/badge';
import { SchoolGovernmentFeedback } from '@/schools/components/SchoolGovernmentFeedback';
import { SchoolTripGovernanceTimeline } from '@/schools/components/SchoolTripGovernanceTimeline';

export type TripViewTab = 'overview' | 'manifest' | 'staff' | 'transport' | 'safety' | 'documents' | 'consent';

const TABS: Array<{ id: TripViewTab; label: string; icon: typeof Users }> = [
  { id: 'overview', label: 'Overview', icon: MapPin },
  { id: 'manifest', label: 'Learners', icon: Users },
  { id: 'staff', label: 'Staff', icon: UserCircle2 },
  { id: 'transport', label: 'Transport', icon: Bus },
  { id: 'safety', label: 'Safety', icon: Shield },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'consent', label: 'Consent', icon: CheckCircle2 },
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value || 'N/A'}</p>
    </div>
  );
}

export function TripFullView({
  trip,
  readiness,
  initialTab = 'overview',
  density = 'default',
}: {
  trip: TripDetail;
  readiness: ReadinessReport | null;
  initialTab?: TripViewTab;
  /** Hides duplicate title block when drawer header already shows trip name */
  density?: 'default' | 'comfortable';
}) {
  const [tab, setTab] = useState<TripViewTab>(initialTab);
  const safety = (trip.safetyDetails ?? {}) as Record<string, boolean>;
  const route = (trip.routeDetails ?? {}) as { departurePoint?: string };
  const vehicle = trip.vehicles[0];
  const leader = trip.staff.find((s) => s.isLeader);
  const authorized = isSchoolTripAuthorized(trip.status);
  const authNo = trip.authorizations?.[0]?.authorizationNo;

  const compactHeader = density === 'comfortable';

  return (
    <div className="space-y-4 sm:space-y-5">
      {authorized ? (
        <SchoolAuthorizationBanner tripId={trip.id} authorizationNo={authNo} />
      ) : null}

      <SchoolGovernmentFeedback trip={trip} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_min(100%,300px)] xl:items-start xl:gap-6">
        <div className="min-w-0 space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-line/80 bg-white p-1 shadow-sm">
            <div className="flex min-w-min gap-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition sm:gap-2 sm:px-3.5 sm:text-sm',
                    tab === id ? 'bg-[#000435] text-white' : 'text-slate-600 hover:bg-slate-100'
                  )}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
      {tab === 'overview' ? (
        <div className="space-y-5">
          {!compactHeader ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-line pb-4">
              <StatusBadge status={trip.status} />
              {readiness ? (
                <span className="rounded-full bg-[#000435] px-2.5 py-0.5 text-xs font-bold text-white">
                  {readiness.score}% ready
                </span>
              ) : null}
            </div>
          ) : readiness && readiness.score < 100 ? (
            <p className="text-xs font-semibold text-slate-500">Readiness {readiness.score}%</p>
          ) : null}

          {trip.purpose ? (
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Purpose</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{trip.purpose}</p>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label="Destination" value={trip.destination ?? ''} />
            <InfoRow label="Trip leader" value={trip.tripLeaderName ?? leader?.fullName ?? ''} />
            <InfoRow label="Departure" value={formatTripDateTime(trip.departAt ?? null)} />
            <InfoRow label="Return" value={formatTripDateTime(trip.returnAt ?? null)} />
            <InfoRow label="Itinerary" value={trip.itinerary ?? ''} />
            <InfoRow label="Academic year" value={trip.academicYear ?? ''} />
          </div>

          {readiness ? (
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Submission checklist</p>
              <ul className="mt-3 space-y-2">
                {readiness.blockers.map((b) => (
                  <li key={b.key} className="flex gap-2 text-sm text-red-800">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {b.message}
                  </li>
                ))}
                {readiness.warnings.map((w) => (
                  <li key={w.key} className="flex gap-2 text-sm text-amber-900">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {w.message}
                  </li>
                ))}
                {readiness.blockers.length === 0 && readiness.warnings.length === 0 ? (
                  <li className="flex gap-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    No blockers on this application.
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === 'manifest' ? (
        <ul className="space-y-2">
          {trip.participants.length === 0 ? (
            <li className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-slate-500">No learners on manifest.</li>
          ) : (
            trip.participants.map((p) => (
              <li key={p.studentId} className="rounded-xl border border-line bg-white px-4 py-3 shadow-sm">
                <p className="font-bold text-slate-900">{p.fullName}</p>
                <p className="text-xs text-slate-500">{p.classLabel ?? 'Class n/a'} · {p.studentCode} · {p.guardianPhone ?? 'No phone'}</p>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {tab === 'staff' ? (
        <ul className="space-y-2">
          {trip.staff.length === 0 ? (
            <li className="rounded-xl border border-dashed border-line py-10 text-center text-sm text-slate-500">No staff assigned.</li>
          ) : (
            trip.staff.map((s, i) => (
              <li key={`${s.fullName}-${i}`} className="rounded-xl border border-line bg-white px-4 py-3">
                <p className="font-bold text-slate-900">{s.fullName}</p>
                <p className="text-sm text-slate-600">
                  {s.role}
                  {s.isLeader ? (
                    <span className="ml-2 rounded-full bg-amber-soft px-2 py-0.5 text-xs font-bold text-amber-950">Leader</span>
                  ) : null}
                </p>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {tab === 'transport' ? (
        vehicle ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Mode" value={vehicle.mode ?? ''} />
            <InfoRow label="Type" value={vehicle.vehicleType ?? ''} />
            <InfoRow label="Plate" value={vehicle.plateNumber ?? ''} />
            <InfoRow label="Capacity" value={vehicle.capacity != null ? String(vehicle.capacity) : ''} />
            <InfoRow label="Driver" value={vehicle.driverName ?? ''} />
            <InfoRow label="Driver phone" value={vehicle.driverPhone ?? ''} />
            <InfoRow label="License category" value={vehicle.driverLicenseCategory ?? ''} />
            <InfoRow label="License number" value={vehicle.driverLicenseNumber ?? ''} />
            <InfoRow label="Departure point" value={route.departurePoint ?? ''} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Transport not configured.</p>
        )
      ) : null}

      {tab === 'safety' ? (
        <ul className="space-y-2">
          {[
            { key: 'risksIdentified', label: 'Travel and destination risks identified' },
            { key: 'firstAidPlan', label: 'First aid arrangements documented' },
            { key: 'emergencyPlan', label: 'Emergency response plan in place' },
          ].map((item) => {
            const on = Boolean(safety[item.key]);
            return (
              <li key={item.key} className="flex items-center gap-3 rounded-xl border border-line bg-slate-50 px-4 py-3">
                {on ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-slate-300" />}
                <span className="text-sm font-semibold text-slate-800">{item.label}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {tab === 'documents' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {TRIP_DOC_TYPES.map(({ type, required }) => {
            const doc = trip.documents.find((d) => d.documentType === type);
            const fileName = doc?.fileName ?? '';
            return (
              <div key={type} className="rounded-2xl border border-line bg-white p-4">
                <p className="text-sm font-bold text-slate-900">{type}</p>
                <p className="mt-1 text-xs text-slate-500">{fileName || (required ? 'Missing · upload in wizard' : 'Optional')}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === 'consent' ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {trip.participants.map((p) => (
            <li key={p.studentId} className="flex items-center justify-between gap-4 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-900">{p.fullName}</p>
                <p className="text-xs text-slate-500">{p.studentCode}</p>
              </div>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-bold',
                  p.guardianConsent ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-soft text-amber-950'
                )}
              >
                {p.guardianConsent ? 'Consented' : 'Pending'}
              </span>
            </li>
          ))}
          {trip.participants.length === 0 ? (
            <li className="py-10 text-center text-sm text-slate-500">No learners to show.</li>
          ) : null}
        </ul>
      ) : null}
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-2">
          <div className="rounded-2xl border border-line bg-white p-4 text-center shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Verify this trip</p>
            <div className="mx-auto mt-3 inline-block rounded-xl bg-slate-50 p-3">
              <TripPassQr reference={trip.reference} size={128} />
            </div>
            <a
              href={tripVerifyUrl(trip.reference)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs font-bold text-[#000435] underline-offset-2 hover:underline"
            >
              Open public verify page
            </a>
          </div>
          <SchoolTripGovernanceTimeline trip={trip} />
        </aside>
      </div>
    </div>
  );
}
