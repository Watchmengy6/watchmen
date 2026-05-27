"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Upload a single file to the chat-media bucket and return its public URL.
 * Path is `<auth.uid()>/<timestamp>-<filename>`.
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

  // Limit 50 MB.
  if (file.size > 50 * 1024 * 1024) return { error: "File too large (50 MB max)." };

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${user.id}/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabase.storage
    .from("chat-media")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) return { error: upErr.message };

  const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
  return { url: data.publicUrl, mediaType: isImage ? "image" : "video" };
}

/** Same as uploadMedia but for the avatars bucket. Used for profile pics. */
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

  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${user.id}/${Date.now()}-${safeName}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) return { error: upErr.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { url: data.publicUrl };
}
