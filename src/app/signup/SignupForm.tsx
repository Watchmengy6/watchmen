"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { signupAction } from "@/lib/auth/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" size="lg" fullWidth loading={pending}>
      Submit request
    </Button>
  );
}

export function SignupForm({ inviteCode }: { inviteCode: string }) {
  const [state, formAction] = useFormState(signupAction, { error: "" } as { error?: string });
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="invite_code" defaultValue={inviteCode} />

      <div>
        <Label>Full name</Label>
        <Input name="full_name" required autoComplete="name" placeholder="Aaron Pilkington" />
      </div>
      <div>
        <Label>Email</Label>
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <Label>Password</Label>
        <Input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
      </div>
      <div>
        <Label>Phone (optional)</Label>
        <Input name="phone" type="tel" autoComplete="tel" placeholder="+1 ..." />
      </div>
      <div>
        <Label>Occupation</Label>
        <Input name="occupation" placeholder="Founder, Real Estate, ..." />
      </div>
      <div>
        <Label>Instagram (optional)</Label>
        <Input name="instagram_url" placeholder="https://instagram.com/yourhandle" />
      </div>
      <div>
        <Label>Short bio</Label>
        <Textarea name="bio" rows={3} placeholder="Two lines about who you are." />
      </div>

      {inviteCode ? (
        <div className="rounded-xl bg-gold-500/10 ring-1 ring-gold-500/25 text-gold-200 text-xs px-3 py-2">
          Invite code <span className="font-mono">{inviteCode.slice(0, 8)}…</span> attached.
        </div>
      ) : (
        <div className="rounded-xl bg-ink-800 hairline text-ink-300 text-xs px-3 py-2">
          No invite code. Admin will still need a referral to approve you.
        </div>
      )}

      {state?.error ? (
        <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-red-200 text-sm px-3 py-2">
          {state.error}
        </div>
      ) : null}

      <Submit />

      <p className="text-ink-400 text-xs text-center">
        By continuing you agree to keep this community private.
      </p>
    </form>
  );
}
