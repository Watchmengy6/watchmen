"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";

export default function PreviewSignup() {
  return (
    <main className="min-h-[100dvh] flex flex-col px-6 safe-top safe-bottom">
      <div className="pt-10">
        <Link href="/preview/landing" className="text-[11px] tracking-[0.25em] uppercase text-gold-300/80">
          ← The Watchman
        </Link>
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto py-8">
        <h1 className="text-3xl font-semibold tracking-tight">Request access</h1>
        <p className="text-ink-300 mt-2 text-[15px]">
          Submit your details. Dustin will review your request.
        </p>
        <form className="space-y-4 mt-8" onSubmit={(e) => e.preventDefault()}>
          <div>
            <Label>Full name</Label>
            <Input defaultValue="Hunter Cole" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" defaultValue="hunter@coleboats.com" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" defaultValue="••••••••" />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input type="tel" defaultValue="+1 727 555 8821" />
          </div>
          <div>
            <Label>Occupation</Label>
            <Input defaultValue="Yacht broker" />
          </div>
          <div>
            <Label>Instagram (optional)</Label>
            <Input defaultValue="https://instagram.com/huntercole" />
          </div>
          <div>
            <Label>Short bio</Label>
            <Textarea rows={3} defaultValue="Selling boats, raising a son. Friend of Marcus." />
          </div>
          <div className="rounded-xl bg-gold-500/10 ring-1 ring-gold-500/25 text-gold-200 text-xs px-3 py-2">
            Invite code <span className="font-mono">wmn-marc8…</span> attached.
          </div>
          <Link href="/preview/pending">
            <Button variant="gold" size="lg" fullWidth>Submit request</Button>
          </Link>
          <p className="text-ink-400 text-xs text-center">
            By continuing you agree to keep this community private.
          </p>
        </form>
      </div>
    </main>
  );
}
