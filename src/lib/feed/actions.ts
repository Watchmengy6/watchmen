"use server";
import { runInBackground } from "@/lib/utils/background";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/points/award";
import {
  sendPushToUser,
  sendPushToSuperAdmins,
  sendPushToAllApproved,
} from "@/lib/push/send";
import type { FeedPostShape } from "@/components/feed/FeedPost";
import {
  POSTS_QUERY_SELECT,
  mapToFeedPostShape,
  type FeedPostStats,
} from "@/lib/feed/feedPostMapper";

/**
 * Load comments for a single post on demand. Replaces the old
 * "fetch every comment for every visible post on home page render"
 * pattern, which scaled with engagement. Now home renders show the
 * comment count from home_feed_stats, and we only hit the DB when a
 * brother actually expands a post.
 */
export async function loadPostCommentsAction(
  postId: string,
): Promise<{
  comments: {
    id: string;
    body: string;
    created_at: string;
    user_name: string;
    user_photo: string | null;
    user_id: string;
    parent_id: string | null;
    like_count: number;
    my_liked: boolean;
  }[];
  error?: string;
}> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { comments: [], error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return { comments: [], error: "Approval required." };

  // Gate on the PARENT POST's visibility through normal posts RLS —
  // without this, anyone holding a UUID could read comments under a
  // deleted (or block-hidden) post, because the post_comments read
  // policy is approved-wide (Codex pre-launch audit, July 2026).
  const { data: parentPost } = await supabase
    .from("posts")
    .select("id")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!parentPost) return { comments: [] };

  const { data } = await supabase
    .from("post_comments")
    .select(
      "id, body, created_at, parent_comment_id, author:profiles!post_comments_author_id_fkey(id, full_name, profile_photo_url)",
    )
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  // Likes for the whole comment set in ONE query; aggregate in JS
  // (comment volume per post is small). likeCount + whether *I* liked.
  const ids = (data ?? []).map((c: any) => c.id);
  const likeCountByComment = new Map<string, number>();
  const myLiked = new Set<string>();
  if (ids.length > 0) {
    const { data: likeRows } = await supabase
      .from("post_comment_likes")
      .select("comment_id, user_id")
      .in("comment_id", ids);
    (likeRows ?? []).forEach((r: any) => {
      likeCountByComment.set(
        r.comment_id,
        (likeCountByComment.get(r.comment_id) ?? 0) + 1,
      );
      if (r.user_id === me.id) myLiked.add(r.comment_id);
    });
  }

  const comments = (data ?? []).map((c: any) => {
    const a = Array.isArray(c.author) ? c.author[0] : c.author;
    return {
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      user_name: a?.full_name ?? "Brother",
      user_photo: a?.profile_photo_url ?? null,
      user_id: a?.id ?? "",
      parent_id: c.parent_comment_id ?? null,
      like_count: likeCountByComment.get(c.id) ?? 0,
      my_liked: myLiked.has(c.id),
    };
  });
  return { comments };
}

/**
 * Toggle a like on a COMMENT. Mirrors toggleLikeAction: optimistic on
 * the client, unique-violation tolerated, no revalidation.
 */
export async function toggleCommentLikeAction(
  commentId: string,
  nextLiked: boolean,
): Promise<{ error?: string }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) return { error: "No profile." };

  if (nextLiked) {
    const { error } = await supabase
      .from("post_comment_likes")
      .insert({ comment_id: commentId, user_id: me.id });
    // Ignore unique-violation (23505): already liked.
    if (error && (error as any).code !== "23505") return { error: error.message };
  } else {
    const { error } = await supabase
      .from("post_comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", me.id);
    if (error) return { error: error.message };
  }
  // No revalidation — client updates optimistically.
  return {};
}

/**
 * Edit a post's body. RLS ("posts author update", migration 00009) only
 * permits the update when the caller is the post's author, so an
 * unauthorized caller updates 0 rows. The `posts_touch_updated_at`
 * trigger (00010) bumps updated_at automatically, which the UI uses to
 * show an "edited" label. Returns the saved body on success.
 */
export async function editPostAction(
  postId: string,
  body: string,
): Promise<{ body?: string; error?: string }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const trimmed = body.trim();
  if (!trimmed) return { error: "Post can't be empty." };
  if (trimmed.length > 5000) return { error: "Post is too long (5000 char max)." };

  const { data: row, error } = await supabase
    .from("posts")
    .update({ body: trimmed })
    .eq("id", postId)
    .select("id, body")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!row) return { error: "You can only edit your own posts." };
  return { body: row.body };
}

/**
 * AI proofread — fixes spelling/grammar/punctuation in a draft while
 * preserving the author's voice, line breaks, emojis, and @mentions.
 * Gated on OPENAI_API_KEY; the composer only shows the button when
 * NEXT_PUBLIC_AI_PROOFREAD === "1". Uses gpt-4o-mini (cheap). If you'd
 * rather use Anthropic, swap the endpoint/body below.
 */
export async function proofreadTextAction(
  text: string,
): Promise<{ text?: string; error?: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { error: "Proofreading isn't set up yet." };

  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const trimmed = text.trim();
  if (!trimmed) return { error: "Nothing to proofread." };
  if (trimmed.length > 5000) return { error: "Too long to proofread (5000 char max)." };

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a proofreader for short social posts. Fix spelling, grammar, capitalization, and punctuation. Preserve the author's voice, meaning, line breaks, emojis, and any @mentions or #hashtags exactly as written. Do not add new sentences, hashtags, links, or commentary. Return ONLY the corrected text with no quotes or preamble.",
          },
          { role: "user", content: trimmed },
        ],
      }),
    });
    if (!res.ok) return { error: "Proofread failed. Try again." };
    const data = await res.json();
    const out = data?.choices?.[0]?.message?.content?.trim();
    if (!out) return { error: "Proofread failed. Try again." };
    return { text: out };
  } catch {
    return { error: "Proofread failed. Try again." };
  }
}

/**
 * Delete a comment. The RLS policy "post_comments author delete"
 * (migration 00009) only permits the delete when the caller is the
 * comment's author OR an admin, so we rely on the database to enforce
 * permission — an unauthorized caller simply deletes 0 rows. We .select()
 * the deleted id back to confirm a row was actually removed and return a
 * clean error otherwise.
 */
export async function deleteCommentAction(
  commentId: string,
): Promise<{ error?: string }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: deleted, error } = await supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId)
    .select("id");
  if (error) return { error: error.message };
  if (!deleted || deleted.length === 0) {
    return { error: "You can only delete your own comments." };
  }
  return {};
}

/**
 * Cast (or change) a vote on a feed poll. One vote per member per
 * post — upserts on (post_id, user_id).
 */
export async function votePollAction(input: {
  postId: string;
  optionIndex: number;
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return { error: "Approval required." };

  if (!Number.isInteger(input.optionIndex) || input.optionIndex < 0 || input.optionIndex >= 10) {
    return { error: "Invalid option." };
  }

  // Verify the option index is in range for this post's poll.
  const { data: post } = await supabase
    .from("posts")
    .select("poll_options")
    .eq("id", input.postId)
    .maybeSingle();
  if (!post?.poll_options || input.optionIndex >= post.poll_options.length) {
    return { error: "Option not available." };
  }

  const { error } = await supabase
    .from("post_poll_votes")
    .upsert(
      {
        post_id: input.postId,
        user_id: me.id,
        option_index: input.optionIndex,
      },
      { onConflict: "post_id,user_id" },
    );
  if (error) return { error: error.message };

  // Super-admin firehose: low-signal but Dustin asked for it.
  runInBackground(async () => {
    try {
      const rawLabel =
        (post.poll_options as string[])[input.optionIndex] ?? "an option";
      // Cap the pushed label — APNs rejects oversized payloads silently
      // (final pre-launch audit, July 2026).
      const optionLabel =
        rawLabel.length > 100 ? `${rawLabel.slice(0, 97)}…` : rawLabel;
      const { data: meProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", me.id)
        .maybeSingle();
      await sendPushToSuperAdmins({
        actorProfileId: me.id,
        payload: {
          title: `${meProfile?.full_name ?? "A brother"} voted`,
          body: `"${optionLabel}"`,
          url: `/app/home#post-${input.postId}`,
          tag: `poll-vote:${input.postId}`,
        },
      });
    } catch (e) {
      console.warn("[poll.vote] super-admin push failed", e);
    }
  });

  // NO revalidatePath — FeedPollWidget flips the bar percentages
  // optimistically; revalidating here skeleton-flashed the whole feed
  // (same class of bug as the comment revalidate, July 2026).
  return { success: true };
}

/**
 * Admin pin/unpin a feed post. Pinned posts float to the top of the
 * home feed regardless of created_at. Toggles the current state so
 * one button serves both directions.
 */
export async function adminTogglePinPostAction(
  postId: string,
): Promise<{ error?: string; pinned?: boolean }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || (me.role !== "admin" && me.role !== "super_admin")) {
    return { error: "Admin only." };
  }

  // Service-role write so the column update can't be blocked by any
  // tightened post update policy in the future.
  const admin = supabaseAdmin();
  const { data: cur } = await admin
    .from("posts")
    .select("pinned")
    .eq("id", postId)
    .maybeSingle();
  if (!cur) return { error: "Post not found." };
  const nextPinned = !cur.pinned;
  const { error } = await admin
    .from("posts")
    .update({ pinned: nextPinned })
    .eq("id", postId);
  if (error) return { error: error.message };
  revalidatePath("/app/home");
  return { pinned: nextPinned };
}

/**
 * Author self-delete: soft-delete a post the caller authored.
 * Sets deleted_at if and only if the signed-in profile is the
 * post's author_id. Admins use adminDeletePostAction for the
 * "delete anyone's post" hammer; this one is "delete my own".
 */
export async function deleteOwnPostAction(
  postId: string,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return { error: "Approval required." };

  // Verify ownership BEFORE the update so RLS doesn't silently no-op for
  // a stranger and leave the user thinking it worked.
  const { data: post, error: lookupErr } = await supabase
    .from("posts")
    .select("id, author_id, deleted_at")
    .eq("id", postId)
    .maybeSingle();
  if (lookupErr) return { error: lookupErr.message };
  if (!post) return { error: "Post not found." };
  if (post.author_id !== me.id) return { error: "You can only delete your own posts." };
  if (post.deleted_at) return { success: true };

  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("author_id", me.id);
  if (error) return { error: error.message };
  revalidatePath("/app/home");
  return { success: true };
}

/**
 * Admin moderation: soft-delete any feed post (sets deleted_at).
 * Used by leadership to take down anyone's post. Authors use
 * deleteOwnPostAction for their own posts.
 */
export async function adminDeletePostAction(
  postId: string,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: me } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || (me.role !== "admin" && me.role !== "super_admin")) {
    return { error: "Admin only." };
  }

  // Use service-role so we cleanly bypass any RLS on the update column.
  const admin = supabaseAdmin();
  const { error } = await admin
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) return { error: error.message };
  revalidatePath("/app/home");
  return { success: true };
}

/**
 * On-demand mention search. Called by the feed composer / comment input
 * when the user types `@`. Replaces the old "fetch every approved member
 * on page load and filter client-side" pattern, which dragged on the home
 * feed as the community grew.
 *
 * Returns up to 8 approved members. With NO query (the moment the user
 * types "@") it returns the first members alphabetically as suggestions,
 * so the picker reliably pops; with a query it matches full_name
 * (substring) OR username (prefix).
 */
export async function searchMembersForMention(
  query: string,
): Promise<{ id: string; full_name: string; username: string }[]> {
  const q = (query ?? "").trim().toLowerCase();

  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: me } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return [];

  // Bidirectional block filter for the mention picker. Without this,
  // a member who blocked someone can still tag them in a new post —
  // which both undoes the social contract of the block and creates
  // a notification path back to the blocker. We call the SECURITY
  // DEFINER RPC `get_my_blocked_usernames` (migration 00041) which
  // bypasses RLS to see both sides of every block the caller is part
  // of. The returned usernames are excluded from the profile query
  // below.
  const { data: blockedRows } = await (supabase as any).rpc(
    "get_my_blocked_usernames",
  );
  const blockedUsernames: string[] = ((blockedRows ?? []) as { username: string }[])
    .map((r) => r.username)
    .filter(Boolean);

  // Typed as `any` because chaining .not(...) after .neq(...).not(...) on
  // PostgrestFilterBuilder makes TypeScript instantiate an excessively
  // deep type union ("Type instantiation is excessively deep and
  // possibly infinite"). The runtime behavior is identical — we just
  // opt out of the deep type narrowing for this builder chain. The
  // .then() result is still narrowed via the destructure below.
  let qb: any = supabase
    .from("profiles")
    .select("id, full_name, username")
    .eq("status", "approved")
    .neq("id", me.id)
    .not("username", "is", null);

  if (blockedUsernames.length > 0) {
    // PostgREST `in` filter wants a parenthesized list. We wrap each
    // username in double quotes so handles with hyphens (the
    // collision-suffix convention from migration 00035) don't break
    // the parser.
    qb = qb.not(
      "username",
      "in",
      `(${blockedUsernames.map((u) => `"${u}"`).join(",")})`,
    );
  }

  if (q.length > 0) {
    // Members type a person's NAME after "@", not their handle — so match
    // full_name (substring) OR username (prefix). Strip chars that would
    // break the PostgREST or-filter (commas/parens/periods are delimiters;
    // %/_ are LIKE wildcards) before interpolating.
    const safe = q
      .replace(/[,.()]/g, " ")
      .replace(/[%_]/g, (c) => `\\${c}`)
      .trim();
    if (safe) {
      qb = qb.or(`username.ilike.${safe}%,full_name.ilike.%${safe}%`);
    }
  }

  const { data, error } = await qb.order("full_name").limit(8);
  if (error) {
    console.error("[searchMembersForMention] query failed", error);
    return [];
  }

  // `r` is typed any because `qb` was cast to any above (TS depth-limit
  // workaround for the chained PostgrestFilterBuilder). The shape we
  // care about is asserted via the final `as ...` cast on the array.
  return (data ?? []).filter((r: any) => r.username) as {
    id: string;
    full_name: string;
    username: string;
  }[];
}

/**
 * Load the full list of @mentionable members ONCE (when the composer opens),
 * so the picker can filter client-side with zero per-keystroke network calls.
 * Calling a server action on every keystroke made the picker take seconds to
 * appear; this loads up to 500 approved members in a single round-trip.
 */
export async function listMentionableMembers(): Promise<
  { id: string; full_name: string; username: string }[]
> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: me } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return [];

  // Same bidirectional block filter as searchMembersForMention —
  // FeedComposer loads this list once when it opens and filters
  // client-side as the user types, so the block exclusion must
  // happen here before the list is shipped to the client.
  const { data: blockedRows } = await (supabase as any).rpc(
    "get_my_blocked_usernames",
  );
  const blockedUsernames: string[] = ((blockedRows ?? []) as { username: string }[])
    .map((r) => r.username)
    .filter(Boolean);

  // See searchMembersForMention above for why this is typed `any` —
  // chained .not(...) after .neq(...).not(...) explodes the
  // PostgrestFilterBuilder generic types past TypeScript's depth
  // limit. Runtime behavior is identical.
  let qb: any = supabase
    .from("profiles")
    .select("id, full_name, username")
    .eq("status", "approved")
    .neq("id", me.id)
    .not("username", "is", null);

  if (blockedUsernames.length > 0) {
    qb = qb.not(
      "username",
      "in",
      `(${blockedUsernames.map((u) => `"${u}"`).join(",")})`,
    );
  }

  const { data, error } = await qb.order("full_name").limit(500);
  if (error) {
    console.error("[listMentionableMembers] query failed", error);
    return [];
  }
  // `r` is typed any because `qb` was cast to any above (TS depth-limit
  // workaround for the chained PostgrestFilterBuilder). The shape we
  // care about is asserted via the final `as ...` cast on the array.
  return (data ?? []).filter((r: any) => r.username) as {
    id: string;
    full_name: string;
    username: string;
  }[];
}

/**
 * Create a feed post. Called from the FeedComposer client component
 * via the onSubmit prop. Accepts a FormData with:
 *   - kind   ('post' | 'job' | 'need' | 'announcement')
 *   - body   (string, required)
 *   - tagged_group_id (uuid string | '')
 *   - tagged_event_id (uuid string | '')
 *   - tagged_meetup_id (uuid string | '')
 */
export async function createPostAction(
  formData: FormData,
): Promise<{ error?: string; postId?: string; post?: FeedPostShape }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("id, status, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return { error: "Approval required." };

  const kindRaw = String(formData.get("kind") ?? "post");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Say something." };
  if (body.length > 10000) return { error: "Post is too long (10,000 char max)." };

  // Member "meetup" + "poll" posts are stored as kind='post' with extra
  // structured columns. The post_kind enum stays unchanged — renderers
  // key off the structured fields (meetup_when_at, poll_options).
  const isMeetupKind = kindRaw === "meetup";
  const isPollKind = kindRaw === "poll";
  const kind = ["post", "job", "need", "announcement"].includes(kindRaw)
    ? (kindRaw as "post" | "job" | "need" | "announcement")
    : "post";

  const taggedGroupId = String(formData.get("tagged_group_id") ?? "").trim() || null;
  const taggedEventId = String(formData.get("tagged_event_id") ?? "").trim() || null;
  const taggedMeetupId = String(formData.get("tagged_meetup_id") ?? "").trim() || null;
  const mediaUrl = String(formData.get("media_url") ?? "").trim() || null;
  const mediaTypeRaw = String(formData.get("media_type") ?? "none").trim();
  const mediaType = (["none", "image", "video"].includes(mediaTypeRaw)
    ? mediaTypeRaw
    : "none") as "none" | "image" | "video";

  // Parse poll fields (only present for type="poll").
  let pollQuestion: string | null = null;
  let pollOptions: string[] | null = null;
  if (isPollKind) {
    pollQuestion = String(formData.get("poll_question") ?? "").trim() || null;
    const rawOptions = formData
      .getAll("poll_option")
      .map((v) => String(v).trim())
      .filter((s) => s.length > 0)
      .slice(0, 4);
    if (!pollQuestion || rawOptions.length < 2) {
      return { error: "Polls need a question and at least two options." };
    }
    pollOptions = rawOptions;
  }

  // Parse the member-meetup when/where (only present for type="meetup").
  let meetupWhenAt: string | null = null;
  let meetupLocation: string | null = null;
  if (isMeetupKind) {
    const whenLocal = String(formData.get("meetup_when_at") ?? "").trim();
    const locStr = String(formData.get("meetup_location") ?? "").trim();
    const tzOffset = String(formData.get("tz_offset") ?? "").trim() || "+00:00";
    if (!whenLocal || !locStr) {
      return { error: "Meetup needs both when and where." };
    }
    // "2026-06-01T18:30" + "-04:00" → "2026-06-01T18:30:00-04:00"
    const padded = whenLocal.split(":").length === 2
      ? `${whenLocal}:00`
      : whenLocal;
    meetupWhenAt = new Date(`${padded}${tzOffset}`).toISOString();
    meetupLocation = locStr;
  }

  // We select the FULL posts-with-joins shape on insert so the caller
  // can prepend the new post to the feed state without a separate
  // refetch. Previously this was .select("id") and the page relied on
  // revalidatePath() to refresh — that worked but cost a full route
  // re-render (6+ parallel queries) on every post submit. Returning
  // the shaped post here lets FeedComposer do an optimistic prepend
  // (Phase 2 of the feed prepend refactor).
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: me.id,
      kind,
      body,
      tagged_group_id: taggedGroupId,
      tagged_event_id: taggedEventId,
      tagged_meetup_id: taggedMeetupId,
      media_url: mediaUrl,
      media_type: mediaType,
      meetup_when_at: meetupWhenAt,
      meetup_location: meetupLocation,
      poll_question: pollQuestion,
      poll_options: pollOptions,
    })
    .select(POSTS_QUERY_SELECT)
    .single();

  if (error) return { error: error.message };

  // Super-admin firehose: fire-and-forget push on every new post.
  runInBackground(async () => {
    try {
      const { data: meProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", me.id)
        .maybeSingle();
      const senderName = meProfile?.full_name ?? "A brother";
      const preview = body.length > 100 ? `${body.slice(0, 97)}…` : body;
      const payload = {
        title: `${senderName} posted`,
        body: preview,
        // #post-<id> deep link — tapping the push lands ON the post
        // (feed scrolls + highlights via ScrollToPostFromHash).
        url: `/app/home#post-${post.id}`,
        tag: `post:${post.id}`,
      };
      if (me.role === "super_admin") {
        // Dustin (or Aaron) posted — EVERY member gets pinged, not just
        // the admin firehose (Aaron's ask, July 2026). Their posts are
        // official announcements to the brotherhood.
        const r = await sendPushToAllApproved({
          actorProfileId: me.id,
          payload,
        });
        console.log(
          `[post.create] super-admin post broadcast to ${r.targeted} members`,
        );
      } else {
        // Regular member post — just the super-admin firehose.
        await sendPushToSuperAdmins({ actorProfileId: me.id, payload });
      }
    } catch (e) {
      console.warn("[post.create] post push failed (non-fatal)", e);
    }
  });

  // Parse @mentions out of body and write to post_mentions.
  // Usernames are always lowercased at write time and may contain hyphens
  // (collision suffixes), so allow [\w-] and lowercase before lookup.
  const mentionedUsernames = Array.from(
    new Set(
      (body.match(/@([\w-]+)/g) ?? []).map((s) => s.slice(1).toLowerCase()),
    ),
  );
  if (mentionedUsernames.length > 0) {
    const { data: mentioned } = await supabase
      .from("profiles")
      .select("id")
      .in("username", mentionedUsernames);
    if (mentioned && mentioned.length > 0) {
      await supabase.from("post_mentions").insert(
        mentioned.map((m) => ({
          post_id: post.id,
          mentioned_user_id: m.id,
        })),
      );
      // Fire-and-forget push to mentioned brothers so the poster doesn't
      // wait for each push delivery before the action returns.
      const mentionedIds = mentioned.filter((m) => m.id !== me.id).map((m) => m.id);
      runInBackground(async () => {
        try {
          const { data: meProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", me.id)
            .maybeSingle();
          const senderName = meProfile?.full_name ?? "A brother";
          const preview = body.length > 100 ? `${body.slice(0, 97)}…` : body;
          await Promise.all(
            mentionedIds.map((id) =>
              sendPushToUser({
                userId: id,
                payload: {
                  title: `${senderName} mentioned you`,
                  body: preview,
                  url: `/app/home#post-${post.id}`,
                  tag: `mention:${post.id}`,
                },
              }),
            ),
          );
        } catch (e) {
          console.warn("[post.create] mention push failed (non-fatal)", e);
        }
      });
    }
  }

  // Award points — genuinely fire-and-forget now. The old `await` made
  // every post-submit wait on an extra DB round-trip (Codex pre-launch
  // audit, July 2026). Points landing a beat later is invisible.
  runInBackground(() =>
    awardPoints({
      userId: me.id,
      action: "post_created",
      meta: { post_id: post.id, kind },
    }),
  );

  // Shape the inserted row into FeedPostShape for the optimistic-prepend
  // path. Fresh posts have zero likes / comments / poll votes so we
  // hand the mapper null stats — no need to call home_feed_stats just
  // to learn "this brand new post has 0 of everything."
  const shaped = mapToFeedPostShape(post, null);

  // Phase 3: revalidatePath("/app/home") removed. The home page now
  // uses HomeFeedComposer + FeedStateProvider — the new post is
  // prepended client-side via prependPost(shaped) the moment this
  // action returns. Forcing a route revalidation here would re-run
  // the six parallel queries on /app/home (next event, birthdays,
  // joined groups, etc.) for zero benefit, defeating the whole point
  // of the optimistic-prepend refactor.
  //
  // If a non-home surface ever consumes createPostAction without
  // managing its own state, that surface is responsible for its own
  // refresh (e.g. router.refresh() in its handler).
  return { postId: post.id, post: shaped };
}

/**
 * Server action used by the home page's PullToRefresh AND by the
 * post-submit reconciliation step in FeedComposer. Returns the same
 * `{ posts }` slice the /app/home page builds on render — just the
 * feed list, NOT the surrounding page data (next event, birthdays,
 * unread count, joined groups).
 *
 * This is the "targeted refetch" that replaces `router.refresh()` on
 * the post-submit and pull-to-refresh paths. Previously a fresh post
 * or a pull-down triggered the full /app/home route to re-render,
 * which fanned out six parallel queries (next event, pending count,
 * unread, groups, posts, birthdays) plus the stats RPC. With this
 * action we only refetch the two queries that actually drive the
 * post list.
 *
 * Approved-member only — anonymous or pending callers get an empty
 * array. Mirrors the gate the home page already enforces via
 * requireApproved().
 */
export async function getFeedSliceAction(): Promise<{
  error?: string;
  posts?: FeedPostShape[];
}> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return { posts: [] };

  // Same query the home page uses for the initial feed render. Keep
  // these two in sync via POSTS_QUERY_SELECT — if you add a joined
  // relation to one, add it to the other.
  const { data: posts, error } = await supabase
    .from("posts")
    .select(POSTS_QUERY_SELECT)
    .is("deleted_at", null)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { error: error.message };

  // Stats RPC for likes / comment_count / my_liked / poll votes.
  const postIds = (posts ?? []).map((p: any) => p.id);
  const { data: statsRows } = postIds.length
    ? await supabase.rpc("home_feed_stats", {
        p_post_ids: postIds,
        p_viewer_id: me.id,
      })
    : { data: [] as any[] };

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

  const shaped: FeedPostShape[] = (posts ?? []).map((p: any) =>
    mapToFeedPostShape(p, statsByPost.get(p.id) ?? null),
  );

  return { posts: shaped };
}

/**
 * Load the next page of older feed posts via KEYSET (cursor) pagination —
 * NOT offset. Given the last-seen post's (created_at, id), fetch the next
 * `limit` posts strictly older than that cursor, newest-first, with an id
 * tiebreak so posts sharing a timestamp are never dropped or duplicated.
 * This uses the existing posts_created_idx and stays fast no matter how
 * deep the user scrolls (offset pagination re-scans from row 0; this does
 * not). Pinned posts already float to the top on the initial render; this
 * pages the plain timeline older than the cursor, and the client dedupes
 * by id, so a floated-up pinned post is never shown twice.
 *
 * Returns the page plus a nextCursor (null when there are no more posts).
 * Post visibility (blocks / suspended authors) is enforced by RLS on the
 * posts select, matching the initial home render.
 */
export async function loadMoreFeedAction(
  cursor: { createdAt: string; id: string },
  limit = 20,
): Promise<{
  posts?: FeedPostShape[];
  nextCursor?: { createdAt: string; id: string } | null;
  error?: string;
}> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("id, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return { posts: [], nextCursor: null };

  if (!cursor?.createdAt || !cursor?.id) return { posts: [], nextCursor: null };

  const pageSize = Math.min(Math.max(limit, 1), 50);
  // Keyset predicate: created_at < cursor OR (created_at = cursor AND id < cursor.id).
  const { data: posts, error } = await supabase
    .from("posts")
    .select(POSTS_QUERY_SELECT)
    .is("deleted_at", null)
    .or(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize);
  if (error) return { error: error.message };

  const rows = posts ?? [];
  const postIds = rows.map((p: any) => p.id);
  const { data: statsRows } = postIds.length
    ? await supabase.rpc("home_feed_stats", {
        p_post_ids: postIds,
        p_viewer_id: me.id,
      })
    : { data: [] as any[] };

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

  const shaped: FeedPostShape[] = rows.map((p: any) =>
    mapToFeedPostShape(p, statsByPost.get(p.id) ?? null),
  );

  const last = rows[rows.length - 1] as any;
  const nextCursor =
    rows.length === pageSize && last
      ? { createdAt: last.created_at as string, id: last.id as string }
      : null;

  return { posts: shaped, nextCursor };
}

/** Toggle a like on a post. */
export async function toggleLikeAction(
  postId: string,
  nextLiked: boolean,
): Promise<{ error?: string }> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) return { error: "No profile." };

  if (nextLiked) {
    const { error } = await supabase
      .from("post_likes")
      .insert({ post_id: postId, user_id: me.id });
    // Ignore unique-violation (Postgres error code 23505): already liked.
    if (error && (error as any).code !== "23505") return { error: error.message };
  } else {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", me.id);
    if (error) return { error: error.message };
  }
  // No revalidation — client updates optimistically.
  return {};
}

/** Add a comment to a post. */
export async function addCommentAction(
  postId: string,
  body: string,
  /** When replying to a comment: the id of the comment being replied
   *  to. Replies-to-replies are flattened onto the ORIGINAL top-level
   *  parent (single-level threading, Instagram-style). */
  parentCommentId?: string | null,
): Promise<{
  error?: string;
  comment?: {
    id: string;
    body: string;
    created_at: string;
    user_name: string;
    user_photo?: string | null;
    user_id: string;
    parent_id?: string | null;
  };
}> {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("id, full_name, profile_photo_url")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) return { error: "No profile." };

  const trimmed = body.trim();
  if (!trimmed) return { error: "Empty comment." };
  if (trimmed.length > 5000) return { error: "Comment is too long (5000 char max)." };

  // Resolve + validate the reply target. Flatten reply-to-reply onto
  // the original top-level parent so threading never nests deeper than
  // one level. Parent must belong to the same post and not be deleted.
  let parentId: string | null = null;
  let parentAuthorId: string | null = null;
  if (parentCommentId) {
    const { data: parent } = await supabase
      .from("post_comments")
      .select("id, post_id, parent_comment_id, author_id, deleted_at")
      .eq("id", parentCommentId)
      .maybeSingle();
    if (!parent || parent.deleted_at || parent.post_id !== postId) {
      return { error: "That comment is gone — it may have been deleted." };
    }
    parentId = parent.parent_comment_id ?? parent.id;
    parentAuthorId = parent.author_id;
  }

  const { data: row, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: postId,
      author_id: me.id,
      body: trimmed,
      parent_comment_id: parentId,
    })
    .select("id, body, created_at, parent_comment_id")
    .single();
  if (error) return { error: error.message };

  // Reply push — tell the brother whose comment was replied to (never
  // yourself). Fire-and-forget so provider latency can't slow the reply.
  if (parentAuthorId && parentAuthorId !== me.id) {
    const replyTargetId = parentAuthorId;
    const preview = trimmed.length > 100 ? `${trimmed.slice(0, 97)}…` : trimmed;
    const rowIdForTag = row.id;
    runInBackground(async () => {
      try {
        await sendPushToUser({
          userId: replyTargetId,
          payload: {
            title: `${me.full_name} replied to your comment`,
            body: preview,
            url: `/app/home#post-${postId}`,
            tag: `comment-reply:${rowIdForTag}`,
          },
        });
      } catch (e) {
        console.warn("[comment.reply] push failed (non-fatal)", e);
      }
    });
  }

  // Fire-and-forget (see post_created note — same Codex finding).
  runInBackground(() =>
    awardPoints({
      userId: me.id,
      action: "comment_added",
      meta: { post_id: postId, comment_id: row.id },
    }),
  );

  // Super-admin firehose — every comment pings Dustin.
  runInBackground(async () => {
    try {
      const preview = trimmed.length > 100 ? `${trimmed.slice(0, 97)}…` : trimmed;
      await sendPushToSuperAdmins({
        actorProfileId: me.id,
        payload: {
          title: `${me.full_name} commented`,
          body: preview,
          url: `/app/home#post-${postId}`,
          tag: `comment:${row.id}`,
        },
      });
    } catch (e) {
      console.warn("[comment.add] super-admin push failed", e);
    }
  });

  // Parse @mentions, write post_mentions rows, and push the mentioned brothers.
  const mentionedUsernames = Array.from(
    new Set(
      (trimmed.match(/@([\w-]+)/g) ?? []).map((s) => s.slice(1).toLowerCase()),
    ),
  );
  if (mentionedUsernames.length > 0) {
    const { data: mentioned } = await supabase
      .from("profiles")
      .select("id")
      .in("username", mentionedUsernames);
    if (mentioned && mentioned.length > 0) {
      await supabase.from("post_mentions").insert(
        mentioned.map((m) => ({
          post_id: postId,
          comment_id: row.id,
          mentioned_user_id: m.id,
        })),
      );
      // Fire-and-forget push so the commenter sees their reply land
      // instantly while pushes deliver in the background.
      const mentionedIds = mentioned.filter((m) => m.id !== me.id).map((m) => m.id);
      const senderName = me.full_name;
      const preview =
        trimmed.length > 100 ? `${trimmed.slice(0, 97)}…` : trimmed;
      const rowId = row.id;
      runInBackground(async () => {
        try {
          await Promise.all(
            mentionedIds.map((id) =>
              sendPushToUser({
                userId: id,
                payload: {
                  title: `${senderName} mentioned you`,
                  body: preview,
                  url: `/app/home#post-${postId}`,
                  tag: `mention-comment:${rowId}`,
                },
              }),
            ),
          );
        } catch (e) {
          console.warn("[comment.add] mention push failed (non-fatal)", e);
        }
      });
    }
  }

  // NO revalidatePath here. FeedPost appends the returned comment to
  // local state optimistically; revalidating /app/home re-ran the whole
  // route tree and flashed the full-feed SKELETON right after commenting
  // (Dustin's "like then comment → blank feed" repro, July 2026). The
  // fresh comment shows for everyone else on their next feed load.
  return {
    comment: {
      id: row.id,
      body: row.body,
      created_at: row.created_at,
      user_name: me.full_name,
      user_photo: me.profile_photo_url ?? null,
      user_id: me.id,
      parent_id: row.parent_comment_id ?? null,
    },
  };
}
