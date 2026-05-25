import { Card } from "@/components/ui/Card";

export function StatsRow({
  points,
  eventsAttended,
  invitesApproved,
}: {
  points: number;
  eventsAttended: number;
  invitesApproved: number;
}) {
  const items = [
    { label: "Your Points", value: points },
    { label: "Events Attended", value: eventsAttended },
    { label: "Invites Approved", value: invitesApproved },
  ];
  return (
    <div className="mx-5 grid grid-cols-3 gap-2">
      {items.map((s) => (
        <Card key={s.label} className="px-3 py-3 text-center">
          <div className="text-gradient-gold text-2xl font-semibold tabular-nums">
            {s.value}
          </div>
          <div className="text-[11px] text-ink-300 mt-1">{s.label}</div>
        </Card>
      ))}
    </div>
  );
}
