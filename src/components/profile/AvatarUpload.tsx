"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import { pickPhotoFromLibrary } from "@/lib/upload/pickPhoto";

export function AvatarUpload({
  authUserId,
  name,
  defaultUrl,
}: {
  authUserId: string;
  name: string;
  defaultUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(defaultUrl);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  async function handleClick() {
    if (busy) return;
    const file = await pickPhotoFromLibrary();
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      push({ title: "Image too large", body: "Max 8 MB.", variant: "error" });
      return;
    }
    setBusy(true);
    const supabase = supabaseBrowser();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${authUserId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
    if (upErr) {
      push({ title: "Upload failed", body: upErr.message, variant: "error" });
      setBusy(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setUrl(data.publicUrl);
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar src={url} name={name} size={80} ring />
      <div className="flex flex-col gap-2">
        <input type="hidden" name="profile_photo_url" value={url ?? ""} />
        {/* Library-only photo picker. The old <input type="file"> opened
            iOS's 3-option sheet ("Take Photo" / "Photo Library" / "Browse")
            and the "Take Photo" path crashed the app on iPadOS 26.5
            under Capacitor 8 — Apple Review caught it in June 2026.
            pickPhotoFromLibrary uses @capacitor/camera's pickImages on
            native (library only, no camera) and falls back to a hidden
            input on web. */}
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className={cn(
            "inline-flex items-center justify-center h-9 px-3 rounded-full text-sm cursor-pointer select-none",
            "bg-transparent text-white hairline hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors disabled:opacity-60",
          )}
        >
          {busy ? "Uploading…" : url ? "Change photo" : "Upload photo"}
        </button>
        {url ? (
          <button
            type="button"
            onClick={() => setUrl(null)}
            className="text-[12px] text-ink-400 hover:text-ink-200 text-left"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}
