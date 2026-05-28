import Link from "next/link";

export const metadata = {
  title: "Terms of Service — The Watchmen",
};

/**
 * Terms of Service / EULA. Placeholder content that meets Apple's
 * minimum bar for social apps with user-generated content. Aaron —
 * needs lawyer review before App Store submission. Apple specifically
 * requires:
 *   - A clause that users won't post objectionable content
 *   - A clause that the app will moderate within 24h
 *   - A clause that repeat offenders lose access
 *   - A clause that you (operator) aren't liable for user content
 */
export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-ink-300 text-[12px] mt-1">
          Last updated: May 28, 2026
        </p>

        <div className="mt-8 space-y-6 text-[14.5px] leading-relaxed">
          <Section title="1. Who can use the app">
            <p>
              The Watchmen is a private, invite-only community for adults
              (18+) who have been approved by an admin. Accessing the app
              without an invite is not permitted.
            </p>
          </Section>

          <Section title="2. Code of conduct">
            <p>You agree NOT to post or send any of the following:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Hate speech, slurs, or harassment targeting any person or group.</li>
              <li>Threats of violence or sexual harassment.</li>
              <li>Sexually explicit content, nudity, or graphic violence.</li>
              <li>Scams, spam, MLM solicitations, or fraudulent claims.</li>
              <li>Content that infringes others&apos; intellectual property.</li>
              <li>Personal information about another person without their consent (doxxing).</li>
              <li>Misinformation likely to cause physical or financial harm.</li>
            </ul>
            <p className="pt-1">
              You also agree to treat every brother with the respect you&apos;d
              show in person. What&apos;s shared in the room stays in the room.
            </p>
          </Section>

          <Section title="3. Moderation and enforcement">
            <p>
              Leadership reviews reports within 24 hours. We may, at our
              sole discretion, remove content, suspend accounts, or
              permanently revoke access — without notice and without
              appeal — for any violation of these terms. Repeat offenders
              lose access.
            </p>
          </Section>

          <Section title="4. Your content">
            <p>
              You own what you post. By posting in the app you grant The
              Watchmen a non-exclusive, revocable license to display
              your content to other approved members and to store it on
              our infrastructure for as long as you keep an account.
              Deleting your account or specific content terminates this
              license for new uses.
            </p>
          </Section>

          <Section title="5. Privacy">
            <p>
              How we collect and use your data is described in our{" "}
              <Link href="/legal/privacy" className="underline">
                Privacy Policy
              </Link>
              . You consent to those practices by using the app.
            </p>
          </Section>

          <Section title="6. Location-based check-ins">
            <p>
              When you tap &ldquo;Check in&rdquo; at an event or meetup, the app
              reads your device&apos;s GPS to verify you&apos;re at the venue. The
              coordinates are stored with your check-in. You can decline
              the location prompt — you just won&apos;t earn the check-in
              points for that event.
            </p>
          </Section>

          <Section title="7. Account deletion">
            <p>
              You may delete your account at any time from Profile →
              Delete my account. Deletion is permanent. Your posts,
              comments, and messages remain in the room but are
              attributed to &ldquo;Deleted member&rdquo; so historical
              conversations stay readable.
            </p>
          </Section>

          <Section title="8. Disclaimers and liability">
            <p>
              The app is provided &ldquo;as is&rdquo; with no warranties. We
              are not liable for content posted by other members, for
              losses arising from your use of the app, or for damages
              exceeding what you&apos;ve paid us in the past twelve months
              (which, for most members, is $0).
            </p>
            <p>
              The Watchmen is not a substitute for professional advice
              (legal, financial, medical, etc). Use your own judgment.
            </p>
          </Section>

          <Section title="9. Changes to these terms">
            <p>
              We may update these terms. Material changes will be
              announced in-app. Continued use after a change means you
              accept the updated terms.
            </p>
          </Section>

          <Section title="10. Governing law">
            <p>
              These terms are governed by the laws of the State of
              Florida, United States.
            </p>
          </Section>

          <div className="text-[12px] text-ink-400 pt-6 border-t border-white/[0.06]">
            See also: <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
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
