import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteGroupButton } from "./DeleteGroupButton";
import { requireAdmin } from "@/lib/auth/gates";

export const dynamic = "force-dynamic";

/**
 * Admin Groups list — every group in the system with a delete button.
 *
 * Uses the service-role client because we want to show ALL groups
 * including private ones the admin isn't a member of (the regular
 * `groups approved read` RLS policy from migration 00015 hides
 * non-member private groups). Page is admin-gated upstream by
 * requireAdmin() so this is safe.
 */

function fmtCreated(s: string | null | undefined): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default async function AdminGroupsPage() {
  await requireAdmin();
  const supabase = supabaseAdmin();

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, slug, category, kind, is_private, cover_url, created_at")
    .order("created_at", { ascending: false });

  // Member counts — separate query to avoid pulling huge member rows
  // into the list shell. group_members has ON DELETE CASCADE so this
  // count is always trustworthy.
  const ids = (groups ?? []).map((g) => g.id);
  const { data: members } = ids.length
    ? await supabase.from("group_members").select("group_id").in("group_id", ids)
    : { data: [] };
  const memberCount: Record<string, number> = {};
  for (const m of members ?? []) {
    memberCount[m.group_id] = (memberCount[m.group_id] ?? 0) + 1;
  }

  return (
    <div className="px-5 space-y-3 pb-8">
      <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-1">
        Groups ({groups?.length ?? 0})
      </div>

      {(groups ?? []).length === 0 ? (
        <Card className="p-4">
          <div className="text-ink-300 text-sm">No groups yet.</div>
        </Card>
      ) : (
        (groups ?? []).map((g) => (
          <Card key={g.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={g.kind === "meetup" ? "default" : "muted"}>
                    {g.kind}
                  </Badge>
                  {g.is_private ? <Badge variant="muted">private</Badge> : null}
                  {g.category ? <Badge variant="muted">{g.category}</Badge> : null}
                </div>
                <Link
                  href={`/app/groups/${g.id}`}
                  className="block mt-1.5 font-semibold truncate"
                >
                  {g.name}
                </Link>
                <div className="text-ink-300 text-xs mt-0.5 truncate">
                  /{g.slug}
                </div>
                <div className="text-ink-400 text-[11px] mt-1">
                  {memberCount[g.id] ?? 0} {memberCount[g.id] === 1 ? "member" : "members"}
                  {g.created_at ? ` · created ${fmtCreated(g.created_at)}` : ""}
                </div>
              </div>
              <DeleteGroupButton id={g.id} name={g.name} />
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
