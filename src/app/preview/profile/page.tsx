"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PreviewBottomNav } from "../PreviewBottomNav";
import { mockMe, mockPending } from "@/lib/preview/mock";
import { cashappLink, instagramLink, venmoLink } from "@/lib/utils/socialLinks";

const INTERESTS = [
  "Marketing","Real estate","Fitness","Pickleball","Sports","Business",
  "Investing","Cars","Watches","Church","Networking","Entrepreneurship",
  "Construction","Tech","Content creation","Golf","Fishing","Boating",
];

export default function PreviewProfile() {
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 relative">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="text-white text-[18px] font-semibold">Your Profile</div>
          <Button variant="gold" size="sm">Save</Button>
        </div>
      </div>

      {/* Master Admin entry — only renders for admins / super_admins */}
      {(mockMe.role === "super_admin" || mockMe.role === "admin") ? (
        <div className="px-5 pt-5">
          <Link href="/preview/admin" className="block">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold-500/20 via-gold-700/10 to-ink-900 ring-1 ring-gold-500/30 px-4 py-3.5 active:scale-[0.99] transition-transform">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />
              <div className="relative flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 text-black flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M12 2 4 6v6c0 5 3.6 9.4 8 10 4.4-.6 8-5 8-10V6Z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[0.25em] uppercase text-gold-300/90 font-bold">
                    {mockMe.role === "super_admin" ? "Master Admin" : "Admin"}
                  </div>
                  <div className="text-white text-[15px] font-semibold leading-tight mt-0.5">
                    Command Room
                  </div>
                  <div className="text-ink-300 text-[12px] mt-0.5">
                    Pending · Members · Events · Leaderboard
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {mockPending.length > 0 ? (
                    <div className="px-2 h-6 rounded-full bg-black text-gold-300 text-[11.5px] font-bold inline-flex items-center">
                      {mockPending.length} pending
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Link>

          {/* Quick admin shortcuts */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Link
              href="/preview/admin-pending"
              className="rounded-xl bg-ink-800/80 hairline px-3 py-2.5 flex items-center justify-between"
            >
              <div>
                <div className="text-white text-[12.5px] font-semibold">Approvals</div>
                <div className="text-ink-400 text-[11px] mt-0.5">{mockPending.length} waiting</div>
              </div>
              <span className="text-ink-400">›</span>
            </Link>
            <Link
              href="/preview/admin-leaderboard"
              className="rounded-xl bg-ink-800/80 hairline px-3 py-2.5 flex items-center justify-between"
            >
              <div>
                <div className="text-white text-[12.5px] font-semibold">Points audit</div>
                <div className="text-ink-400 text-[11px] mt-0.5">Top contributors</div>
              </div>
              <span className="text-ink-400">›</span>
            </Link>
          </div>
        </div>
      ) : null}

      <form className="space-y-4 px-5 pt-5" onSubmit={(e) => e.preventDefault()}>
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={mockMe.full_name} size={80} ring />
              <div className="flex flex-col gap-2">
                <span className="inline-flex items-center justify-center h-9 px-3 rounded-full text-sm bg-transparent text-white hairline">
                  Change photo
                </span>
                <Badge variant="gold">{mockMe.points_total} pts</Badge>
              </div>
            </div>
            <div>
              <Label>Name</Label>
              <Input defaultValue={mockMe.full_name} />
            </div>
            <div>
              <Label>Short bio</Label>
              <Textarea defaultValue={mockMe.bio} rows={3} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300">
              Work
            </div>
            <div>
              <Label>Occupation</Label>
              <Input defaultValue={mockMe.occupation} />
            </div>
            <div>
              <Label>Company</Label>
              <Input defaultValue={mockMe.company} />
            </div>
          </CardBody>
        </Card>

        <SocialFinanceCard
          defaultInstagram={instagramLink(mockMe.instagram_url)?.handle ?? ""}
          defaultVenmo={mockMe.venmo_username}
          defaultCashapp={mockMe.cashapp_username}
        />

        <Card>
          <CardBody className="space-y-4">
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300">
              Personal
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Birthday</Label>
                <Input type="date" defaultValue={mockMe.birthday} />
              </div>
              <div>
                <Label>Member since</Label>
                <Input value={new Date(mockMe.membership_date).toLocaleDateString(undefined, { month: "short", year: "numeric" })} readOnly />
              </div>
            </div>
            <div>
              <Label>Phone (private)</Label>
              <Input defaultValue={mockMe.phone} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300">
              Family
            </div>
            <div>
              <Label>Spouse</Label>
              <Input defaultValue={mockMe.spouse} />
            </div>
            <div>
              <Label>Kids</Label>
              <Input defaultValue={mockMe.kids} placeholder="Names and ages, or just count" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Label>Interests</Label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => {
                const active = mockMe.interests.includes(i);
                return (
                  <span
                    key={i}
                    className={
                      active
                        ? "inline-flex items-center px-3 h-9 rounded-full text-sm bg-gold-500/15 text-gold-200 ring-1 ring-gold-500/40"
                        : "inline-flex items-center px-3 h-9 rounded-full text-sm bg-ink-800 text-ink-200 hairline"
                    }
                  >
                    {i}
                  </span>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* More links */}
        <Card>
          <CardBody className="!py-2">
            <Link
              href="/preview/members"
              className="flex items-center justify-between py-2.5 border-b border-white/[0.04]"
            >
              <span className="text-white text-[14px]">Members directory</span>
              <span className="text-ink-400">›</span>
            </Link>
            <Link
              href="/preview/invite"
              className="flex items-center justify-between py-2.5 border-b border-white/[0.04]"
            >
              <span className="text-white text-[14px]">Your invite link</span>
              <span className="text-ink-400">›</span>
            </Link>
            <Link
              href="/preview/notifications"
              className="flex items-center justify-between py-2.5 border-b border-white/[0.04]"
            >
              <span className="text-white text-[14px]">Notifications</span>
              <span className="text-ink-400">›</span>
            </Link>
            <Link
              href="/preview/settings"
              className="flex items-center justify-between py-2.5"
            >
              <span className="text-white text-[14px]">Settings</span>
              <span className="text-ink-400">›</span>
            </Link>
          </CardBody>
        </Card>

        <Button variant="outline" fullWidth>Sign out</Button>
      </form>
      <PreviewBottomNav />
    </div>
  );
}

function SocialFinanceCard({
  defaultInstagram,
  defaultVenmo,
  defaultCashapp,
}: {
  defaultInstagram: string;
  defaultVenmo: string;
  defaultCashapp: string;
}) {
  const [ig, setIg] = useState(defaultInstagram);
  const [vm, setVm] = useState(defaultVenmo);
  const [ca, setCa] = useState(defaultCashapp);

  const igLink = instagramLink(ig);
  const vmLink = venmoLink(vm);
  const caLink = cashappLink(ca);

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300">
          Socials & Pay
        </div>

        <SocialField
          label="Instagram"
          prefix="@"
          value={ig}
          onChange={setIg}
          placeholder="username"
          link={igLink?.url}
          display={igLink ? `instagram.com/${igLink.handle}` : null}
        />
        <SocialField
          label="Venmo"
          prefix="@"
          value={vm}
          onChange={setVm}
          placeholder="username"
          link={vmLink?.url}
          display={vmLink ? `venmo.com/u/${vmLink.handle}` : null}
        />
        <SocialField
          label="CashApp"
          prefix="$"
          value={ca}
          onChange={setCa}
          placeholder="cashtag"
          link={caLink?.url}
          display={caLink ? `cash.app/$${caLink.handle}` : null}
        />

        <p className="text-[11px] text-ink-400 leading-relaxed">
          Type your username only — we&apos;ll build the link. These show up on your
          profile as one-tap buttons so brothers can DM you on IG or settle up fast.
        </p>
      </CardBody>
    </Card>
  );
}

function SocialField({
  label,
  prefix,
  value,
  onChange,
  placeholder,
  link,
  display,
}: {
  label: string;
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  link: string | null | undefined;
  display: string | null;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-400 pointer-events-none">
          {prefix}
        </span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pl-7"
        />
      </div>
      {display ? (
        <a
          href={link ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-[11.5px] text-gold-300 hover:text-gold-200 underline-offset-2 hover:underline"
        >
          {display} ↗
        </a>
      ) : null}
    </div>
  );
}
