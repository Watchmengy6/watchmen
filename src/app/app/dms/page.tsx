import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";
import { relativeTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

export default async function DmsPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();
  // The "events" sub-tab is hidden for now — event chat still lives on the
  // old chats/messages tables and doesn't populate threads.kind = 'event'.
  // Will be re-added when event chat is migrated onto the threads system.
  // Default to Groups (Dustin's call) — most members will land here
  // looking for run-club / bible-study chatter, not a one-on-one DM.
  const activeTab = (searchParams?.tab ?? "groups") as "private" | "groups";

  // Threads where I'm a member.
  const { data: myThreadRows } = await supabase
    .from("thread_members")
    .select("thread_id, muted, last_read_at")
    .eq("user_id", profile.id);
  const threadIds = (myThreadRows ?? []).map((r: any) => r.thread_id);

  // Build a lookup: my last_read_at per thread (null = never opened).
  const lastReadMap = new Map<string, string | null>();
  (myThreadRows ?? []).forEach((r: any) => {
    lastReadMap.set(r.thread_id, r.last_read_at ?? null);
  });

  const { data: threads } = threadIds.length
    ? await supabase
        .from("threads")
        .select("id, kind, title, last_message_at, last_message_preview, group_id, event_id")
        .in("id", threadIds)
        .order("last_message_at", { ascending: false, nullsFirst: false })
    : { data: [] };

  // A thread is "unread" when it has any message and I haven't read up to it.
  function isUnread(t: any): boolean {
    if (!t.last_message_at) return false;
    const lastRead = lastReadMap.get(t.id);
    if (!lastRead) return true;
    return new Date(t.last_message_at).getTime() > new Date(lastRead).getTime();
  }

  // For DM threads, fetch the *other* member's name + avatar.
  const dmThreads = (threads ?? []).filter((t: any) => t.kind === "dm");
  const groupThreads = (threads ?? []).filter((t: any) => t.kind === "group");

  const dmCounterparts = new Map<string, any>();
  if (dmThreads.length > 0) {
    const { data: pairs } = await supabase
      .from("thread_members")
      .select("thread_id, profile:profiles!thread_members_user_id_fkey(id, full_name, profile_photo_url)")
      .in(
        "thread_id",
        dmThreads.map((t: any) => t.id),
      )
      .neq("user_id", profile.id);
    (pairs ?? []).forEach((row: any) => {
      const p = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      if (p) dmCounterparts.set(row.thread_id, p);
    });
  }

  // Tab badges show UNREAD thread count, not total.
  const counts = {
    private: dmThreads.filter(isUnread).length,
    groups: groupThreads.filter(isUnread).length,
  };

  const listForTab = activeTab === "groups" ? groupThreads : dmThreads;

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Chats
            </div>
            <div className="text-white text-[22px] font-semibold leading-tight">
              Conversations
            </div>
          </div>
          <Link
            href="/app/dms/new"
            className="h-9 px-4 rounded-full text-[13px] font-semibold bg-gradient-to-b from-gold-300 to-gold-500 text-black inline-flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New
          </Link>
        </div>
        <div className="px-4 pb-2 flex gap-1">
          <Pill href="/app/dms?tab=private" label="Private" count={counts.private} active={activeTab === "private"} />
          <Pill href="/app/dms?tab=groups" label="Groups" count={counts.groups} active={activeTab === "groups"} />
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {listForTab.length === 0 ? (
          <div className="px-6 py-16 text-center text-ink-300 text-sm">
            {activeTab === "private"
              ? "No private messages yet. Tap New to start one."
              : "Join a group to chat with the room."}
          </div>
        ) : (
          listForTab.map((t: any) => {
            const counterpart = activeTab === "private" ? dmCounterparts.get(t.id) : null;
            const title =
              activeTab === "private"
                ? counterpart?.full_name ?? "Brother"
                : t.title ?? "Untitled";
            const href =
              activeTab === "groups" && t.group_id
                ? `/app/groups/${t.group_id}/chat`
                : `/app/dms/${t.id}`;
            const unread = isUnread(t);
            return (
              <Link
                key={t.id}
                href={href}
                className="flex items-center gap-3 px-4 py-3 active:bg-white/[0.02]"
              >
                <Avatar
                  name={title}
                  src={counterpart?.profile_photo_url ?? undefined}
                  size={48}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <div
                      className={
                        unread
                          ? "text-white text-[15px] font-semibold truncate"
                          : "text-ink-100 text-[15px] truncate"
                      }
                    >
                      {title}
                    </div>
                    {t.last_message_at ? (
                      <div
                        className={
                          unread
                            ? "text-[11px] text-gold-300 shrink-0 font-semibold"
                            : "text-[11px] text-ink-400 shrink-0"
                        }
                      >
                        {relativeTime(t.last_message_at)}
                      </div>
                    ) : null}
                  </div>
                  <div
                    className={
                      unread
                        ? "text-ink-100 text-[13.5px] truncate mt-0.5"
                        : "text-ink-400 text-[13.5px] truncate mt-0.5"
                    }
                  >
                    {t.last_message_preview ?? "No messages yet."}
                  </div>
                </div>
                {unread ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-gold-400 shrink-0" aria-label="Unread" />
                ) : null}
              </Link>
            );
          })
        )}
      </div>

      <p className="px-6 pt-6 text-[11px] text-ink-400 text-center">
        Only Watchmen members can DM you.
      </p>
    </div>
  );
}

function Pill({ href, label, count, active }: { href: string; label: string; count: number; active: boolean }) {
  // Only render an unread count when > 0. When 0, the tab is plain text.
  return (
    <Link
      href={href}
      className={
        active
          ? "flex-1 h-9 rounded-full bg-white text-black font-semibold text-[13px] inline-flex items-center justify-center gap-2"
          : "flex-1 h-9 rounded-full bg-ink-800 hairline text-ink-200 text-[13px] inline-flex items-center justify-center gap-2"
      }
    >
      {label}
      {count > 0 ? (
        <span
          className={
            active
              ? "h-5 min-w-5 px-1.5 rounded-full bg-gold-400 text-black text-[10.5px] font-bold inline-flex items-center justify-center"
              : "h-5 min-w-5 px-1.5 rounded-full bg-gold-400 text-black text-[10.5px] font-bold inline-flex items-center justify-center"
          }
          aria-label={`${count} unread`}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
