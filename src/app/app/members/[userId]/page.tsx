import { notFound } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { InterestChipsReadOnly } from "@/components/profile/InterestChips";

export const dynamic = "force-dynamic";

export default async function MemberProfile({ params }: { params: { userId: string } }) {
  await requireApproved();
  const supabase = supabaseServer();

  // Use safe column list — email/phone/invite_code were revoked from
  // `authenticated` in migration 00011. select("*") would silently return
  // no rows because permission is denied on those columns.
  const { data: m } = await supabase
    .from("profiles")
    .select(
      "id, full_name, profile_photo_url, bio, occupation, company, instagram_url, interests, role, status, points_total, invited_by_user_id, created_at, last_active_at, venmo_username, cashapp_username, username",
    )
    .eq("id", params.userId)
    .eq("status", "approved")
    .maybeSingle();

  if (!m) notFound();

  const [{ count: invitesApproved }, { count: eventsAttended }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("invited_by_user_id", m.id)
      .eq("status", "approved"),
    // checked_in is revoked — fall back to counting "going" RSVPs as the
    // simpler attendance proxy for the public profile card.
    supabase
      .from("event_rsvps")
      .select("*", { count: "exact", head: true })
      .eq("user_id", m.id)
      .eq("status", "going"),
  ]);

  return (
    <div className="pt-8 px-5 space-y-4">
      <Card>
        <CardBody className="text-center">
          <div className="flex justify-center">
            <Avatar src={m.profile_photo_url} name={m.full_name} size={96} ring />
          </div>
          <h1 className="mt-4 text-xl font-semibold">{m.full_name}</h1>
          <div className="text-ink-300 text-sm mt-0.5">
            {m.occupation ?? "Member"}
            {m.company ? ` · ${m.company}` : ""}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Badge variant="gold">{m.points_total} pts</Badge>
            {m.instagram_url ? (
              <a
                href={m.instagram_url}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] px-2.5 h-6 rounded-full bg-ink-800 hairline text-ink-200 inline-flex items-center"
              >
                Instagram
              </a>
            ) : null}
          </div>
          {m.bio ? <p className="text-ink-200 text-sm mt-4 leading-relaxed">{m.bio}</p> : null}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-2">
            Contribution
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Points" value={m.points_total} />
            <Stat label="Events" value={eventsAttended ?? 0} />
            <Stat label="Invites" value={invitesApproved ?? 0} />
          </div>
        </CardBody>
      </Card>

      {m.interests?.length ? (
        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-2">
              Interests
            </div>
            <InterestChipsReadOnly values={m.interests} />
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-1">Joined</div>
          <div className="text-ink-200">
            {new Date(m.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
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
