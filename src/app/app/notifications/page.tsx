import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { relativeTime } from "@/lib/utils/date";
import { MarkAllRead } from "./MarkAllRead";

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
    <div className="pt-8 px-5 pb-8">
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
          (items ?? []).map((n) => (
            <Card key={n.id} className={`p-4 ${!n.read ? "ring-1 ring-gold-500/30" : ""}`}>
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
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
