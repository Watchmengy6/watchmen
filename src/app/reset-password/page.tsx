import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Set new password · The Watchmen" };

/**
 * Landing page for the emailed reset link:
 *   /reset-password?token_hash=...&type=recovery
 * The token is verified server-side on submit (resetPasswordAction), so
 * this page works no matter which browser the email opens in.
 */
export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { token_hash?: string };
}) {
  const tokenHash = searchParams?.token_hash ?? "";

  return (
    <main className="min-h-[100dvh] flex flex-col px-6 safe-top safe-bottom">
      <div className="pt-6" />
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="flex justify-center mb-6">
          <Logo className="h-16 w-16 text-gold-400" />
        </div>
        {tokenHash ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight text-center">
              Set a new password
            </h1>
            <p className="text-ink-300 mt-2 text-[15px] text-center">
              Choose a new password for your account.
            </p>
            <div className="mt-8">
              <ResetPasswordForm tokenHash={tokenHash} />
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-ink-800/80 hairline px-4 py-5 text-center">
            <div className="text-white text-[15px] font-semibold">
              This link isn&apos;t valid
            </div>
            <p className="text-ink-300 text-[13.5px] mt-1.5 leading-relaxed">
              The reset link is missing or incomplete. Request a fresh one and
              open the newest email.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center justify-center h-10 px-5 mt-4 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[14px] font-semibold"
            >
              Request a new link
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
