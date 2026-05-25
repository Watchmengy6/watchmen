import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { InviteLinkBox } from "./InviteLinkBox";

export const dynamic = "force-dynamic";

export default async function InvitePage() {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const fullLink = `${siteUrl}/invite/${profile.invite_code}`;

  const [{ count: totalInvited }, { count: approvedInvited }, { data: invitePoints }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("invited_by_user_id", profile.id),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("invited_by_user_id", profile.id)
        .eq("status", "approved"),
      supabase
        .from("points_ledger")
        .select("points")
        .eq("user_id", profile.id)
        .eq("action_type", "invite_approved"),
    ]);

  const inviteEarnings = (invitePoints ?? []).reduce(
    (sum, row) => sum + (row.points ?? 0),
    0,
  );

  return (
    <div className="pt-8 px-5 space-y-4">
      <div>
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
          Invite a Brother
        </div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight">Your invite link</h1>
        <p className="mt-1 text-ink-300 text-sm">
          Share this with men you trust. They land on a private welcome screen
          and Dustin reviews every request.
        </p>
      </div>

      <InviteLinkBox link={fullLink} />

      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-2">
            Your impact
          </div>
          <div className="grid grid-cols-3 text-center gap-2">
            <Stat label="Total invited" value={totalInvited ?? 0} />
            <Stat label="Approved" value={approvedInvited ?? 0} />
            <Stat label="Points earned" value={inviteEarnings} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-2">
            Reward
          </div>
          <p className="text-ink-200 text-sm leading-relaxed">
            You earn <span className="text-gold-300 font-semibold">+50 points</span> each
            time someone you invited is approved. Points may unlock recognition,
            event perks, or rewards Dustin decides on later.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-gradient-gold text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-ink-300 mt-0.5">{label}</div>
    </div>
  );
}
