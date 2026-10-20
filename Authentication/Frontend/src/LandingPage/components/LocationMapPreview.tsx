"use client";

type LocationParts = {
  provinceName?: string;
  districtName?: string;
  sectorName?: string;
  cellName?: string;
  villageName?: string;
  postalAddress?: string;
};

function buildMapQuery(parts: LocationParts): string {
  if (parts.postalAddress?.trim() && !parts.cellName?.trim() && !parts.sectorName?.trim()) {
    return parts.postalAddress.trim();
  }

  const segments = [
    parts.cellName?.trim(),
    parts.sectorName?.trim(),
    parts.districtName?.trim(),
    parts.provinceName?.trim(),
    "Rwanda",
  ].filter(Boolean);

  return segments.join(", ") || "Kigali, Rwanda";
}

function mapZoom(parts: LocationParts): number {
  if (parts.cellName?.trim()) return 17;
  if (parts.sectorName?.trim()) return 15;
  if (parts.districtName?.trim()) return 14;
  return 13;
}

export function LocationMapPreview({
  parts,
  title = "School location",
  className = "",
}: {
  parts: LocationParts;
  title?: string;
  className?: string;
}) {
  const query = buildMapQuery(parts);
  const hasLocation =
    parts.cellName ||
    parts.sectorName ||
    parts.districtName ||
    parts.provinceName ||
    parts.postalAddress?.trim();

  if (!hasLocation) return null;

  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed&z=${mapZoom(parts)}`;
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-navy-900/[0.08] bg-white shadow-[0_8px_30px_-12px_rgba(0,4,53,0.15)] ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-navy-900/[0.06] px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-700/45">
            Map preview
          </p>
          <p className="mt-0.5 text-sm font-semibold text-navy-900">{query}</p>
        </div>
        <a
          href={directionsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center rounded-full bg-[#000435] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0a0f52]"
        >
          Directions
        </a>
      </div>
      <iframe
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={mapSrc}
        className="block h-[220px] w-full border-0 sm:h-[260px]"
        allowFullScreen
      />
    </div>
  );
}

export function LocationSummaryCard({
  parts,
  className = "",
}: {
  parts: LocationParts;
  className?: string;
}) {
  const rows = [
    ["Province", parts.provinceName],
    ["District", parts.districtName],
    ["Sector", parts.sectorName],
    ["Cell", parts.cellName],
    ["Village", parts.villageName],
  ].filter(([, value]) => Boolean(value?.trim()));

  if (rows.length === 0) return null;

  return (
    <div
      className={`rounded-2xl border border-navy-900/[0.08] bg-[#f8f9fb] p-4 ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-700/45">
        Registered location
      </p>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-navy-700/55">{label}</dt>
            <dd className="font-semibold text-navy-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
