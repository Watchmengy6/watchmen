// Placeholder map preview. Replace with Google Maps API once a key is provisioned.
export function MapPreview({
  lat,
  lng,
  label,
}: {
  lat: number | null;
  lng: number | null;
  label?: string | null;
}) {
  if (lat == null || lng == null) {
    return (
      <div className="rounded-xl bg-ink-800 hairline h-32 flex items-center justify-center text-ink-400 text-sm">
        Location coordinates not set
      </div>
    );
  }
  const href = `https://maps.apple.com/?q=${lat},${lng}`;
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
          <div className="text-ink-400 text-[11px] mt-0.5 font-mono">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </div>
        </div>
      </div>
    </a>
  );
}
