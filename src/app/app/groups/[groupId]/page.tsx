import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";
import { joinGroupAction, leaveGroupAction } from "@/lib/groups/actions";

export const dynamic = "force-dynamic";

export default async function GroupDetail({
  params,
}: {
  params: { groupId: string };
}) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, category, cover_url, created_at, created_by")
    .eq("id", params.groupId)
    .maybeSingle();
  if (!group) notFound();

  // Members + thread both depend only on group.id, not on each other —
  // run in parallel. Saves ~one round-trip on every group open; per the
  // Codex Part 2 audit this was the single biggest perf win on the
  // group detail page (~500ms on real-device cold loads).
  const [{ data: members }, { data: thread }] = await Promise.all([
    supabase
      .from("group_members")
      .select(
        "user_id, role, profile:profiles!group_members_user_id_fkey(id, full_name, profile_photo_url)",
      )
      .eq("group_id", group.id),
    supabase
      .from("threads")
      .select("id")
      .eq("group_id", group.id)
      .maybeSingle(),
  ]);

  const memberCount = members?.length ?? 0;
  const iAmMember = (members ?? []).some((m: any) => m.user_id === profile.id);

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Link
            href="/app/groups"
            aria-label="Back"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-800 hairline text-ink-100 text-lg"
          >
            ‹
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-white text-[16px] font-semibold leading-tight truncate">
              {group.name}
            </div>
            <div className="text-[11px] text-gold-300/80 uppercase tracking-wider">
              {group.category} · {memberCount} members
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Hero */}
        {group.cover_url ? (
          <div className="rounded-2xl overflow-hidden ring-1 ring-gold-500/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={group.cover_url}
              alt=""
              className="w-full h-44 object-cover"
            />
            <div className="bg-gradient-to-br from-gold-500/15 via-gold-700/5 to-transparent p-5">
              <div className="text-white text-[20px] font-semibold">{group.name}</div>
              {group.description ? (
                <p className="text-ink-200 text-[14px] mt-1.5 leading-relaxed">
                  {group.description}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-gradient-to-br from-gold-500/20 via-gold-700/10 to-transparent ring-1 ring-gold-500/30 p-5">
            <div className="h-14 w-14 rounded-xl bg-ink-900/60 ring-1 ring-gold-500/30 flex items-center justify-center text-[28px]">
              {group.name[0]?.toUpperCase()}
            </div>
            <div className="text-white text-[20px] font-semibold mt-3">{group.name}</div>
            {group.description ? (
              <p className="text-ink-200 text-[14px] mt-1.5 leading-relaxed">
                {group.description}
              </p>
            ) : null}
          </div>
        )}

        {/* CTA — chat or join */}
        {iAmMember ? (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/app/groups/${group.id}/chat`}
              className="h-11 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black font-semibold text-[14px] inline-flex items-center justify-center"
            >
              Open chat
            </Link>
            <form action={leaveGroupAction}>
              <input type="hidden" name="group_id" value={group.id} />
              <button
                type="submit"
                className="w-full h-11 rounded-full bg-ink-800 hairline text-ink-200 text-[14px] font-medium"
              >
                Leave
              </button>
            </form>
          </div>
        ) : (
          <form action={joinGroupAction}>
            <input type="hidden" name="group_id" value={group.id} />
            <button
              type="submit"
              className="w-full h-12 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black font-semibold text-[15px]"
            >
              Join group
            </button>
          </form>
        )}

        {/* Members */}
        <div>
          <div className="text-[10.5px] tracking-[0.22em] uppercase text-ink-400 mb-2 px-1">
            Members
          </div>
          <div className="rounded-2xl bg-ink-800/80 hairline divide-y divide-white/[0.04]">
            {(members ?? []).map((row: any) => {
              const p = Array.isArray(row.profile) ? row.profile[0] : row.profile;
              if (!p) return null;
              return (
                <Link
                  key={p.id}
                  href={`/app/members/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-white/[0.02]"
                >
                  <Avatar src={p.profile_photo_url ?? undefined} name={p.full_name} size={36} />
                  <div className="flex-1 min-w-0 text-white text-[14px]">
                    {p.full_name}
                  </div>
                  {row.role === "admin" ? (
                    <span className="text-[10px] text-gold-300 uppercase tracking-wider">
                      Admin
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
