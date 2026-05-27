import Link from "next/link";
import { SignupForm } from "./SignupForm";
import { Logo } from "@/components/brand/Logo";

export const metadata = { title: "Join · The Watchmen" };

export default function SignupPage({ searchParams }: { searchParams: { code?: string } }) {
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
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto py-8">
        <div className="flex justify-center mb-6">
          <Logo className="h-16 w-16 text-gold-400" />
        </div>
        <div className="text-[10px] tracking-[0.32em] uppercase text-gold-300/80 text-center">
          The Watchmen
        </div>
        <div className="text-[10.5px] tracking-[0.22em] uppercase text-ink-300 text-center mt-0.5">
          Got Your 6
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-center mt-5">
          Request access
        </h1>
        <p className="text-ink-300 mt-2 text-[15px] text-center">
          Submit your details. An admin will review your request and add you to the room.
        </p>
        <div className="mt-8">
          <SignupForm inviteCode={searchParams.code ?? ""} />
        </div>
      </div>
    </main>
  );
}
