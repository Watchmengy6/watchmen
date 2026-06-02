import Link from "next/link";
import { redirect } from "next/navigation";
import { requireApproved } from "@/lib/auth/gates";
import { supabaseServer } from "@/lib/supabase/server";
import { ReportRowActions } from "./ReportRowActions";

export const dynamic = "force-dynamic";

/**
 * Admin moderation queue. Pulls pending reports first, then reviewed
 * ones below as a history log. Each row gets a context preview (post
 * body, comment body, message body, or target member name) and the
 * triage buttons live in a small client component.
 */
export default async function AdminReportsPage() {
  const { profile } = await requireApproved();
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    redirect("/app/home");
  }

  const supabase = supabaseServer();
  const { data: reports } = await supabase
    .from("reports")
    .select(
      "id, reason, details, status, action_taken, created_at, reviewed_at, target_user_id, target_post_id, target_comment_id, target_thread_message_id, reporter:profiles!reports_reporter_id_fkey(id, full_name)",
    )
    .order("status", { ascending: true }) // pending first (alphabetical luck)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = reports ?? [];

  // Resolve target previews in one batched query per kind.
  const userIds = rows
    .filter((r: any) => r.target_user_id)
    .map((r: any) => r.target_user_id);
  const postIds = rows
    .filter((r: any) => r.target_post_id)
    .map((r: any) => r.target_post_id);
  const commentIds = rows
    .filter((r: any) => r.target_comment_id)
    .map((r: any) => r.target_comment_id);
  const threadMsgIds = rows
    .filter((r: any) => r.target_thread_message_id)
    .map((r: any) => r.target_thread_message_id);

  const [userMap, postMap, commentMap, threadMsgMap] = await Promise.all([
    userIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)
          .then(({ data }) =>
            new Map((data ?? []).map((r: any) => [r.id, r])),
          )
      : Promise.resolve(new Map()),
    postIds.length > 0
      ? supabase
          .from("posts")
          .select("id, body, author:profiles!posts_author_id_fkey(id, full_name)")
          .in("id", postIds)
          .then(({ data }) =>
            new Map((data ?? []).map((r: any) => [r.id, r])),
          )
      : Promise.resolve(new Map()),
    commentIds.length > 0
      ? supabase
          .from("post_comments")
          .select("id, body, author:profiles!post_comments_author_id_fkey(id, full_name)")
          .in("id", commentIds)
          .then(({ data }) =>
            new Map((data ?? []).map((r: any) => [r.id, r])),
          )
      : Promise.resolve(new Map()),
    threadMsgIds.length > 0
      ? supabase
          .from("thread_messages")
          .select(
            "id, body, author:profiles!thread_messages_author_id_fkey(id, full_name)",
          )
          .in("id", threadMsgIds)
          .then(({ data }) =>
            new Map((data ?? []).map((r: any) => [r.id, r])),
          )
      : Promise.resolve(new Map()),
  ]);

  const pendingRows = rows.filter((r: any) => r.status === "pending");
  const reviewedRows = rows.filter((r: any) => r.status !== "pending");

  return (
    <div className="px-5 space-y-5">
      <div>
        <Link href="/admin" className="text-ink-300 text-[12px]">
          ‹ Command Room
        </Link>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight">
          Reports
        </h1>
        <p className="text-ink-300 text-[13px] mt-1">
          Member-filed reports of inappropriate content. Apple wants
          these reviewed within 24 hours.
        </p>
      </div>

      <section className="space-y-3">
        <div className="text-[11px] tracking-[0.22em] uppercase text-gold-300/80">
          Pending ({pendingRows.length})
        </div>
        {pendingRows.length === 0 ? (
          <div className="text-ink-300 text-[14px]">No pending reports.</div>
        ) : (
          pendingRows.map((r: any) => (
            <ReportCard
              key={r.id}
              row={r}
              userMap={userMap}
              postMap={postMap}
              commentMap={commentMap}
              threadMsgMap={threadMsgMap}
            />
          ))
        )}
      </section>

      {reviewedRows.length > 0 ? (
        <section className="space-y-3">
          <div className="text-[11px] tracking-[0.22em] uppercase text-ink-400">
            History
          </div>
          {reviewedRows.slice(0, 30).map((r: any) => (
            <ReportCard
              key={r.id}
              row={r}
              userMap={userMap}
              postMap={postMap}
              commentMap={commentMap}
              threadMsgMap={threadMsgMap}
              showHistory
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function ReportCard({
  row,
  userMap,
  postMap,
  commentMap,
  threadMsgMap,
  showHistory = false,
}: {
  row: any;
  userMap: Map<string, any>;
  postMap: Map<string, any>;
  commentMap: Map<string, any>;
  threadMsgMap: Map<string, any>;
  showHistory?: boolean;
}) {
  const reporter = Array.isArray(row.reporter) ? row.reporter[0] : row.reporter;

  // Build the target preview.
  let targetKind = "Member";
  let targetTitle = "Unknown";
  let targetBody: string | null = null;
  let targetUserId: string | null = null;
  if (row.target_user_id) {
    targetKind = "Member";
    const u = userMap.get(row.target_user_id);
    targetTitle = u?.full_name ?? "Unknown member";
    targetUserId = row.target_user_id;
  } else if (row.target_post_id) {
    targetKind = "Post";
    const p = postMap.get(row.target_post_id);
    const author = p?.author
      ? Array.isArray(p.author)
        ? p.author[0]
        : p.author
      : null;
    targetTitle = `Post by ${author?.full_name ?? "Unknown"}`;
    targetBody = p?.body ?? null;
    targetUserId = author?.id ?? null;
  } else if (row.target_comment_id) {
    targetKind = "Comment";
    const c = commentMap.get(row.target_comment_id);
    const author = c?.author
      ? Array.isArray(c.author)
        ? c.author[0]
        : c.author
      : null;
    targetTitle = `Comment by ${author?.full_name ?? "Unknown"}`;
    targetBody = c?.body ?? null;
    targetUserId = author?.id ?? null;
  } else if (row.target_thread_message_id) {
    targetKind = "Chat message";
    const m = threadMsgMap.get(row.target_thread_message_id);
    const author = m?.author
      ? Array.isArray(m.author)
        ? m.author[0]
        : m.author
      : null;
    targetTitle = `Message by ${author?.full_name ?? "Unknown"}`;
    targetBody = m?.body ?? null;
    targetUserId = author?.id ?? null;
  }

  const statusColor =
    row.status === "actioned"
      ? "text-red-300 bg-red-500/15"
      : row.status === "dismissed"
        ? "text-ink-300 bg-ink-700"
        : row.status === "reviewed"
          ? "text-emerald-300 bg-emerald-500/15"
          : "text-gold-200 bg-gold-500/15";

  return (
    <div className="rounded-2xl bg-ink-800/80 hairline p-4 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="text-[10.5px] tracking-[0.22em] uppercase text-ink-400">
            {targetKind}
          </div>
          <div className="text-white text-[14px] font-semibold truncate">
            {targetTitle}
          </div>
        </div>
        <span
          className={`text-[10.5px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full font-semibold ${statusColor}`}
        >
          {row.status}
        </span>
      </div>

      <div className="rounded-xl bg-ink-900/60 hairline px-3 py-2 space-y-1">
        <div className="text-ink-400 text-[11px] uppercase tracking-[0.18em]">
          Reason
        </div>
        <div className="text-white text-[13.5px]">{row.reason}</div>
        {row.details ? (
          <>
            <div className="text-ink-400 text-[11px] uppercase tracking-[0.18em] mt-1.5">
              Reporter note
            </div>
            <div className="text-ink-100 text-[13px] whitespace-pre-wrap">
              {row.details}
            </div>
          </>
        ) : null}
        {targetBody ? (
          <>
            <div className="text-ink-400 text-[11px] uppercase tracking-[0.18em] mt-1.5">
              Content
            </div>
            <div className="text-ink-100 text-[13px] whitespace-pre-wrap line-clamp-6">
              {targetBody}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-[11.5px] text-ink-400">
        <span>
          Reported by {reporter?.full_name ?? "Unknown"} ·{" "}
          {new Date(row.created_at).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
        {targetUserId ? (
          <Link
            href={`/app/members/${targetUserId}`}
            className="text-gold-300 hover:underline"
          >
            View target →
          </Link>
        ) : null}
      </div>

      {showHistory ? (
        row.action_taken ? (
          <div className="text-[11.5px] text-ink-300">
            Action: {row.action_taken}
          </div>
        ) : null
      ) : (
        <ReportRowActions reportId={row.id} targetUserId={targetUserId} />
      )}
    </div>
  );
}
