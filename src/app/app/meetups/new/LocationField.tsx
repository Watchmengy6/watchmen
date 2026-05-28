"use client";

import { useState } from "react";

/**
 * "Pin to my location" capture for meetup creation.
 *
 * Writes hidden `latitude` / `longitude` fields into the form when the
 * host taps the button. The server then enforces a 250m radius on
 * check-in, so attendees actually have to show up.
 *
 * Optional — meetups without coords still allow check-in but only
 * enforce the time window.
 */
export function LocationField() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function capture() {
    if (!("geolocation" in navigator)) {
      setErr("This device can't share location.");
      return;
    }
    setBusy(true);
    setErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBusy(false);
      },
      (e) => {
        setBusy(false);
        setErr(
          e.code === e.PERMISSION_DENIED
            ? "Location permission denied."
            : "Couldn't get your location.",
        );
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-1.5">
        Pin to my location
      </div>
      <button
        type="button"
        onClick={capture}
        disabled={busy}
        className="w-full h-11 rounded-xl bg-ink-800 hairline text-ink-100 text-[14px] flex items-center justify-between px-3 disabled:opacity-60"
      >
        <span className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-gold-300"
          >
            <path d="M12 22s-7-8-7-13a7 7 0 1 1 14 0c0 5-7 13-7 13Z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          {coords
            ? "Pinned — attendees check in here"
            : busy
              ? "Getting your location…"
              : "Tap to pin venue (for check-ins)"}
        </span>
        {coords ? <span className="text-gold-300 text-[13px]">✓</span> : null}
      </button>
      {coords ? (
        <>
          <input type="hidden" name="latitude" value={coords.lat} />
          <input type="hidden" name="longitude" value={coords.lng} />
        </>
      ) : null}
      {err ? (
        <div className="mt-1.5 text-[12px] text-red-300">{err}</div>
      ) : null}
      <div className="mt-1.5 text-[11px] text-ink-400">
        Optional. Without this, check-ins only enforce the time window.
      </div>
    </div>
  );
}
