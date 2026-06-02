import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { MemberCard } from "@/components/profile/MemberCard";

export const dynamic = "force-dynamic";

/**
 * Member-card detail page — a member's gold "Watchmen Member" card with
 * a native share button. Linked from /app/profile.
 */
export default async function MemberCardPage() {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();
  const { data: memberNumber } = await supabase.rpc("watchmen_member_number", {
    p_profile_id: profile.id,
  });

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://watchmen-six.vercel.app";

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
              Profile
            </div>
            <div className="text-white text-[16px] font-semibold leading-tight">
              Your Member Card
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-8">
        <MemberCard
          fullName={profile.full_name}
          email={profile.email}
          phone={profile.phone}
          memberNumber={typeof memberNumber === "number" ? memberNumber : null}
          appUrl={siteUrl}
        />
      </div>
    </div>
  );
}
