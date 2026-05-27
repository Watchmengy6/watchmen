import { Card } from "@/components/ui/Card";
import { relativeTime } from "@/lib/utils/date";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockNotifications } from "@/lib/preview/mock";

export default function PreviewNotifications() {
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-24 relative">
      <div className="pt-8 px-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">Activity</div>
            <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Notifications</h1>
          </div>
          <button className="text-[11px] tracking-wider uppercase text-ink-300 px-3 h-8 rounded-full bg-ink-800 hairline">
            Mark all read
          </button>
        </div>
        <div className="space-y-2">
          {mockNotifications.map((n) => (
            <Card key={n.id} className={`p-4 ${!n.read ? "ring-1 ring-gold-500/30" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-white text-sm font-semibold">{n.title}</div>
                  {n.body ? (
                    <div className="text-ink-300 text-sm mt-0.5 leading-snug">{n.body}</div>
                  ) : null}
                </div>
                <div className="text-ink-400 text-xs shrink-0">{relativeTime(n.created_at)}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <PreviewBottomNav />
    </div>
  );
}
