"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { INTERESTS } from "./interests";

export async function updateProfileAction(_prev: unknown, formData: FormData) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Cap free-text fields server-side so a crafted client can't store
  // multi-MB payloads (DB bloat / abuse). Trim then slice to a sane max.
  const cap = (key: string, max: number) =>
    String(formData.get(key) ?? "").trim().slice(0, max);
  const full_name = cap("full_name", 120);
  const bio = cap("bio", 1000);
  const occupation = cap("occupation", 200);
  const company = cap("company", 200);
  const instagram_url = cap("instagram_url", 300);
  const phone = cap("phone", 40);
  const profile_photo_url = cap("profile_photo_url", 600);
  const usernameRaw = cap("username", 24).toLowerCase();
  const venmo = cap("venmo_username", 60).replace(/^@/, "");
  const cashapp = cap("cashapp_username", 60).replace(/^\$/, "");
  const birthday = cap("birthday", 20);
  const spouse = cap("spouse", 120);
  const kids = cap("kids", 300);
  const interests = (formData.getAll("interests") as string[]).filter((i) =>
    INTERESTS.includes(i),
  );

  if (!full_name) return { error: "Name is required." };

  // Validate username: 3-24 chars, lowercase letters/digits/underscore/dash only.
  let username: string | null = null;
  if (usernameRaw) {
    if (!/^[a-z0-9_-]{3,24}$/.test(usernameRaw)) {
      return {
        error: "Username must be 3–24 chars: lowercase letters, digits, _ or -.",
      };
    }
    // Check uniqueness (ignoring my own row).
    const { data: taken } = await supabase
      .from("profiles")
      .select("id, auth_user_id")
      .eq("username", usernameRaw)
      .maybeSingle();
    if (taken && taken.auth_user_id !== user.id) {
      return { error: "That username is already taken." };
    }
    username = usernameRaw;
  }

  const update: Record<string, unknown> = {
    full_name,
    bio: bio || null,
    occupation: occupation || null,
    company: company || null,
    instagram_url: instagram_url || null,
    phone: phone || null,
    profile_photo_url: profile_photo_url || null,
    interests,
    venmo_username: venmo || null,
    cashapp_username: cashapp || null,
    birthday: birthday || null,
    spouse: spouse || null,
    kids: kids || null,
  };
  if (username) update.username = username;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("auth_user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/app/profile");
  revalidatePath("/app/home");
  return { success: true } as const;
}
