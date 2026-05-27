"use client";

import { useState, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { mockGroups, mockMembers } from "@/lib/preview/mock";

const types = [
  { id: "post", label: "Post" },
  { id: "job", label: "Hiring" },
  { id: "need", label: "Need" },
] as const;

export function FeedComposer({ meName }: { meName: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof types)[number]["id"]>("post");
  const [text, setText] = useState("");
  const [taggedGroupId, setTaggedGroupId] = useState<string | null>(null);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const joinedGroups = mockGroups.filter((g) => g.joined);
  const taggedGroup = taggedGroupId
    ? mockGroups.find((g) => g.id === taggedGroupId)
    : null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // @ mention picker: opens when user types "@" and shows live-filtered members
  const mentionQuery = (() => {
    const m = text.match(/@(\w*)$/);
    return m ? m[1] : null;
  })();
  const mentionMatches =
    mentionQuery !== null
      ? mockMembers
          .filter((u) =>
            u.username?.toLowerCase().startsWith(mentionQuery.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  function insertMention(username: string) {
    const newText = text.replace(/@(\w*)$/, `@${username} `);
    setText(newText);
    textareaRef.current?.focus();
  }

  return (
    <div className="rounded-2xl bg-ink-800/80 hairline p-3">
      <div className="flex items-center gap-3">
        <Avatar name={meName} size={36} />
        <button
          onClick={() => setOpen(true)}
          className="flex-1 h-10 rounded-full bg-ink-900/60 hairline px-4 text-left text-ink-400 text-[14px]"
        >
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
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={
              type === "job"
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
                {taggedGroup.emoji}
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

          <div className="flex items-center gap-2 mt-2">
            <button
              aria-label="Add photo"
              className="h-9 w-9 rounded-full bg-ink-900/60 hairline flex items-center justify-center text-ink-200"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                   strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="9" cy="11" r="2" />
                <path d="m21 17-5-5-9 9" />
              </svg>
            </button>
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
            <div className="flex-1" />
            <button
              onClick={() => {
                setOpen(false);
                setText("");
                setTaggedGroupId(null);
                setGroupPickerOpen(false);
              }}
              className="h-9 px-3 rounded-full text-[13px] text-ink-200"
            >
              Cancel
            </button>
            <button
              disabled={!text.trim()}
              className="h-9 px-4 rounded-full text-[13px] font-semibold bg-gradient-to-b from-gold-300 to-gold-500 text-black disabled:opacity-40"
            >
              Post
            </button>
          </div>

          {/* Group picker dropdown */}
          {groupPickerOpen ? (
            <div className="mt-2 rounded-xl bg-ink-900/80 hairline overflow-hidden">
              <div className="px-3 py-2 text-[10.5px] tracking-[0.25em] uppercase text-ink-400">
                Tag one of your groups
              </div>
              <div className="max-h-48 overflow-y-auto">
                {joinedGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setTaggedGroupId(g.id);
                      setGroupPickerOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] text-left"
                  >
                    <span className="h-7 w-7 rounded-full bg-ink-800 flex items-center justify-center text-[15px]">
                      {g.emoji}
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
