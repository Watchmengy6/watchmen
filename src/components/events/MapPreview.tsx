// Map "preview" card — by design this is a tappable card that deep-links
// into the user's native Maps app (Apple Maps on iOS, falls back to
// Google Maps via maps.apple.com's `?q=` redirect on Android/web). We
// intentionally don't render a real map tile image — that would require
// a paid map provider API key and a server-side tile proxy. The card
// shows the venue label + address/coordinates and opens Maps on tap,
// which is the only behavior the event detail page needs.
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
  // Prefer coordinates; fall back to an address search, then to the venue
  // name, so a named location like "Central Park St.Pete" is still tappable
  // even without coords/address.
  const hasCoords = lat != null && lng != null;
  const searchText = address || label || null;
  const href = hasCoords
    ? `https://maps.apple.com/?q=${lat},${lng}`
    : searchText
      ? `https://maps.apple.com/?q=${encodeURIComponent(searchText)}`
      : null;

  // No location info at all — render nothing rather than a big empty
  // "Location not set" box that looks broken.
  if (!href) {
    return null;
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
