import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { ThreadChatClient } from "@/app/app/dms/[threadId]/ThreadChatClient";
import { markThreadReadAction } from "@/lib/dms/actions";
import { signMessagesMedia } from "@/lib/uploads/signChatMedia";
import { BackButton } from "@/components/ui/BackButton";

export const dynamic = "force-dynamic";

export default async function GroupChatPage({
  params,
}: {
  params: { groupId: string };
}) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  // Group, membership, and thread lookups all depend only on the route
  // param + viewer id — run them in ONE parallel batch instead of three
  // serial round-trips. Combined with the message fetch below this cuts
  // group-chat open from 4 sequential DB trips to 2 (Dustin flagged
  // group open speed, July 2026).
  const [{ data: group }, { data: membership }, { data: thread }] =
    await Promise.all([
      supabase
        .from("groups")
        .select("id, name")
        .eq("id", params.groupId)
        .maybeSingle(),
      supabase
        .from("group_members")
        .select("user_id")
        .eq("group_id", params.groupId)
        .eq("user_id", profile.id)
        .maybeSingle(),
      supabase
        .from("threads")
        .select("id")
        .eq("group_id", params.groupId)
        .maybeSingle(),
    ]);
  if (!group) notFound();
  if (!membership) redirect(`/app/groups/${group.id}`);
  if (!thread) notFound();

  // Fetch newest 50 desc, then reverse to render oldest→newest. 50 (not
  // 200) keeps first paint snappy on long-running group threads; older
  // history loads on demand via ThreadChatClient's "Load older" button
  // (which is why initialPageSize={50} is passed below).
  const INITIAL_PAGE_SIZE = 50;
  const { data: messagesDesc } = await supabase
    .from("thread_messages")
    .select(
      "id, body, media_url, media_type, created_at, author_id, author:profiles!thread_messages_author_id_fkey(id, full_name, profile_photo_url)",
    )
    .eq("thread_id", thread.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(INITIAL_PAGE_SIZE);
  const messages = (messagesDesc ?? []).slice().reverse();

  // Mark this group's thread as read for the current member.
  // Fire-and-forget so we don't block render on an UPDATE roundtrip.
  void markThreadReadAction(thread.id).catch(() => {});

  const adapted = (messages ?? []).map((m: any) => {
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
            fallbackHref={`/app/groups/${group.id}`}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-800 hairline text-ink-100 text-lg"
          />
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Group chat
            </div>
            <div className="text-white text-[16px] font-semibold leading-tight">
              {group.name}
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
        initialPageSize={INITIAL_PAGE_SIZE}
      />
    </div>
  );
}
