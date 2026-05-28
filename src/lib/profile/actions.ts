"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

const INTERESTS_WHITELIST = [
  "Marketing","Real estate","Fitness","Pickleball","Sports","Business",
  "Investing","Cars","Watches","Church","Networking","Entrepreneurship",
  "Construction","Tech","Content creation","Golf","Fishing","Boating",
];

export async function updateProfileAction(_prev: unknown, formData: FormData) {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const full_name = String(formData.get("full_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const occupation = String(formData.get("occupation") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const instagram_url = String(formData.get("instagram_url") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const profile_photo_url = String(formData.get("profile_photo_url") ?? "").trim();
  const usernameRaw = String(formData.get("username") ?? "").trim().toLowerCase();
  const interests = (formData.getAll("interests") as string[]).filter((i) =>
    INTERESTS_WHITELIST.includes(i),
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

export const INTERESTS = INTERESTS_WHITELIST;
