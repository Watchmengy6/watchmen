// Placeholder map preview. Replace with Google Maps API once a key is provisioned.
export function MapPreview({
  lat,
  lng,
  label,
  address,
}: {
  lat: number | null;
  lng: number | null;
  label?: string | null;
  /** Plain address string — used as a fallback when lat/lng aren't set. */
  address?: string | null;
}) {
  // Prefer coordinates; fall back to a text-based search so the CTA still works.
  const hasCoords = lat != null && lng != null;
  const href = hasCoords
    ? `https://maps.apple.com/?q=${lat},${lng}`
    : address
      ? `https://maps.apple.com/?q=${encodeURIComponent(address)}`
      : null;

  if (!href) {
    return (
      <div className="rounded-xl bg-ink-800 hairline h-32 flex items-center justify-center text-ink-400 text-sm">
        Location not set
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl bg-gradient-to-br from-ink-700 to-ink-900 hairline h-32 relative overflow-hidden"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-3">
          <div className="text-gold-300 text-sm font-medium">{label ?? "Open in Maps"}</div>
          {hasCoords ? (
            <div className="text-ink-400 text-[11px] mt-0.5 font-mono">
              {lat!.toFixed(4)}, {lng!.toFixed(4)}
            </div>
          ) : address ? (
            <div className="text-ink-400 text-[11px] mt-0.5 truncate max-w-[80vw]">
              {address}
            </div>
          ) : null}
        </div>
      </div>
    </a>
  );
}
