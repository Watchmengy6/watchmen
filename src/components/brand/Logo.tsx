import { cn } from "@/lib/utils/cn";

/**
 * The Watchmen chevron mark.
 * Paths come from the master brand SVG. Renders in currentColor so the
 * parent's text-color controls the fill — drop it in any color context.
 *
 * Use:  <Logo className="h-12 w-12 text-gold-400" />
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 456 437"
      fill="currentColor"
      fillRule="evenodd"
      className={cn("inline-block", className)}
      aria-label="The Watchmen"
    >
      {/* right vertical bar (notched for the 6) */}
      <path d="M 355.45 230.48 L 305.70 189.79 L 305.70 0.41 L 355.45 41.10 Z" />
      {/* left vertical bar */}
      <path d="M 101.73 230.48 L 151.48 189.79 L 151.48 0.41 L 101.73 41.10 Z" />
      {/* inner chevron */}
      <path d="M 265.95 286.75 L 355.90 367.46 L 355.90 436.10 L 227.68 321.07 L 100.12 435.51 L 100.12 366.87 L 227.68 252.43 Z" />
      {/* outer chevron */}
      <path d="M 0.61 353.13 L 0.61 145.07 L 50.37 100.45 L 50.37 308.49 L 227.68 149.42 L 405.66 309.08 L 405.66 101.34 L 455.43 145.96 L 455.43 422.36 L 227.68 218.06 L 0.61 421.77 Z" />
    </svg>
  );
}

/**
 * Full lockup — mark + "THE WATCHMEN" wordmark + "Got Your 6" tagline.
 * Uses the master SVG asset (preserves the custom display typeface).
 */
export function LogoLockup({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-full.svg"
      alt="The Watchmen · Got Your 6"
      className={cn("block", className)}
    />
  );
}
