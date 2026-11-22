import { Bus, IdCard, MapPin, UserRound } from 'lucide-react';
import { Field, Input, Select } from '@/components/ui/form-field';

export type TransportVehicleState = {
  mode: string;
  plateNumber: string;
  vehicleType: string;
  capacity: number;
  driverName: string;
  driverPhone: string;
  driverLicenseCategory: string;
  driverLicenseNumber: string;
};

export const DRIVER_LICENSE_CATEGORIES = [
  { value: '', label: 'Select category…' },
  { value: 'A', label: 'A — Motorcycle' },
  { value: 'A1', label: 'A1 — Light motorcycle' },
  { value: 'B', label: 'B — Light vehicle / car' },
  { value: 'C', label: 'C — Light truck / van' },
  { value: 'D', label: 'D — Bus / passenger transport' },
  { value: 'E', label: 'E — Heavy trailer combination' },
  { value: 'F', label: 'F — Special / other' },
] as const;

export function TransportRouteStep({
  departurePoint,
  onDeparturePointChange,
  vehicle,
  onVehicleChange,
}: {
  departurePoint: string;
  onDeparturePointChange: (value: string) => void;
  vehicle: TransportVehicleState;
  onVehicleChange: (next: TransportVehicleState) => void;
}) {
  function patch(partial: Partial<TransportVehicleState>) {
    onVehicleChange({ ...vehicle, ...partial });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-slate-50/60 p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy text-white">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-navy">Route</h3>
            <p className="text-xs text-slate-500">Where learners board and depart from</p>
          </div>
        </div>
        <Field label="Departure point" hint="School gate, main parking, or agreed pick-up">
          <Input
            value={departurePoint}
            onChange={(e) => onDeparturePointChange(e.target.value)}
            placeholder="e.g. Main gate — ST THEO SCHOOL"
          />
        </Field>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber text-navy">
            <Bus className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-navy">Vehicle</h3>
            <p className="text-xs text-slate-500">Registration and capacity for this trip</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Transport mode">
            <Select value={vehicle.mode} onChange={(e) => patch({ mode: e.target.value })}>
              <option value="Bus">Bus</option>
              <option value="Coaster">Coaster / minibus</option>
              <option value="Van">Van</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
          <Field label="Vehicle type">
            <Input
              value={vehicle.vehicleType}
              onChange={(e) => patch({ vehicleType: e.target.value })}
              placeholder="Coaster, 30-seater…"
            />
          </Field>
          <Field label="Plate number" required>
            <Input
              value={vehicle.plateNumber}
              onChange={(e) => patch({ plateNumber: e.target.value.toUpperCase() })}
              placeholder="RAB 123 A"
            />
          </Field>
          <Field label="Passenger capacity">
            <Input
              type="number"
              min={1}
              value={vehicle.capacity || ''}
              onChange={(e) => patch({ capacity: Number(e.target.value) || 0 })}
            />
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-navy/15 bg-gradient-to-br from-navy/[0.04] to-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy text-white">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-navy">Driver</h3>
            <p className="text-xs text-slate-500">
              License details must match the driver license document uploaded in the documents step
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Driver full name" required>
            <Input value={vehicle.driverName} onChange={(e) => patch({ driverName: e.target.value })} placeholder="Jean Baptiste" />
          </Field>
          <Field label="Driver phone">
            <Input
              value={vehicle.driverPhone}
              onChange={(e) => patch({ driverPhone: e.target.value })}
              placeholder="+250 788 000 000"
            />
          </Field>
          <Field label="License category" required hint="Class on the driving permit">
            <Select
              value={vehicle.driverLicenseCategory}
              onChange={(e) => patch({ driverLicenseCategory: e.target.value })}
            >
              {DRIVER_LICENSE_CATEGORIES.map((c) => (
                <option key={c.value || 'empty'} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="License number" required>
            <div className="relative">
              <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9 font-mono uppercase tracking-wide"
                value={vehicle.driverLicenseNumber}
                onChange={(e) => patch({ driverLicenseNumber: e.target.value.toUpperCase() })}
                placeholder="DL-2024-XXXXX"
                autoComplete="off"
              />
            </div>
          </Field>
        </div>
      </div>
    </div>
  );
}
