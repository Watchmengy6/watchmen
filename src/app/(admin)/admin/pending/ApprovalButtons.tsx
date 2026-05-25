"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { approveMemberAction, rejectMemberAction } from "@/lib/admin/actions";
import { useToast } from "@/components/ui/Toast";

export function ApprovalButtons({ profileId }: { profileId: string }) {
  const [pending, start] = useTransition();
  const { push } = useToast();

  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Button
        variant="outline"
        size="md"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await rejectMemberAction(profileId);
            if ((r as any).error) push({ title: "Failed", body: (r as any).error, variant: "error" });
            else push({ title: "Rejected", variant: "default" });
          })
        }
      >
        Reject
      </Button>
      <Button
        variant="gold"
        size="md"
        loading={pending}
        onClick={() =>
          start(async () => {
            const r = await approveMemberAction(profileId);
            if ((r as any).error) push({ title: "Failed", body: (r as any).error, variant: "error" });
            else push({ title: "Approved", body: "Inviter awarded +50.", variant: "success" });
          })
        }
      >
        Approve
      </Button>
    </div>
  );
}
