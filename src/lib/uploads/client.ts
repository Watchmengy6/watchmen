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
  | { url: string; mediaType: "image" | "video"; posterUrl?: string | null }
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

  // Videos: cap at 100 MB. Real transcoding belongs on a backend
  // service (Mux, Cloudflare Stream) — too expensive to do reliably
  // in-browser. The cap keeps phone recordings sane until then.
  if (isVideo && file.size > 100 * 1024 * 1024) {
    return {
      error:
        "Video is too big (100 MB max). Trim it shorter or record at lower quality.",
    };
  }
  // Images: 50 MB ceiling on the source file before resize.
  if (isImage && file.size > 50 * 1024 * 1024) {
    return { error: "Image too large (50 MB max)." };
  }

  // Downscale images before upload. Videos go through as-is.
  const payload = isImage ? await resizeImageFile(file) : file;

  const safeName = payload.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  // Single timestamp shared by the media path AND any poster sibling.
  // Earlier code called Date.now() twice, so a 1-ms tick between the two
  // calls broke poster URL derivation — the feed renderer expects the
  // poster to live at exactly `${mediaUrl}.poster.jpg`.
  const stamp = Date.now();
  const path = `${user.id}/${stamp}-${safeName}`;
  const { error: upErr } = await supabase.storage
    .from("chat-media")
    .upload(path, payload, { upsert: false, contentType: payload.type });
  if (upErr) return { error: upErr.message };

  const { data } = supabase.storage.from("chat-media").getPublicUrl(path);

  // For videos, also try to generate + upload a poster image from the
  // first frame so the feed preview doesn't have to load the full
  // video bytes just to render a card. Best-effort — if the browser
  // can't decode the video (rare iOS edge case), we skip the poster.
  let posterUrl: string | null = null;
  if (isVideo) {
    try {
      const posterBlob = await generateVideoPoster(file);
      if (posterBlob) {
        const posterPath = `${user.id}/${stamp}-${safeName}.poster.jpg`;
        const { error: pErr } = await supabase.storage
          .from("chat-media")
          .upload(posterPath, posterBlob, {
            upsert: false,
            contentType: "image/jpeg",
          });
        if (!pErr) {
          const { data: pub } = supabase.storage
            .from("chat-media")
            .getPublicUrl(posterPath);
          posterUrl = pub.publicUrl;
        }
      }
    } catch {
      /* poster generation is optional */
    }
  }

  return {
    url: data.publicUrl,
    mediaType: isImage ? "image" : "video",
    posterUrl,
  };
}

/**
 * Grab the first frame of a video file as a JPEG. Used to build a
 * cheap poster for feed previews so the player doesn't autoload the
 * full video. Returns null if the browser can't decode the source
 * (older iOS Safari + uncommon codecs sometimes fail).
 */
async function generateVideoPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    function cleanup() {
      URL.revokeObjectURL(url);
    }

    video.onloadedmetadata = () => {
      // Seek a hair past 0 so we get an actual frame, not a black one.
      video.currentTime = Math.min(0.1, video.duration / 4);
    };
    video.onseeked = () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) {
          cleanup();
          resolve(null);
          return;
        }
        // Cap poster size to 1280px longest edge.
        const maxEdge = 1280;
        const scale = Math.min(1, maxEdge / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (b) => {
            cleanup();
            resolve(b);
          },
          "image/jpeg",
          0.85,
        );
      } catch {
        cleanup();
        resolve(null);
      }
    };
    video.onerror = () => {
      cleanup();
      resolve(null);
    };
    // Safety timeout — some Safari versions hang on .onseeked silently.
    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 8000);
  });
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
