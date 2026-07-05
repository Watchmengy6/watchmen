"use server";
import { runInBackground } from "@/lib/utils/background";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { notifyAdminNewSignup, signupReceived } from "@/lib/mail/send";
import { sendPushToAdmins } from "@/lib/push/send";

export async function loginAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Where to land after login. Only internal paths are honored (no
  // open-redirect), and never bounce back to /login itself.
  const nextRaw = String(formData.get("next") ?? "");
  const next =
    nextRaw.startsWith("/") &&
    !nextRaw.startsWith("//") &&
    !nextRaw.startsWith("/login")
      ? nextRaw
      : "/app/home";
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
  redirect(next);
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
  // Terms acceptance is the moment of contract formation between the new
  // member and The Watchmen. Apple App Store review (Guideline 5.1.1)
  // expects a deliberate consent step before account creation — and a
  // crafted client request must not be able to bypass it. The client
  // checkbox submits "agreed_terms"=1; we reject any signup without it.
  const agreed_terms = String(formData.get("agreed_terms") ?? "").trim();

  if (!email || !password || !full_name) {
    return { error: "Name, email, and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (agreed_terms !== "1") {
    return {
      error:
        "You must agree to the Terms of Service and Privacy Policy to create an account.",
    };
  }

  // Validate the invite code BEFORE creating the account. Previously a
  // typo'd/invalid code still created an unattributed pending account —
  // with 200 signups on event night (July 11) those become silent
  // attribution holes instead of a clear "check your link" error
  // (Codex pre-launch audit). Lookup is case-insensitive and we forward
  // the CANONICAL stored code so the DB trigger's exact match works
  // even if the member typed it in the wrong case. Service-role client:
  // profiles.invite_code is column-revoked from `authenticated`.
  let canonicalInviteCode = invite_code;
  if (invite_code) {
    // Escape ilike wildcards — a crafted code of just "%" would
    // otherwise match ANY member's invite code.
    const escaped = invite_code.replace(/[\\%_]/g, "\\$&");
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { data: inviter } = await supabaseAdmin()
      .from("profiles")
      .select("invite_code")
      .ilike("invite_code", escaped)
      .limit(1)
      .maybeSingle();
    if (!inviter) {
      return {
        error:
          "That invite code isn't valid. Re-open your invite link, or ask the brother who invited you for a fresh one.",
      };
    }
    canonicalInviteCode = inviter.invite_code;
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
        invite_code: canonicalInviteCode,
      },
    },
  });
  if (error) {
    // Translate the two errors 200 strangers WILL hit on event night
    // into plain instructions instead of Supabase jargon
    // (final pre-launch audit, July 2026).
    const msg = error.message ?? "";
    if (/already registered|already exists|duplicate/i.test(msg)) {
      return {
        error:
          "That email already has an account. Go back and sign in instead — or use “Forgot password?” on the sign-in screen.",
      };
    }
    if ((error as { status?: number }).status === 429 || /rate limit|too many/i.test(msg)) {
      return {
        error:
          "A lot of brothers are signing up right now. Wait a minute and tap Submit again — your info is still filled in.",
      };
    }
    return { error: msg };
  }

  // Truly fire-and-forget: detach the admin email + push + applicant
  // confirmation email so slow provider latency never delays the new
  // member's redirect to /pending. (Mirrors the fan-out pattern in
  // fileReportAction.) Admin email goes only if RESEND_ADMIN_NOTIFY_TO
  // is set; the push to admins and the confirmation email to the new
  // signup fire regardless.
  runInBackground(async () => {
    try {
      const adminInbox = process.env.RESEND_ADMIN_NOTIFY_TO;
      if (adminInbox) {
        const adminEmails = adminInbox
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (adminEmails.length > 0) {
          await notifyAdminNewSignup({
            adminEmails,
            newMemberName: full_name,
            newMemberEmail: email,
          });
        }
      } else {
        console.warn("[signup] RESEND_ADMIN_NOTIFY_TO not set — admin email skipped");
      }
      // Confirmation email to the applicant — closes the loop so they
      // know the request was received and they're not staring at the
      // pending screen wondering if anything happened.
      await signupReceived({ to: email, fullName: full_name });
      // Push fires regardless of email config — admin push subscriptions
      // are independent of the email notify env var.
      await sendPushToAdmins({
        title: "New signup awaiting approval",
        body: `${full_name} just requested access`,
        url: "/admin/pending",
        tag: "admin-pending",
      });
    } catch (e) {
      console.warn("[signup] admin notify failed (non-fatal)", e);
    }
  });

  // The trigger creates the profile as pending. Take them to /pending.
  redirect("/pending");
}

/**
 * Step 1 of the forgot-password flow: email the member a reset link.
 *
 * Supabase sends its "Reset Password" template. That template MUST be
 * set (Dashboard → Authentication → Emails → Reset Password) to link to:
 *
 *   {{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery
 *
 * We use the token_hash form (verified server-side in
 * resetPasswordAction) instead of the default ConfirmationURL because
 * the member requests the reset inside the NATIVE APP's webview but
 * opens the email link in Safari — a different browser context, so any
 * PKCE/code flow would fail with a missing code-verifier. token_hash
 * verification is context-free and works wherever the link is opened.
 */
export async function requestPasswordResetAction(
  _prev: unknown,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email address." };

  const supabase = supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  // Rate-limit errors are worth surfacing; "user not found" is NOT —
  // never leak which emails have accounts.
  if (error && /rate|seconds/i.test(error.message)) {
    return { error: "Too many requests — wait a minute and try again." };
  }
  return { sent: true };
}

/** Step 2: verify the emailed token and set the new password. */
export async function resetPasswordAction(_prev: unknown, formData: FormData) {
  const token_hash = String(formData.get("token_hash") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token_hash) {
    return { error: "This reset link is invalid. Request a new one." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const supabase = supabaseServer();
  // verifyOtp consumes the one-time token and signs the member in (sets
  // the session cookies), which is what lets updateUser change the
  // password without knowing the old one.
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash,
  });
  if (verifyErr) {
    return {
      error:
        "This reset link is invalid or has expired. Request a new one from the sign-in screen.",
    };
  }

  const { error: updateErr } = await supabase.auth.updateUser({ password });
  if (updateErr) return { error: updateErr.message };

  // They're signed in with the new password — drop them into the app.
  // Middleware still bounces non-approved members to /pending.
  redirect("/app/home");
}

export async function logoutAction() {
  const supabase = supabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
