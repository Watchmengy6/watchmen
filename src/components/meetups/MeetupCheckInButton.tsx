"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { checkInMeetupAction } from "@/lib/meetups/actions";
import { useToast } from "@/components/ui/Toast";

/**
 * Geolocated check-in for meetups. Mirrors the events CheckInButton:
 *   - Refuses to attempt without a real GPS fix (no 0,0 fallback).
 *   - Server-side validates coords + radius + time window + RSVP.
 *   - Awards +10 points on successful check-in.
 *
 * Visibility rules are enforced by the parent — this component
 * assumes the user is already going, the meetup is happening now,
 * and they haven't already checked in.
 */
export function MeetupCheckInButton({
  meetupId,
  alreadyCheckedIn,
}: {
  meetupId: string;
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
        const r = await checkInMeetupAction({
          meetup_id: meetupId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setBusy(false);
        if ((r as any).error) {
          push({ title: "Check-in failed", body: (r as any).error, variant: "error" });
        } else {
          push({ title: "Checked in", body: "+10 points", variant: "success" });
        }
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
