"use client";

import { Button } from "@/components/ui/Button";
import { checkInAction } from "@/lib/events/actions";
import { useToast } from "@/components/ui/Toast";
import { useState } from "react";

export function CheckInButton({
  eventId,
  alreadyCheckedIn,
}: {
  eventId: string;
  alreadyCheckedIn: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  if (alreadyCheckedIn) {
    return (
      <Button variant="outline" size="lg" fullWidth disabled>
        Checked in ✓
      </Button>
    );
  }

  async function go() {
    setBusy(true);
    // Refuse to attempt check-in without a real geolocation fix. The
    // server-side validates radius/time/coords, so submitting 0,0 just
    // bounces — we'd rather give the user a clear "enable location" toast.
    if (!("geolocation" in navigator)) {
      setBusy(false);
      push({
        title: "Location required",
        body: "This device can't share location, so check-in isn't available here.",
        variant: "error",
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const r = await checkInAction({
          event_id: eventId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setBusy(false);
        if ((r as any).error) push({ title: "Check-in failed", body: (r as any).error, variant: "error" });
        else push({ title: "Checked in", body: "+25 points", variant: "success" });
      },
      (err) => {
        setBusy(false);
        push({
          title: "Location required",
          body:
            err.code === err.PERMISSION_DENIED
              ? "Enable location for The Watchmen and try again."
              : "Couldn't get your location — try again outside.",
          variant: "error",
        });
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  return (
    <Button variant="gold" size="lg" fullWidth loading={busy} onClick={go}>
      Check In
    </Button>
  );
}
