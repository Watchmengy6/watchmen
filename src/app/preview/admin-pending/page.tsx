import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { AdminPreviewShell } from "../AdminPreviewShell";
import { mockPending } from "@/lib/preview/mock";

export default function PreviewAdminPending() {
  return (
    <AdminPreviewShell>
      <div className="px-5 space-y-3 pb-6">
        {mockPending.map((p) => (
          <Card key={p.id}>
            <CardBody>
              <div className="flex items-start gap-3">
                <Avatar src={p.profile_photo_url} name={p.full_name} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="text-white font-semibold">{p.full_name}</div>
                  <div className="text-ink-300 text-sm break-all">{p.email}</div>
                  <div className="text-ink-400 text-xs mt-0.5">
                    Invited by: <span className="text-ink-200">{p.inviter.full_name}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <Field label="Occupation" value={p.occupation} />
                <Field label="Company" value={p.company} />
                <Field label="Phone" value={p.phone} />
                <Field label="Instagram" value={p.instagram_url} link />
              </div>
              {p.bio ? (
                <p className="text-ink-200 text-sm mt-3 leading-relaxed border-t border-white/[0.05] pt-3">
                  {p.bio}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.interests.map((i) => (
                  <span
                    key={i}
                    className="text-[10.5px] px-2 h-5 rounded-full bg-ink-800 hairline text-ink-300 inline-flex items-center"
                  >
                    {i}
                  </span>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" size="md">Reject</Button>
                <Button variant="gold" size="md">Approve</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </AdminPreviewShell>
  );
}

function Field({ label, value, link }: { label: string; value: string | null; link?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10.5px] text-ink-400 uppercase tracking-wide">{label}</div>
      {link ? (
        <a href={value} className="text-gold-300 break-all">{value}</a>
      ) : (
        <div className="text-ink-100 break-all">{value}</div>
      )}
    </div>
  );
}
