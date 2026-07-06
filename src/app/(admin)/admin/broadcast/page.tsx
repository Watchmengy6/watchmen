import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { BroadcastForm } from "./BroadcastForm";

export const dynamic = "force-dynamic";

/**
 * SUPER-ADMIN broadcast tool (built for Dustin, July 2026): compose a
 * push notification and send it to every approved member at once.
 * Regular admins get bounced to the admin overview — this is the
 * loudest hammer in the app.
 */
export default async function BroadcastPage() {
  const { profile } = await requireAdmin();
  if (profile.role !== "super_admin") redirect("/admin");

  // Audience size — shown on the button so the sender knows exactly
  // how many brothers they're about to ping.
  const supabase = supabaseServer();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");
  const audience = Math.max(0, (count ?? 0) - 1); // minus the sender

  return (
    <div className="px-5">
      <div className="mb-4">
        <div className="text-[10.5px] tracking-[0.22em] uppercase text-gold-300/80">
          Super admin
        </div>
        <h2 className="text-xl font-semibold mt-1">Broadcast a push</h2>
        <p className="text-ink-300 text-[13.5px] mt-1.5 leading-relaxed">
          Sends a push notification to every approved member. Brothers who
          haven&apos;t turned on notifications won&apos;t receive it — for
          must-see announcements, post to the feed too.
        </p>
      </div>
      <BroadcastForm audience={audience} />
    </div>
  );
}
