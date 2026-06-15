"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { createEventAction } from "@/lib/events/actions";
import { useToast } from "@/components/ui/Toast";
import { supabaseBrowser } from "@/lib/supabase/client";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="gold" size="md" loading={pending} fullWidth>
      Publish event
    </Button>
  );
}

export function CreateEventForm() {
  const [state, action] = useFormState(createEventAction, {} as { error?: string; success?: boolean });
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (state?.success) push({ title: "Event published", variant: "success" });
    if (state?.error) push({ title: "Failed", body: state.error, variant: "error" });
  }, [state, push]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("event-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      push({ title: "Upload failed", body: error.message, variant: "error" });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("event-images").getPublicUrl(path);
    setImageUrl(data.publicUrl);
    setUploading(false);
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="image_url" value={imageUrl} />
      <div>
        <Label>Title</Label>
        <Input name="title" required placeholder="Watchman Cigar Night" />
      </div>
      <div>
        <Label>Type</Label>
        <select
          name="kind"
          defaultValue="watchmen"
          className="w-full h-11 rounded-xl bg-ink-800 hairline px-3 text-[15px] text-white outline-none"
        >
          <option value="watchmen">Watchmen Event</option>
          <option value="sponsored">Sponsored (paid placement)</option>
        </select>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea name="description" rows={3} placeholder="What to expect, what to bring..." />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <Label>Date</Label>
          <Input name="event_date" type="date" required />
        </div>
        <div>
          <Label>Start</Label>
          <Input name="start_time" type="time" />
        </div>
        <div>
          <Label>End</Label>
          <Input name="end_time" type="time" />
        </div>
      </div>
      <div>
        <Label>Location name</Label>
        <Input name="location_name" placeholder="Rooftop on Central" />
      </div>
      <div>
        <Label>Address</Label>
        <Input name="address" placeholder="123 Central Ave, St. Petersburg, FL" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Latitude</Label>
          <Input name="latitude" placeholder="27.7676" />
        </div>
        <div>
          <Label>Longitude</Label>
          <Input name="longitude" placeholder="-82.6403" />
        </div>
      </div>
      <div>
        <Label>Cover image</Label>
        <label className="inline-flex items-center h-10 px-3 rounded-full bg-ink-800 hairline text-sm cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={onPick} />
          {uploading ? "Uploading…" : imageUrl ? "Replace image" : "Upload image"}
        </label>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="mt-2 rounded-xl h-28 w-full object-cover" />
        ) : null}
      </div>
      {state?.error ? (
        <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-red-200 text-sm px-3 py-2">
          {state.error}
        </div>
      ) : null}
      <Submit />
    </form>
  );
}
