import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { ChatRoom } from "@/components/chat/ChatRoom";

export const dynamic = "force-dynamic";

export default async function EventChatPage({ params }: { params: { eventId: string } }) {
  const { user, profile } = await requireApproved();
  const supabase = supabaseServer();

  // Gate: must be going to access the event room.
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

  const { data: chat } = await supabase
    .from("chats")
    .select("*")
    .eq("type", "event")
    .eq("event_id", event.id)
    .maybeSingle();
  if (!chat) notFound();

  // Fetch newest 200, then reverse to render oldest→newest.
  const { data: messagesDesc } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chat.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
  const messages = (messagesDesc ?? []).slice().reverse();

  const userIds = Array.from(new Set((messages ?? []).map((m) => m.user_id)));
  const { data: authors } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, profile_photo_url")
        .in("id", userIds)
    : { data: [] as any[] };
  const authorMap: Record<string, any> = {};
  for (const a of authors ?? []) authorMap[a.id] = a;

  const messageIds = (messages ?? []).map((m) => m.id);
  const { data: reactions } = messageIds.length
    ? await supabase
        .from("message_reactions")
        .select("message_id, user_id, reaction_type")
        .in("message_id", messageIds)
    : { data: [] };

  const { data: polls } = await supabase
    .from("polls")
    .select("*")
    .eq("chat_id", chat.id)
    .order("created_at", { ascending: true });
  const pollIds = (polls ?? []).map((p) => p.id);
  const [{ data: pollOpts }, { data: pollVotes }] = await Promise.all([
    pollIds.length
      ? supabase.from("poll_options").select("id, poll_id, option_text").in("poll_id", pollIds)
      : Promise.resolve({ data: [] as any[] }),
    pollIds.length
      ? supabase.from("poll_votes").select("poll_id, poll_option_id, user_id").in("poll_id", pollIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const enrichedPolls = (polls ?? []).map((p) => ({
    ...p,
    options: (pollOpts ?? []).filter((o: any) => o.poll_id === p.id),
    votes: (pollVotes ?? []).filter((v: any) => v.poll_id === p.id),
  }));

  return (
    <div className="relative">
      <div className="fixed top-0 left-0 right-0 z-30 glass border-b border-white/[0.06]">
        <div className="mx-auto max-w-screen-sm flex items-center justify-between px-4 py-2 safe-top gap-2">
          <Link
            href={`/app/events/${event.id}`}
            className="text-ink-200 text-sm flex items-center"
          >
            ← Event
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300">Event Room</div>
            <div className="text-white text-[14px] font-semibold truncate">{event.title}</div>
          </div>
          <div className="w-12" />
        </div>
      </div>
      <ChatRoom
        chatId={chat.id}
        authUserId={user.id}
        myProfileId={profile.id}
        initialMessages={messages ?? []}
        initialAuthors={authorMap}
        initialReactions={reactions ?? []}
        initialPolls={enrichedPolls as any}
        eventId={event.id}
      />
    </div>
  );
}
