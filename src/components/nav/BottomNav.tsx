"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const tabs = [
  { href: "/app/home", label: "Home", icon: HomeIcon },
  { href: "/app/chat", label: "Chat", icon: ChatIcon },
  { href: "/app/events", label: "Events", icon: EventIcon },
  { href: "/app/members", label: "Members", icon: MembersIcon },
  { href: "/app/profile", label: "Profile", icon: ProfileIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/[0.06]"
      style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-screen-sm grid grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center py-2 gap-0.5 transition-colors",
                active ? "text-gold-300" : "text-ink-300 hover:text-ink-100",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10.5px] tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ---- inline icons (24x24 stroke=1.6) ----
function HomeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function ChatIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 12c0 4-4 7-9 7-1.6 0-3-.3-4.2-.8L3 20l1.2-3.6C3.4 15.2 3 13.7 3 12c0-4 4-7 9-7s9 3 9 7Z" />
    </svg>
  );
}
function EventIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}
function MembersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="9" r="3.2" />
      <path d="M3 20c.5-3.2 3-5 6-5s5.5 1.8 6 5" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M21 17c-.4-2-1.8-3-3.5-3.2" />
    </svg>
  );
}
function ProfileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
         strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M4 20c1-3.5 4.5-5.5 8-5.5s7 2 8 5.5" />
    </svg>
  );
}
