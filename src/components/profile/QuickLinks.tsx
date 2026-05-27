import { cashappLink, instagramLink, venmoLink } from "@/lib/utils/socialLinks";

/**
 * Branded one-tap buttons for Instagram + Venmo + CashApp.
 * Anything missing is silently skipped.
 */
export function QuickLinks({
  instagram,
  venmo,
  cashapp,
}: {
  instagram: string | null | undefined;
  venmo: string | null | undefined;
  cashapp: string | null | undefined;
}) {
  const ig = instagramLink(instagram);
  const vm = venmoLink(venmo);
  const ca = cashappLink(cashapp);

  const items: { href: string; label: string; sub: string; bg: string; icon: React.ReactNode }[] = [];
  if (ig) {
    items.push({
      href: ig.url,
      label: "Instagram",
      sub: ig.display,
      bg: "bg-gradient-to-tr from-[#feda77] via-[#f58529] to-[#dd2a7b]",
      icon: <IgIcon />,
    });
  }
  if (vm) {
    items.push({
      href: vm.url,
      label: "Venmo",
      sub: ca ? ca.display : vm.display,
      bg: "bg-[#008CFF]",
      icon: <VmIcon />,
    });
  }
  if (ca) {
    items.push({
      href: ca.url,
      label: "CashApp",
      sub: ca.display,
      bg: "bg-[#00C244]",
      icon: <CaIcon />,
    });
  }
  // We had a small label-mix bug above — rebuild items cleanly.
  const clean: typeof items = [];
  if (ig)
    clean.push({
      href: ig.url,
      label: "Instagram",
      sub: ig.display,
      bg: "bg-gradient-to-tr from-[#feda77] via-[#f58529] to-[#dd2a7b]",
      icon: <IgIcon />,
    });
  if (vm)
    clean.push({
      href: vm.url,
      label: "Venmo",
      sub: vm.display,
      bg: "bg-[#008CFF]",
      icon: <VmIcon />,
    });
  if (ca)
    clean.push({
      href: ca.url,
      label: "CashApp",
      sub: ca.display,
      bg: "bg-[#00C244]",
      icon: <CaIcon />,
    });

  if (clean.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {clean.map((it) => (
        <a
          key={it.label}
          href={it.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl px-3 py-3 ring-1 ring-white/[0.08] bg-ink-800 active:scale-[0.98] transition-transform"
        >
          <div
            className={`h-9 w-9 rounded-xl ${it.bg} flex items-center justify-center text-white shadow-sm`}
          >
            {it.icon}
          </div>
          <div className="mt-2 text-[12px] font-semibold text-white">{it.label}</div>
          <div className="text-[10.5px] text-ink-300 truncate">{it.sub}</div>
        </a>
      ))}
    </div>
  );
}

function IgIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function VmIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M19.5 4c1 0 1.5.6 1.5 1.7 0 3.1-4.6 11.2-7 14.3H8.5L6 7.5l4-.4L11.5 16c1.4-2.2 3.5-6 3.5-8 0-1-.4-1.7-.6-2L19.5 4Z" />
    </svg>
  );
}

function CaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <rect x="2.5" y="2.5" width="19" height="19" rx="4.5" fill="currentColor" opacity="0" />
      <path d="M14.7 9.2c-.7-.6-1.7-1-2.7-1-1.1 0-2 .4-2 1.2 0 .8.8 1 2.4 1.4 2.6.6 4.1 1.6 4.1 3.6 0 2.2-2 3.6-4.3 3.8l-.3 1c-.1.3-.4.5-.7.4l-.7-.2c-.3-.1-.5-.4-.4-.7l.3-1.1c-1.1-.3-2.1-.9-2.8-1.7-.2-.2-.2-.6 0-.8l1-1c.2-.2.5-.2.7 0 .8.8 2 1.3 3.2 1.3 1.3 0 2.1-.5 2.1-1.4 0-.8-.7-1.1-2.5-1.5-2.2-.5-4-1.5-4-3.5 0-2 1.9-3.3 4-3.5l.3-1c.1-.3.4-.5.7-.4l.7.2c.3.1.5.4.4.7l-.3 1c.9.2 1.7.6 2.4 1.2.2.2.2.5 0 .7l-1 1.1c-.1.2-.4.2-.6 0Z" />
    </svg>
  );
}
