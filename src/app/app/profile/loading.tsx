export default function ProfileLoading() {
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="px-4 py-2.5">
          <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
            Profile
          </div>
          <div className="text-white text-[18px] font-semibold leading-tight">
            You
          </div>
        </div>
      </div>
      <div className="px-4 pt-6 space-y-4">
        <div className="flex items-center gap-4 animate-pulse">
          <div className="h-20 w-20 rounded-full bg-ink-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 rounded bg-ink-800" />
            <div className="h-3 w-24 rounded bg-ink-800" />
          </div>
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-ink-800 h-20 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
