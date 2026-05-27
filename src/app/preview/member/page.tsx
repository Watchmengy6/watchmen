import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InterestChipsReadOnly } from "@/components/profile/InterestChips";
import { QuickLinks } from "@/components/profile/QuickLinks";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockMembers } from "@/lib/preview/mock";
import { ageFromBirthday, fmtBirthday, fmtMonthYear } from "@/lib/utils/date";

export default function PreviewMember() {
  // Default to Dustin so the Founder/Master Admin badge is visible.
  const m = mockMembers.find((mm) => mm.id === "p_dustin") ?? mockMembers[0];
  const isFounder = m.id === "p_dustin";
  const age = ageFromBirthday(m.birthday);
  const birthday = fmtBirthday(m.birthday);
  const memberSince = fmtMonthYear(m.membership_date);

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      <div className="pt-8 px-5 space-y-4">
        <Card>
          <CardBody className="text-center">
            <div className="flex justify-center">
              <Avatar src={m.profile_photo_url} name={m.full_name} size={96} ring />
            </div>
            <h1 className="mt-4 text-xl font-semibold">{m.full_name}</h1>
            {m.username ? (
              <div className="text-gold-300/80 text-[12px] font-medium mt-0.5">
                @{m.username}
              </div>
            ) : null}
            <div className="text-ink-300 text-sm mt-1">
              {m.occupation} · {m.company}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
              <Badge variant="gold">{m.points_total} pts</Badge>
              {isFounder ? (
                <span className="inline-flex items-center gap-1 px-2.5 h-6 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[10.5px] font-bold tracking-wider">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
                    <path d="M12 2 4 6v6c0 5 3.6 9.4 8 10 4.4-.6 8-5 8-10V6Z" />
                  </svg>
                  FOUNDER · MASTER ADMIN
                </span>
              ) : null}
            </div>
            {m.bio ? (
              <p className="text-ink-200 text-sm mt-4 leading-relaxed">{m.bio}</p>
            ) : null}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/preview/dm">
                <Button variant="gold" size="md" fullWidth>Message</Button>
              </Link>
              <Button variant="outline" size="md" fullWidth>Save Contact</Button>
            </div>
          </CardBody>
        </Card>

        {/* Quick links: Instagram + Venmo + CashApp */}
        <QuickLinks
          instagram={m.instagram_url}
          venmo={m.venmo_username}
          cashapp={m.cashapp_username}
        />

        {/* About — age, family, work, member since */}
        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-3">
              About
            </div>
            <dl className="divide-y divide-white/[0.04]">
              {age != null ? (
                <Row label="Age" value={`${age}${birthday ? ` · ${birthday}` : ""}`} />
              ) : null}
              <Row label="Work" value={`${m.occupation}${m.company ? ` at ${m.company}` : ""}`} />
              {m.spouse || m.kids ? (
                <Row
                  label="Family"
                  value={
                    <>
                      {m.spouse ? (
                        <span>
                          <span className="text-ink-400">Spouse: </span>
                          <span className="text-ink-100">{m.spouse}</span>
                        </span>
                      ) : null}
                      {m.spouse && m.kids ? <br /> : null}
                      {m.kids ? (
                        <span>
                          <span className="text-ink-400">Kids: </span>
                          <span className="text-ink-100">{m.kids}</span>
                        </span>
                      ) : null}
                    </>
                  }
                />
              ) : null}
              {memberSince ? (
                <Row label="Member since" value={memberSince} />
              ) : null}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-2">
              Contribution
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Points" value={m.points_total} />
              <Stat label="Events" value={11} />
              <Stat label="Invites" value={6} />
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
      </div>
      <PreviewBottomNav />
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <dt className="text-[11px] tracking-wider uppercase text-ink-400 w-[100px] shrink-0 pt-0.5">
        {label}
      </dt>
      <dd className="text-[14px] text-white leading-snug flex-1">{value}</dd>
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
