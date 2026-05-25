"use client";

import { useTransition } from "react";
import { setRoleAction } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/Toast";

export function RoleSelect({ profileId, role }: { profileId: string; role: string }) {
  const [pending, start] = useTransition();
  const { push } = useToast();

  return (
    <select
      defaultValue={role}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          const r = await setRoleAction(profileId, e.target.value as any);
          if ((r as any).error) {
            push({ title: "Couldn't update", body: (r as any).error, variant: "error" });
          } else {
            push({ title: "Role updated", variant: "success" });
          }
        })
      }
      className="mt-1 h-7 rounded-full bg-ink-800 hairline text-[11px] text-ink-100 px-2"
    >
      <option value="member">member</option>
      <option value="admin">admin</option>
      <option value="super_admin">super_admin</option>
    </select>
  );
}
