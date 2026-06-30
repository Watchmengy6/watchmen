import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";
import { ThreadChatClient } from "./ThreadChatClient";
import { markThreadReadAction } from "@/lib/dms/actions";
import { BackButton } from "@/components/ui/BackButton";

export const dynamic = "force-dynamic";

export default async function DmThreadPage({
  params,
}: {
  params: { threadId: string };
}) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  const { data: thread } = await supabase
    .from("threads")
    .select("id, kind, title, group_id, event_id")
    .eq("id", params.threadId)
    .maybeSingle();
  if (!thread) notFound();

  // Members (for header + counterpart name) and messages both depend only
  // on thread.id, not each other — fetch them in parallel to save a
  // round-trip. Messages: newest 50 (not 200) for snappy first paint on
  // long threads; older history loads on demand via ThreadChatClient
  // (hence initialPageSize={INITIAL_PAGE_SIZE} below).
  const INITIAL_PAGE_SIZE = 50;
  const [{ data: members }, { data: messagesDesc }] = await Promise.all([
    supabase
      .from("thread_members")
      .select(
        "user_id, profile:profiles!thread_members_user_id_fkey(id, full_name, profile_photo_url)",
      )
      .eq("thread_id", thread.id),
    supabase
      .from("thread_messages")
      .select(
        "id, body, media_url, media_type, created_at, author_id, author:profiles!thread_messages_author_id_fkey(id, full_name, profile_photo_url)",
      )
      .eq("thread_id", thread.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(INITIAL_PAGE_SIZE),
  ]);

  const others = (members ?? [])
    .map((row: any) => (Array.isArray(row.profile) ? row.profile[0] : row.profile))
    .filter((p: any) => p && p.id !== profile.id);

  const headerTitle =
    thread.kind === "dm"
      ? others[0]?.full_name ?? "Brother"
      : thread.title ?? "Conversation";
  const headerAvatar = thread.kind === "dm" ? others[0]?.profile_photo_url ?? null : null;

  const messages = (messagesDesc ?? []).slice().reverse();

  // Fire-and-forget the read marker so we don't block first paint of the
  // thread on a write that the user doesn't see. The group/event chat
  // routes already do this — DMs were the outlier. Inbox unread badges
  // still clear on next navigation back; worst case a stale unread dot
  // persists for one extra round trip if the network is slow.
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

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink-900 flex flex-col">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <BackButton
            fallbackHref="/app/dms"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-800 hairline text-ink-100 text-lg"
          />
          <Avatar src={headerAvatar ?? undefined} name={headerTitle} size={36} />
          <div className="flex-1 min-w-0">
            <div className="text-white text-[15px] font-semibold truncate">{headerTitle}</div>
            <div className="text-[11px] text-ink-400">
              {thread.kind === "dm" ? "Private message" : thread.kind === "group" ? "Group" : "Event"}
            </div>
          </div>
        </div>
      </div>

      <ThreadChatClient
        threadId={thread.id}
        initialMessages={adapted}
        meId={profile.id}
        meName={profile.full_name}
        meAvatar={profile.profile_photo_url}
        initialPageSize={INITIAL_PAGE_SIZE}
      />
    </div>
  );
}
