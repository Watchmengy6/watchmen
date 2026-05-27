import Link from "next/link";
import { PreviewPicker } from "./PreviewPicker";

// Frame the preview content like an iPhone on desktop, full-bleed on mobile.
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-black via-ink-900 to-black">
      <div className="md:py-8 md:px-4 md:flex md:gap-8 md:justify-center md:items-start">
        <PreviewPicker />
        <div className="md:phone-frame relative">
          <div className="md:phone-screen min-h-[100dvh] md:min-h-0 bg-ink-900 text-white relative overflow-hidden">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="text-[9.5px] tracking-[0.3em] uppercase text-gold-300/80 px-2.5 py-0.5 rounded-full bg-black/55 backdrop-blur-sm font-semibold">
                Got Your 6
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
      <div className="text-center text-[11px] text-ink-400 py-6 md:hidden">
        <Link href="/preview" className="text-gold-300">All preview screens →</Link>
      </div>
    </div>
  );
}
