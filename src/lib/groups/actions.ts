"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPushToUser, sendPushToSuperAdmins } from "@/lib/push/send";
import { runInBackground } from "@/lib/utils/background";

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

const KINDS = ["group", "meetup", "hobby"] as const;

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
  // kind = the color-coded flavor (group / meetup / hobby) from migration 00029.
  const kindRaw = String(formData.get("kind") ?? "group").trim();
  const kind = (KINDS as readonly string[]).includes(kindRaw) ? kindRaw : "group";
  const coverUrl = String(formData.get("cover_url") ?? "").trim() || null;
  if (!name) return;

  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me) return;

  // Request-and-approve model (Dustin's call, July 2026): super-admin
  // groups go live instantly; everyone else's group is created as a
  // PENDING REQUEST — visible only to them + admins (RLS, migration
  // 00053) until approved in the Command Room.
  const goesLiveInstantly = me.role === "super_admin";

  const baseSlug = slugify(name) || "group";
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
      kind,
      cover_url: coverUrl,
      created_by: me.id,
      status: goesLiveInstantly ? "active" : "pending",
    })
    .select("id")
    .single();
  if (error || !g) {
    console.error("[createGroupAction]", error);
    redirect("/app/groups");
  }

  // New request — ping the super admins so Dustin can approve from
  // the Command Room without waiting to stumble across it.
  if (!goesLiveInstantly) {
    const requesterName = me.full_name ?? "A brother";
    const requesterId = me.id;
    const groupName = name;
    runInBackground(async () => {
      try {
        await sendPushToSuperAdmins({
          actorProfileId: requesterId,
          payload: {
            title: "Group request",
            body: `${requesterName} wants to start "${groupName}"`,
            url: "/admin/groups",
            tag: `group-request:${g.id}`,
          },
        });
      } catch (e) {
        console.warn("[group.request] push failed (non-fatal)", e);
      }
    });
  }

  revalidatePath("/app/groups");
  redirect(`/app/groups/${g.id}`);
}

/**
 * ADMIN — approve a pending group request: flips it live and tells the
 * requester. Service-role write (page is admin-gated; we re-check here).
 */
export async function approveGroupRequestAction(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "").trim();
  if (!groupId) return;
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || (me.role !== "admin" && me.role !== "super_admin")) return;

  const admin = supabaseAdmin();
  const { data: g } = await admin
    .from("groups")
    .select("id, name, created_by, status")
    .eq("id", groupId)
    .maybeSingle();
  if (!g || g.status !== "pending") return;

  const { error } = await admin
    .from("groups")
    .update({ status: "active" })
    .eq("id", groupId)
    .eq("status", "pending");
  if (error) {
    console.error("[group.approve]", error);
    return;
  }

  runInBackground(async () => {
    try {
      await sendPushToUser({
        userId: g.created_by,
        payload: {
          title: "Your group is live 🎉",
          body: `"${g.name}" was approved — brothers can join it now.`,
          url: `/app/groups/${g.id}`,
          tag: `group-approved:${g.id}`,
        },
      });
    } catch (e) {
      console.warn("[group.approve] push failed (non-fatal)", e);
    }
  });

  revalidatePath("/admin/groups");
  revalidatePath("/app/groups");
}

/**
 * ADMIN — decline a pending group request: deletes the group (cascade
 * cleans members/thread) and tells the requester.
 */
export async function rejectGroupRequestAction(formData: FormData) {
  const groupId = String(formData.get("group_id") ?? "").trim();
  if (!groupId) return;
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!me || (me.role !== "admin" && me.role !== "super_admin")) return;

  const admin = supabaseAdmin();
  const { data: g } = await admin
    .from("groups")
    .select("id, name, created_by, status")
    .eq("id", groupId)
    .maybeSingle();
  if (!g || g.status !== "pending") return;

  const { error } = await admin.from("groups").delete().eq("id", groupId);
  if (error) {
    console.error("[group.reject]", error);
    return;
  }

  runInBackground(async () => {
    try {
      await sendPushToUser({
        userId: g.created_by,
        payload: {
          title: "Group request declined",
          body: `"${g.name}" wasn't approved this time — reach out to Dustin with questions.`,
          url: "/app/groups",
          tag: `group-rejected:${groupId}`,
        },
      });
    } catch (e) {
      console.warn("[group.reject] push failed (non-fatal)", e);
    }
  });

  revalidatePath("/admin/groups");
  revalidatePath("/app/groups");
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

  // Delete group membership. The
  // sync_group_member_remove_from_thread trigger (migration 00011) will
  // also remove this user from the group's thread_members row.
  await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", me.id);

  // Belt-and-suspenders: also remove from the thread in case the trigger
  // ever fails or hasn't migrated yet.
  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("group_id", groupId)
    .maybeSingle();
  if (thread) {
    await supabase
      .from("thread_members")
      .delete()
      .eq("thread_id", thread.id)
      .eq("user_id", me.id);
  }

  revalidatePath(`/app/groups/${groupId}`);
  revalidatePath("/app/groups");
  revalidatePath("/app/dms");
}
