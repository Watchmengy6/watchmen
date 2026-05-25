import Link from "next/link";
import { Card } from "@/components/ui/Card";

const actions = [
  { href: "/app/chat", label: "Main Room", sub: "Group chat" },
  { href: "/app/invite", label: "Invite a Brother", sub: "Share your link" },
  { href: "/app/events", label: "Events", sub: "RSVP & check in" },
  { href: "/app/members", label: "Members", sub: "Directory" },
];

export function QuickActions() {
  return (
    <div className="mx-5 grid grid-cols-2 gap-2">
      {actions.map((a) => (
        <Link key={a.href} href={a.href}>
          <Card className="px-4 py-4 h-full active:bg-white/[0.04]">
            <div className="text-white text-[15px] font-semibold">{a.label}</div>
            <div className="text-ink-300 text-xs mt-0.5">{a.sub}</div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
