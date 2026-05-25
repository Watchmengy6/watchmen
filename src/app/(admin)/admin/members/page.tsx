import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { RoleSelect } from "./RoleSelect";
import { requireAdmin } from "@/lib/auth/gates";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const { profile } = await requireAdmin();
  const supabase = supabaseServer();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, profile_photo_url, role, status, points_total, created_at, occupation")
    .order("points_total", { ascending: false });

  if (searchParams.q) {
    query = query.or(
      `full_name.ilike.%${searchParams.q}%,email.ilike.%${searchParams.q}%,occupation.ilike.%${searchParams.q}%`,
    );
  }

  const { data: members } = await query.limit(200);

  return (
    <div className="px-5 space-y-3 pb-6">
      <form action="/admin/members" className="flex gap-2">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Search members"
          className="flex-1 h-10 rounded-xl bg-ink-800 hairline px-3 text-sm text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30"
        />
      </form>
      {(members ?? []).map((m) => (
        <Card key={m.id} className="p-3">
          <div className="flex items-center gap-3">
            <Link href={`/app/members/${m.id}`} className="shrink-0">
              <Avatar src={m.profile_photo_url} name={m.full_name} size={44} />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Link href={`/app/members/${m.id}`} className="text-white text-sm font-medium truncate">
                  {m.full_name}
                </Link>
                {m.status !== "approved" ? (
                  <Badge variant="muted">{m.status}</Badge>
                ) : null}
                {m.role !== "member" ? <Badge variant="gold">{m.role}</Badge> : null}
              </div>
              <div className="text-ink-300 text-xs truncate">{m.email}</div>
            </div>
            <div className="text-right">
              <div className="text-gold-300 font-semibold text-sm tabular-nums">{m.points_total}</div>
              {profile.role === "super_admin" ? (
                <RoleSelect profileId={m.id} role={m.role} />
              ) : null}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
