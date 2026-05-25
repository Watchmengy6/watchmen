import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Join · The Watchman" };

export default function SignupPage({ searchParams }: { searchParams: { code?: string } }) {
  return (
    <main className="min-h-[100dvh] flex flex-col px-6 safe-top safe-bottom">
      <div className="pt-10">
        <Link href="/" className="text-[11px] tracking-[0.25em] uppercase text-gold-300/80">
          ← The Watchman
        </Link>
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Request access</h1>
        <p className="text-ink-300 mt-2 text-[15px]">
          Submit your details. Dustin will review your request.
        </p>
        <div className="mt-8">
          <SignupForm inviteCode={searchParams.code ?? ""} />
        </div>
      </div>
    </main>
  );
}
