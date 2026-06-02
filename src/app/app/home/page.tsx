import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { FeedComposer } from "@/components/feed/FeedComposer";
import { FeedPostClient } from "./FeedPostClient";
import { PullToRefresh } from "@/components/feed/PullToRefresh";
import { Logo } from "@/components/brand/Logo";
import { AdminPill } from "@/components/admin/AdminPill";
import { fmtTime } from "@/lib/utils/date";
import { localTodayISO } from "@/lib/utils/localDate";
import { createPostAction } from "@/lib/feed/actions";
import type { FeedPostShape } from "@/components/feed/FeedPost";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";

  // Compute "today" in the Watchmen's home time zone instead of UTC so
  // the next-event banner doesn't flip a day early after 8 PM Tampa.
  const today = localTodayISO();

  // Birthdays today — used for the celebratory banner. We also book an
  // auto feed post via the SECURITY DEFINER RPC (idempotent: unique on
  // member_id + posted_for_date so concurrent renders dedupe at the DB).
  // Computing in JS avoids a synchronous DB roundtrip per home render.
  const { data: birthdayCandidates } = await supabase
    .from("profiles")
    .select("id, full_name, profile_photo_url, birthday")
    .eq("status", "approved")
    .not("birthday", "is", null);
  const todayLocal = new Date();
  const birthdaysToday = (birthdayCandidates ?? []).filter((p: any) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(p.birthday ?? "");
    if (!m) return false;
    return (
      Number(m[2]) === todayLocal.getMonth() + 1 &&
      Number(m[3]) === todayLocal.getDate()
    );
  });
  // Fire-and-forget book the auto-post for each birthday member. The RPC
  // is idempotent, so multiple home renders won't create dupes.
  if (birthdaysToday.length > 0) {
    void (async () => {
      try {
        await Promise.all(
          birthdaysToday.map((b: any) =>
            supabase.rpc("book_birthday_auto_post", { p_member_id: b.id }),
          ),
        );
      } catch (e) {
        console.warn("[home] birthday auto-post failed (non-fatal)", e);
      }
    })();
  }

  // Phase 1: fan everything that only needs the profile into ONE Promise.all.
  // Previously these ran serially (next-event → pending → unread → members →
  // groups → posts) which stacked five round-trip waits before the first
  // byte. Running in parallel is the single biggest win here.
  const [
    { data: nextEvent },
    pendingRes,
    { count: unread },
    { data: joinedGroups },
    postsRes,
  ] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, event_date, start_time, location_name, image_url")
      .eq("status", "published")
      .gte("event_date", today)
      .order("event_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
    isAdmin
      ? supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
      : Promise.resolve({ count: 0 }),
    supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("read", false),
    // Mention picker now fetches on-demand via searchMembersForMention,
    // so we no longer ship the full approved-member directory on every
    // home render. This keeps the page light as the community grows.
    supabase
      .from("group_members")
      .select("group:groups(id, name)")
      .eq("user_id", profile.id),
    supabase
      .from("posts")
      .select(
        `id, kind, body, created_at, media_url, meetup_when_at, meetup_location,
         poll_question, poll_options,
         author:profiles!posts_author_id_fkey(id, full_name, username, profile_photo_url, occupation, company, birthday),
         tagged_group:groups!posts_tagged_group_id_fkey(id, name, category),
         tagged_event:events!posts_tagged_event_id_fkey(id, title, event_date, start_time, location_name),
         tagged_meetup:meetups!posts_tagged_meetup_id_fkey(
           id, title, when_at, location_name,
           host:profiles!meetups_host_user_id_fkey(id, full_name, profile_photo_url)
         )`,
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const pendingCount = pendingRes.count ?? 0;
  const posts = postsRes.data;
  if (postsRes.error) console.error("[/app/home] posts query failed", postsRes.error);

  // Phase 2: likes, my-likes, comment previews, and poll votes for the
  // posts we just got. (Comment-count fan-out removed earlier —
  // comments.length sources from allComments.)
  const postIds = (posts ?? []).map((p: any) => p.id);
  const [{ data: likeRows }, { data: myLikeRows }, { data: cs }, { data: pollVoteRows }] =
    postIds.length
      ? await Promise.all([
          supabase.from("post_likes").select("post_id").in("post_id", postIds),
          supabase
            .from("post_likes")
            .select("post_id")
            .eq("user_id", profile.id)
            .in("post_id", postIds),
          supabase
            .from("post_comments")
            .select(
              "id, post_id, body, created_at, author:profiles!post_comments_author_id_fkey(id, full_name, profile_photo_url)",
            )
            .in("post_id", postIds)
            .is("deleted_at", null)
            .order("created_at", { ascending: true }),
          supabase
            .from("post_poll_votes")
            .select("post_id, user_id, option_index")
            .in("post_id", postIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];

  // Tally poll votes per post + remember the viewer's own vote.
  const pollTallies = new Map<string, number[]>();
  const myPollVotes = new Map<string, number>();
  (pollVoteRows ?? []).forEach((v: any) => {
    const idx = v.option_index as number;
    const arr = pollTallies.get(v.post_id) ?? [];
    arr[idx] = (arr[idx] ?? 0) + 1;
    pollTallies.set(v.post_id, arr);
    if (v.user_id === profile.id) myPollVotes.set(v.post_id, idx);
  });

  const likeCount = new Map<string, number>();
  (likeRows ?? []).forEach((r: any) => {
    likeCount.set(r.post_id, (likeCount.get(r.post_id) ?? 0) + 1);
  });
  const myLikes = new Set((myLikeRows ?? []).map((r: any) => r.post_id));

  // Group comments by post — keep them ascending for display.
  const allComments = new Map<string, any[]>();
  (cs ?? []).forEach((c: any) => {
    const list = allComments.get(c.post_id) ?? [];
    list.push(c);
    allComments.set(c.post_id, list);
  });

  // Adapt to FeedPostShape.
  const feed: FeedPostShape[] = (posts ?? []).map((p: any) => {
    const author = Array.isArray(p.author) ? p.author[0] : p.author;
    const tg = Array.isArray(p.tagged_group) ? p.tagged_group[0] : p.tagged_group;
    const te = Array.isArray(p.tagged_event) ? p.tagged_event[0] : p.tagged_event;
    const tm = Array.isArray(p.tagged_meetup) ? p.tagged_meetup[0] : p.tagged_meetup;
    // Poll bookkeeping — pad the tally array to match the option count
    // so the renderer can index safely even on a 0-vote option.
    const pollOpts = (p.poll_options as string[] | null) ?? null;
    const rawTally = pollTallies.get(p.id) ?? [];
    const pollVotes = pollOpts
      ? pollOpts.map((_: string, idx: number) => rawTally[idx] ?? 0)
      : null;
    const pollMyVote = myPollVotes.has(p.id) ? myPollVotes.get(p.id)! : null;

    return {
      id: p.id,
      type: (p.kind as any) ?? "post",
      body: p.body,
      created_at: p.created_at,
      image_url: p.media_url ?? null,
      // Member-meetup feed posts carry structured when/where so the
      // renderer can show a card without resolving a meetup entity.
      meetup_when_at: p.meetup_when_at ?? null,
      meetup_location: p.meetup_location ?? null,
      // Poll fields. poll_options null = not a poll.
      poll_question: p.poll_question ?? null,
      poll_options: pollOpts,
      poll_votes: pollVotes,
      poll_my_vote: pollMyVote,
      author: {
        id: author?.id ?? "",
        full_name: author?.full_name ?? "Brother",
        username: author?.username ?? undefined,
        profile_photo_url: author?.profile_photo_url ?? null,
        birthday: author?.birthday ?? null,
        role_text:
          author?.occupation && author?.company
            ? `${author.occupation} · ${author.company}`
            : author?.occupation ?? null,
      },
      tagged_group: tg
        ? { id: tg.id, name: tg.name, category: tg.category, emoji: null }
        : null,
      activity: te
        ? {
            kind: "event" as const,
            data: te,
            hostName: null,
            hostPhoto: null,
          }
        : tm
          ? (() => {
              const host = Array.isArray(tm.host) ? tm.host[0] : tm.host;
              return {
                kind: "meetup" as const,
                data: tm,
                hostName: host?.full_name ?? null,
                hostPhoto: host?.profile_photo_url ?? null,
              };
            })()
          : null,
      likes: likeCount.get(p.id) ?? 0,
      liked_by_me: myLikes.has(p.id),
      comments: (allComments.get(p.id) ?? []).map((c: any) => {
        const ca = Array.isArray(c.author) ? c.author[0] : c.author;
        return {
          id: c.id,
          body: c.body,
          created_at: c.created_at,
          user_name: ca?.full_name ?? "Brother",
          user_photo: ca?.profile_photo_url ?? null,
          user_id: ca?.id,
        };
      }),
      preview: false,
    };
  });

  const taggableGroups = (joinedGroups ?? [])
    .map((row: any) => {
      const g = Array.isArray(row.group) ? row.group[0] : row.group;
      return g ? { id: g.id, name: g.name } : null;
    })
    .filter(Boolean) as { id: string; name: string }[];

  // Empty static list — composer/comment input now fetches @mention
  // matches lazily via searchMembersForMention when the user actually
  // types `@`. Saves a directory-sized query on every home render.
  const mentionable: { id: string; full_name: string; username: string }[] = [];

  return (
    <PullToRefresh>
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      {/* sticky top bar */}
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Logo className="h-8 w-8 text-gold-400 shrink-0" />
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
                The Watchmen
              </div>
              <div className="text-white text-[18px] font-semibold leading-tight">
                The Feed
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin ? <AdminPill pendingCount={pendingCount} /> : null}
            <Link
              href="/app/members"
              aria-label="Search members"
              className="h-9 w-9 rounded-full bg-ink-800 hairline flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                   strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] text-ink-100">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </Link>
            <Link
              href="/app/notifications"
              aria-label="Notifications"
              className="relative h-9 w-9 rounded-full bg-ink-800 hairline flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                   strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] text-ink-100">
                <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
                <path d="M10 19a2 2 0 0 0 4 0" />
              </svg>
              {(unread ?? 0) > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-gold-400 text-black text-[9px] font-bold flex items-center justify-center">
                  {unread}
                </span>
              ) : null}
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3">
        {/* Birthday banner — one row per brother whose birthday is today.
            Tap to jump to their profile and wish them well. */}
        {birthdaysToday.map((b: any) => (
          <Link key={b.id} href={`/app/members/${b.id}`} className="block">
            <div className="rounded-2xl bg-gradient-to-r from-pink-500/10 via-gold-500/10 to-transparent ring-1 ring-pink-400/25 px-4 py-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-pink-500/15 ring-1 ring-pink-400/30 flex items-center justify-center shrink-0 text-[18px]">
                🎂
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] uppercase tracking-[0.2em] text-pink-200/80">
                  Birthday today
                </div>
                <div className="text-white text-[14px] font-semibold truncate">
                  Wish {b.full_name} a happy birthday
                </div>
                <div className="text-ink-300 text-[12px] truncate">
                  Tap to drop a note on their profile
                </div>
              </div>
              <div className="text-ink-300 text-sm">›</div>
            </div>
          </Link>
        ))}

        {/* Next event banner. If the event has a hero image we render
            it as a full-width header with a dark gradient over the
            bottom for readability; otherwise we fall back to the
            compact row layout with a date tile. */}
        {nextEvent ? (
          <Link href={`/app/events/${nextEvent.id}`} className="block">
            {nextEvent.image_url ? (
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-gold-500/30 aspect-[16/9]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={nextEvent.image_url}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Dark gradient overlay so text stays readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                {/* Date tile + caption pinned to bottom */}
                <div className="absolute inset-x-0 bottom-0 p-3 flex items-end gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gold-500/30 ring-1 ring-gold-400/50 backdrop-blur-md flex flex-col items-center justify-center shrink-0">
                    <div className="text-[9px] uppercase tracking-wider text-gold-100 leading-none">
                      {new Date(nextEvent.event_date).toLocaleString("en-US", { month: "short" })}
                    </div>
                    <div className="text-[16px] font-bold text-white leading-none mt-0.5">
                      {new Date(nextEvent.event_date).getDate()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10.5px] uppercase tracking-[0.2em] text-gold-300/90">
                      Next Event
                    </div>
                    <div className="text-white text-[15px] font-semibold truncate">
                      {nextEvent.title}
                    </div>
                    <div className="text-white/80 text-[12px] truncate">
                      {fmtTime(nextEvent.start_time)}
                      {nextEvent.location_name ? ` · ${nextEvent.location_name}` : ""}
                    </div>
                  </div>
                  <div className="text-white/70 text-sm">›</div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-gradient-to-r from-gold-500/10 to-gold-700/0 ring-1 ring-gold-500/20 px-4 py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gold-500/20 ring-1 ring-gold-500/30 flex flex-col items-center justify-center shrink-0">
                  <div className="text-[9px] uppercase tracking-wider text-gold-200 leading-none">
                    {new Date(nextEvent.event_date).toLocaleString("en-US", { month: "short" })}
                  </div>
                  <div className="text-[15px] font-bold text-white leading-none mt-0.5">
                    {new Date(nextEvent.event_date).getDate()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10.5px] uppercase tracking-[0.2em] text-gold-300/80">
                    Next Event
                  </div>
                  <div className="text-white text-[14px] font-semibold truncate">
                    {nextEvent.title}
                  </div>
                  <div className="text-ink-300 text-[12px] truncate">
                    {fmtTime(nextEvent.start_time)}
                    {nextEvent.location_name ? ` · ${nextEvent.location_name}` : ""}
                  </div>
                </div>
                <div className="text-ink-300 text-sm">›</div>
              </div>
            )}
          </Link>
        ) : null}

        {/* Composer */}
        <FeedComposer
          meName={profile.full_name}
          meAvatarUrl={profile.profile_photo_url}
          mentionablePeople={mentionable}
          taggableGroups={taggableGroups}
          onSubmit={createPostAction}
        />

        {/* Feed */}
        <div className="space-y-3">
          {feed.length === 0 ? (
            <div className="text-center text-ink-300 text-sm py-10">
              No posts yet. Be the first to share something with the room.
            </div>
          ) : (
            feed.map((post) => (
              <FeedPostClient
                key={post.id}
                post={post}
                meName={profile.full_name}
                meAvatar={profile.profile_photo_url}
                mentionablePeople={mentionable}
                isAdmin={isAdmin}
              />
            ))
          )}
        </div>

        <p className="text-center text-[11px] text-ink-400 py-4">
          You&apos;re all caught up.
        </p>
      </div>
    </div>
    </PullToRefresh>
  );
}
