import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Sign in · The Watchmen" };

export default function LoginPage() {
  return (
    <main className="min-h-[100dvh] flex flex-col px-6 safe-top safe-bottom">
      <div className="pt-6">
        <Link
          href="/"
          className="h-9 w-9 -ml-1 inline-flex items-center justify-center text-ink-300 text-lg"
          aria-label="Back"
        >
          ‹
        </Link>
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="flex justify-center mb-6">
          <Logo className="h-16 w-16 text-gold-400" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-center">Welcome back</h1>
        <p className="text-ink-300 mt-2 text-[15px] text-center">
          Sign in to the private network.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
        <div className="mt-8 text-center text-sm text-ink-300">
          Have an invite link? Open it to sign up — admin will approve you.
        </div>
      </div>
    </main>
  );
}
