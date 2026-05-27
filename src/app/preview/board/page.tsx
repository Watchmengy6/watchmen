import Link from "next/link";
import { FeedPost } from "@/components/feed/FeedPost";
import { Card, CardBody } from "@/components/ui/Card";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockFeed } from "@/lib/preview/mock";

export default function PreviewBoard() {
  const items = mockFeed.filter((p) => p.type === "job" || p.type === "need");

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/preview/home" className="text-ink-200 text-sm">‹</Link>
          <div className="text-white text-[15px] font-semibold">Job Board</div>
          <Link
            href="/preview/home"
            className="h-8 px-3 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[12px] font-semibold inline-flex items-center gap-1"
          >
            Post
          </Link>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        <Card>
          <CardBody>
            <div className="text-[10.5px] tracking-[0.25em] uppercase text-gold-300/80 mb-1">
              Roles · Asks · Needs
            </div>
            <p className="text-ink-200 text-[13.5px] leading-relaxed">
              When brothers post something they&apos;re hiring for or need help
              with, it shows up here too. Tap a post to message them directly.
            </p>
          </CardBody>
        </Card>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {["All", "Hiring", "Needs", "Recommendations"].map((p, i) => (
            <button
              key={p}
              className={
                i === 0
                  ? "shrink-0 h-8 px-3.5 rounded-full text-[12px] bg-white text-black font-semibold"
                  : "shrink-0 h-8 px-3.5 rounded-full text-[12px] bg-ink-800 text-ink-200 hairline"
              }
            >
              {p}
            </button>
          ))}
        </div>

        {items.map((p) => (
          <FeedPost key={p.id} post={p} />
        ))}
      </div>
      <PreviewBottomNav />
    </div>
  );
}
