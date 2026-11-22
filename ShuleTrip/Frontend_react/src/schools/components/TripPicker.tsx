import { Field, Select } from '@/components/ui/form-field';
import type { SchoolTripListItem } from '@/schools/types/trip-list';

export function TripPicker({
  trips,
  value,
  onChange,
  loading,
}: {
  trips: SchoolTripListItem[];
  value: string;
  onChange: (tripId: string) => void;
  loading?: boolean;
}) {
  return (
    <Field label="Trip application" className="max-w-xl">
      <Select disabled={loading} value={value} onChange={(e) => onChange(e.target.value)}>
        {trips.length === 0 ? <option value="">No trips available</option> : null}
        {trips.map((t) => (
          <option key={t.id} value={t.id}>
            {t.reference} · {t.title}
          </option>
        ))}
      </Select>
    </Field>
  );
}
