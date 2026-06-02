"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

async function requireAdminProfile() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || (me.role !== "admin" && me.role !== "super_admin")) return null;
  return me;
}

export async function upsertPartnershipAction(
  input: {
    id?: string;
    name: string;
    blurb: string;
    discount_details: string;
    location_name: string;
    address: string;
    link_url: string;
    logo_url: string;
    active: boolean;
    sort_order: number;
  },
): Promise<{ error?: string; success?: boolean }> {
  const me = await requireAdminProfile();
  if (!me) return { error: "Admin only." };

  const supabase = supabaseServer();
  const payload = {
    name: input.name.trim(),
    blurb: input.blurb.trim() || null,
    discount_details: input.discount_details.trim(),
    location_name: input.location_name.trim() || null,
    address: input.address.trim() || null,
    link_url: input.link_url.trim() || null,
    logo_url: input.logo_url.trim() || null,
    active: input.active,
    sort_order: input.sort_order,
  };
  if (!payload.name) return { error: "Name required." };
  if (!payload.discount_details) return { error: "Describe the discount." };

  const { error } = input.id
    ? await supabase.from("partnerships").update(payload).eq("id", input.id)
    : await supabase.from("partnerships").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/admin/partnerships");
  revalidatePath("/app/partnerships");
  return { success: true };
}

export async function deletePartnershipAction(
  id: string,
): Promise<{ error?: string; success?: boolean }> {
  const me = await requireAdminProfile();
  if (!me) return { error: "Admin only." };
  const supabase = supabaseServer();
  const { error } = await supabase.from("partnerships").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/partnerships");
  revalidatePath("/app/partnerships");
  return { success: true };
}
