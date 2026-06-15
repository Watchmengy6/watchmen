"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

// Tab order per Dustin's spec: Feed → Groups → Events → Chats → Profile.
// "Chats" is the renamed DMs tab; the Master Chat is gone (everything
// broadcast-style moves to the feed).
const tabs = [
  { href: "/app/home", label: "Feed", Icon: HomeIcon },
  { href: "/app/groups", label: "Groups", Icon: GroupsIcon },
  { href: "/app/events", label: "Events", Icon: EventIcon },
  { href: "/app/dms", label: "Chats", Icon: ChatIcon },
  { href: "/app/profile", label: "You", Icon: ProfileIcon },
];

interface BottomNavProps {
  /** Initials or short label for the profile avatar dot. */
  profileLabel?: string;
  /** Optional avatar URL for the profile tab. */
  profileSrc?: string | null;
}

export function BottomNav({ profileLabel = "·", profileSrc = null }: BottomNavProps) {
  const pathname = usePathname() ?? "";
  const [inputFocused, setInputFocused] = useState(false);

  // Hide whenever an input/textarea is focused. More reliable on iOS PWA
  // than visualViewport (which can fire spuriously on rotation/scroll).
  useEffect(() => {
    if (typeof document === "undefined") return;
    // Helper: is this element a TEXT input that brings up the iOS keyboard?
    // File / button / submit / checkbox / radio / range etc do NOT bring up
    // a keyboard and shouldn't hide the nav. The old check fired on every
    // <input>, which meant tapping "Add photo" (a hidden <input type=file>)
    // immediately hid the nav AND failed to restore it cleanly when the
    // iOS photo picker dismissed — that read as "bottom bar gets messed up
    // when I upload a photo."
    const KEYBOARD_INPUT_TYPES = new Set([
      "text",
      "search",
      "url",
      "tel",
      "email",
      "password",
      "number",
      "date",
      "datetime-local",
      "month",
      "time",
      "week",
    ]);
    function isKeyboardInput(el: HTMLElement | null): boolean {
      if (!el) return false;
      if (el.tagName === "TEXTAREA") return true;
      if (el.isContentEditable) return true;
      if (el.tagName === "INPUT") {
        const t = (el as HTMLInputElement).type || "text";
        return KEYBOARD_INPUT_TYPES.has(t);
      }
      return false;
    }

    function onFocusIn(e: FocusEvent) {
      if (isKeyboardInput(e.target as HTMLElement | null)) {
        setInputFocused(true);
      }
    }
    function onFocusOut() {
      // Delay slightly — some pickers blur briefly between widgets.
      setTimeout(() => {
        const ae = document.activeElement as HTMLElement | null;
        setInputFocused(isKeyboardInput(ae));
      }, 0);
    }
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // Hide on full-screen chat thread pages so the message input isn't covered.
  const HIDE_ON = [
    /^\/app\/dms\/[^/]+$/,
    /^\/app\/groups\/[^/]+\/chat$/,
    /^\/app\/events\/[^/]+\/chat$/,
  ];
  if (pathname && HIDE_ON.some((re) => re.test(pathname))) return null;
  if (inputFocused) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-ink-900/70 backdrop-blur-xl border-t border-white/[0.05]"
      // max(env(...), 20px) guarantees ≥20px of home-indicator clearance
      // even when env() resolves to 0 — which it does in Capacitor
      // WKWebView after iOS reflow events (file picker dismissal,
      // orientation change, etc). The old `env(..., 20px)` CSS-fallback
      // syntax only triggers when env() is unsupported, NOT when env()
      // returns 0, so the nav drifted into the home-indicator pill.
      // +0.375rem on top so labels stay clear of the indicator.
      style={{
        paddingBottom:
          "calc(max(env(safe-area-inset-bottom), 20px) + 0.375rem)",
      }}
    >
      <div className="grid grid-cols-5 pt-1.5">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex flex-col items-center justify-center gap-[3px] py-1 transition-opacity active:opacity-60",
                active ? "text-white" : "text-ink-200",
              )}
            >
              <Icon
                active={active}
                className="h-[22px] w-[22px]"
                profileLabel={profileLabel}
                profileSrc={profileSrc}
              />
              <span
                className={cn(
                  "text-[9.5px] tracking-wide leading-none",
                  active ? "font-semibold text-white" : "font-medium text-ink-300",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

interface IconProps {
  active?: boolean;
  className?: string;
  profileLabel?: string;
  profileSrc?: string | null;
}

function HomeIcon({ active, className }: IconProps) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3 11.4 12 4l9 7.4V20a1 1 0 0 1-1 1h-4.5v-6.2a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1V21H4a1 1 0 0 1-1-1Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 11.4 12 4l9 7.4V20a1 1 0 0 1-1 1h-4.5v-6.2a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1V21H4a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

function ChatIcon({ active, className }: IconProps) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3c5.5 0 10 3.6 10 8 0 4.5-4.5 8.1-10 8.1-1.2 0-2.3-.15-3.4-.45L3.5 21l1.45-4.55C3.7 15.05 3 13.6 3 12c0-4.4 4.5-9 9-9Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12c0 4.2-4 7.5-9 7.5-1.4 0-2.7-.25-3.85-.7L3 21l1.55-4.4C3.6 15.4 3 13.75 3 12 3 7.85 7 4.5 12 4.5s9 3.35 9 7.5Z" />
    </svg>
  );
}

function EventIcon({ active, className }: IconProps) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm13 8H4v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}

function GroupsIcon({ active, className }: IconProps) {
  return MembersIcon({ active, className });
}

function DmIcon({ active, className }: IconProps) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22 2 11 13 2 9l20-7Zm-7 13-4 7-4-9 8 2Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </svg>
  );
}

function MembersIcon({ active, className }: IconProps) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="9" cy="8.5" r="3.5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M2.5 19c.6-3.5 3.3-5.4 6.5-5.4S15 15.5 15.5 19a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1Z" />
      <path d="M16 13.5c2 .2 3.5 1.4 4 4a1 1 0 0 1-1 1.1h-2.6c-.2-1.7-.8-3.5-2.2-4.7.6-.3 1.2-.4 1.8-.4Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3 20c.5-3.2 3-5 6-5s5.5 1.8 6 5" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M21 17c-.4-2-1.8-3-3.5-3.2" />
    </svg>
  );
}

function ProfileIcon({ active, profileLabel = "·", profileSrc, className }: IconProps) {
  return (
    <div
      className={cn(
        "rounded-full border-[1.8px] flex items-center justify-center overflow-hidden",
        active ? "border-white" : "border-ink-200",
        className,
      )}
    >
      {profileSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profileSrc} alt="" className="h-full w-full object-cover rounded-full" />
      ) : (
        <div className="h-[16px] w-[16px] rounded-full bg-gradient-to-br from-ink-500 to-ink-700 flex items-center justify-center text-[8.5px] font-semibold text-ink-100">
          {profileLabel}
        </div>
      )}
    </div>
  );
}
