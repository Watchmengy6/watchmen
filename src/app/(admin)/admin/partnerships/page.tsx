import Link from "next/link";
import { redirect } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { PartnershipsEditor } from "./PartnershipsEditor";

export const dynamic = "force-dynamic";

/**
 * Admin CRUD page for partnerships. Lists every row (active + inactive)
 * and lets admins create, edit, deactivate, or delete each one.
 */
export default async function AdminPartnershipsPage() {
  const { profile } = await requireApproved();
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    redirect("/app/home");
  }

  const supabase = supabaseServer();
  const { data: rows } = await supabase
    .from("partnerships")
    .select(
      "id, name, blurb, discount_details, location_name, address, link_url, logo_url, active, sort_order, created_at",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="px-5 space-y-4">
      <div>
        <Link href="/admin" className="text-ink-300 text-[12px]">
          ‹ Command Room
        </Link>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight">
          Partnerships
        </h1>
        <p className="text-ink-300 text-[13px] mt-1">
          Manage partner discounts. Active ones show on every member&apos;s
          Profile → Partnerships.
        </p>
      </div>

      <PartnershipsEditor initialRows={rows ?? []} />
    </div>
  );
}
