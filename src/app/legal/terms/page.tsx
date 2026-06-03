import Link from "next/link";

export const metadata = {
  title: "Terms of Service — The Watchmen",
};

/**
 * Terms of Service / End User License Agreement.
 *
 * Drafted to cover Apple App Store Guideline 1.2 (UGC) requirements:
 *   - 1.2(a) "no objectionable content" clause + filter mechanism
 *   - 1.2(b) report mechanism, 24-hour response
 *   - 1.2(c) block abusive users
 *   - 1.2(d) publish developer contact info
 * AND the standard US-based social-app protections:
 *   - Limitation of liability + cap
 *   - Indemnification
 *   - Class action waiver + arbitration (FL)
 *   - DMCA / IP clause
 *   - Age restriction (18+)
 *   - Termination / suspension at sole discretion
 *   - Severability + entire agreement
 *
 * Aaron — this is meant to give you the best chance at first-pass App
 * Store approval AND meaningful legal coverage. It is NOT a substitute
 * for a lawyer reviewing it once revenue / membership volume grow.
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
          Last updated: June 3, 2026
        </p>

        <p className="text-ink-200 text-[13.5px] mt-4 leading-relaxed">
          These Terms of Service (&ldquo;Terms&rdquo;) form a binding
          contract between you and The Watchmen (also operating as
          &ldquo;Got Your 6&rdquo; / GY6), a private membership community
          based in St. Petersburg, Florida (&ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;the Brotherhood&rdquo;). By
          creating an account, signing in, or otherwise using the
          mobile application, website, or any related services
          (collectively, the &ldquo;Service&rdquo;), you accept and
          agree to be bound by these Terms and our{" "}
          <Link href="/legal/privacy" className="underline">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the Service.
        </p>

        <div className="mt-8 space-y-6 text-[14.5px] leading-relaxed">
          <Section title="1. Eligibility and account">
            <p>
              The Service is a private, invite-only community for
              adults aged 18 or older. By using the Service you
              represent and warrant that:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You are at least 18 years of age.</li>
              <li>
                You have received a valid invite from an existing
                approved member.
              </li>
              <li>
                You will provide accurate information about yourself
                during signup and keep it current.
              </li>
              <li>
                You are not a person barred from using the Service
                under the laws of the United States or any other
                jurisdiction.
              </li>
              <li>
                You will not allow anyone else to use your account, and
                you are solely responsible for maintaining the
                confidentiality of your password.
              </li>
            </ul>
            <p>
              Membership requires admin approval, which we may grant or
              decline at our sole discretion. We may also revoke
              approval at any time. Sharing the Service with
              non-members or attempting to bypass the invite system is
              a material breach of these Terms.
            </p>
          </Section>

          <Section title="2. Code of conduct — prohibited content and conduct">
            <p>
              The Service is for brothers who treat each other with
              respect. You agree NOT to post, send, upload, or share
              any of the following:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Hate speech, slurs, or harassment targeting any person
                or group on the basis of race, ethnicity, religion,
                national origin, sex, gender identity, sexual
                orientation, age, disability, or any other protected
                class.
              </li>
              <li>
                Threats, intimidation, stalking, or incitement of
                violence against any person.
              </li>
              <li>
                Sexually explicit material, nudity, sexually suggestive
                content involving minors (which is also reported to
                law enforcement), or graphic violence.
              </li>
              <li>
                Scams, &ldquo;get rich quick&rdquo; schemes, MLM
                recruitment, pyramid schemes, fraudulent claims, or
                deceptive solicitations.
              </li>
              <li>
                Content that infringes another party&apos;s
                intellectual property, publicity, or privacy rights.
              </li>
              <li>
                Personally identifying information about any person
                (their own or another&apos;s) without that
                person&apos;s explicit consent, including without
                limitation home addresses, phone numbers, ID numbers,
                or financial account details.
              </li>
              <li>
                Disinformation reasonably likely to cause physical,
                emotional, or financial harm.
              </li>
              <li>
                Spam, repetitive content, off-topic promotion, link
                bombing, or automated posting.
              </li>
              <li>
                Malware, viruses, or any code designed to disable,
                damage, or surveil the Service or any user&apos;s
                device.
              </li>
              <li>
                Any other content or behavior that, in our sole
                judgment, undermines the integrity, safety, or purpose
                of the Brotherhood.
              </li>
            </ul>
            <p>
              You also agree not to: (a) attempt to gain unauthorized
              access to any account, server, or system; (b) probe, scan,
              or reverse-engineer the Service; (c) scrape, harvest, or
              redistribute any data from the Service; (d) impersonate
              another member or any third party; (e) use the Service to
              violate any law or regulation.
            </p>
          </Section>

          <Section title="3. Moderation, reporting, and enforcement">
            <p>
              Any member may report a post, comment, message, or
              account by tapping the report icon next to the content.
              Leadership reviews every report within 24 hours and
              acknowledges receipt to the reporter where appropriate.
            </p>
            <p>
              We may, in our sole discretion and without notice:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Remove or hide any content.</li>
              <li>
                Warn, suspend, or permanently terminate any account
                (including yours).
              </li>
              <li>
                Filter or block specific words, phrases, or media
                automatically.
              </li>
              <li>
                Cooperate with law enforcement when required by law or
                when we reasonably believe a credible threat exists.
              </li>
            </ul>
            <p>
              You can also block any other member directly. Blocking
              removes both members from any shared 1:1 conversation and
              hides the other party&apos;s content from your feed.
              Repeat violators of these Terms lose access permanently.
              Leadership&apos;s decision is final.
            </p>
          </Section>

          <Section title="4. Your content; license you grant us">
            <p>
              You retain ownership of all content you submit, post, or
              display through the Service (&ldquo;Your Content&rdquo;).
              You represent that you own or have all necessary rights
              to share Your Content and that doing so does not violate
              any third party&apos;s rights.
            </p>
            <p>
              By posting Your Content you grant The Watchmen a
              worldwide, non-exclusive, royalty-free, sublicensable
              license to host, store, reproduce, display, and
              distribute Your Content within the Service for the
              purpose of operating, providing, and improving the
              Service. You also grant other approved members the right
              to view, react to, share within the app, and quote Your
              Content within the Service.
            </p>
            <p>
              Deleting Your Content or your account terminates the
              license for new uses, but copies may remain in backups
              for a commercially reasonable retention period and
              content that other members have already saved, quoted,
              or referenced may persist outside our direct control.
            </p>
          </Section>

          <Section title="5. Intellectual property / DMCA">
            <p>
              The Service itself, including all software, design,
              trademarks, logos, and original content created by us,
              is our property or licensed to us and is protected by
              U.S. and international copyright, trademark, and other
              laws. You may not copy, modify, distribute, sell, or
              create derivative works of the Service except as
              expressly permitted in these Terms.
            </p>
            <p>
              If you believe Your Content has been infringed inside
              the Service, send a written DMCA notice to{" "}
              <a className="underline" href="mailto:legal@gy6.me">
                legal@gy6.me
              </a>{" "}
              including: (a) identification of the copyrighted work,
              (b) identification of the infringing material with
              enough detail to locate it, (c) your contact info,
              (d) a statement under penalty of perjury that you own
              the rights, and (e) your physical or electronic
              signature. We respond to valid notices in accordance
              with the Digital Millennium Copyright Act.
            </p>
          </Section>

          <Section title="6. Location, push notifications, and device data">
            <p>
              When you tap &ldquo;Check in&rdquo; at an event or
              meet-up, the Service reads your device&apos;s GPS to
              verify you are at the venue. The coordinates are stored
              with your check-in record. You can decline the location
              prompt — you simply will not earn the check-in points
              for that event.
            </p>
            <p>
              If you enable push notifications, we store the device
              token to deliver notifications about DMs, mentions,
              events, and admin announcements. You can disable push
              notifications in your device settings at any time.
            </p>
          </Section>

          <Section title="7. Account suspension, termination, and deletion">
            <p>
              You may delete your account at any time from{" "}
              <em>Profile → Delete my account</em>. Deletion is
              permanent. Your posts, comments, and messages remain
              visible to the members who saw them but are
              re-attributed to &ldquo;Deleted member&rdquo; so that
              ongoing conversations remain readable.
            </p>
            <p>
              We may suspend or terminate your account at any time, with
              or without notice, for any reason or no reason, including
              (without limitation) a violation of these Terms, conduct
              that we believe harms another member or the Brotherhood,
              or compliance with legal process. We are not liable to
              you for any termination or suspension.
            </p>
          </Section>

          <Section title="8. Disclaimer of warranties">
            <p className="uppercase tracking-wide text-[12.5px] text-ink-300">
              The Service is provided &ldquo;as is&rdquo; and
              &ldquo;as available,&rdquo; without warranties of any
              kind, whether express, implied, statutory, or otherwise.
              To the maximum extent permitted by law, we disclaim all
              warranties including merchantability, fitness for a
              particular purpose, non-infringement, accuracy, and
              quiet enjoyment.
            </p>
            <p>
              We do not warrant that the Service will be uninterrupted,
              secure, or error-free; that defects will be corrected;
              that any content shared by other members will be accurate
              or appropriate; or that the Service will meet your
              expectations.
            </p>
            <p>
              The Service is not a substitute for professional advice.
              Anything you read on the Service — including financial,
              legal, medical, or investment opinions from other
              members — is opinion, not advice. Consult a licensed
              professional before acting on it.
            </p>
          </Section>

          <Section title="9. Limitation of liability">
            <p className="uppercase tracking-wide text-[12.5px] text-ink-300">
              To the maximum extent permitted by law, in no event will
              The Watchmen, its officers, directors, employees, or
              affiliates be liable for any indirect, incidental,
              special, consequential, exemplary, or punitive damages,
              including loss of profits, goodwill, data, or other
              intangibles, arising out of or relating to your use of
              the Service, even if we have been advised of the
              possibility of such damages.
            </p>
            <p className="uppercase tracking-wide text-[12.5px] text-ink-300">
              In any case, our total cumulative liability arising out
              of or relating to these Terms or the Service is limited
              to the greater of (a) the amount you paid us in the
              twelve months preceding the claim, or (b) one hundred
              US dollars ($100).
            </p>
            <p>
              Some jurisdictions do not allow the exclusion or
              limitation of certain damages; in those jurisdictions,
              our liability is limited to the smallest amount permitted
              by law.
            </p>
          </Section>

          <Section title="10. Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless The
              Watchmen, its officers, directors, employees, members,
              and affiliates from and against any and all claims,
              liabilities, damages, losses, costs, and expenses
              (including reasonable attorneys&apos; fees) arising out
              of or in connection with: (a) Your Content; (b) your use
              of the Service; (c) your breach of these Terms; or
              (d) your violation of any rights of another person.
            </p>
          </Section>

          <Section title="11. Dispute resolution — arbitration and class action waiver">
            <p>
              Any dispute, claim, or controversy arising out of or
              relating to these Terms or the Service will be settled by
              binding individual arbitration administered by the
              American Arbitration Association under its Consumer
              Arbitration Rules, in Pinellas County, Florida, or by
              video conference at the arbitrator&apos;s discretion. The
              arbitrator&apos;s award is final and may be entered as a
              judgment in any court of competent jurisdiction.
            </p>
            <p className="uppercase tracking-wide text-[12.5px] text-ink-300">
              You and we each waive the right to a trial by jury and
              the right to participate in a class action, class
              arbitration, or other representative proceeding. The
              arbitrator may not consolidate more than one
              person&apos;s claims and may not preside over any form of
              representative or class proceeding.
            </p>
            <p>
              Notwithstanding the foregoing, either party may bring an
              individual action in small claims court, and either
              party may seek injunctive or other equitable relief in
              court for infringement of intellectual property rights.
            </p>
          </Section>

          <Section title="12. Apple App Store — additional terms">
            <p>
              If you accessed the Service through an Apple device, the
              following additional terms apply between you and Apple
              Inc.:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                These Terms are between you and The Watchmen, not
                Apple. Apple is not responsible for the Service or its
                content.
              </li>
              <li>
                Apple has no obligation to provide maintenance or
                support for the Service.
              </li>
              <li>
                In the event of any failure to conform to a warranty,
                you may notify Apple, and Apple will refund the
                purchase price (if any). Beyond that, Apple has no
                warranty obligation regarding the Service.
              </li>
              <li>
                Apple is not responsible for addressing any claims by
                you or any third party relating to the Service or your
                possession or use of it.
              </li>
              <li>
                If a third party claims the Service infringes its
                intellectual property rights, The Watchmen — not
                Apple — is responsible for the investigation, defense,
                settlement, and discharge of the claim.
              </li>
              <li>
                You represent that you are not located in a country
                subject to a U.S. government embargo or designated as
                a &ldquo;terrorist supporting&rdquo; country, and that
                you are not on any U.S. government list of prohibited
                or restricted parties.
              </li>
              <li>
                Apple and Apple&apos;s subsidiaries are third-party
                beneficiaries of these Terms and may enforce them
                against you.
              </li>
            </ul>
          </Section>

          <Section title="13. Governing law and venue">
            <p>
              These Terms are governed by the laws of the State of
              Florida, USA, without regard to its conflicts-of-law
              provisions. Except for disputes subject to arbitration
              under Section 11, any judicial proceedings will be
              brought exclusively in the state or federal courts
              located in Pinellas County, Florida, and you consent to
              personal jurisdiction there.
            </p>
          </Section>

          <Section title="14. Changes to these Terms">
            <p>
              We may update these Terms from time to time. Material
              changes will be announced in the Service and will be
              effective on the date posted. Your continued use after
              an update constitutes acceptance of the updated Terms.
              If you do not agree to a change, your sole remedy is to
              stop using the Service and delete your account.
            </p>
          </Section>

          <Section title="15. Miscellaneous">
            <p>
              These Terms, together with the{" "}
              <Link href="/legal/privacy" className="underline">
                Privacy Policy
              </Link>{" "}
              and any in-product disclaimers you accept, constitute
              the entire agreement between you and The Watchmen
              regarding the Service. If any provision is found
              unenforceable, the remainder of these Terms will remain
              in full force. Our failure to enforce a right is not a
              waiver. You may not assign these Terms; we may.
            </p>
          </Section>

          <Section title="16. Contact">
            <p>
              For questions about these Terms, including DMCA notices,
              privacy requests, or account issues:
            </p>
            <p>
              The Watchmen / GY6, Inc.
              <br />
              St. Petersburg, Florida, USA
              <br />
              <a className="underline" href="mailto:legal@gy6.me">
                legal@gy6.me
              </a>
            </p>
          </Section>

          <div className="text-[12px] text-ink-400 pt-6 border-t border-white/[0.06]">
            See also:{" "}
            <Link href="/legal/privacy" className="underline">
              Privacy Policy
            </Link>
            .
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
