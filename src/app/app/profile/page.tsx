import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { ProfileEditor } from "./ProfileEditor";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { EnablePushButton } from "@/components/push/EnablePushButton";
import { DeleteAccountButton } from "@/components/account/DeleteAccountButton";
import { InviteLinkBox } from "@/app/app/invite/InviteLinkBox";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile, user } = await requireApproved();
  const isAdmin = profile.role === "admin" || profile.role === "super_admin";
  const supabase = supabaseServer();
  const { data: memberNumber } = await supabase.rpc("watchmen_member_number", {
    p_profile_id: profile.id,
  });

  // Personal invite link — every brother has their own permanent invite
  // code on profile.invite_code (kept private to the user via me_full).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const inviteLink = `${siteUrl}/invite/${profile.invite_code}`;

  return (
    <div className="pb-10" style={{ paddingTop: "max(2rem, env(safe-area-inset-top))" }}>
      <div className="px-5 mb-5">
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
          Your Profile
        </div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight">
          {profile.full_name}
        </h1>
        <p className="mt-1 text-ink-300 text-sm">
          {profile.points_total} points · {profile.role === "super_admin" ? "Super Admin" : profile.role === "admin" ? "Admin" : "Member"}
          {typeof memberNumber === "number" ? (
            <>
              {" · "}
              <span className="text-gold-300/90">
                Watchmen #{String(memberNumber).padStart(3, "0")}
              </span>
            </>
          ) : null}
        </p>
      </div>

      <ProfileEditor
        authUserId={user.id}
        defaults={{
          full_name: profile.full_name ?? "",
          username: (profile as any).username ?? "",
          bio: profile.bio ?? "",
          occupation: profile.occupation ?? "",
          company: profile.company ?? "",
          instagram_url: profile.instagram_url ?? "",
          phone: profile.phone ?? "",
          profile_photo_url: profile.profile_photo_url ?? null,
          interests: Array.isArray(profile.interests) ? profile.interests : [],
          venmo_username: (profile as any).venmo_username ?? "",
          cashapp_username: (profile as any).cashapp_username ?? "",
          birthday: (profile as any).birthday ?? "",
          spouse: (profile as any).spouse ?? "",
          kids: (profile as any).kids ?? "",
        }}
      />

      {/* Admin section — only renders for admin/super_admin */}
      {isAdmin ? (
        <div className="px-5 mt-8 space-y-3">
          <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
            Admin
          </div>
          <Card>
            <CardBody className="!p-0">
              <AdminLink href="/admin" label="Command Room" sub="Overview & quick links" />
              <AdminLink href="/admin/pending" label="Pending approvals" sub="Approve new brothers" />
              <AdminLink href="/admin/members" label="Members" sub="Manage roles" />
              <AdminLink href="/admin/events" label="Events" sub="Create & edit events" />
              <AdminLink href="/admin/leaderboard" label="Leaderboard" sub="Audit point activity" last />
            </CardBody>
          </Card>
        </div>
      ) : null}

      {/* Personal invite link — every member can hand this to brothers
          they trust. Admin still has to approve the signup. */}
      <div className="px-5 mt-8 space-y-2">
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
          Invite a Brother
        </div>
        <InviteLinkBox link={inviteLink} />
        <p className="text-[11.5px] text-ink-400 leading-relaxed">
          Share with men you trust. They land on a private welcome screen and Dustin reviews every request. You earn <span className="text-gold-300 font-semibold">+50 points</span> when they're approved.
        </p>
      </div>

      {/* Push notifications */}
      <div className="px-5 mt-8 space-y-2">
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
          Notifications
        </div>
        <EnablePushButton />
        <p className="text-[11.5px] text-ink-400 leading-relaxed">
          Get a push when someone DMs you, posts an event, or @mentions you. On iPhone, install the app to your Home Screen first.
        </p>
      </div>

      {/* Privacy & moderation settings */}
      <div className="px-5 mt-8 space-y-2">
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
          Privacy
        </div>
        <Link
          href="/app/profile/blocked"
          className="block w-full h-11 rounded-full bg-ink-800 hairline text-ink-100 text-[13.5px] font-semibold leading-[44px] text-center"
        >
          Blocked members
        </Link>
        <div className="flex gap-2 pt-1 text-[11.5px] text-ink-400">
          <Link href="/legal/privacy" className="underline hover:text-ink-200">
            Privacy policy
          </Link>
          <span>·</span>
          <Link href="/legal/terms" className="underline hover:text-ink-200">
            Terms
          </Link>
        </div>
      </div>

      <div className="px-5 mt-10 space-y-3">
        <form action={logoutAction}>
          <Button type="submit" variant="outline" fullWidth>
            Sign out
          </Button>
        </form>
        <DeleteAccountButton />
      </div>
    </div>
  );
}

function AdminLink({
  href,
  label,
  sub,
  last,
}: {
  href: string;
  label: string;
  sub: string;
  last?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 active:bg-white/[0.02] ${last ? "" : "border-b border-white/[0.04]"}`}
    >
      <div className="h-9 w-9 rounded-xl bg-gold-500/15 ring-1 ring-gold-500/30 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 text-gold-300"
        >
          <path d="M12 2 4 6v6c0 5 3.6 9.4 8 10 4.4-.6 8-5 8-10V6Z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-[14.5px] font-medium">{label}</div>
        <div className="text-ink-300 text-[12px]">{sub}</div>
      </div>
      <div className="text-ink-300">›</div>
    </Link>
  );
}
