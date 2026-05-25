import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in · The Watchman" };

export default function LoginPage() {
  return (
    <main className="min-h-[100dvh] flex flex-col px-6 safe-top safe-bottom">
      <div className="pt-10">
        <Link href="/" className="text-[11px] tracking-[0.25em] uppercase text-gold-300/80">
          ← The Watchman
        </Link>
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-ink-300 mt-2 text-[15px]">Sign in to the private network.</p>
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
