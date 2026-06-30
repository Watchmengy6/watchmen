import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { ThreadChatClient } from "@/app/app/dms/[threadId]/ThreadChatClient";
import { markThreadReadAction } from "@/lib/dms/actions";
import { BackButton } from "@/components/ui/BackButton";

export const dynamic = "force-dynamic";

export default async function GroupChatPage({
  params,
}: {
  params: { groupId: string };
}) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("id", params.groupId)
    .maybeSingle();
  if (!group) notFound();

  // Must be a member.
  const { data: membership } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", group.id)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!membership) redirect(`/app/groups/${group.id}`);

  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("group_id", group.id)
    .maybeSingle();
  if (!thread) notFound();

  // Fetch newest 200 desc, then reverse to render oldest→newest.
  const { data: messagesDesc } = await supabase
    .from("thread_messages")
    .select(
      "id, body, media_url, media_type, created_at, author_id, author:profiles!thread_messages_author_id_fkey(id, full_name, profile_photo_url)",
    )
    .eq("thread_id", thread.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);
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

  return (
    <div className="h-[100dvh] overflow-hidden bg-ink-900 flex flex-col">
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
        initialMessages={adapted}
        meId={profile.id}
        meName={profile.full_name}
        meAvatar={profile.profile_photo_url}
      />
    </div>
  );
}
