"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { notifyAdminNewSignup } from "@/lib/mail/send";

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

  // Fire-and-forget: notify admins that someone is waiting for approval.
  // Email is best-effort — never block the signup flow.
  try {
    // Use the anon-client we already have; admin emails are visible to
    // admins via RLS, but for the notification we just need addresses.
    // We use a fresh server client to query admins by auth email.
    const { data: admins } = await supabase
      .from("profiles")
      .select("auth_user_id")
      .in("role", ["admin", "super_admin"])
      .eq("status", "approved");

    if (admins && admins.length > 0) {
      // Pull emails for those auth_user_ids via the admin endpoint we
      // can't reach from anon — fall back to reading the contact email
      // off the profile if present. For now, ship the notification to a
      // single configured admin email if RESEND_ADMIN_NOTIFY_TO is set.
      const adminInbox = process.env.RESEND_ADMIN_NOTIFY_TO;
      if (adminInbox) {
        await notifyAdminNewSignup({
          adminEmails: adminInbox.split(",").map((s) => s.trim()).filter(Boolean),
          newMemberName: full_name,
          newMemberEmail: email,
        });
      }
    }
  } catch (e) {
    console.warn("[signup] admin notify failed (non-fatal)", e);
  }

  // The trigger creates the profile as pending. Take them to /pending.
  redirect("/pending");
}

export async function logoutAction() {
  const supabase = supabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
