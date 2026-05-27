"use client";

import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { fmtEventDate, fmtTime } from "@/lib/utils/date";
import { AdminPreviewShell } from "../AdminPreviewShell";
import { mockEvents, mockPastEvent } from "@/lib/preview/mock";

export default function PreviewAdminEvents() {
  const all = [...mockEvents, mockPastEvent];
  return (
    <AdminPreviewShell>
      <div className="px-5 space-y-4 pb-8">
        <Card>
          <CardBody>
            <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-3">
              Create event
            </div>
            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <div>
                <Label>Title</Label>
                <Input placeholder="Watchman Cigar Night" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} placeholder="What to expect, what to bring..." />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <Label>Date</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label>Start</Label>
                  <Input type="time" />
                </div>
                <div>
                  <Label>End</Label>
                  <Input type="time" />
                </div>
              </div>
              <div>
                <Label>Location name</Label>
                <Input placeholder="Rooftop on Central" />
              </div>
              <div>
                <Label>Address</Label>
                <Input placeholder="123 Central Ave, St. Petersburg, FL" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Latitude</Label>
                  <Input placeholder="27.7676" />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input placeholder="-82.6403" />
                </div>
              </div>
              <div>
                <Label>Cover image</Label>
                <span className="inline-flex items-center h-10 px-3 rounded-full bg-ink-800 hairline text-sm">
                  Upload image
                </span>
              </div>
              <Button variant="gold" size="md" fullWidth>Publish event</Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-3">
          {all.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="muted">{fmtEventDate(e.event_date)}</Badge>
                    <Badge variant={e.status === "published" ? "success" : "default"}>
                      {e.status}
                    </Badge>
                  </div>
                  <div className="mt-1.5 font-semibold">{e.title}</div>
                  <div className="text-ink-300 text-xs mt-0.5">
                    {e.start_time ? fmtTime(e.start_time) : ""}
                    {e.location_name ? ` · ${e.location_name}` : ""}
                  </div>
                  <div className="text-ink-400 text-[11px] mt-1">
                    {e.rsvp_count} going · {Math.round(e.rsvp_count * 0.6)} checked in
                  </div>
                </div>
                <button className="text-[11px] text-red-300 px-2 py-1 rounded-full bg-red-500/10 hairline">
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminPreviewShell>
  );
}
