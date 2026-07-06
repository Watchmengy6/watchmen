import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
// FeedComposer and PullToRefresh now consumed via the home-page
// wrappers HomeFeedComposer + HomePullToRefresh which hook into
// FeedStateContext for optimistic prepend / targeted refetch. Direct
// imports removed to avoid unused-import build errors.
//
// createPostAction is still imported by FeedStateClient (called from
// HomeFeedComposer's onSubmit) — not needed here in page.tsx anymore.
//
// FeedPostClient is consumed inside <FeedList>; not referenced here.
import {
  FeedStateProvider,
  FeedList,
  HomeFeedComposer,
  HomePullToRefresh,
} from "./FeedStateClient";
import { ScrollToPostFromHash } from "./ScrollToPostFromHash";
import { Logo } from "@/components/brand/Logo";
import { AdminPill } from "@/components/admin/AdminPill";
import { fmtTime } from "@/lib/utils/date";
import { localTodayISO, parseLocalDate } from "@/lib/utils/localDate";
import type { FeedPostShape } from "@/components/feed/FeedPost";
import {
  POSTS_QUERY_SELECT,
  mapToFeedPostShape,
  type FeedPostStats,
} from "@/lib/feed/feedPostMapper";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";

  // Compute "today" in the Watchmen's home time zone instead of UTC so
  // the next-event banner doesn't flip a day early after 8 PM Tampa.
  const today = localTodayISO();

  // Phase 1: fan everything that only needs the profile into ONE Promise.all.
  // Previously these ran serially (next-event → pending → unread → members →
  // groups → posts) which stacked five round-trip waits before the first
  // byte. Running in parallel is the single biggest win here. birthdays_today
  // was sitting in front of this Promise.all on its own await — folded in
  // per Codex audit so the cost overlaps the other queries instead of
  // stacking onto first-byte time.
  const [
    { data: nextEvent },
    pendingRes,
    { count: unread },
    { data: joinedGroups },
    postsRes,
    birthdayRes,
    blockedUsernamesRes,
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
      // Canonical select+join shape lives in src/lib/feed/feedPostMapper.ts
      // so this query, createPostAction, and getFeedSliceAction stay
      // byte-identical. If a joined relation is added, update the
      // constant — not three call sites.
      .select(POSTS_QUERY_SELECT)
      .is("deleted_at", null)
      // Pinned posts float to the top; within each group, newest first.
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    // Birthdays today — Tampa-time filtered via Postgres RPC. Folded into
    // this Promise.all so it overlaps with the other queries; previously
    // it stacked an extra serial round trip onto first-byte time.
    supabase.rpc("birthdays_today"),
    // Blocked usernames (bidirectional). Folded into this Promise.all so
    // we don't add a serial roundtrip just to render mentions. Used by
    // FeedPost → RichText to dim @-mentions of blocked users instead of
    // rendering them as clickable chips that link to an empty member
    // search. Migration 00041 added the get_my_blocked_usernames() RPC.
    (supabase as any).rpc("get_my_blocked_usernames"),
  ]);
  const pendingCount = pendingRes.count ?? 0;
  const posts = postsRes.data;
  if (postsRes.error) console.error("[/app/home] posts query failed", postsRes.error);
  const birthdaysToday: { id: string; full_name: string; profile_photo_url: string | null }[] =
    (birthdayRes.data ?? []) as any[];
  // Flatten the RPC rows `[{username:'aaron'}, ...]` to a plain string
  // array that <RichText> can do constant-time `.has()` checks against.
  // Already lowercased server-side via the username convention but the
  // client also lowercases for safety. Returns [] when there are no
  // blocks (or on RPC error) so the prop is always a valid array.
  const blockedUsernames: string[] = (
    (blockedUsernamesRes as { data?: { username: string }[] | null })?.data ?? []
  )
    .map((r) => r.username)
    .filter(Boolean);

  // Fire-and-forget book the auto-post for each birthday member. The RPC
  // is idempotent (unique on member_id + posted_for_date), so multiple
  // home renders won't create dupes.
  if (birthdaysToday.length > 0) {
    void (async () => {
      try {
        await Promise.all(
          birthdaysToday.map((b) =>
            supabase.rpc("book_birthday_auto_post", { p_member_id: b.id }),
          ),
        );
      } catch (e) {
        console.warn("[home] birthday auto-post failed (non-fatal)", e);
      }
    })();
  }

  // Phase 2: stats RPC (likes, comments, my-flags, poll votes) +
  // first-5 comment previews. Consolidated from 4 queries into 2.
  const postIds = (posts ?? []).map((p: any) => p.id);
  // Phase 2 is now ONE query — home_feed_stats RPC returns likes,
  // comment count, my-flags, and poll votes. Comments themselves are
  // loaded on demand by FeedPost when a brother expands a post (see
  // loadPostCommentsAction). This keeps /app/home from scaling with
  // total comment volume.
  // home_feed_stats derives the viewer from current_profile_id() inside
  // the SD function (migration 00033_audit_p1_p2_hardening) — p_viewer_id
  // is retained in the signature for call-compat and is ignored
  // server-side. We pass profile.id so PostgREST picks the right overload.
  const { data: statsRows, error: statsErr } = postIds.length
    ? await supabase.rpc("home_feed_stats", {
        p_post_ids: postIds,
        p_viewer_id: profile.id,
      })
    : { data: [], error: null };
  if (statsErr) console.error("[/app/home] home_feed_stats failed", statsErr);

  // Stats Map — keyed by post_id so the per-post mapper lookup is O(1).
  // Type from the shared mapper module so the page and the action
  // can't drift on the stats shape.
  const statsByPost = new Map<string, FeedPostStats>();
  (statsRows ?? []).forEach((s: any) => {
    statsByPost.set(s.post_id, {
      like_count: s.like_count ?? 0,
      comment_count: s.comment_count ?? 0,
      my_liked: !!s.my_liked,
      my_poll_vote:
        typeof s.my_poll_vote === "number" ? s.my_poll_vote : null,
      poll_vote_counts: s.poll_vote_counts ?? null,
    });
  });

  // Adapt to FeedPostShape using the shared mapper. The previous
  // inline ~75-line transformation now lives in feedPostMapper.ts so
  // createPostAction and getFeedSliceAction produce IDENTICAL shapes
  // to what this page renders on the initial server pass. If we ever
  // need to tweak how a post renders (e.g. add a new joined field),
  // change it in ONE place.
  const feed: FeedPostShape[] = (posts ?? []).map((p: any) =>
    mapToFeedPostShape(p, statsByPost.get(p.id) ?? null),
  );

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
    /* FeedStateProvider wraps the whole feed surface so BOTH
       HomePullToRefresh (which calls replacePosts on pull) AND
       HomeFeedComposer (which calls prependPost on submit) can
       consume the same context. Provider position is critical:
       must be OUTSIDE HomePullToRefresh for the pull-to-refresh
       wrapper to use the hook. */
    <FeedStateProvider initialPosts={feed}>
    <HomePullToRefresh>
    {/* Scrolls to + highlights #post-<id> when a push/share deep link lands. */}
    <ScrollToPostFromHash />
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
                {/* Eager-load: this image is above the fold on /app/home,
                    which is the first screen brothers see. loading="lazy"
                    here used to add ~200-400ms to perceived first paint. */}
                <img
                  src={nextEvent.image_url}
                  alt=""
                  loading="eager"
                  fetchPriority="high"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Dark gradient overlay so text stays readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                {/* Date tile + caption pinned to bottom */}
                <div className="absolute inset-x-0 bottom-0 p-3 flex items-end gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gold-500/30 ring-1 ring-gold-400/50 backdrop-blur-md flex flex-col items-center justify-center shrink-0">
                    <div className="text-[9px] uppercase tracking-wider text-gold-100 leading-none">
                      {parseLocalDate(nextEvent.event_date).toLocaleString("en-US", { month: "short" })}
                    </div>
                    <div className="text-[16px] font-bold text-white leading-none mt-0.5">
                      {parseLocalDate(nextEvent.event_date).getDate()}
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
                    {parseLocalDate(nextEvent.event_date).toLocaleString("en-US", { month: "short" })}
                  </div>
                  <div className="text-[15px] font-bold text-white leading-none mt-0.5">
                    {parseLocalDate(nextEvent.event_date).getDate()}
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

        {/* Composer — uses HomeFeedComposer wrapper which intercepts
            the submit, calls createPostAction directly, and prepends
            the returned post into FeedStateContext for instant UI
            update. No router.refresh() = no full /app/home refetch. */}
        <HomeFeedComposer
          meName={profile.full_name}
          meAvatarUrl={profile.profile_photo_url}
          mentionablePeople={mentionable}
          taggableGroups={taggableGroups}
        />

        {/* Feed — list rendered from client state via FeedStateProvider.
            Empty-state copy lives inside <FeedList>, so the conditional
            is gone. The per-post props (viewer identity, mentionable
            members, blocked usernames, admin flag) are bundled into
            `postProps` and threaded once. Phase 3 will let FeedComposer
            prepend optimistically through the same provider. */}
        <div className="space-y-3">
          <FeedList
            postProps={{
              meName: profile.full_name,
              meAvatar: profile.profile_photo_url,
              mentionablePeople: mentionable,
              blockedUsernames,
              isAdmin,
              viewerProfileId: profile.id,
            }}
          />
        </div>

        <p className="text-center text-[11px] text-ink-400 py-4">
          You&apos;re all caught up.
        </p>
      </div>
    </div>
    </HomePullToRefresh>
    </FeedStateProvider>
  );
}
