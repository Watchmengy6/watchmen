"use client";

import { useState } from "react";
import { WelcomeFrame } from "@/components/welcome/WelcomeFrame";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

export default function WelcomePhoto() {
  const [uploaded, setUploaded] = useState(false);

  return (
    <WelcomeFrame
      step={2}
      totalSteps={5}
      back="/preview/welcome"
      skip="/preview/welcome/basics"
      title="Put a face to the name"
      subtitle="Brothers know who they're talking to. A clean headshot beats a logo every time."
      next={{
        href: "/preview/welcome/basics",
        label: uploaded ? "Continue" : "Add later",
        variant: uploaded ? "gold" : "outline",
      }}
    >
      <div className="flex flex-col items-center pt-4">
        <div className="relative">
          <div
            className={cn(
              "rounded-full transition-all",
              uploaded ? "ring-2 ring-gold-400" : "",
            )}
          >
            <Avatar
              name="Aaron Pilkington"
              size={140}
              ring={uploaded}
            />
          </div>
          {uploaded ? (
            <button
              onClick={() => setUploaded(false)}
              className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-red-500/90 text-white ring-4 ring-ink-900 flex items-center justify-center"
              aria-label="Remove"
            >
              ×
            </button>
          ) : null}
        </div>

        <label
          className={cn(
            "mt-8 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full cursor-pointer transition-colors",
            uploaded
              ? "bg-ink-800 hairline text-white"
              : "bg-gradient-to-b from-gold-300 to-gold-500 text-black font-semibold",
          )}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={() => setUploaded(true)}
          />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
               strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <path d="M17 8l-5-5-5 5" />
            <path d="M12 3v12" />
          </svg>
          {uploaded ? "Change photo" : "Upload from camera roll"}
        </label>

        <div className="mt-3 text-[12px] text-ink-400">
          JPG or PNG · square works best
        </div>
      </div>
    </WelcomeFrame>
  );
}
