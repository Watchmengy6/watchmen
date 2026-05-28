"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Resize an image File to fit within `maxEdge` pixels (longest side),
 * re-encode as JPEG at `quality`, and return a new File. Preserves
 * aspect ratio. Falls back to the original file if anything goes
 * sideways (offline, exotic format, decode failure) so we never block
 * an upload on the resize step.
 *
 * This is the single biggest "upload feels fast" win — a 4–10 MB phone
 * photo drops to ~200–500 KB after this pass, which means faster sends,
 * less storage, less bandwidth on every feed render.
 */
async function resizeImageFile(
  file: File,
  maxEdge = 1600,
  quality = 0.85,
): Promise<File> {
  // Don't resize tiny images — they're already small enough.
  if (file.size < 300 * 1024) return file;
  // Don't try to handle exotic formats (HEIC etc) — browsers can't
  // always decode them. Just upload as-is and let the server deal.
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= maxEdge) {
      bitmap.close?.();
      return file;
    }
    const scale = maxEdge / longest;
    const targetW = Math.round(bitmap.width * scale);
    const targetH = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    bitmap.close?.();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;

    // Reuse the original filename but force a .jpg extension so the
    // server-side content-type and storage URL line up.
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

/**
 * Upload a single file to the chat-media bucket and return its public URL.
 * Path is `<auth.uid()>/<timestamp>-<filename>`.
 *
 * Images are downscaled in the browser to a max 1600px edge before upload.
 * Videos pass through untouched (transcoding in the browser is too costly).
 *
 * Returns { url, mediaType } on success, { error } on failure.
 */
export async function uploadMedia(file: File): Promise<
  | { url: string; mediaType: "image" | "video" }
  | { error: string }
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { error: "Supabase not configured." };

  const supabase = createBrowserClient(url, key);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) return { error: "Only images and videos allowed." };

  // Limit 50 MB on the source file.
  if (file.size > 50 * 1024 * 1024) return { error: "File too large (50 MB max)." };

  // Downscale images before upload. Videos go through as-is.
  const payload = isImage ? await resizeImageFile(file) : file;

  const safeName = payload.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${user.id}/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabase.storage
    .from("chat-media")
    .upload(path, payload, { upsert: false, contentType: payload.type });
  if (upErr) return { error: upErr.message };

  const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
  return { url: data.publicUrl, mediaType: isImage ? "image" : "video" };
}

/**
 * Same as uploadMedia but for the avatars bucket. Used for profile pics.
 * Avatars are smaller — resize to a 800px edge so the bucket stays tight.
 */
export async function uploadAvatar(file: File): Promise<
  { url: string } | { error: string }
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { error: "Supabase not configured." };

  const supabase = createBrowserClient(url, key);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!file.type.startsWith("image/")) return { error: "Pick an image." };
  if (file.size > 8 * 1024 * 1024) return { error: "Image too large (8 MB max)." };

  const payload = await resizeImageFile(file, 800, 0.88);
  const safeName = payload.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${user.id}/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, payload, { upsert: true, contentType: payload.type });
  if (upErr) return { error: upErr.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl };
}
