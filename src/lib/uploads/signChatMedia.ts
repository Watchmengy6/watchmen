import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// P0.2 — chat media privacy. The chat-media bucket is being made private so
// DM/group/event images aren't world-readable by URL. Reads now go through
// short-lived signed URLs minted server-side with the service-role key
// (which is pre-authorized, so it works whether the bucket is public or
// private — that's why shipping this code BEFORE flipping the bucket is
// safe). Stored `media_url` values keep their existing (public-URL) format;
// we derive the object path from them, so no data migration is needed.

const BUCKET = "chat-media";
// 7 days. Pages are force-dynamic so URLs are re-minted on every load; this
// only needs to outlast a single viewing session.
const EXPIRY_SECONDS = 60 * 60 * 24 * 7;

/**
 * Extract the object path within the chat-media bucket from a stored value
 * that may be a full public URL (legacy/current format) or an already-bare
 * path. Returns null if it isn't a chat-media reference.
 */
export function chatMediaPath(stored: string | null | undefined): string | null {
  if (!stored) return null;
  const marker = "/chat-media/";
  const i = stored.indexOf(marker);
  if (i >= 0) {
    return decodeURIComponent(stored.slice(i + marker.length).split("?")[0]);
  }
  // Not a full URL — treat as a bare path (strip an optional bucket prefix).
  if (!stored.startsWith("http")) return stored.replace(/^chat-media\//, "");
  // A full URL for some other bucket — not ours.
  return null;
}

/**
 * Sign a single stored chat-media reference into a temporary URL. If the
 * value isn't a chat-media object, or signing fails, returns the original
 * value unchanged (defensive — never blank an image because of a signer
 * hiccup).
 */
export async function signChatMediaUrl(
  stored: string | null | undefined,
): Promise<string | null> {
  if (!stored) return null;
  const path = chatMediaPath(stored);
  if (!path) return stored;
  const admin = supabaseAdmin();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, EXPIRY_SECONDS);
  if (error || !data?.signedUrl) return stored;
  return data.signedUrl;
}

/**
 * Batch-sign the media_url on a list of chat messages (only image/video
 * rows are touched). Used by the DM/group/event thread page loaders.
 */
export async function signMessagesMedia<
  T extends { media_url?: string | null; media_type?: string | null },
>(messages: T[]): Promise<T[]> {
  return Promise.all(
    messages.map(async (m) => {
      if (
        m.media_url &&
        (m.media_type === "image" || m.media_type === "video")
      ) {
        return { ...m, media_url: await signChatMediaUrl(m.media_url) };
      }
      return m;
    }),
  );
}
