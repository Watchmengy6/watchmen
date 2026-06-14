"use client";

import { useRef, useState } from "react";
import { uploadMedia } from "@/lib/uploads/client";

/**
 * Cover-image picker + uploader for a new group. Writes the resulting public
 * URL into a hidden input named `cover_url` so the server action picks it up.
 */
export function GroupCoverInput() {
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Pick an image file.");
      return;
    }
    setErr(null);
    setUploading(true);
    const result = await uploadMedia(file);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    if ("error" in result) {
      setErr(result.error);
      return;
    }
    setUrl(result.url);
  }

  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-1.5">
        Cover image (optional)
      </div>
      <input type="hidden" name="cover_url" value={url ?? ""} />
      <input
        ref={fileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.heic,.heif,.gif,.webp"
        className="hidden"
        onChange={onPick}
      />
      {url ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="w-full h-40 rounded-xl object-cover"
          />
          <button
            type="button"
            onClick={() => setUrl(null)}
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 text-white text-sm"
            aria-label="Remove cover"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full h-40 rounded-xl bg-ink-800 hairline flex flex-col items-center justify-center text-ink-300 active:bg-ink-700 transition-colors"
        >
          {uploading ? (
            <>
              <svg viewBox="0 0 24 24" className="h-6 w-6 animate-spin text-gold-300" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" strokeDasharray="40 60" />
              </svg>
              <span className="text-[12px] mt-2">Uploading…</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
                   strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="9" cy="11" r="2" />
                <path d="m21 17-5-5-9 9" />
              </svg>
              <span className="text-[13px] mt-2">Add cover image</span>
              <span className="text-[11px] text-ink-400">Auto-resized to fit</span>
            </>
          )}
        </button>
      )}
      {err ? <div className="mt-1.5 text-[12px] text-red-300">{err}</div> : null}
    </div>
  );
}
