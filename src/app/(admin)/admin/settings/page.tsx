import { Card, CardBody } from "@/components/ui/Card";

export default function AdminSettings() {
  return (
    <div className="px-5 space-y-3 pb-8">
      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-1">
            App identity
          </div>
          <p className="text-ink-300 text-sm">
            Name, logo, and theme colors live in the codebase for the MVP. To
            change name or icons, edit{" "}
            <span className="font-mono text-gold-300">src/app/layout.tsx</span>{" "}
            and replace icons in <span className="font-mono text-gold-300">public/</span>.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-1">
            Shopify (coming later)
          </div>
          <p className="text-ink-300 text-sm">
            A <span className="font-mono">shops</span> table is already in the
            database. When ready, insert a row with your Shopify URL and we&apos;ll
            light up a Shop tab for members.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="text-[11px] tracking-[0.25em] uppercase text-ink-300 mb-1">
            Push notifications
          </div>
          <p className="text-ink-300 text-sm">
            In-app notifications are live. Web push and native iOS push will be
            added once you decide on a provider (OneSignal, Expo, or APNs direct).
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
