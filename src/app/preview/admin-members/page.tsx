import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { AdminPreviewShell } from "../AdminPreviewShell";
import { RolePicker } from "@/components/admin/RolePicker";
import { mockMembers } from "@/lib/preview/mock";

export default function PreviewAdminMembers() {
  const sorted = [...mockMembers].sort((a, b) => b.points_total - a.points_total);
  return (
    <AdminPreviewShell>
      <div className="px-4 space-y-3 pb-8">
        <div className="h-10 rounded-full bg-ink-800 hairline px-3.5 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
               strokeLinecap="round" className="h-4 w-4 text-ink-400">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            placeholder="Search members"
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-ink-400 outline-none"
          />
        </div>

        {sorted.map((m, i) => {
          const isDustin = m.id === "p_dustin";
          return (
            <Card key={m.id} className="p-3">
              <div className="flex items-center gap-3">
                <Avatar src={m.profile_photo_url} name={m.full_name} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-white text-[14px] font-semibold truncate">
                      {m.full_name}
                    </div>
                    {isDustin ? <Badge variant="gold">Founder</Badge> : null}
                  </div>
                  <div className="text-ink-300 text-[12px] truncate">
                    {m.occupation} · {m.company}
                  </div>
                  <div className="text-ink-500 text-[10.5px] mt-0.5">
                    @{(m as any).username ?? "—"}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="text-gold-300 font-semibold text-[14px] tabular-nums">
                    {m.points_total}
                  </div>
                  <RolePicker
                    initial={isDustin ? "super_admin" : "member"}
                    disabled={isDustin}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AdminPreviewShell>
  );
}
