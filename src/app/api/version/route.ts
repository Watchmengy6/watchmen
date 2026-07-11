// Returns the commit SHA of the deployment serving this request.
// Deployments are immutable, so this is always the LATEST deployed
// version — while NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA is baked into each
// client bundle at build time. When they differ, the client is stale
// and <UpdateNotice> shows the refresh banner (built after Aaron lost
// 10 minutes to a stale bundle on event day, July 2026).
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    { v: process.env.VERCEL_GIT_COMMIT_SHA ?? null },
    { headers: { "cache-control": "no-store" } },
  );
}
