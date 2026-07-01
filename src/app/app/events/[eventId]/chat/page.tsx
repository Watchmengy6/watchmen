import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { ThreadChatClient } from "@/app/app/dms/[threadId]/ThreadChatClient";
import { markThreadReadAction } from "@/lib/dms/actions";
import { signMessagesMedia } from "@/lib/uploads/signChatMedia";
import { BackButton } from "@/components/ui/BackButton";

export const dynamic = "force-dynamic";

/**
 * Event room chat — migrated to the threads/thread_messages stack
 * (migration 00031). RSVP-going automatically syncs to thread_members
 * via the trigger, so we just look up the thread by event_id and
 * render the same client as DMs and group chats. This brings
 * load-older pagination + the realtime author cache to event rooms.
 */
export default async function EventChatPage({
  params,
}: {
  params: { eventId: string };
}) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  // Gate: must be going to access the event room. The thread_members
  // sync trigger should have us in already, but we double-check at the
  // page layer for clarity.
  const { data: rsvp } = await supabase
    .from("event_rsvps")
    .select("status")
    .eq("event_id", params.eventId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!rsvp || rsvp.status !== "going") {
    redirect(`/app/events/${params.eventId}`);
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", params.eventId)
    .maybeSingle();
  if (!event) notFound();

  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("kind", "event")
    .eq("event_id", event.id)
    .maybeSingle();
  if (!thread) notFound();

  // Fetch newest 200 desc, render oldest→newest. ThreadChatClient
  // handles "Load older" beyond that.
  const { data: messagesDesc } = await supabase
    .from("thread_messages")
    .select(
      "id, body, media_url, media_type, created_at, author_id, author:profiles!thread_messages_author_id_fkey(id, full_name, profile_photo_url)",
    )
    .eq("thread_id", thread.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    // Initial page: 50 messages. Event rooms during a live event hit
    // high message volume; serializing 200 on open was the single
    // biggest contributor to "Chats tab feels slow" on real devices.
    // Older history loads on-demand via ThreadChatClient's load-older.
    .limit(50);
  const messages = (messagesDesc ?? []).slice().reverse();

  void markThreadReadAction(thread.id).catch(() => {});

  const adapted = messages.map((m: any) => {
    const a = Array.isArray(m.author) ? m.author[0] : m.author;
    return {
      id: m.id,
      body: m.body ?? "",
      media_url: m.media_url ?? null,
      media_type: (m.media_type ?? "none") as "none" | "image" | "video",
      created_at: m.created_at,
      author_id: m.author_id,
      author_name: a?.full_name ?? "Brother",
      author_photo: a?.profile_photo_url ?? null,
      is_me: m.author_id === profile.id,
    };
  });
  // P0.2 — sign chat media so the private bucket's images still load.
  const adaptedSigned = await signMessagesMedia(adapted);

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink-900 flex flex-col">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <BackButton
            fallbackHref={`/app/events/${event.id}`}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-800 hairline text-ink-100 text-lg"
          />
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Event room
            </div>
            <div className="text-white text-[16px] font-semibold leading-tight">
              {event.title}
            </div>
          </div>
        </div>
      </div>

      <ThreadChatClient
        threadId={thread.id}
        initialMessages={adaptedSigned}
        meId={profile.id}
        meName={profile.full_name}
        meAvatar={profile.profile_photo_url}
        initialPageSize={50}
      />
    </div>
  );
}
