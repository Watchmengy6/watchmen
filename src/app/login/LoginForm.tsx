"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { loginAction } from "@/lib/auth/actions";
// Sign in with Apple was removed for v1.0: Apple's review (June 9 2026)
// rejected the build because the OAuth flow opened in Safari, which
// they treat as "taking the user out of the app to sign in." Guideline
// 4.8 only requires SIWA when you also offer third-party social sign-in
// (Google, Facebook, etc.) — email-only is fine without it. We can wire
// real native SIWA via @capacitor-community/apple-sign-in in v1.1.

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" size="lg" fullWidth loading={pending}>
      Sign in
    </Button>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useFormState(loginAction, { error: "" } as { error?: string });
  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>
      <div>
        <Label>Password</Label>
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>
      {state?.error ? (
        <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-red-200 text-sm px-3 py-2">
          {state.error}
        </div>
      ) : null}
      <SubmitButton />
    </form>
  );
}
