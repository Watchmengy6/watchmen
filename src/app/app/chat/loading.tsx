/**
 * Main Room loading skeleton. Renders instantly on tab tap so the
 * user sees structure before the message hydration finishes.
 */
export default function ChatLoading() {
  return (
    <div className="min-h-[100dvh] bg-ink-900 flex flex-col">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Main Room
            </div>
            <div className="text-white text-[18px] font-semibold leading-tight">
              The Watchmen
            </div>
          </div>
          <div className="h-3 w-12 rounded bg-ink-800 animate-pulse" />
        </div>
      </div>
      <div className="flex-1 px-3 py-4 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"} gap-2 animate-pulse`}
          >
            {i % 2 === 0 ? <div className="h-7 w-7 rounded-full bg-ink-800" /> : null}
            <div
              className={`h-10 rounded-[20px] bg-ink-800 ${i % 2 === 0 ? "w-56" : "w-40"}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
