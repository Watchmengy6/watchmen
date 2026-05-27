import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { PreviewBottomNav } from "../PreviewBottomNav";

const externalLinks = [
  { label: "Watchman Website", href: "https://thewatchman.app", desc: "Public landing page" },
  { label: "Apparel Shop", href: "#", desc: "Watchman gear (Shopify, coming soon)" },
  { label: "Code of Conduct", href: "#", desc: "How we hold each other" },
  { label: "Submit Feedback", href: "#", desc: "What's working, what isn't" },
  { label: "Help & FAQ", href: "#", desc: "Common questions" },
];

const appLinks = [
  { label: "Notification settings", href: "#" },
  { label: "Privacy", href: "#" },
  { label: "Blocked members", href: "#" },
  { label: "About", href: "#" },
];

export default function PreviewSettings() {
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/preview/profile" className="text-ink-200 text-sm">‹ Profile</Link>
          <div className="text-white text-[15px] font-semibold">Settings</div>
          <div className="w-16" />
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        <div>
          <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300 mb-2 px-1">
            From the Watchman site
          </div>
          <Card>
            <CardBody className="!py-2">
              {externalLinks.map((l, i) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center justify-between py-3 ${
                    i < externalLinks.length - 1 ? "border-b border-white/[0.04]" : ""
                  }`}
                >
                  <div>
                    <div className="text-white text-[14px]">{l.label}</div>
                    <div className="text-ink-400 text-[11.5px] mt-0.5">{l.desc}</div>
                  </div>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-ink-400"
                  >
                    <path d="M7 17 17 7M9 7h8v8" />
                  </svg>
                </a>
              ))}
            </CardBody>
          </Card>
        </div>

        <div>
          <div className="text-[10.5px] tracking-[0.25em] uppercase text-ink-300 mb-2 px-1">
            App
          </div>
          <Card>
            <CardBody className="!py-2">
              {appLinks.map((l, i) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className={`flex items-center justify-between py-3 ${
                    i < appLinks.length - 1 ? "border-b border-white/[0.04]" : ""
                  }`}
                >
                  <div className="text-white text-[14px]">{l.label}</div>
                  <span className="text-ink-400">›</span>
                </Link>
              ))}
            </CardBody>
          </Card>
        </div>

        <p className="text-center text-[11px] text-ink-500 py-2">
          The Watchman · v0.1.0 MVP
        </p>
      </div>
      <PreviewBottomNav />
    </div>
  );
}
