import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { ChatRoom } from "@/components/chat/ChatRoom";

export const dynamic = "force-dynamic";

export default async function MainChatPage() {
  const { user, profile } = await requireApproved();
  const supabase = supabaseServer();

  const { data: chat } = await supabase
    .from("chats")
    .select("*")
    .eq("type", "main")
    .maybeSingle();

  if (!chat) {
    return (
      <div className="pt-20 px-6 text-center text-ink-300">
        Main room is not set up yet. Run migrations.
      </div>
    );
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chat.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);

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
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">Main Room</div>
            <div className="text-white text-[18px] font-semibold leading-tight">The Watchmen</div>
          </div>
          <div className="text-[11px] text-ink-400">{(messages ?? []).length} messages</div>
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
      />
    </div>
  );
}
