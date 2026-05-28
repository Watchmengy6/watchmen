import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";
import { startDmAction } from "@/lib/dms/actions";

export const dynamic = "force-dynamic";

export default async function NewDmPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const { profile } = await requireApproved();
  const supabase = supabaseServer();
  const q = (searchParams?.q ?? "").trim();

  let query = supabase
    .from("profiles")
    .select("id, full_name, profile_photo_url, occupation, company")
    .eq("status", "approved")
    .neq("id", profile.id)
    .order("full_name");
  if (q) query = query.ilike("full_name", `%${q}%`);
  const { data: members } = await query;

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Link
            href="/app/dms"
            aria-label="Back"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-800 hairline text-ink-100 text-lg"
          >
            ‹
          </Link>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              New message
            </div>
            <div className="text-white text-[18px] font-semibold leading-tight">
              Pick a brother
            </div>
          </div>
        </div>
        <form action="/app/dms/new" method="get" className="px-4 pb-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search brothers — name"
            className="w-full h-10 rounded-full bg-ink-800 hairline px-4 text-[14px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30"
          />
        </form>
      </div>

      <ul className="divide-y divide-white/[0.04]">
        {(members ?? []).map((m: any) => (
          <li key={m.id}>
            <form action={startDmAction}>
              <input type="hidden" name="other_profile_id" value={m.id} />
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/[0.02] text-left"
              >
                <Avatar src={m.profile_photo_url ?? undefined} name={m.full_name} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="text-white text-[15px] font-semibold truncate">
                    {m.full_name}
                  </div>
                  {m.occupation || m.company ? (
                    <div className="text-ink-300 text-[12px] truncate">
                      {[m.occupation, m.company].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                </div>
                <div className="text-ink-300">›</div>
              </button>
            </form>
          </li>
        ))}
        {(members ?? []).length === 0 ? (
          <li className="px-6 py-16 text-center text-ink-300 text-sm">
            No matches.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
