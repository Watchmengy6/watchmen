"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/points/award";
import { sendPushToUser, sendPushToSuperAdmins } from "@/lib/push/send";

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
    .select("status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || me.status !== "approved") return { comments: [], error: "Approval required." };

  const { data } = await supabase
    .from("post_comments")
    .select(
      "id, body, created_at, author:profiles!post_comments_author_id_fkey(id, full_name, profile_photo_url)",
    )
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const comments = (data ?? []).map((c: any) => {
    const a = Array.isArray(c.author) ? c.author[0] : c.author;
    return {
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      user_name: a?.full_name ?? "Brother",
      user_photo: a?.profile_photo_url ?? null,
      user_id: a?.id ?? "",
    };
  });
  return { comments };
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
  void (async () => {
    try {
      const optionLabel =
        (post.poll_options as string[])[input.optionIndex] ?? "an option";
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
          url: "/app/home",
          tag: `poll-vote:${input.postId}`,
        },
      });
    } catch (e) {
      console.warn("[poll.vote] super-admin push failed", e);
    }
  })();

  revalidatePath("/app/home");
  return { success: true };
}

/**
 * Admin moderation: soft-delete any feed post (sets deleted_at).
 * Authors can also delete their own posts via a separate flow; this
 * one is the heavy hammer for leadership.
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
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
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

  let qb = supabase
    .from("profiles")
    .select("id, full_name, username")
    .eq("status", "approved")
    .neq("id", me.id)
    .not("username", "is", null);

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

  return (data ?? []).filter((r) => r.username) as {
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
): Promise<{ error?: string; postId?: string }> {
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
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Super-admin firehose: fire-and-forget push on every new post.
  void (async () => {
    try {
      const { data: meProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", me.id)
        .maybeSingle();
      const senderName = meProfile?.full_name ?? "A brother";
      const preview = body.length > 100 ? `${body.slice(0, 97)}…` : body;
      await sendPushToSuperAdmins({
        actorProfileId: me.id,
        payload: {
          title: `${senderName} posted`,
          body: preview,
          url: "/app/home",
          tag: `post:${post.id}`,
        },
      });
    } catch (e) {
      console.warn("[post.create] super-admin push failed", e);
    }
  })();

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
      void (async () => {
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
                  url: `/app/home`,
                  tag: `mention:${post.id}`,
                },
              }),
            ),
          );
        } catch (e) {
          console.warn("[post.create] mention push failed (non-fatal)", e);
        }
      })();
    }
  }

  // Award points for the post (fire-and-forget).
  await awardPoints({ userId: me.id, action: "post_created", meta: { post_id: post.id, kind } });

  revalidatePath("/app/home");
  return { postId: post.id };
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
): Promise<{
  error?: string;
  comment?: {
    id: string;
    body: string;
    created_at: string;
    user_name: string;
    user_photo?: string | null;
    user_id: string;
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

  const { data: row, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: me.id, body: trimmed })
    .select("id, body, created_at")
    .single();
  if (error) return { error: error.message };

  await awardPoints({ userId: me.id, action: "comment_added", meta: { post_id: postId, comment_id: row.id } });

  // Super-admin firehose — every comment pings Dustin.
  void (async () => {
    try {
      const preview = trimmed.length > 100 ? `${trimmed.slice(0, 97)}…` : trimmed;
      await sendPushToSuperAdmins({
        actorProfileId: me.id,
        payload: {
          title: `${me.full_name} commented`,
          body: preview,
          url: "/app/home",
          tag: `comment:${row.id}`,
        },
      });
    } catch (e) {
      console.warn("[comment.add] super-admin push failed", e);
    }
  })();

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
      void (async () => {
        try {
          await Promise.all(
            mentionedIds.map((id) =>
              sendPushToUser({
                userId: id,
                payload: {
                  title: `${senderName} mentioned you`,
                  body: preview,
                  url: "/app/home",
                  tag: `mention-comment:${rowId}`,
                },
              }),
            ),
          );
        } catch (e) {
          console.warn("[comment.add] mention push failed (non-fatal)", e);
        }
      })();
    }
  }

  revalidatePath("/app/home");
  return {
    comment: {
      id: row.id,
      body: row.body,
      created_at: row.created_at,
      user_name: me.full_name,
      user_photo: me.profile_photo_url ?? null,
      user_id: me.id,
    },
  };
}
