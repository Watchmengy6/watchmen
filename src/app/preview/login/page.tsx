"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Logo } from "@/components/brand/Logo";

export default function PreviewLogin() {
  return (
    <main className="min-h-[100dvh] flex flex-col px-6 safe-top safe-bottom">
      <div className="pt-6">
        <Link
          href="/preview/landing"
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
        <form className="space-y-4 mt-8" onSubmit={(e) => e.preventDefault()}>
          <div>
            <Label>Email</Label>
            <Input type="email" defaultValue="aaron@skyway.media" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" defaultValue="••••••••" />
          </div>
          <Link href="/preview/home">
            <Button variant="gold" size="lg" fullWidth>Sign in</Button>
          </Link>
        </form>
        <div className="mt-8 text-center text-sm text-ink-300">
          Have an invite link? Open it to sign up — admin will approve you.
        </div>
      </div>
    </main>
  );
}
