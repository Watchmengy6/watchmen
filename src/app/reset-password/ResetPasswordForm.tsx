"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { resetPasswordAction } from "@/lib/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" size="lg" fullWidth loading={pending}>
      Save new password
    </Button>
  );
}

export function ResetPasswordForm({ tokenHash }: { tokenHash: string }) {
  const [state, formAction] = useFormState(resetPasswordAction, {} as {
    error?: string;
  });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <div>
        <Label>New password</Label>
        <PasswordInput
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </div>
      <div>
        <Label>Confirm new password</Label>
        <PasswordInput
          name="confirm"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Type it again"
        />
      </div>
      {state?.error ? (
        <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-red-200 text-sm px-3 py-2">
          {state.error}{" "}
          <Link href="/forgot-password" className="underline text-red-100">
            Get a new link
          </Link>
        </div>
      ) : null}
      <SubmitButton />
    </form>
  );
}
