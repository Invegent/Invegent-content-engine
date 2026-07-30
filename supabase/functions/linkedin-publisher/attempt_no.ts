// nextAttemptNoFrom — pure helper for the cc-0089 / task_05bf8b3d attempt_no audit-gap fix
// (mirrors youtube-publisher v1.10.0 F-YT-PUB-PUBLISH-AUDIT-GAP and
// linkedin-zapier-publisher v1.4.0 / ./media_action.ts's nextAttemptNoFrom). Given the
// highest-attempt_no row already present for a post_draft_id (m.post_publish queried
// ORDER BY attempt_no DESC LIMIT 1), return the next free attempt number so a new audit
// insert never collides with a prior/cross-posted platform's row on uq_publish_attempt
// (post_draft_id, attempt_no).
//   - no prior rows (null/undefined/empty)              -> 1
//   - prior top attempt_no = N (numeric or num-string)   -> N + 1
//   - non-numeric / missing attempt_no on the row        -> treated as 0 -> 1 (fail-safe)
//
// NOTE: this EF is repo-only / NOT deployed (no cron.job entry; activates with B24/F06 —
// see the VERSION header in ./index.ts). The fix below is dormant until activation but
// must not regress before then, per cc-0089 scope.
export function nextAttemptNoFrom(
  priorRows: Array<{ attempt_no?: number | string | null }> | null | undefined,
): number {
  const top = priorRows?.[0]?.attempt_no;
  const parsed = Number(top ?? 0);
  return (Number.isFinite(parsed) ? parsed : 0) + 1;
}
