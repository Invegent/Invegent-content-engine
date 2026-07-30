// video_stat_bounds.ts — VENDORED projection of the canonical governed video_short_stat
// render-contract character bounds.
//
// The canonical, sole source of truth for these four numbers is
// `../video-worker/b1_video_stat.ts:67-70` (the four EXPORTED constants consumed by the
// throwing render gate `assertStatFieldsWithinGate`, b1_video_stat.ts:112-129). This module
// is a VENDORED COPY of those numbers plus a PURE, NON-throwing validator so the PRODUCER
// (ai-worker) can measure a freshly-generated stat script against the exact bounds the render
// worker will later enforce — BEFORE the draft is enrolled in the render queue.
//
// Why a vendored copy and NOT a runtime import: the ICE house rule (proven) forbids any
// production path cross-importing across function dirs (no `import ... from '../video-worker/'`
// on a deployed path). See `creative_contract_parity_test.ts` — the sanctioned pattern is a
// vendored copy guarded by a TEST-ONLY parity import. This module's numbers are bound to the
// canonical source by `video_stat_bounds_parity_test.ts` (test-only cross-dir import), which
// deep-equals each constant against the `b1_video_stat.ts` export. If that parity test fails,
// the vendored copy has drifted and MUST be re-synced — the render gate stays the authority.
//
// Measurement contract: this validator measures `String(value ?? '').trim().length` — UTF-16
// code units — IDENTICAL to the render gate's `.trim().length`. It is NOT a SQL `length()`
// (Postgres counts characters, not UTF-16 units) — that divergence is exactly why validation
// lives here in TypeScript, sharing the gate's measurement, and not in the DB.

// VENDORED — must deep-equal `../video-worker/b1_video_stat.ts:67-70`.
// (Guarded by video_stat_bounds_parity_test.ts.)
export const B1_VIDEO_STAT_VALUE_MAX_CHARS = 12;
export const B1_VIDEO_STAT_LABEL_MAX_CHARS = 48;
export const B1_VIDEO_CONTEXT_LINE_MAX_CHARS = 160;
export const B1_VIDEO_CTA_TEXT_MAX_CHARS = 90;

export type StatBoundViolation = { field: string; length: number; max: number };

// PURE, NON-throwing per-field length validator. Returns one violation per field whose trimmed
// UTF-16 length EXCEEDS its max (strictly greater — a field at exactly its max is conformant).
// Blank fields are NOT this validator's concern: the render gate (assertStatFieldsWithinGate)
// owns the blank/missing check via `throw` at render time; here we validate LENGTH only, so a
// bounded-regeneration loop re-prompts strictly on over-length. No I/O, no Date, no random.
export function validateStatScriptBounds(script: {
  stat_value?: unknown;
  stat_label?: unknown;
  context_line?: unknown;
  cta_text?: unknown;
}): StatBoundViolation[] {
  const checks: Array<{ field: string; value: unknown; max: number }> = [
    { field: 'stat_value', value: script.stat_value, max: B1_VIDEO_STAT_VALUE_MAX_CHARS },
    { field: 'stat_label', value: script.stat_label, max: B1_VIDEO_STAT_LABEL_MAX_CHARS },
    { field: 'context_line', value: script.context_line, max: B1_VIDEO_CONTEXT_LINE_MAX_CHARS },
    { field: 'cta_text', value: script.cta_text, max: B1_VIDEO_CTA_TEXT_MAX_CHARS },
  ];
  const violations: StatBoundViolation[] = [];
  for (const c of checks) {
    const length = String(c.value ?? '').trim().length;
    if (length > c.max) {
      violations.push({ field: c.field, length, max: c.max });
    }
  }
  return violations;
}

// PURE re-prompt reminder builder. Turns a violation list into an explicit instruction that
// names each violated field, its measured length, and its hard max, then restates every
// violated field's limit and demands JSON-only output. Deterministic — same input yields the
// same string (no Date, no random). Intended to be appended to the stat user prompt on a
// bounded-regeneration retry.
export function buildBoundReminder(violations: StatBoundViolation[]): string {
  const measured = violations
    .map((v) => `${v.field} was ${v.length} chars (max ${v.max})`)
    .join(', ');
  const limits = violations
    .map((v) => `${v.field} max ${v.max}`)
    .join(', ');
  return `Your previous response violated hard character limits: ${measured}. ` +
    `Rewrite so EVERY field is within its limit: ${limits}. Return ONLY the JSON.`;
}
