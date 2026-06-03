import Link from "next/link";
import { redirect } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { createMeetupAction } from "@/lib/meetups/realActions";
import { TzOffsetField } from "./TzOffsetField";
import { LocationField } from "./LocationField";

export const dynamic = "force-dynamic";

const CATEGORIES = ["Coffee", "Workout", "Drinks", "Outdoors", "Food", "Other"];

export default async function NewMeetupPage() {
  const { profile } = await requireApproved();
  // Meetups are admin-only per Dustin. Non-admins get bounced back to
  // the Groups tab (filtered to meet-ups) instead of the standalone
  // /app/meetups list, which has no bottom-nav entry and would strand
  // them on a dead-end page.
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    redirect("/app/groups?tab=meetup");
  }
  return (
    <div className="min-h-[100dvh] bg-ink-900 pb-28">
      <div
        className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl border-b border-white/[0.05]"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          {/* Back goes to the Groups tab (where the user entered the
              meet-up creation flow via the kind picker). The standalone
              /app/meetups list has no bottom-nav entry so we never
              route back to it — it would trap users on a dead-end. */}
          <Link
            href="/app/groups?tab=meetup"
            aria-label="Back"
            className="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-800 hairline text-ink-100 text-lg"
          >
            ‹
          </Link>
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300/80">
              New
            </div>
            <div className="text-white text-[18px] font-semibold leading-tight">
              Host a meetup
            </div>
          </div>
        </div>
      </div>
      <form action={createMeetupAction} className="px-4 pt-4 space-y-4">
        <TzOffsetField />
        <Field label="Title" name="title" placeholder="Morning coffee at Black Crow" required />
        <Field
          label="When"
          name="when_at"
          type="datetime-local"
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-1.5">
              Category
            </div>
            <select
              name="category"
              defaultValue="Coffee"
              className="w-full h-11 rounded-xl bg-ink-800 hairline px-3 text-[15px] text-white outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="Duration (min)"
            name="duration_min"
            type="number"
            defaultValue="60"
          />
        </div>
        <Field label="Location" name="location_name" placeholder="Black Crow Coffee" />
        <LocationField />
        <Field label="Notes" name="notes" placeholder="Optional — anything attendees should know." textarea />

        <button
          type="submit"
          className="w-full h-12 rounded-full text-[15px] font-semibold bg-gradient-to-b from-gold-300 to-gold-500 text-black"
        >
          Create meetup
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
  defaultValue,
  textarea,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  textarea?: boolean;
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
          defaultValue={defaultValue}
          className="w-full rounded-xl bg-ink-800 hairline px-3 py-2.5 text-[15px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30 resize-none"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className="w-full h-11 rounded-xl bg-ink-800 hairline px-3 text-[15px] text-white placeholder:text-ink-400 outline-none focus:ring-2 focus:ring-gold-400/30"
        />
      )}
    </div>
  );
}
