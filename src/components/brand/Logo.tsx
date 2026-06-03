import { cn } from "@/lib/utils/cn";

/**
 * The GY6 "YG" hexagon monogram (the Watchmen brand mark) — the master
 * gold-on-transparent art. Rendered as an <img> so it stays pixel-exact
 * to the brand file. Size it with height/width utility classes.
 *
 * Use:  <Logo className="h-12 w-12" />
 */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-yg.png"
      alt="The Watchmen"
      className={cn("inline-block object-contain", className)}
    />
  );
}

/** Full lockup — currently just the mark; wordmark lockup TBD from Jeremy. */
export function LogoLockup({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-yg.png" alt="The Watchmen" className={cn("block object-contain", className)} />
  );
}
