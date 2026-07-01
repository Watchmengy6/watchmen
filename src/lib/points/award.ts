"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Insert a points_ledger row and bump profile.points_total.
 * Uses the service-role client so RLS doesn't get in the way.
 * Fail-soft: errors are logged but never thrown.
 */
type ActionType =
  | "post_created"
  | "comment_added"
  | "post_liked"
  | "meetup_created"
  | "meetup_rsvp"
  | "meetup_check_in"
  | "event_rsvp"
  | "event_check_in"
  | "invite_approved";

const POINTS: Record<ActionType, number> = {
  post_created: 5,
  comment_added: 2,
  post_liked: 1,
  meetup_created: 10,
  meetup_rsvp: 3,
  meetup_check_in: 15,
  event_rsvp: 5,
  event_check_in: 25,
  invite_approved: 50,
};

function svc() {
  return supabaseAdmin();
}

export async function awardPoints(opts: {
  userId: string;
  action: ActionType;
  /** Optional related entity ("post" | "meetup" | "event" | etc) for the ledger. */
  meta?: { post_id?: string; meetup_id?: string; event_id?: string; comment_id?: string; kind?: string };
}): Promise<void> {
  try {
    const points = POINTS[opts.action];
    const supabase = svc();

    // Pick the most relevant related entity from meta.
    let relatedType: string | null = null;
    let relatedId: string | null = null;
    if (opts.meta?.post_id) {
      relatedType = "post";
      relatedId = opts.meta.post_id;
    } else if (opts.meta?.meetup_id) {
      relatedType = "meetup";
      relatedId = opts.meta.meetup_id;
    } else if (opts.meta?.event_id) {
      relatedType = "event";
      relatedId = opts.meta.event_id;
    } else if (opts.meta?.comment_id) {
      relatedType = "comment";
      relatedId = opts.meta.comment_id;
    }

    // Atomic ledger insert + points_total bump (no read-modify-write race).
    await supabase.rpc("award_points_rpc", {
      p_user_id: opts.userId,
      p_action: opts.action,
      p_points: points,
      p_related_type: relatedType,
      p_related_id: relatedId,
    });
  } catch (e) {
    console.warn("[awardPoints] failed (non-fatal)", e);
  }
}
