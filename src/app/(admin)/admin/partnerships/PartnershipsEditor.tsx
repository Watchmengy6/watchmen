"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  upsertPartnershipAction,
  deletePartnershipAction,
} from "@/lib/partnerships/actions";
import { useToast } from "@/components/ui/Toast";

interface Row {
  id: string;
  name: string;
  blurb: string | null;
  discount_details: string;
  location_name: string | null;
  address: string | null;
  link_url: string | null;
  logo_url: string | null;
  active: boolean;
  sort_order: number;
}

const BLANK: Omit<Row, "id"> & { id?: string } = {
  name: "",
  blurb: "",
  discount_details: "",
  location_name: "",
  address: "",
  link_url: "",
  logo_url: "",
  active: true,
  sort_order: 0,
};

export function PartnershipsEditor({ initialRows }: { initialRows: Row[] }) {
  const router = useRouter();
  const { push } = useToast();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<typeof BLANK | null>(null);

  function openNew() {
    setEditing({ ...BLANK });
  }
  function openEdit(r: Row) {
    setEditing({ ...r });
  }
  function close() {
    setEditing(null);
  }

  function save() {
    if (!editing) return;
    start(async () => {
      const r = await upsertPartnershipAction({
        id: editing.id,
        name: editing.name,
        blurb: editing.blurb ?? "",
        discount_details: editing.discount_details,
        location_name: editing.location_name ?? "",
        address: editing.address ?? "",
        link_url: editing.link_url ?? "",
        logo_url: editing.logo_url ?? "",
        active: editing.active,
        sort_order: editing.sort_order,
      });
      if (r.error) {
        push({ title: "Save failed", body: r.error, variant: "error" });
        return;
      }
      push({ title: "Saved", variant: "success" });
      close();
      router.refresh();
    });
  }

  function del(id: string) {
    if (!confirm("Delete this partnership? This can't be undone.")) return;
    start(async () => {
      const r = await deletePartnershipAction(id);
      if (r.error) {
        push({ title: "Delete failed", body: r.error, variant: "error" });
        return;
      }
      push({ title: "Deleted", variant: "success" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={openNew}
        className="w-full h-11 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[14px] font-semibold"
      >
        ＋ New partnership
      </button>

      <div className="space-y-2">
        {initialRows.length === 0 ? (
          <div className="text-center text-ink-300 text-[14px] py-10">
            No partnerships yet. Add the first one above.
          </div>
        ) : (
          initialRows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl bg-ink-800/80 hairline px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-[14px] font-semibold truncate">
                      {r.name}
                    </span>
                    {!r.active ? (
                      <span className="text-[10px] uppercase tracking-wider text-ink-400 bg-ink-700 px-1.5 py-0.5 rounded-full">
                        Off
                      </span>
                    ) : null}
                  </div>
                  <div className="text-ink-300 text-[12px] truncate">
                    {r.discount_details}
                  </div>
                </div>
                <button
                  onClick={() => openEdit(r)}
                  className="h-8 px-3 rounded-full bg-ink-700 hairline text-ink-100 text-[12px]"
                >
                  Edit
                </button>
                <button
                  onClick={() => del(r.id)}
                  className="h-8 px-3 rounded-full bg-red-500/15 ring-1 ring-red-500/30 text-red-200 text-[12px]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-3"
          onClick={(e) => {
            if (e.target === e.currentTarget && !pending) close();
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-ink-800 hairline p-5 space-y-3 max-h-[90dvh] overflow-y-auto"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            <div className="text-white text-[17px] font-semibold">
              {editing.id ? "Edit partnership" : "New partnership"}
            </div>
            <Field
              label="Name"
              value={editing.name}
              onChange={(v) => setEditing({ ...editing, name: v })}
              placeholder="Chick-fil-A Gandy"
            />
            <Field
              label="Discount details"
              value={editing.discount_details}
              onChange={(v) => setEditing({ ...editing, discount_details: v })}
              placeholder="Free sandwich with any meal"
              textarea
            />
            <Field
              label="Blurb (optional)"
              value={editing.blurb ?? ""}
              onChange={(v) => setEditing({ ...editing, blurb: v })}
              placeholder="Owner is a Watchmen brother — show your card."
              textarea
            />
            <Field
              label="Location name"
              value={editing.location_name ?? ""}
              onChange={(v) => setEditing({ ...editing, location_name: v })}
              placeholder="4th St & Gandy"
            />
            <Field
              label="Address"
              value={editing.address ?? ""}
              onChange={(v) => setEditing({ ...editing, address: v })}
              placeholder="3700 4th St S, St. Petersburg, FL"
            />
            <Field
              label="Link"
              value={editing.link_url ?? ""}
              onChange={(v) => setEditing({ ...editing, link_url: v })}
              placeholder="https://chick-fil-a.com/gandy"
            />
            <Field
              label="Logo URL"
              value={editing.logo_url ?? ""}
              onChange={(v) => setEditing({ ...editing, logo_url: v })}
              placeholder="https://..."
            />
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 text-ink-100 text-[13.5px]">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
                  className="h-4 w-4 accent-gold-400"
                />
                Active
              </label>
              <div className="flex-1" />
              <label className="flex items-center gap-2 text-ink-100 text-[13.5px]">
                Sort
                <input
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      sort_order: Number(e.target.value) || 0,
                    })
                  }
                  className="w-16 h-9 rounded-lg bg-ink-900 hairline px-2 text-[13px] text-white outline-none"
                />
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="flex-1 h-11 rounded-full bg-ink-700 hairline text-ink-100 text-[14px] font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="flex-1 h-11 rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-black text-[14px] font-semibold disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-1">
        {label}
      </div>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className="w-full rounded-xl bg-ink-900/60 hairline px-3 py-2 text-[14px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-10 rounded-xl bg-ink-900/60 hairline px-3 text-[14px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30"
        />
      )}
    </div>
  );
}
