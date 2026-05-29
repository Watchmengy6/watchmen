"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { uploadMedia } from "@/lib/uploads/client";
import { searchMembersForMention } from "@/lib/feed/actions";

const types = [
  { id: "post", label: "Post" },
  { id: "meetup", label: "Meetup" },
  { id: "job", label: "Hiring" },
  { id: "need", label: "Need" },
] as const;

export interface MentionablePerson {
  id: string;
  full_name: string;
  username: string;
}

export interface TaggableGroup {
  id: string;
  name: string;
  /** Optional small emoji or character to render in the chip — falls back to first letter. */
  emoji?: string | null;
}

export interface FeedComposerProps {
  meName: string;
  meAvatarUrl?: string | null;
  /** Members the user can @mention. Live-filtered against `@<query>` typed into the textarea. */
  mentionablePeople?: MentionablePerson[];
  /** Groups the user has joined and can tag a post to. */
  taggableGroups?: TaggableGroup[];
  /**
   * Server action invoked on submit. Should accept FormData with:
   *   - kind   ('post' | 'job' | 'need')
   *   - body   (string)
   *   - tagged_group_id (uuid | '')
   * Returns void; component closes & resets on success.
   */
  onSubmit?: (formData: FormData) => Promise<{ error?: string } | void>;
}

export function FeedComposer({
  meName,
  meAvatarUrl,
  mentionablePeople = [],
  taggableGroups = [],
  onSubmit,
}: FeedComposerProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof types)[number]["id"]>("post");
  const [text, setText] = useState("");
  const [taggedGroupId, setTaggedGroupId] = useState<string | null>(null);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  // Member-meetup fields (only used when type === "meetup")
  const [meetupWhen, setMeetupWhen] = useState("");
  const [meetupWhere, setMeetupWhere] = useState("");
  const router = useRouter();
  const taggedGroup = taggedGroupId
    ? taggableGroups.find((g) => g.id === taggedGroupId)
    : null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // @ mention picker: opens when user types "@" and shows live-filtered members.
  // Allow hyphens because the username backfill produces dash-suffixed handles.
  const mentionQuery = (() => {
    const m = text.match(/@([\w-]*)$/);
    return m ? m[1] : null;
  })();

  // Fetch matches from the server on demand (debounced) when no static
  // list is provided. The static-list path is still used by the preview
  // tree and any caller that wants to pre-populate.
  const [remoteMatches, setRemoteMatches] = useState<MentionablePerson[]>([]);
  useEffect(() => {
    if (mentionablePeople.length > 0) return; // static list — no fetch
    if (mentionQuery === null || mentionQuery.length === 0) {
      setRemoteMatches([]);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      const rows = await searchMembersForMention(mentionQuery);
      if (!cancelled) setRemoteMatches(rows);
    }, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [mentionQuery, mentionablePeople.length]);

  const mentionMatches =
    mentionQuery === null
      ? []
      : mentionablePeople.length > 0
        ? mentionablePeople
            .filter((u) =>
              u.username?.toLowerCase().startsWith(mentionQuery.toLowerCase()),
            )
            .slice(0, 5)
        : remoteMatches.slice(0, 5);

  function insertMention(username: string) {
    const newText = text.replace(/@([\w-]*)$/, `@${username} `);
    setText(newText);
    textareaRef.current?.focus();
  }

  function reset() {
    setOpen(false);
    setText("");
    setTaggedGroupId(null);
    setGroupPickerOpen(false);
    setErr(null);
    setMediaUrl(null);
    setMediaType(null);
    setMeetupWhen("");
    setMeetupWhere("");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    const result = await uploadMedia(file);
    setUploading(false);
    if ("error" in result) {
      setErr(result.error);
      return;
    }
    setMediaUrl(result.url);
    setMediaType(result.mediaType);
    // Reset input so the same file can be picked again later.
    if (fileRef.current) fileRef.current.value = "";
  }

  function handlePost() {
    if (!text.trim() || pending) return;
    // Meetup posts require both fields — otherwise it's just a regular
    // post with the wrong label and no card to render.
    if (type === "meetup" && (!meetupWhen.trim() || !meetupWhere.trim())) {
      setErr("Meetup needs both when and where.");
      return;
    }
    if (!onSubmit) {
      // No server action wired — just reset (preview mode).
      reset();
      return;
    }
    const fd = new FormData();
    fd.set("kind", type);
    fd.set("body", text.trim());
    fd.set("tagged_group_id", taggedGroupId ?? "");
    fd.set("media_url", mediaUrl ?? "");
    fd.set("media_type", mediaType ?? "none");
    if (type === "meetup") {
      // datetime-local has no timezone — pass the local string and the
      // server combines it with the browser tz offset for storage.
      fd.set("meetup_when_at", meetupWhen);
      fd.set("meetup_location", meetupWhere.trim());
      fd.set(
        "tz_offset",
        formatTzOffset(new Date().getTimezoneOffset()),
      );
    }
    startTransition(async () => {
      const result = await onSubmit(fd);
      if (result && "error" in result && result.error) {
        setErr(result.error);
        return;
      }
      reset();
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-ink-800/80 hairline p-3">
      <div className="flex items-center gap-3">
        <Avatar name={meName} src={meAvatarUrl ?? undefined} size={36} />
        {/* Gold gradient pill so the composer pops instead of blending
            in. Per Dustin — more obvious composer = more posts. */}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 h-11 rounded-full bg-gradient-to-r from-gold-400/20 via-gold-500/15 to-gold-700/0 ring-1 ring-gold-500/40 px-4 text-left text-gold-100 text-[14px] font-medium flex items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        >
          <span className="text-gold-300 text-base leading-none">＋</span>
          Share something with the room…
        </button>
      </div>

      {open ? (
        <div className="mt-3">
          <div className="flex gap-2 mb-2">
            {types.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={cn(
                  "h-7 px-3 rounded-full text-[12px]",
                  type === t.id
                    ? "bg-gold-500/15 text-gold-200 ring-1 ring-gold-500/40"
                    : "bg-ink-900/60 text-ink-200 hairline",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {/* Meetup-only fields: when + where. Render above the textarea
              so it reads as "I'm doing X at Y, here's what it is." */}
          {type === "meetup" ? (
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-1">
                  When
                </div>
                <input
                  type="datetime-local"
                  value={meetupWhen}
                  onChange={(e) => setMeetupWhen(e.target.value)}
                  className="w-full h-10 rounded-xl bg-ink-900/60 hairline px-3 text-[13.5px] text-white outline-none focus:ring-2 focus:ring-gold-400/30"
                />
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-1">
                  Where
                </div>
                <input
                  type="text"
                  value={meetupWhere}
                  onChange={(e) => setMeetupWhere(e.target.value)}
                  placeholder="Black Crow Coffee"
                  className="w-full h-10 rounded-xl bg-ink-900/60 hairline px-3 text-[13.5px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30"
                />
              </div>
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={
              type === "meetup"
                ? "Who's around? Quick details — what is it, who should come?"
                : type === "job"
                  ? "Describe the role, location, and how to reach you. Tag with @"
                  : type === "need"
                    ? "What do you need? Tag a brother with @"
                    : "What's on your mind? Tag with @"
            }
            className="w-full rounded-xl bg-ink-900/60 hairline px-3 py-2.5 text-[15px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30 resize-none"
          />

          {/* @ mention live picker */}
          {mentionMatches.length > 0 ? (
            <div className="mt-2 rounded-xl bg-ink-900/80 hairline overflow-hidden">
              <div className="px-3 py-1.5 text-[10.5px] tracking-[0.25em] uppercase text-ink-400">
                Tag a brother
              </div>
              <div className="max-h-44 overflow-y-auto">
                {mentionMatches.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => insertMention(u.username)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] text-left"
                  >
                    <Avatar name={u.full_name} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white truncate">{u.full_name}</div>
                      <div className="text-[11px] text-gold-300/80">@{u.username}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Tagged group display */}
          {taggedGroup ? (
            <div className="mt-2 inline-flex items-center gap-2 h-7 pr-1 pl-1 rounded-full bg-ink-900/80 hairline">
              <span className="h-6 w-6 rounded-full bg-ink-700 flex items-center justify-center text-[13px]">
                {taggedGroup.emoji ?? taggedGroup.name[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="text-[11.5px] text-ink-100">Tagged to {taggedGroup.name}</span>
              <button
                onClick={() => setTaggedGroupId(null)}
                className="h-5 w-5 rounded-full bg-ink-700 text-ink-300 text-xs"
                aria-label="Remove tag"
              >
                ×
              </button>
            </div>
          ) : null}

          {err ? (
            <div className="mt-2 text-[12px] text-red-300">{err}</div>
          ) : null}

          {/* Media preview */}
          {mediaUrl ? (
            <div className="mt-2 relative">
              {mediaType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl}
                  alt=""
                  className="w-full max-h-72 rounded-xl object-cover"
                />
              ) : (
                <video
                  src={mediaUrl}
                  className="w-full max-h-72 rounded-xl"
                  controls
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setMediaUrl(null);
                  setMediaType(null);
                }}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 text-white text-sm"
                aria-label="Remove media"
              >
                ×
              </button>
            </div>
          ) : null}

          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              aria-label="Add photo or video"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={cn(
                "h-9 w-9 rounded-full bg-ink-900/60 hairline flex items-center justify-center transition-colors",
                uploading ? "text-gold-300" : "text-ink-200",
              )}
            >
              {uploading ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" strokeDasharray="40 60" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                     strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <circle cx="9" cy="11" r="2" />
                  <path d="m21 17-5-5-9 9" />
                </svg>
              )}
            </button>
            {taggableGroups.length > 0 ? (
              <button
                onClick={() => setGroupPickerOpen((s) => !s)}
                aria-label="Tag a group"
                className={cn(
                  "h-9 w-9 rounded-full hairline flex items-center justify-center transition-colors",
                  taggedGroup
                    ? "bg-gold-500/15 text-gold-200 ring-1 ring-gold-500/40"
                    : "bg-ink-900/60 text-ink-200",
                )}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                     strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M20 12 12 4H5a1 1 0 0 0-1 1v7l8 8a1 1 0 0 0 1.4 0l6.6-6.6a1 1 0 0 0 0-1.4Z" />
                  <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
                </svg>
              </button>
            ) : null}
            <div className="flex-1" />
            <button
              onClick={reset}
              className="h-9 px-3 rounded-full text-[13px] text-ink-200"
              disabled={pending}
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={!text.trim() || pending}
              className="h-9 px-4 rounded-full text-[13px] font-semibold bg-gradient-to-b from-gold-300 to-gold-500 text-black disabled:opacity-40"
            >
              {pending ? "Posting…" : "Post"}
            </button>
          </div>

          {/* Group picker dropdown */}
          {groupPickerOpen ? (
            <div className="mt-2 rounded-xl bg-ink-900/80 hairline overflow-hidden">
              <div className="px-3 py-2 text-[10.5px] tracking-[0.25em] uppercase text-ink-400">
                Tag one of your groups
              </div>
              <div className="max-h-48 overflow-y-auto">
                {taggableGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setTaggedGroupId(g.id);
                      setGroupPickerOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] text-left"
                  >
                    <span className="h-7 w-7 rounded-full bg-ink-800 flex items-center justify-center text-[15px]">
                      {g.emoji ?? g.name[0]?.toUpperCase() ?? "?"}
                    </span>
                    <span className="flex-1 text-[13px] text-white">{g.name}</span>
                    {taggedGroupId === g.id ? (
                      <span className="text-gold-300 text-[11.5px]">✓</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Format a JS Date timezone offset (minutes, sign-flipped per Date API)
 * into "+HH:MM" / "-HH:MM" for storage. Mirrors the helper used by the
 * meetup form so member-meetup posts respect the user's local time.
 */
function formatTzOffset(jsOffsetMinutes: number): string {
  const sign = jsOffsetMinutes > 0 ? "-" : "+";
  const abs = Math.abs(jsOffsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}
