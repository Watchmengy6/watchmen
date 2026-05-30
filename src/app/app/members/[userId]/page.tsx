import { notFound } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { InterestChipsReadOnly } from "@/components/profile/InterestChips";
import { BlockButton } from "@/components/moderation/BlockButton";
import { ReportButton } from "@/components/moderation/ReportButton";
import { isBirthdayToday } from "@/lib/utils/birthday";

export const dynamic = "force-dynamic";

export default async function MemberProfile({ params }: { params: { userId: string } }) {
  const { profile: me } = await requireApproved();
  const supabase = supabaseServer();
  const isAdmin = me.role === "admin" || me.role === "super_admin";

  // Use safe column list — email/phone/invite_code were revoked from
  // `authenticated` in migration 00011. select("*") would silently return
  // no rows because permission is denied on those columns.
  // We DON'T filter by status=approved up front because admins can view
  // any profile (pending or rejected too). The filter happens below.
  const { data: m } = await supabase
    .from("profiles")
    .select(
      "id, full_name, profile_photo_url, bio, occupation, company, instagram_url, interests, role, status, points_total, invited_by_user_id, created_at, last_active_at, venmo_username, cashapp_username, username, birthday, spouse, kids, membership_date, email, phone",
    )
    .eq("id", params.userId)
    .maybeSingle();

  if (!m) notFound();
  // Non-admin viewers can only see approved members.
  if (!isAdmin && m.status !== "approved") notFound();

  // Watchmen member number — sequential by join order. Computed via the
  // SECURITY DEFINER RPC so the rank stays stable across viewers.
  const { data: memberNumber } = await supabase.rpc("watchmen_member_number", {
    p_profile_id: m.id,
  });

  // Has the viewer already blocked this member? Used to render the
  // block / unblock toggle. Self-view skips the moderation row entirely.
  const isSelf = m.id === me.id;
  let isBlocked = false;
  if (!isSelf) {
    const { data: blockRow } = await supabase
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", me.id)
      .eq("blocked_id", m.id)
      .maybeSingle();
    isBlocked = !!blockRow;
  }

  const [{ count: invitesApproved }, { count: eventsAttended }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("invited_by_user_id", m.id)
      .eq("status", "approved"),
    supabase
      .from("event_rsvps")
      .select("*", { count: "exact", head: true })
      .eq("user_id", m.id)
      .eq("status", "going"),
  ]);

  // Build social links. instagram_url may be a handle or a full URL.
  const igUrl = m.instagram_url
    ? m.instagram_url.startsWith("http")
      ? m.instagram_url
      : `https://instagram.com/${m.instagram_url.replace(/^@/, "")}`
    : null;
  const venmoUrl = m.venmo_username
    ? `https://venmo.com/u/${m.venmo_username.replace(/^@/, "")}`
    : null;
  const cashappUrl = m.cashapp_username
    ? `https://cash.app/$${m.cashapp_username.replace(/^\$/, "")}`
    : null;

  const familyBits = [
    m.spouse ? `Spouse: ${m.spouse}` : null,
    m.kids ? `Kids: ${m.kids}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="pt-8 px-5 space-y-4 pb-6">
      <Card>
        <CardBody className="text-center">
          <div className="flex justify-center">
            <Avatar src={m.profile_photo_url} name={m.full_name} size={96} ring />
          </div>
          <h1 className="mt-4 text-xl font-semibold">
            {m.full_name}
            {isBirthdayToday(m.birthday) ? (
              <span className="ml-2" title="Birthday today" aria-label="Birthday today">
                🎂
              </span>
            ) : null}
          </h1>
          {m.username ? (
            <div className="text-gold-300/80 text-[12px] mt-0.5">@{m.username}</div>
          ) : null}
          <div className="text-ink-300 text-sm mt-0.5">
            {m.occupation ?? "Member"}
            {m.company ? ` · ${m.company}` : ""}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="gold">{m.points_total} pts</Badge>
            {typeof memberNumber === "number" ? (
              <Badge variant="muted">
                Watchmen #{String(memberNumber).padStart(3, "0")}
              </Badge>
            ) : null}
            {m.status !== "approved" ? (
              <Badge variant="muted">{m.status}</Badge>
            ) : null}
          </div>

          {/* Social / pay quick links */}
          {(igUrl || venmoUrl || cashappUrl) ? (
            <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
              {igUrl ? (
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 w-10 rounded-full bg-ink-800 hairline inline-flex items-center justify-center text-ink-100 active:bg-ink-700"
                  aria-label="Instagram"
                  title="Instagram"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              ) : null}
              {venmoUrl ? (
                <a
                  href={venmoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 px-3 rounded-full bg-[#008CFF]/10 ring-1 ring-[#008CFF]/40 text-[#7BC0FF] inline-flex items-center gap-1.5 text-[12px] font-semibold active:bg-[#008CFF]/15"
                  aria-label="Venmo"
                  title={`Venmo @${m.venmo_username}`}
                >
                  Venmo
                </a>
              ) : null}
              {cashappUrl ? (
                <a
                  href={cashappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 px-3 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/40 text-emerald-300 inline-flex items-center gap-1.5 text-[12px] font-semibold active:bg-emerald-500/15"
                  aria-label="CashApp"
                  title={`CashApp $${m.cashapp_username}`}
                >
                  CashApp
                </a>
              ) : null}
            </div>
          ) : null}

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

      {/* Contact — visible to every approved brother per Dustin. The
          email + phone columns were re-granted in migration 00022. */}
      {(m.email || m.phone) ? (
        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-2">
              Contact
            </div>
            <div className="space-y-2 text-[14px]">
              {m.email ? (
                <a
                  href={`mailto:${m.email}`}
                  className="flex items-center gap-2 text-ink-100 hover:text-white"
                >
                  <span className="text-ink-400 text-[12px] w-14">Email</span>
                  <span className="truncate">{m.email}</span>
                </a>
              ) : null}
              {m.phone ? (
                <a
                  href={`tel:${m.phone}`}
                  className="flex items-center gap-2 text-ink-100 hover:text-white"
                >
                  <span className="text-ink-400 text-[12px] w-14">Phone</span>
                  <span className="truncate">{m.phone}</span>
                </a>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {familyBits.length > 0 || m.birthday ? (
        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-2">
              Family
            </div>
            <div className="space-y-1.5 text-[14px] text-ink-100">
              {familyBits.map((b) => (
                <div key={b}>{b}</div>
              ))}
              {m.birthday ? (
                <div>Birthday: {formatDateString(m.birthday, { month: "long", day: "numeric" })}</div>
              ) : null}
            </div>
          </CardBody>
        </Card>
      ) : null}

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
            {m.membership_date
              ? formatDateString(m.membership_date, { year: "numeric", month: "long", day: "numeric" })
              : new Date(m.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
          </div>
        </CardBody>
      </Card>

      {/* Moderation row — Apple-required for any social app. Hidden on
          self-view since you can't report or block yourself. */}
      {!isSelf ? (
        <div className="flex items-center gap-2 pt-2">
          <BlockButton targetProfileId={m.id} isBlocked={isBlocked} variant="compact" />
          <ReportButton
            target={{ kind: "user", id: m.id }}
            className="h-9 px-3 rounded-full bg-ink-800 hairline text-ink-100 text-[12px] font-semibold"
            label="Report"
          />
        </div>
      ) : null}
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

/**
 * Format a YYYY-MM-DD date string WITHOUT timezone conversion.
 * `new Date("2026-05-27")` parses as UTC midnight, which renders as the
 * previous day in any US time zone. We parse the parts manually so the
 * displayed day matches what the user typed.
 */
function formatDateString(
  dateStr: string,
  opts: Intl.DateTimeFormatOptions,
): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, opts);
    } catch {
      return dateStr;
    }
  }
  const [, y, mo, d] = m;
  // Build a local-time Date so toLocaleDateString gives the right calendar day.
  const local = new Date(Number(y), Number(mo) - 1, Number(d));
  return local.toLocaleDateString(undefined, opts);
}
