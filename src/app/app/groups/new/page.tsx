import Link from "next/link";
import { requireApproved } from "@/lib/auth/gates";
import { createGroupAction } from "@/lib/groups/actions";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  { id: "business", label: "Business" },
  { id: "fitness", label: "Fitness" },
  { id: "faith", label: "Faith" },
  { id: "family", label: "Family" },
  { id: "outdoors", label: "Outdoors" },
  { id: "finance", label: "Finance" },
  { id: "social", label: "Social" },
  { id: "other", label: "Other" },
];

export default async function NewGroupPage() {
  await requireApproved();
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28 -mx-4 sm:mx-0">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Link
            href="/app/groups"
            aria-label="Back"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-800 hairline text-ink-100 text-lg"
          >
            ‹
          </Link>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              Brotherhood
            </div>
            <div className="text-white text-[18px] font-semibold leading-tight">
              New Group
            </div>
          </div>
        </div>
      </div>
      <form action={createGroupAction} className="px-4 pt-4 space-y-4">
        <Field label="Name" name="name" placeholder="What's the group called?" required />
        <Field
          label="Description"
          name="description"
          placeholder="What's this group about?"
          textarea
        />
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-1.5">
            Category
          </div>
          <select
            name="category"
            defaultValue="business"
            className="w-full h-11 rounded-xl bg-ink-800 hairline px-3 text-[15px] text-white outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full h-12 rounded-full text-[15px] font-semibold bg-gradient-to-b from-gold-300 to-gold-500 text-black"
        >
          Create group
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  textarea,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  textarea?: boolean;
  required?: boolean;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-1.5">
        {label}
      </div>
      {textarea ? (
        <textarea
          name={name}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-xl bg-ink-800 hairline px-3 py-2.5 text-[15px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30 resize-none"
        />
      ) : (
        <input
          name={name}
          required={required}
          placeholder={placeholder}
          className="w-full h-11 rounded-xl bg-ink-800 hairline px-3 text-[15px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30"
        />
      )}
    </div>
  );
}
