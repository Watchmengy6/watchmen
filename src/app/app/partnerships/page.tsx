import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Member-facing partnerships list. Shows every active partnership in
 * sort order, with logo, discount details, location, and an optional
 * link out to the business. Linked from /app/profile.
 */
export default async function PartnershipsPage() {
  await requireApproved();
  const supabase = supabaseServer();

  const { data: rows } = await supabase
    .from("partnerships")
    .select(
      "id, name, blurb, discount_details, location_name, address, link_url, logo_url",
    )
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const list = rows ?? [];

  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Link
            href="/app/profile"
            aria-label="Back"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-800 hairline text-ink-100 text-lg"
          >
            ‹
          </Link>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Profile
            </div>
            <div className="text-white text-[16px] font-semibold leading-tight">
              Partnerships
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <p className="text-ink-300 text-[13.5px] mb-4">
          Pull up your{" "}
          <Link href="/app/profile/card" className="text-gold-300 underline">
            Member Card
          </Link>{" "}
          at these spots to get your Watchmen discount.
        </p>
        {list.length === 0 ? (
          <div className="text-center text-ink-300 text-[14px] py-10">
            No partnerships yet. Dustin&apos;s working on it.
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl bg-ink-800/80 hairline p-4"
              >
                <div className="flex items-start gap-3">
                  {p.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.logo_url}
                      alt=""
                      className="h-14 w-14 rounded-xl object-cover ring-1 ring-white/[0.06] shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-gold-500/15 ring-1 ring-gold-500/25 flex items-center justify-center text-gradient-gold text-xl font-semibold shrink-0">
                      {p.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-[15.5px] font-semibold leading-tight">
                      {p.name}
                    </div>
                    {p.location_name ? (
                      <div className="text-ink-400 text-[12px] mt-0.5">
                        {p.location_name}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-gold-500/10 ring-1 ring-gold-500/25 px-3 py-2.5">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-gold-300/80">
                    Watchmen discount
                  </div>
                  <div className="text-white text-[13.5px] mt-0.5">
                    {p.discount_details}
                  </div>
                </div>
                {p.blurb ? (
                  <p className="text-ink-200 text-[13px] mt-3 leading-relaxed">
                    {p.blurb}
                  </p>
                ) : null}
                {p.link_url || p.address ? (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {p.link_url ? (
                      <a
                        href={p.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-8 px-3 rounded-full bg-ink-700 hairline text-ink-100 text-[12px] font-medium inline-flex items-center"
                      >
                        Visit site
                      </a>
                    ) : null}
                    {p.address ? (
                      <a
                        href={`https://maps.apple.com/?q=${encodeURIComponent(p.address)}`}
                        className="h-8 px-3 rounded-full bg-ink-700 hairline text-ink-100 text-[12px] font-medium inline-flex items-center"
                      >
                        Directions
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
