"use client";

import Link from "next/link";
import { Fragment } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { toggleReactionAction } from "@/lib/chat/actions";
import { useTransition } from "react";

/**
 * Render a chat message body, converting any /app/meetups/<id>,
 * /app/events/<id>, /app/groups/<id>, /app/members/<id> path into a
 * clickable pill so we don't show raw UUIDs to the room. Also strips
 * the redundant "RSVP:" / "Tap to RSVP:" prefix that precedes those
 * links in our auto-broadcasts.
 */
function renderContent(content: string, mine: boolean) {
  const lineEls: React.ReactNode[] = [];
  const urlPattern = /\/app\/(meetups|events|groups|members)\/[\w-]+/g;
  const labelFor = (kind: string) =>
    kind === "meetups"
      ? "View meetup"
      : kind === "events"
        ? "View event"
        : kind === "groups"
          ? "View group"
          : "View profile";

  content.split("\n").forEach((line, lineIdx) => {
    // Pull off a leading "RSVP:" or "Tap to RSVP:" label so the chat
    // bubble doesn't show two prompts back-to-back.
    const stripped = line.replace(/^\s*(RSVP|Tap to RSVP|Tap)\s*:\s*/i, "");
    const parts: React.ReactNode[] = [];
    let lastIdx = 0;
    let matchIdx = 0;
    for (const match of stripped.matchAll(urlPattern)) {
      const start = match.index ?? 0;
      if (start > lastIdx) parts.push(stripped.slice(lastIdx, start));
      const url = match[0];
      const kind = match[1];
      parts.push(
        <Link
          key={`${lineIdx}-${matchIdx}`}
          href={url}
          className={cn(
            "inline-block align-middle ml-1 px-2.5 h-6 leading-6 rounded-full text-[12px] font-semibold transition-colors",
            mine
              ? "bg-black/15 text-black hover:bg-black/25"
              : "bg-gold-500/15 text-gold-200 hover:bg-gold-500/25",
          )}
        >
          {labelFor(kind)} →
        </Link>,
      );
      lastIdx = start + url.length;
      matchIdx += 1;
    }
    if (lastIdx < stripped.length) parts.push(stripped.slice(lastIdx));
    lineEls.push(
      <Fragment key={lineIdx}>
        {parts.length > 0 ? parts : stripped}
        {lineIdx < content.split("\n").length - 1 ? <br /> : null}
      </Fragment>,
    );
  });

  return lineEls;
}

export type GroupPosition = "first" | "middle" | "last" | "only";

export interface MessageRow {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: "none" | "image" | "video";
  created_at: string;
  author?: {
    full_name: string;
    profile_photo_url: string | null;
  };
  reactions?: { reaction_type: string; user_id: string }[];
}

interface Props {
  message: MessageRow;
  mine: boolean;
  /** Viewer's profile id — used to detect whether *I* reacted, not the author. */
  myProfileId?: string;
  groupPosition?: GroupPosition;
  showName?: boolean;
}

/**
 * iMessage-style bubble:
 * - Single message: all corners ~20px
 * - First in group: tail-side bottom corner tightened to ~6px
 * - Middle: tail-side top and bottom corners tightened
 * - Last: tail-side top corner tightened (the visual "tail" of the stack)
 */
function bubbleRadius(mine: boolean, pos: GroupPosition) {
  if (mine) {
    if (pos === "first") return "rounded-[20px] rounded-br-[6px]";
    if (pos === "middle") return "rounded-[20px] rounded-tr-[6px] rounded-br-[6px]";
    if (pos === "last") return "rounded-[20px] rounded-tr-[6px]";
    return "rounded-[20px]";
  }
  if (pos === "first") return "rounded-[20px] rounded-bl-[6px]";
  if (pos === "middle") return "rounded-[20px] rounded-tl-[6px] rounded-bl-[6px]";
  if (pos === "last") return "rounded-[20px] rounded-tl-[6px]";
  return "rounded-[20px]";
}

export function MessageBubble({
  message,
  mine,
  myProfileId,
  groupPosition = "only",
  showName = false,
}: Props) {
  const [, start] = useTransition();
  const showAvatar = !mine && (groupPosition === "only" || groupPosition === "last");
  const tightSpacing = groupPosition === "first" || groupPosition === "middle";

  const likeReactions = (message.reactions ?? []).filter((r) => r.reaction_type === "like");
  // "Liked by me" — compare each like's user_id to the *viewer*, not the
  // message author (the old check made every authored message look liked).
  const reactedByMe = myProfileId
    ? likeReactions.some((r) => r.user_id === myProfileId)
    : false;

  const onLike = () => start(() => void toggleReactionAction({ message_id: message.id }));

  return (
    <div
      className={cn(
        "flex gap-2 px-3",
        mine && "flex-row-reverse",
        tightSpacing ? "mt-[2px]" : "mt-1.5",
      )}
    >
      {!mine ? (
        <div className="w-7 shrink-0 flex items-end">
          {showAvatar ? (
            <Avatar
              src={message.author?.profile_photo_url ?? null}
              name={message.author?.full_name}
              size={28}
            />
          ) : null}
        </div>
      ) : null}

      <div className={cn("max-w-[76%] flex flex-col", mine ? "items-end" : "items-start")}>
        {showName && !mine && message.author ? (
          <div className="text-[11px] text-ink-400 mb-1 ml-3">
            {message.author.full_name}
          </div>
        ) : null}

        <button
          onDoubleClick={onLike}
          className={cn("relative group/bubble text-left", mine ? "ml-auto" : "mr-auto")}
        >
          <div
            className={cn(
              "px-3 py-2 text-[15px] leading-[1.25] shadow-sm",
              bubbleRadius(mine, groupPosition),
              mine
                ? "bg-gradient-to-b from-gold-300 to-gold-500 text-black"
                : "bg-ink-700 text-white",
            )}
          >
            {message.media_type === "image" && message.media_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.media_url}
                alt=""
                className="rounded-2xl mb-1 max-h-72 object-cover"
              />
            ) : null}
            {message.media_type === "video" && message.media_url ? (
              <video
                src={message.media_url}
                controls
                playsInline
                className="rounded-2xl mb-1 max-h-72"
              />
            ) : null}
            {message.content ? (
              <div className="whitespace-pre-wrap break-words">
                {renderContent(message.content, mine)}
              </div>
            ) : null}
          </div>

          {likeReactions.length > 0 ? (
            <div
              className={cn(
                "absolute -top-3 z-10 inline-flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-ink-800 ring-1 ring-white/[0.08] shadow-sm",
                mine ? "-left-2" : "-right-2",
                reactedByMe ? "ring-gold-500/40" : "",
              )}
            >
              <span className="text-[11px] text-pink-400">♥</span>
              {likeReactions.length > 1 ? (
                <span className="text-[10px] text-ink-100 tabular-nums">
                  {likeReactions.length}
                </span>
              ) : null}
            </div>
          ) : null}
        </button>
      </div>
    </div>
  );
}
