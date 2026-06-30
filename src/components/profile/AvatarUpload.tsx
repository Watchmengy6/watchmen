"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { uploadAvatar } from "@/lib/uploads/client";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

export function AvatarUpload({
  name,
  defaultUrl,
}: {
  // authUserId kept for call-site compatibility; the upload path now
  // derives the owner from the authed session inside uploadAvatar().
  authUserId?: string;
  name: string;
  defaultUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(defaultUrl);
  const [busy, setBusy] = useState(false);
  const { push } = useToast();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    // uploadAvatar() validates type + 8 MB cap, center-crops square and
    // downscales to an 800px edge before upload, then returns the URL.
    const result = await uploadAvatar(file);
    if ("error" in result) {
      push({ title: "Upload failed", body: result.error, variant: "error" });
      setBusy(false);
      return;
    }
    setUrl(result.url);
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar src={url} name={name} size={80} ring />
      <div className="flex flex-col gap-2">
        <input type="hidden" name="profile_photo_url" value={url ?? ""} />
        <label
          className={cn(
            "inline-flex items-center justify-center h-9 px-3 rounded-full text-sm cursor-pointer select-none",
            "bg-transparent text-white hairline hover:bg-white/[0.04] active:bg-white/[0.08] transition-colors",
            busy && "opacity-60 pointer-events-none",
          )}
        >
          <input type="file" accept="image/*" className="hidden" onChange={onPick} />
          {busy ? "Uploading…" : url ? "Change photo" : "Upload photo"}
        </label>
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
