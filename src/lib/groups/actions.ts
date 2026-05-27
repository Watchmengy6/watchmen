"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

const CATEGORIES = [
  "business",
  "fitness",
  "faith",
  "family",
  "outdoors",
  "finance",
  "social",
  "other",
] as const;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function createGroupAction(formData: FormData): Promise<void> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const categoryRaw = String(formData.get("category") ?? "other").trim();
  const category = (CATEGORIES as readonly string[]).includes(categoryRaw)
    ? categoryRaw
    : "other";
  if (!name) return;

  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: me } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) return;

  let baseSlug = slugify(name) || "group";
  let slug = baseSlug;
  let suffix = 0;
  // Ensure uniqueness — small loop.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: exists } = await supabase
      .from("groups")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!exists) break;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
    if (suffix > 50) {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      break;
    }
  }

  const { data: g, error } = await supabase
    .from("groups")
    .insert({
      name,
      slug,
      description,
      category,
      created_by: me.id,
    })
    .select("id")
    .single();
  if (error || !g) {
    console.error("[createGroupAction]", error);
    redirect("/app/groups");
  }

  revalidatePath("/app/groups");
  redirect(`/app/groups/${g.id}`);
}

export async function joinGroupAction(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "").trim();
  if (!groupId) return;
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) return;
  await supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: me.id, role: "member" });
  revalidatePath(`/app/groups/${groupId}`);
  revalidatePath("/app/groups");
}

export async function leaveGroupAction(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "").trim();
  if (!groupId) return;
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) return;
  await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", me.id);
  revalidatePath(`/app/groups/${groupId}`);
  revalidatePath("/app/groups");
}
