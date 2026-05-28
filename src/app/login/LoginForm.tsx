"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { loginAction } from "@/lib/auth/actions";
import { SignInWithAppleButton } from "@/components/auth/SignInWithAppleButton";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" size="lg" fullWidth loading={pending}>
      Sign in
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, { error: "" } as { error?: string });
  return (
    <form action={formAction} className="space-y-4">
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

      {/* Apple Sign In — App Store requires this alongside email auth.
          The provider has to be enabled in Supabase dashboard before
          the button actually works in production. */}
      <div className="relative pt-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.08]" />
          <div className="text-[11px] uppercase tracking-[0.22em] text-ink-400">
            or
          </div>
          <div className="flex-1 h-px bg-white/[0.08]" />
        </div>
      </div>
      <SignInWithAppleButton />
    </form>
  );
}
