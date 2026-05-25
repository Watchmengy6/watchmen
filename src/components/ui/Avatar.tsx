import { cn } from "@/lib/utils/cn";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
}

function initials(name?: string | null) {
  if (!name) return "·";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({ src, name, size = 40, className, ring }: AvatarProps) {
  const dim = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "avatar"}
        style={dim}
        className={cn(
          "rounded-full object-cover bg-ink-700",
          ring && "ring-2 ring-gold-400/40",
          className,
        )}
      />
    );
  }
  return (
    <div
      style={dim}
      className={cn(
        "rounded-full bg-gradient-to-br from-ink-600 to-ink-800 hairline",
        "flex items-center justify-center text-ink-200 font-semibold",
        ring && "ring-2 ring-gold-400/40",
        className,
      )}
    >
      <span style={{ fontSize: Math.max(11, size * 0.38) }}>{initials(name)}</span>
    </div>
  );
}
