import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { relativeTime } from "@/lib/utils/date";
import { MarkAllRead } from "./MarkAllRead";

/** Map a notification's related entity to the right in-app screen. */
function hrefForNotification(n: any): string | null {
  const t = n.related_entity_type as string | null;
  const id = n.related_entity_id as string | null;
  if (!t || !id) return null;
  switch (t) {
    case "event":
      return `/app/events/${id}`;
    case "meetup":
      return `/app/meetups/${id}`;
    case "post":
    case "comment":
      return `/app/home`;
    case "profile":
    case "user":
      return `/app/members/${id}`;
    case "thread":
    case "dm":
      return `/app/dms/${id}`;
    case "group":
      return `/app/groups/${id}`;
    default:
      return null;
  }
}

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  const { data: items } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    // Safe-area top padding — without it the ACTIVITY label rendered
    // underneath the iPhone status bar clock (Aaron, July 2026).
    <div
      className="px-5 pb-8"
      style={{ paddingTop: "max(2rem, calc(env(safe-area-inset-top) + 0.75rem))" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">Activity</div>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Notifications</h1>
        </div>
        <MarkAllRead />
      </div>
      <div className="space-y-2">
        {(items ?? []).length === 0 ? (
          <EmptyState title="All quiet" body="You'll see RSVPs, polls, and approvals here." />
        ) : (
          (items ?? []).map((n) => {
            const href = hrefForNotification(n);
            const inner = (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-white text-sm font-semibold">{n.title}</div>
                  {n.body ? (
                    <div className="text-ink-300 text-sm mt-0.5 leading-snug">{n.body}</div>
                  ) : null}
                </div>
                <div className="text-ink-400 text-xs shrink-0">
                  {relativeTime(n.created_at)}
                </div>
              </div>
            );
            if (href) {
              return (
                <Link key={n.id} href={href} className="block">
                  <Card className={`p-4 active:bg-ink-700/50 transition-colors ${!n.read ? "ring-1 ring-gold-500/30" : ""}`}>
                    {inner}
                  </Card>
                </Link>
              );
            }
            return (
              <Card key={n.id} className={`p-4 ${!n.read ? "ring-1 ring-gold-500/30" : ""}`}>
                {inner}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
