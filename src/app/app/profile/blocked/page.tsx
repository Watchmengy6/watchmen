import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";
import { BlockButton } from "@/components/moderation/BlockButton";

export const dynamic = "force-dynamic";

/**
 * "Blocked members" settings page. Reachable from /app/profile.
 * Lets a member see who they've blocked and unblock them.
 */
export default async function BlockedListPage() {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  const { data: rows } = await supabase
    .from("user_blocks")
    .select(
      "id, created_at, blocked_id, blocked:profiles!user_blocks_blocked_id_fkey(id, full_name, profile_photo_url)",
    )
    .eq("blocker_id", profile.id)
    .order("created_at", { ascending: false });

  const items = (rows ?? [])
    .map((r: any) => {
      const b = Array.isArray(r.blocked) ? r.blocked[0] : r.blocked;
      return b ? { id: b.id, full_name: b.full_name, profile_photo_url: b.profile_photo_url } : null;
    })
    .filter(Boolean) as { id: string; full_name: string; profile_photo_url: string | null }[];

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Link
            href="/app/profile"
            aria-label="Back"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-800 hairline text-ink-100 text-lg"
          >
            ‹
          </Link>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Settings
            </div>
            <div className="text-white text-[16px] font-semibold leading-tight">
              Blocked members
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-2">
        {items.length === 0 ? (
          <div className="text-center text-ink-300 text-[14px] py-10">
            You haven&apos;t blocked anyone. You can block a member from their
            profile if their posts or messages are a problem.
          </div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-ink-800 hairline"
            >
              <Avatar src={it.profile_photo_url ?? undefined} name={it.full_name} size={40} />
              <div className="flex-1 min-w-0 text-white text-[14px] truncate">
                {it.full_name}
              </div>
              <BlockButton targetProfileId={it.id} isBlocked={true} variant="compact" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
