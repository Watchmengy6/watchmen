import { requireApproved } from "@/lib/auth/gates";
import { ProfileEditor } from "./ProfileEditor";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile, user } = await requireApproved();

  return (
    <div className="pt-8 pb-10">
      <div className="px-5 mb-5">
        <div className="text-[11px] tracking-[0.3em] uppercase text-gold-300/80">
          Your Profile
        </div>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight">
          Tune your presence
        </h1>
        <p className="mt-1 text-ink-300 text-sm">
          What other members see when you show up in the room.
        </p>
      </div>

      <ProfileEditor
        authUserId={user.id}
        defaults={{
          full_name: profile.full_name,
          bio: profile.bio ?? "",
          occupation: profile.occupation ?? "",
          company: profile.company ?? "",
          instagram_url: profile.instagram_url ?? "",
          phone: profile.phone ?? "",
          profile_photo_url: profile.profile_photo_url,
          interests: profile.interests ?? [],
        }}
      />

      <div className="px-5 mt-10">
        <form action={logoutAction}>
          <Button type="submit" variant="outline" fullWidth>
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
