"use client";

import { Avatar } from "@/components/ui/Avatar";
import { relativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { toggleReactionAction } from "@/lib/chat/actions";
import { useTransition } from "react";

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

export function MessageBubble({
  message,
  mine,
}: {
  message: MessageRow;
  mine: boolean;
}) {
  const [, start] = useTransition();
  const likeCount = (message.reactions ?? []).filter((r) => r.reaction_type === "like").length;

  const onLike = () => start(() => void toggleReactionAction({ message_id: message.id }));

  return (
    <div className={cn("flex gap-2.5 px-3 py-1.5", mine && "flex-row-reverse")}>
      {!mine ? (
        <div className="pt-0.5">
          <Avatar
            src={message.author?.profile_photo_url ?? null}
            name={message.author?.full_name}
            size={32}
          />
        </div>
      ) : null}
      <div className={cn("max-w-[78%]", mine ? "items-end" : "items-start", "flex flex-col")}>
        {!mine && message.author ? (
          <div className="text-[11px] text-ink-400 mb-0.5 px-1">
            {message.author.full_name}
          </div>
        ) : null}
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-[15px] leading-snug shadow-card",
            mine ? "bg-gradient-to-b from-gold-400 to-gold-500 text-black" : "bg-ink-700 text-white",
          )}
        >
          {message.media_type === "image" && message.media_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.media_url}
              alt=""
              className="rounded-xl mb-1 max-h-72 object-cover"
            />
          ) : null}
          {message.media_type === "video" && message.media_url ? (
            <video
              src={message.media_url}
              controls
              playsInline
              className="rounded-xl mb-1 max-h-72"
            />
          ) : null}
          {message.content ? <div className="whitespace-pre-wrap break-words">{message.content}</div> : null}
        </div>
        <div className={cn("flex items-center gap-2 mt-0.5 px-1", mine && "flex-row-reverse")}>
          <span className="text-[10.5px] text-ink-400">{relativeTime(message.created_at)}</span>
          <button
            onClick={onLike}
            className={cn(
              "text-[11px] inline-flex items-center gap-1 px-2 h-5 rounded-full transition-colors",
              likeCount > 0
                ? "bg-gold-500/15 text-gold-200 ring-1 ring-gold-500/30"
                : "bg-ink-800 hairline text-ink-300 hover:text-ink-100",
            )}
          >
            ♡ {likeCount > 0 ? likeCount : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
