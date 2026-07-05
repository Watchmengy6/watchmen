"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { requestPasswordResetAction } from "@/lib/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" size="lg" fullWidth loading={pending}>
      Send reset link
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(requestPasswordResetAction, {} as {
    error?: string;
    sent?: boolean;
  });

  if (state?.sent) {
    return (
      <div className="rounded-2xl bg-ink-800/80 hairline px-4 py-5 text-center">
        <div className="text-2xl mb-2">📬</div>
        <div className="text-white text-[15px] font-semibold">
          Check your email
        </div>
        <p className="text-ink-300 text-[13.5px] mt-1.5 leading-relaxed">
          If an account exists for that address, a password-reset link is on
          its way. The link expires after an hour — check spam if you
          don&apos;t see it.
        </p>
      </div>
    );
  }

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
      {state?.error ? (
        <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-red-200 text-sm px-3 py-2">
          {state.error}
        </div>
      ) : null}
      <SubmitButton />
    </form>
  );
}
