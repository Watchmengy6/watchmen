"use client";

import { cn } from "@/lib/utils/cn";
import { useState } from "react";

/**
 * Visual-only iMessage-style input. Used in /preview/* — no submit handler.
 * For a wired-up version see MessageInput.tsx.
 */
export function IosChatInput({ placeholder = "iMessage" }: { placeholder?: string }) {
  const [text, setText] = useState("");
  const hasText = text.trim().length > 0;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-40 bg-black/95 backdrop-blur-md">
      <div className="flex items-end gap-2 px-3 pt-2.5 pb-2">
        <button
          aria-label="Attach"
          className="shrink-0 h-[34px] w-[34px] rounded-full bg-ink-700/80 hover:bg-ink-600 flex items-center justify-center text-ink-100 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div
            className={cn(
              "flex items-end rounded-[20px] bg-ink-900/80 ring-1 transition-colors",
              "pr-1 pl-3.5 py-1",
              hasText ? "ring-gold-500/40" : "ring-white/10",
            )}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-white placeholder:text-ink-400 text-[15px] resize-none outline-none max-h-32 leading-[1.4] py-[5px]"
            />
            <button
              aria-label={hasText ? "Send" : "Voice"}
              className={cn(
                "shrink-0 h-[26px] w-[26px] rounded-full flex items-center justify-center transition-all self-end mb-[3px] ml-1",
                hasText
                  ? "bg-gradient-to-b from-gold-300 to-gold-500 text-black active:scale-95"
                  : "bg-transparent text-ink-300",
              )}
            >
              {hasText ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                >
                  <path d="M5 12l7-7 7 7M12 5v14" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <rect x="9" y="3" width="6" height="12" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
