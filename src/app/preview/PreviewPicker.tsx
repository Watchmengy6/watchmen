"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const groups: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "Public",
    items: [
      { href: "/preview/landing", label: "Landing" },
      { href: "/preview/invite-landing", label: "Invite link" },
      { href: "/preview/login", label: "Sign in" },
      { href: "/preview/signup", label: "Request access" },
      { href: "/preview/pending", label: "Pending screen" },
    ],
  },
  {
    title: "Onboarding",
    items: [
      { href: "/preview/welcome", label: "1 · Welcome" },
      { href: "/preview/welcome/photo", label: "2 · Photo" },
      { href: "/preview/welcome/basics", label: "3 · Basics" },
      { href: "/preview/welcome/pay", label: "4 · Pay" },
      { href: "/preview/welcome/permissions", label: "5 · Permissions" },
    ],
  },
  {
    title: "Member",
    items: [
      { href: "/preview/home", label: "Feed (home)" },
      { href: "/preview/events", label: "Events" },
      { href: "/preview/event", label: "Event detail" },
      { href: "/preview/event-chat", label: "Event chat" },
      { href: "/preview/groups", label: "Groups list" },
      { href: "/preview/group", label: "Group detail" },
      { href: "/preview/group-chat", label: "Group chat" },
      { href: "/preview/group-discover", label: "Group (not joined)" },
      { href: "/preview/group-new", label: "Create group" },
      { href: "/preview/meetup", label: "Meetup detail" },
      { href: "/preview/meetup-new", label: "Create meetup" },
      { href: "/preview/dms", label: "DM inbox" },
      { href: "/preview/dm", label: "DM thread" },
      { href: "/preview/chat", label: "Main chat (legacy)" },
      { href: "/preview/members", label: "Members directory" },
      { href: "/preview/member", label: "Member profile" },
      { href: "/preview/profile", label: "Your profile" },
      { href: "/preview/invite", label: "Your invite" },
      { href: "/preview/notifications", label: "Notifications" },
      { href: "/preview/board", label: "Job board" },
      { href: "/preview/settings", label: "Settings" },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/preview/admin", label: "Overview" },
      { href: "/preview/admin-pending", label: "Pending approvals" },
      { href: "/preview/admin-members", label: "Members" },
      { href: "/preview/admin-events", label: "Events" },
      { href: "/preview/admin-leaderboard", label: "Leaderboard" },
    ],
  },
];

export function PreviewPicker() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:block w-64 shrink-0 sticky top-8 self-start">
      <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/70 mb-2">
        The Watchman · Preview
      </div>
      <div className="rounded-2xl bg-ink-800/60 hairline backdrop-blur-sm overflow-hidden">
        {groups.map((g) => (
          <div key={g.title} className="border-b border-white/[0.05] last:border-0">
            <div className="px-3 pt-3 pb-1 text-[10.5px] tracking-[0.2em] uppercase text-ink-400">
              {g.title}
            </div>
            <ul className="pb-2">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={cn(
                      "block px-3 py-1.5 text-[13px] transition-colors",
                      pathname === it.href
                        ? "text-gold-200 bg-gold-500/5"
                        : "text-ink-200 hover:text-white hover:bg-white/[0.04]",
                    )}
                  >
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-ink-400 leading-relaxed">
        Click screens to navigate. The phone on the right is fully scrollable.
        On a real mobile browser, the picker hides and the app goes full-bleed.
      </p>
    </aside>
  );
}
