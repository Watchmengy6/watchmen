export default function DmsLoading() {
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="px-4 py-2.5">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
            Inbox
          </div>
          <div className="text-white text-[18px] font-semibold leading-tight">
            Messages
          </div>
        </div>
      </div>
      <div className="px-3 pt-3 space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-ink-800 animate-pulse"
          >
            <div className="h-11 w-11 rounded-full bg-ink-700" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 rounded bg-ink-700" />
              <div className="h-2.5 w-48 rounded bg-ink-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
