"use client";

import { Button } from "@/components/ui/Button";
import { rsvpAction } from "@/lib/events/actions";
import { useToast } from "@/components/ui/Toast";
import { useTransition } from "react";

export function RsvpButton({
  eventId,
  going,
}: {
  eventId: string;
  going: boolean;
}) {
  const [pending, start] = useTransition();
  const { push } = useToast();

  return (
    <Button
      variant={going ? "outline" : "gold"}
      size="lg"
      fullWidth
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await rsvpAction(eventId, going ? "not_going" : "going");
          if ((r as any).error) {
            push({ title: "RSVP failed", body: (r as any).error, variant: "error" });
          } else if (going) {
            push({ title: "RSVP removed", variant: "success" });
          } else {
            // Only show the +5 message when points were actually awarded.
            push({
              title: "You're going",
              variant: "success",
              body: (r as any).awardedPoints
                ? "+5 points · Event room unlocked."
                : "Event room unlocked.",
            });
          }
        })
      }
    >
      {going ? "Cancel RSVP" : "I'm Going"}
    </Button>
  );
}
