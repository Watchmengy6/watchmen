"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { href: "/preview/home", label: "Feed", Icon: FeedIcon },
  { href: "/preview/chat", label: "Chat", Icon: ChatIcon },
  { href: "/preview/dms", label: "DMs", Icon: DmIcon },
  { href: "/preview/events", label: "Events", Icon: EventIcon },
  { href: "/preview/groups", label: "Groups", Icon: GroupsIcon },
  { href: "/preview/profile", label: "You", Icon: ProfileIcon },
];

export function PreviewBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-ink-900/70 backdrop-blur-xl border-t border-white/[0.05]"
      style={{ paddingBottom: "max(0.375rem, env(safe-area-inset-bottom))" }}
    >
      <div className="grid grid-cols-6 pt-1.5">
        {tabs.map(({ href, label, Icon }) => {
          // For DM tab match /preview/dm and /preview/dms
          const active =
            pathname === href ||
            (href === "/preview/dms" && pathname.startsWith("/preview/dm"));
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
              <Icon active={active} className="h-[22px] w-[22px]" />
              <span
                className={cn(
                  "text-[10px] tracking-wide leading-none",
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
}

function FeedIcon({ active, className }: IconProps) {
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

function DmIcon({ active, className }: IconProps) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M21.3 2.7c.4-.4.4-1 0-1.4-.4-.4-1-.4-1.4 0L9.6 9.6 3 8.4c-.7-.1-1.2.8-.6 1.2l5.6 4.2 1.2 5.6c.1.6 1 .7 1.3.1l2.6-5 8-8c.4-.4.4-1 0-1.4l-1.6-1.6 1.8-1.8Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
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

function MeetupIcon({ active, className }: IconProps) {
  return active ? (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 12 7.4 12.3a1 1 0 0 0 1.2 0C13 22 20 15.4 20 10a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 10c0 5.4-7.6 12-7.6 12S4.8 15.4 4.8 10a7.2 7.2 0 0 1 14.4 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ProfileIcon({ active, className }: IconProps) {
  return (
    <div
      className={cn(
        "rounded-full border-[1.6px] flex items-center justify-center",
        active ? "border-white" : "border-ink-200",
        className,
      )}
    >
      <div className="h-[14px] w-[14px] rounded-full bg-gradient-to-br from-ink-500 to-ink-700 flex items-center justify-center text-[8px] font-semibold text-ink-100">
        AP
      </div>
    </div>
  );
}
