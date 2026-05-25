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
    if (!("geolocation" in navigator)) {
      const r = await checkInAction({ event_id: eventId, latitude: 0, longitude: 0 });
      setBusy(false);
      if ((r as any).error) push({ title: "Check-in failed", body: (r as any).error, variant: "error" });
      else push({ title: "Checked in", body: "+25 points", variant: "success" });
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
      async () => {
        const r = await checkInAction({ event_id: eventId, latitude: 0, longitude: 0 });
        setBusy(false);
        if ((r as any).error) push({ title: "Check-in failed", body: (r as any).error, variant: "error" });
        else push({ title: "Checked in", body: "Without precise location.", variant: "success" });
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
