import { NextResponse } from "next/server";

/**
 * Apple App Site Association (AASA) file for Universal Links.
 *
 * iOS fetches https://<domain>/.well-known/apple-app-site-association to
 * decide whether a tapped https link should open the native app instead of
 * Safari. It must be served over HTTPS, as JSON, with NO redirect.
 *
 * The native app already declares the matching `applinks:` Associated
 * Domains in ios/App/App/App.entitlements (gy6.me + watchmen-six.vercel.app).
 *
 * The appID is "<AppleTeamID>.<bundleId>". The bundle id is me.gy6.watchmen
 * (capacitor.config.ts). Set APPLE_TEAM_ID in the Vercel env to your 10-char
 * Apple Developer Team ID — until it's set this serves a placeholder and
 * Universal Links will NOT activate.
 *
 * `paths` controls which URLs deep-link into the app. We open everything
 * members would share or land on, but exclude the marketing root, /login,
 * and /signup so first-time/logged-out web visitors still get the website.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID || "TEAMID";
  const appID = `${teamId}.me.gy6.watchmen`;

  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID,
          paths: ["/app/*", "/invite/*", "/pending", "/legal/*"],
        },
      ],
    },
  };

  return new NextResponse(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Let Apple's CDN cache it but not forever, so a Team ID change propagates.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
