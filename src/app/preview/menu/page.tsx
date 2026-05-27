import Link from "next/link";

const screens = [
  { href: "/preview/landing", label: "Landing" },
  { href: "/preview/invite-landing", label: "Invite link" },
  { href: "/preview/login", label: "Sign in" },
  { href: "/preview/signup", label: "Request access" },
  { href: "/preview/pending", label: "Pending screen" },
  { href: "/preview/home", label: "Home" },
  { href: "/preview/chat", label: "Main chat" },
  { href: "/preview/events", label: "Events list" },
  { href: "/preview/event", label: "Event detail" },
  { href: "/preview/event-chat", label: "Event chat" },
  { href: "/preview/members", label: "Members" },
  { href: "/preview/member", label: "Member profile" },
  { href: "/preview/profile", label: "Your profile" },
  { href: "/preview/invite", label: "Your invite" },
  { href: "/preview/notifications", label: "Notifications" },
  { href: "/preview/admin", label: "Admin overview" },
  { href: "/preview/admin-pending", label: "Admin · Pending" },
  { href: "/preview/admin-members", label: "Admin · Members" },
  { href: "/preview/admin-events", label: "Admin · Events" },
  { href: "/preview/admin-leaderboard", label: "Admin · Leaderboard" },
];

export default function PreviewMenu() {
  return (
    <div className="min-h-[100dvh] flex flex-col pt-12 px-6 pb-10">
      <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
        The Watchman · Preview
      </div>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        <span className="text-gradient-gold">All Screens</span>
      </h1>
      <p className="mt-2 text-ink-300 text-[14px] leading-relaxed">
        Jump to any screen in the app.
      </p>
      <div className="mt-6 grid gap-2">
        {screens.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-xl bg-ink-800 hairline px-4 py-3 text-white text-[15px] active:bg-ink-700 transition-colors flex items-center justify-between"
          >
            <span>{s.label}</span>
            <span className="text-ink-400 text-sm">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
