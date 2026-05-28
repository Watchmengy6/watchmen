/**
 * Instant skeleton for /app/home. Next.js renders this immediately when
 * the user taps the Feed tab, then streams the real RSC payload over
 * the top. Without this file the bottom-nav tab tap "locked up" while
 * the server work ran.
 */
export default function HomeLoading() {
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-ink-800 animate-pulse" />
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
                The Watchmen
              </div>
              <div className="text-white text-[18px] font-semibold leading-tight">
                The Feed
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-ink-800 animate-pulse" />
            <div className="h-9 w-9 rounded-full bg-ink-800 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="px-4 pt-3 space-y-3">
        <div className="h-16 rounded-2xl bg-ink-800 animate-pulse" />
        <div className="h-24 rounded-2xl bg-ink-800 animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl bg-ink-800 p-4 space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-ink-700" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-32 rounded bg-ink-700" />
                <div className="h-2.5 w-20 rounded bg-ink-700" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded bg-ink-700" />
              <div className="h-3 w-3/4 rounded bg-ink-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
