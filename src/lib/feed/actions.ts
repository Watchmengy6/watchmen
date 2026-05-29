"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { awardPoints } from "@/lib/points/award";
import { sendPushToUser } from "@/lib/push/send";

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
 * Returns up to 8 username-matching approved members. Empty query → empty
 * list (nothing to filter against, and we don't want to leak a directory).
 */
export async function searchMembersForMention(
  query: string,
): Promise<{ id: string; full_name: string; username: string }[]> {
  const q = (query ?? "").trim().toLowerCase();
  if (q.length === 0) return [];

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

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username")
    .eq("status", "approved")
    .neq("id", me.id)
    .not("username", "is", null)
    .ilike("username", `${q}%`)
    .order("full_name")
    .limit(8);

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

  // Member "meetup" posts are stored as kind='post' with structured
  // meetup_when_at / meetup_location fields. The post_kind enum stays
  // unchanged — the renderer keys off the structured fields instead.
  const isMeetupKind = kindRaw === "meetup";
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
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

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

  const { data: row, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, author_id: me.id, body: trimmed })
    .select("id, body, created_at")
    .single();
  if (error) return { error: error.message };

  await awardPoints({ userId: me.id, action: "comment_added", meta: { post_id: postId, comment_id: row.id } });

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
