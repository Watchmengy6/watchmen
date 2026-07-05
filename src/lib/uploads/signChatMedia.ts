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
 *
 * Perf (July 2026): uses ONE `createSignedUrls` call for the whole page
 * of messages instead of one storage round-trip per media message. A
 * photo-heavy thread was paying up to 50 parallel storage calls on
 * every open — this was a real chunk of the "opening messages is slow"
 * report from Dustin.
 */
export async function signMessagesMedia<
  T extends { media_url?: string | null; media_type?: string | null },
>(messages: T[]): Promise<T[]> {
  // Collect the chat-media object paths that actually need signing.
  const paths: string[] = [];
  const pathByIndex = new Map<number, string>();
  messages.forEach((m, i) => {
    if (m.media_url && (m.media_type === "image" || m.media_type === "video")) {
      const path = chatMediaPath(m.media_url);
      if (path) {
        pathByIndex.set(i, path);
        if (!paths.includes(path)) paths.push(path);
      }
    }
  });
  if (paths.length === 0) return messages;

  const admin = supabaseAdmin();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrls(paths, EXPIRY_SECONDS);

  // Defensive: on signer hiccup, return originals rather than blanking
  // images (same contract as signChatMediaUrl).
  const signedByPath = new Map<string, string>();
  if (!error && data) {
    data.forEach((row) => {
      if (row?.path && row.signedUrl && !row.error) {
        signedByPath.set(row.path, row.signedUrl);
      }
    });
  }

  return messages.map((m, i) => {
    const path = pathByIndex.get(i);
    if (!path) return m;
    const signed = signedByPath.get(path);
    return signed ? { ...m, media_url: signed } : m;
  });
}
