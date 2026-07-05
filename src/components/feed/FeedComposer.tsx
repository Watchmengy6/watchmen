"use client";

import { useEffect, useState, useRef, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { uploadMedia } from "@/lib/uploads/client";
import { listMentionableMembers, proofreadTextAction } from "@/lib/feed/actions";

// Meetup composer type removed per Dustin — informal coordination
// happens via plain posts now, not a dedicated meetup type. The
// schema columns (meetup_when_at / meetup_location) and the
// MemberMeetupCard renderer stay in place so we can flip it back on
// without a migration if Dustin reverses again.
const types = [
  { id: "post", label: "Post" },
  { id: "poll", label: "Poll" },
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
  const [polishing, setPolishing] = useState(false);
  // Member-meetup fields (only used when type === "meetup")
  const [meetupWhen, setMeetupWhen] = useState("");
  const [meetupWhere, setMeetupWhere] = useState("");
  // Poll fields (only used when type === "poll"). Start with 2 empty
  // options — members can add up to 4 total via the + button below.
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  // router.refresh() was removed in Phase 3 of the optimistic-prepend
  // refactor. The caller's `onSubmit` is now responsible for updating
  // whatever feed state is visible to the user (e.g. HomeFeedComposer
  // prepends the new post via useFeedState().prependPost). Keeping the
  // router.refresh() here would defeat the purpose by triggering the
  // very full-route refetch we're trying to avoid.
  const taggedGroup = taggedGroupId
    ? taggableGroups.find((g) => g.id === taggedGroupId)
    : null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // @ mention picker state. `mentionQuery` is the text typed after the "@"
  // immediately before the CARET (null = no active @ token). We compute it
  // from the caret position rather than the end of the whole textarea, so the
  // picker also works when an @mention is inserted in the middle of an
  // already-typed post — not just at the very end.
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  function syncMentionQuery(value: string, caret: number) {
    const upto = value.slice(0, Math.max(0, caret));
    const m = upto.match(/@([\w-]*)$/);
    setMentionQuery(m ? m[1] : null);
  }

  // Load the mentionable members ONCE when the composer opens, then filter
  // client-side. Doing a server round-trip per keystroke made the picker take
  // several seconds to appear; this is a single load so filtering is instant.
  // A caller may still pass a static `mentionablePeople` list (preview tree).
  const [loadedPeople, setLoadedPeople] = useState<MentionablePerson[]>([]);
  const [peopleLoaded, setPeopleLoaded] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (mentionablePeople.length > 0) return; // static list provided
    if (peopleLoaded) return; // already loaded this mount
    let cancelled = false;
    (async () => {
      const rows = await listMentionableMembers();
      if (!cancelled) {
        setLoadedPeople(rows);
        setPeopleLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mentionablePeople.length, peopleLoaded]);

  const allMentionable =
    mentionablePeople.length > 0 ? mentionablePeople : loadedPeople;

  const mentionMatches =
    mentionQuery === null
      ? []
      : (() => {
          const q = mentionQuery.toLowerCase();
          return allMentionable
            .filter((u) => {
              if (q === "") return true; // just "@" — show suggestions
              return (
                u.username?.toLowerCase().includes(q) ||
                u.full_name?.toLowerCase().includes(q)
              );
            })
            .slice(0, 6);
        })();

  function insertMention(username: string) {
    const ta = textareaRef.current;
    const caret = ta?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([\w-]*)$/, `@${username} `);
    const after = text.slice(caret);
    const newText = before + after;
    setText(newText);
    setMentionQuery(null);
    const newCaret = before.length;
    // Restore focus + place the caret right after the inserted handle.
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(newCaret, newCaret);
    });
  }

  function reset() {
    setOpen(false);
    setText("");
    setMentionQuery(null);
    setTaggedGroupId(null);
    setGroupPickerOpen(false);
    setErr(null);
    setMediaUrl(null);
    setMediaType(null);
    setMeetupWhen("");
    setMeetupWhere("");
    setPollQuestion("");
    setPollOptions(["", ""]);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErr(null);
    // Feed photos upload at their natural aspect ratio (no square crop) so
    // flyers/graphics with text aren't cut off — the feed renders them with
    // h-auto. (uploadMedia still downscales/compresses; it just doesn't crop.)
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

  async function handlePolish() {
    if (polishing || !text.trim()) return;
    setPolishing(true);
    setErr(null);
    const r = await proofreadTextAction(text);
    setPolishing(false);
    if ("error" in r && r.error) {
      setErr(r.error);
      return;
    }
    if (r.text) setText(r.text);
  }

  function handlePost() {
    // Polls don't require body text — the question itself is the post.
    // Everything else requires at least some text.
    const requiresBody = type !== "poll";
    if (requiresBody && !text.trim()) return;
    if (pending) return;
    // Polls need a question + at least two non-empty options.
    let cleanedPollOptions: string[] = [];
    if (type === "poll") {
      if (!pollQuestion.trim()) {
        setErr("Polls need a question.");
        return;
      }
      cleanedPollOptions = pollOptions
        .map((o) => o.trim())
        .filter((o) => o.length > 0);
      if (cleanedPollOptions.length < 2) {
        setErr("Polls need at least two options.");
        return;
      }
    }
    if (!onSubmit) {
      // No server action wired — just reset (preview mode).
      reset();
      return;
    }
    const fd = new FormData();
    fd.set("kind", type);
    // For polls we store the question as the body so the post still
    // has searchable text and the existing rendering paths keep working.
    fd.set("body", type === "poll" ? pollQuestion.trim() : text.trim());
    fd.set("tagged_group_id", taggedGroupId ?? "");
    fd.set("media_url", mediaUrl ?? "");
    fd.set("media_type", mediaType ?? "none");
    if (type === "poll") {
      fd.set("poll_question", pollQuestion.trim());
      // FormData supports multiple values for the same key; the server
      // action reads them back with formData.getAll("poll_option").
      cleanedPollOptions.forEach((o) => fd.append("poll_option", o));
    }
    startTransition(async () => {
      const result = await onSubmit(fd);
      if (result && "error" in result && result.error) {
        setErr(result.error);
        return;
      }
      // Phase 3: composer just resets itself on success. The caller's
      // onSubmit handler is responsible for whatever happens to the
      // feed list — typically an optimistic prepend via the
      // FeedStateProvider on /app/home.
      reset();
    });
  }

  return (
    <div className="rounded-2xl bg-ink-800/80 hairline p-3">
      <div className="flex items-center gap-3">
        <Avatar name={meName} src={meAvatarUrl ?? undefined} size={40} />
        {/* Big, bright "Share something" button — Dustin asked for it to
            pop more so members actually post. Solid gold gradient, dark
            text, taller, with a glow ring on hover/focus. */}
        <button
          onClick={() => setOpen(true)}
          className="group/share flex-1 h-13 min-h-[52px] rounded-full bg-gradient-to-b from-gold-300 to-gold-500 px-5 text-left text-black text-[15.5px] font-semibold flex items-center gap-2 shadow-[0_0_22px_-6px_rgba(212,175,55,0.55),inset_0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-gold-300/60 active:scale-[0.99] transition-transform"
          aria-label="Share something with the room"
        >
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-black/15 text-black text-lg leading-none">
            ＋
          </span>
          <span className="flex-1">Share something…</span>
          <span className="text-black/70 text-[18px] leading-none">›</span>
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
          {/* Poll-only fields: question + 2–4 options. Question goes
              in place of the body, so we hide the textarea below. */}
          {type === "poll" ? (
            <div className="mb-2 space-y-2">
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-1">
                  Question
                </div>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="What does the room think?"
                  maxLength={200}
                  className="w-full h-10 rounded-xl bg-ink-900/60 hairline px-3 text-[13.5px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30"
                />
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-1">
                  Options
                </div>
                <div className="space-y-1.5">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...pollOptions];
                          next[idx] = e.target.value;
                          setPollOptions(next);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        maxLength={80}
                        className="flex-1 h-10 rounded-xl bg-ink-900/60 hairline px-3 text-[13.5px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30"
                      />
                      {pollOptions.length > 2 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPollOptions((prev) =>
                              prev.filter((_, i) => i !== idx),
                            )
                          }
                          className="h-10 w-10 rounded-xl bg-ink-900/60 hairline text-ink-300 text-base"
                          aria-label="Remove option"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
                {pollOptions.length < 4 ? (
                  <button
                    type="button"
                    onClick={() => setPollOptions((prev) => [...prev, ""])}
                    className="mt-2 h-8 px-3 rounded-full bg-ink-900/60 hairline text-ink-200 text-[12px]"
                  >
                    ＋ Add option
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Body textarea — hidden for polls because the question
              already IS the body. */}
          {type !== "poll" ? (
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                syncMentionQuery(
                  e.target.value,
                  e.target.selectionStart ?? e.target.value.length,
                );
              }}
              onSelect={(e) => {
                const t = e.currentTarget;
                syncMentionQuery(t.value, t.selectionStart ?? t.value.length);
              }}
              rows={3}
              spellCheck
              autoCapitalize="sentences"
              autoCorrect="on"
              placeholder={
                type === "job"
                  ? "Describe the role, location, and how to reach you. Tag with @"
                  : type === "need"
                    ? "What do you need? Tag a brother with @"
                    : "What's on your mind? Tag with @"
              }
              className="w-full rounded-xl bg-ink-900/60 hairline px-3 py-2.5 text-[15px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30 resize-none"
            />
          ) : null}

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

          {/* Media preview — wrapper has overflow-hidden so a portrait
              photo or oversized HEIC from the camera can never push the
              composer card past viewport width and let the whole page
              rubber-band sideways after upload. block + max-w-full on
              the media elements themselves are belt+suspenders. */}
          {mediaUrl ? (
            <div className="mt-2 relative overflow-hidden rounded-xl">
              {mediaType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl}
                  alt=""
                  className="block w-full max-w-full max-h-72 rounded-xl object-contain"
                />
              ) : (
                <video
                  src={mediaUrl}
                  className="block w-full max-w-full max-h-72 rounded-xl object-contain bg-black"
                  controls
                  playsInline
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
            {/* AI proofread — only shown when NEXT_PUBLIC_AI_PROOFREAD="1"
                (and OPENAI_API_KEY is set server-side). Non-poll only. */}
            {type !== "poll" &&
            process.env.NEXT_PUBLIC_AI_PROOFREAD === "1" ? (
              <button
                type="button"
                onClick={handlePolish}
                disabled={polishing || !text.trim()}
                className="h-9 px-3 rounded-full bg-ink-900/60 hairline text-ink-200 text-[12px] font-medium inline-flex items-center gap-1.5 disabled:opacity-40"
                aria-label="Proofread with AI"
              >
                {polishing ? "Polishing…" : "✨ Polish"}
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
              // `uploading` in the guard: posting while a photo upload
              // was still in flight submitted with media_url=null and
              // silently DROPPED the photo (final pre-launch audit,
              // July 2026 — guaranteed to happen on event-night cell data).
              disabled={
                pending ||
                uploading ||
                (type === "poll"
                  ? !pollQuestion.trim() ||
                    pollOptions.filter((o) => o.trim()).length < 2
                  : !text.trim())
              }
              className="h-9 px-4 rounded-full text-[13px] font-semibold bg-gradient-to-b from-gold-300 to-gold-500 text-black disabled:opacity-40"
            >
              {pending ? "Posting…" : uploading ? "Uploading…" : "Post"}
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
