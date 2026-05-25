"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function loginAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  const supabase = supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Login failed. Try again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile || profile.status !== "approved") redirect("/pending");
  redirect("/app/home");
}

export async function signupAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const occupation = String(formData.get("occupation") ?? "").trim() || null;
  const instagram_url = String(formData.get("instagram_url") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const invite_code = String(formData.get("invite_code") ?? "").trim() || null;

  if (!email || !password || !full_name) {
    return { error: "Name, email, and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = supabaseServer();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone,
        occupation,
        instagram_url,
        bio,
        invite_code,
      },
    },
  });
  if (error) return { error: error.message };

  // The trigger creates the profile as pending. Take them to /pending.
  redirect("/pending");
}

export async function logoutAction() {
  const supabase = supabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
