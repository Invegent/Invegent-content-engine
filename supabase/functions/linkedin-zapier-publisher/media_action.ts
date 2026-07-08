// linkedin-zapier-publisher media action resolver v1 (cc-0028) — pure, dependency-free, unit-tested.
// Extracted from index.ts so it can be imported by hermetic tests without pulling in Deno.serve.
//
// resolveZapierAction — fail-closed publish resolver, reached ONLY for a guard decision of
// kind 'publish' (hold/block are handled at the index.ts call site before this is called).
// Supported-method ALLOWLIST is EXACTLY 'text' and 'image'. Anything else BLOCKS (never posts).
//   - 'text'  → post text-only (no image).
//   - 'image' → require image_status==='generated' AND a non-empty image_url; else BLOCK
//               (fail closed — an image_quote draft must never post text-only).
//   - any other / unknown method → BLOCK (carousel + video stay blocked in v0).
export type ZapierAction =
  | { action: 'post'; method: 'text' | 'image'; includeImage: boolean }
  | { action: 'block'; reason: string };

export function resolveZapierAction(
  decision: { kind: string; method?: string },
  draft: { image_status?: string | null; image_url?: string | null },
): ZapierAction {
  const method = decision.method;
  if (method === 'text') {
    return { action: 'post', method: 'text', includeImage: false };
  }
  if (method === 'image') {
    const hasImage = draft.image_status === 'generated'
      && typeof draft.image_url === 'string'
      && draft.image_url.trim().length > 0;
    if (!hasImage) {
      return { action: 'block', reason: `image_method_no_image_url:status=${draft.image_status ?? 'null'}` };
    }
    return { action: 'post', method: 'image', includeImage: true };
  }
  return { action: 'block', reason: `method_not_enabled_v0:${method ?? 'null'}` };
}

// nextAttemptNoFrom — pure helper for the v1.4.0 attempt_no audit-gap fix (cc-0029 step 1;
// mirrors youtube-publisher v1.10.0 F-YT-PUB-PUBLISH-AUDIT-GAP). Given the highest-attempt_no
// row already present for a post_draft_id (m.post_publish is ordered attempt_no DESC, limit 1),
// return the next free attempt number so a new audit insert never collides with a prior/cross-
// posted platform's row on uq_publish_attempt (post_draft_id, attempt_no).
//   - no prior rows (null/undefined/empty)      → 1
//   - prior top attempt_no = N (numeric or num-string) → N + 1
//   - non-numeric / missing attempt_no on the row → treated as 0 → 1 (fail-safe to first attempt)
export function nextAttemptNoFrom(
  priorRows: Array<{ attempt_no?: number | string | null }> | null | undefined,
): number {
  const top = priorRows?.[0]?.attempt_no;
  const parsed = Number(top ?? 0);
  return (Number.isFinite(parsed) ? parsed : 0) + 1;
}
