import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DeleteGroupButton } from "./DeleteGroupButton";
import { requireAdmin } from "@/lib/auth/gates";
import {
  approveGroupRequestAction,
  rejectGroupRequestAction,
} from "@/lib/groups/actions";

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
    .select(
      "id, name, slug, category, kind, is_private, cover_url, created_at, status, creator:profiles!groups_created_by_fkey(full_name)",
    )
    .order("created_at", { ascending: false });

  const pendingRequests = (groups ?? []).filter((g: any) => g.status === "pending");
  const liveGroups = (groups ?? []).filter((g: any) => g.status !== "pending");

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
      {/* Pending group requests — members request, Dustin approves.
          (Request-and-approve model, July 2026.) */}
      {pendingRequests.length > 0 ? (
        <>
          <div className="text-[11px] tracking-[0.25em] uppercase text-gold-300/90 mb-1">
            Requests ({pendingRequests.length})
          </div>
          {pendingRequests.map((g: any) => {
            const creator = Array.isArray(g.creator) ? g.creator[0] : g.creator;
            return (
              <Card key={g.id} className="p-4 ring-1 ring-gold-500/30">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="gold">request</Badge>
                  {g.category ? <Badge variant="muted">{g.category}</Badge> : null}
                </div>
                <div className="mt-1.5 font-semibold">{g.name}</div>
                <div className="text-ink-300 text-xs mt-0.5">
                  Requested by {creator?.full_name ?? "a member"}
                  {g.created_at ? ` · ${fmtCreated(g.created_at)}` : ""}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <form action={rejectGroupRequestAction}>
                    <input type="hidden" name="group_id" value={g.id} />
                    <button
                      type="submit"
                      className="w-full h-10 rounded-full bg-ink-800 hairline text-ink-200 text-[13px] font-medium"
                    >
                      Decline
                    </button>
                  </form>
                  <form action={approveGroupRequestAction}>
                    <input type="hidden" name="group_id" value={g.id} />
                    <button
                      type="submit"
                      className="w-full h-10 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[13px] font-semibold"
                    >
                      Approve
                    </button>
                  </form>
                </div>
              </Card>
            );
          })}
        </>
      ) : null}

      <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-1">
        Groups ({liveGroups.length})
      </div>

      {liveGroups.length === 0 ? (
        <Card className="p-4">
          <div className="text-ink-300 text-sm">No groups yet.</div>
        </Card>
      ) : (
        liveGroups.map((g: any) => (
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
