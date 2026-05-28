import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { FeedComposer } from "@/components/feed/FeedComposer";
import { FeedPostClient } from "./FeedPostClient";
import { Logo } from "@/components/brand/Logo";
import { AdminPill } from "@/components/admin/AdminPill";
import { fmtTime } from "@/lib/utils/date";
import { createPostAction } from "@/lib/feed/actions";
import type { FeedPostShape } from "@/components/feed/FeedPost";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";

  // ----- next upcoming event (for the banner) -----
  const today = new Date().toISOString().slice(0, 10);
  const { data: nextEvent } = await supabase
    .from("events")
    .select("id, title, event_date, start_time, location_name")
    .eq("status", "published")
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  // ----- pending approvals count (admin badge) -----
  let pendingCount = 0;
  if (isAdmin) {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  // ----- unread notifications count -----
  const { count: unread } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("read", false);

  // ----- mentionable people + taggable groups -----
  const [{ data: members }, { data: joinedGroups }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username")
      .eq("status", "approved")
      .neq("id", profile.id)
      .order("full_name"),
    supabase
      .from("group_members")
      .select("group:groups(id, name)")
      .eq("user_id", profile.id),
  ]);

  // ----- feed posts -----
  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select(
      `id, kind, body, created_at, media_url,
       author:profiles!posts_author_id_fkey(id, full_name, username, profile_photo_url, occupation, company),
       tagged_group:groups!posts_tagged_group_id_fkey(id, name, category),
       tagged_event:events!posts_tagged_event_id_fkey(id, title, event_date, start_time, location_name),
       tagged_meetup:meetups!posts_tagged_meetup_id_fkey(id, title, when_at, location_name)`,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (postsErr) console.error("[/app/home] posts query failed", postsErr);

  // Counts: likes + comments + my-like — three batched queries.
  const postIds = (posts ?? []).map((p: any) => p.id);
  const [
    { data: likeRows },
    { data: commentRows },
    { data: myLikeRows },
  ] = postIds.length
    ? await Promise.all([
        supabase.from("post_likes").select("post_id").in("post_id", postIds),
        supabase.from("post_comments").select("post_id").in("post_id", postIds).is("deleted_at", null),
        supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", profile.id)
          .in("post_id", postIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const likeCount = new Map<string, number>();
  (likeRows ?? []).forEach((r: any) => {
    likeCount.set(r.post_id, (likeCount.get(r.post_id) ?? 0) + 1);
  });
  const commentCount = new Map<string, number>();
  (commentRows ?? []).forEach((r: any) => {
    commentCount.set(r.post_id, (commentCount.get(r.post_id) ?? 0) + 1);
  });
  const myLikes = new Set((myLikeRows ?? []).map((r: any) => r.post_id));

  // Fetch comments only for posts being shown (lightweight — first 5 per post).
  const allComments = new Map<string, any[]>();
  if (postIds.length > 0) {
    const { data: cs } = await supabase
      .from("post_comments")
      .select(
        "id, post_id, body, created_at, author:profiles!post_comments_author_id_fkey(id, full_name, profile_photo_url)",
      )
      .in("post_id", postIds)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    (cs ?? []).forEach((c: any) => {
      const list = allComments.get(c.post_id) ?? [];
      list.push(c);
      allComments.set(c.post_id, list);
    });
  }

  // Adapt to FeedPostShape.
  const feed: FeedPostShape[] = (posts ?? []).map((p: any) => {
    const author = Array.isArray(p.author) ? p.author[0] : p.author;
    const tg = Array.isArray(p.tagged_group) ? p.tagged_group[0] : p.tagged_group;
    const te = Array.isArray(p.tagged_event) ? p.tagged_event[0] : p.tagged_event;
    const tm = Array.isArray(p.tagged_meetup) ? p.tagged_meetup[0] : p.tagged_meetup;
    return {
      id: p.id,
      type: (p.kind as any) ?? "post",
      body: p.body,
      created_at: p.created_at,
      image_url: p.media_url ?? null,
      author: {
        id: author?.id ?? "",
        full_name: author?.full_name ?? "Brother",
        username: author?.username ?? undefined,
        profile_photo_url: author?.profile_photo_url ?? null,
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
          ? {
              kind: "meetup" as const,
              data: tm,
              hostName: null,
              hostPhoto: null,
            }
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

  const mentionable = (members ?? [])
    .filter((m: any) => m.username)
    .map((m: any) => ({
      id: m.id,
      full_name: m.full_name,
      username: m.username,
    }));

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative -mx-4 sm:mx-0">
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
        {/* Next event banner */}
        {nextEvent ? (
          <Link href={`/app/events/${nextEvent.id}`} className="block">
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
              />
            ))
          )}
        </div>

        <p className="text-center text-[11px] text-ink-400 py-4">
          You&apos;re all caught up.
        </p>
      </div>
    </div>
  );
}
