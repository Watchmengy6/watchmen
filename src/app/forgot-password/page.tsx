import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = { title: "Forgot password · The Watchmen" };

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-[100dvh] flex flex-col px-6 safe-top safe-bottom">
      <div className="pt-6">
        <Link
          href="/login"
          className="h-9 w-9 -ml-1 inline-flex items-center justify-center text-ink-300 text-lg"
          aria-label="Back to sign in"
        >
          ‹
        </Link>
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="flex justify-center mb-6">
          <Logo className="h-16 w-16 text-gold-400" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-center">
          Reset your password
        </h1>
        <p className="text-ink-300 mt-2 text-[15px] text-center">
          Enter your email and we&apos;ll send you a link to set a new one.
        </p>
        <div className="mt-8">
          <ForgotPasswordForm />
        </div>
        <div className="mt-8 text-center text-sm text-ink-300">
          Remembered it?{" "}
          <Link href="/login" className="text-gold-300 hover:text-gold-200">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
