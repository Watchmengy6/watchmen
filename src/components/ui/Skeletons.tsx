/**
 * Shared loading skeletons used by route-level loading.tsx files so a tap
 * never shows a blank screen while the server renders. Dark, pulse-animated
 * placeholders that roughly match each surface's shape.
 */

/** Generic list surface — a header plus stacked rows (notifications, etc.). */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="px-5"
        style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}
      >
        <div className="h-2.5 w-24 rounded bg-ink-800 animate-pulse" />
        <div className="mt-3 h-7 w-44 rounded bg-ink-800 animate-pulse" />
      </div>
      <div className="px-5 mt-5 space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl bg-ink-800 p-3.5 animate-pulse"
          >
            <div className="h-10 w-10 rounded-full bg-ink-700" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-ink-700" />
              <div className="h-2.5 w-1/3 rounded bg-ink-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Detail surface — hero card plus body lines (event/group/member detail). */
export function DetailSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div className="h-52 w-full bg-ink-800 animate-pulse" />
      <div className="px-5 -mt-8 space-y-4">
        <div className="rounded-2xl bg-ink-800 p-4 space-y-3 animate-pulse">
          <div className="h-5 w-2/3 rounded bg-ink-700" />
          <div className="h-3 w-1/2 rounded bg-ink-700" />
          <div className="h-3 w-1/3 rounded bg-ink-700" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-ink-800 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-ink-800 animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-ink-800 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** Full-screen chat thread — header, alternating bubbles, input bar. */
export function ChatSkeleton() {
  const bubbles = [
    { mine: false, w: "w-40" },
    { mine: true, w: "w-32" },
    { mine: false, w: "w-52" },
    { mine: false, w: "w-24" },
    { mine: true, w: "w-44" },
    { mine: true, w: "w-28" },
  ];
  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink-900">
      <div
        className="sticky top-0 z-30 flex items-center gap-3 bg-ink-900/85 px-4 pb-2 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="h-9 w-9 rounded-full bg-ink-800 animate-pulse" />
        <div className="h-9 w-9 rounded-full bg-ink-800 animate-pulse" />
        <div className="h-4 w-32 rounded bg-ink-800 animate-pulse" />
      </div>
      <div className="flex-1 space-y-3 px-4 py-4">
        {bubbles.map((b, i) => (
          <div
            key={i}
            className={b.mine ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`h-9 ${b.w} rounded-2xl animate-pulse ${
                b.mine ? "bg-gold-500/25" : "bg-ink-800"
              }`}
            />
          </div>
        ))}
      </div>
      <div
        className="px-3 pt-2"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="h-11 w-full rounded-full bg-ink-800 animate-pulse" />
      </div>
    </div>
  );
}
