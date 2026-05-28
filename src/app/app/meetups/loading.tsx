export default function MeetupsLoading() {
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="px-4 py-2.5">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
            Meetups
          </div>
          <div className="text-white text-[18px] font-semibold leading-tight">
            Get together
          </div>
        </div>
      </div>
      <div className="px-4 pt-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-ink-800 h-28 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
