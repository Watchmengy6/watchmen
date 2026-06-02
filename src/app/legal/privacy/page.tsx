import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — The Watchmen",
};

/**
 * Privacy policy. This is a placeholder that accurately describes what
 * the live app collects. IMPORTANT: Aaron — get a lawyer review before
 * App Store submission. Apple checks that the policy actually matches
 * what the app does, and the privacy nutrition label (in App Store
 * Connect) must align with what's listed here.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-[100dvh] bg-ink-900 text-ink-100">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <Link
          href="/app/profile"
          className="text-[12px] text-ink-300 hover:text-white"
        >
          ‹ Back
        </Link>
        <h1 className="text-white text-[28px] font-semibold mt-4">
          Privacy Policy
        </h1>
        <p className="text-ink-300 text-[12px] mt-1">
          Last updated: May 28, 2026
        </p>

        <div className="mt-8 space-y-6 text-[14.5px] leading-relaxed">
          <Section title="Who we are">
            <p>
              The Watchmen is a private, invite-only community app operated
              by The Watchmen leadership in St. Petersburg, Florida. We can
              be reached at the email address you used to sign up; for
              data requests, contact your admin.
            </p>
          </Section>

          <Section title="What we collect">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Account data:</strong> full name, email, optional
                phone, optional bio, occupation, company, social handles
                (Instagram, Venmo, Cash App), profile photo, family info
                you choose to add (spouse, kids, birthday).
              </li>
              <li>
                <strong>Content you post:</strong> feed posts, comments,
                direct messages, group messages, event/meetup RSVPs and
                check-ins, polls and votes, photos and videos you upload.
              </li>
              <li>
                <strong>Location (only when you ask):</strong> when you
                tap &ldquo;Check in&rdquo; at an event or meetup, we read your
                device&apos;s GPS coordinates once to verify you&apos;re at the
                venue. We store the check-in coordinates with your RSVP
                row. We do not track your location in the background.
              </li>
              <li>
                <strong>Push subscription tokens:</strong> if you enable
                notifications, your browser provides a token we use to
                send pushes. We delete the token if you turn notifications
                off or delete your account.
              </li>
              <li>
                <strong>Operational metadata:</strong> account creation
                date, last active timestamp, points earned, who invited
                you.
              </li>
            </ul>
          </Section>

          <Section title="What we don't collect">
            <ul className="list-disc pl-5 space-y-1">
              <li>We do not sell your data to advertisers.</li>
              <li>We do not track you across other apps or websites.</li>
              <li>We do not run analytics that profile your behavior.</li>
              <li>We do not share your data with third parties except as listed below.</li>
            </ul>
          </Section>

          <Section title="Who sees your data">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Other approved members of The Watchmen see your profile,
                your posts, your comments, and any rooms you&apos;re in.
              </li>
              <li>
                Direct messages are visible only to the participants and
                The Watchmen admins for moderation purposes.
              </li>
              <li>
                Admins (currently Dustin Lachance and Aaron Pilkington)
                can view all member profiles, posts, and messages to keep
                the room safe.
              </li>
              <li>
                We use Supabase (database + auth + storage), Vercel
                (hosting), and Resend (transactional email) as data
                processors. These providers store data on our behalf and
                are bound by their own privacy terms.
              </li>
            </ul>
          </Section>

          <Section title="How we protect your data">
            <p>
              All connections use HTTPS. Passwords are hashed by Supabase
              Auth (we never see them). Database row-level security
              prevents one member from reading another member&apos;s private
              data. Uploaded photos and files are served from
              unguessable public storage URLs: we don&apos;t list them
              publicly, but anyone who has a given file&apos;s direct link
              can open it without signing in. Avoid uploading anything you
              wouldn&apos;t want shared outside the group.
            </p>
          </Section>

          <Section title="Your rights">
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Delete your account:</strong> Profile →
                &ldquo;Delete my account.&rdquo; This permanently removes your
                profile, sign-in, photos, payment handles, and push
                tokens. Posts and messages stay attached to a tombstone
                profile labeled &ldquo;Deleted member&rdquo; so historical
                conversations remain coherent.
              </li>
              <li>
                <strong>Block another member:</strong> their profile →
                &ldquo;Block.&rdquo; You won&apos;t see their content; they won&apos;t
                see yours.
              </li>
              <li>
                <strong>Report content:</strong> tap Report on any post
                or member. Leadership reviews within 24 hours.
              </li>
              <li>
                <strong>Export or correct your data:</strong> contact
                your admin and we&apos;ll provide it within 30 days.
              </li>
            </ul>
          </Section>

          <Section title="Children">
            <p>
              The Watchmen is for adults (18+) only. We do not knowingly
              collect data from anyone under 18. If you believe a child
              has accessed the app, contact your admin so we can remove
              the account.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We&apos;ll post material changes here and notify members in-app.
              Continued use after a change means you accept the updated
              policy.
            </p>
          </Section>

          <div className="text-[12px] text-ink-400 pt-6 border-t border-white/[0.06]">
            See also: <Link href="/legal/terms" className="underline">Terms of Service</Link>.
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-white text-[18px] font-semibold mb-2">{title}</h2>
      <div className="space-y-2 text-ink-200">{children}</div>
    </section>
  );
}
