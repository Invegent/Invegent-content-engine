// publisher v1.11.0 — Publishing-Origin cadence (pure, dependency-free, unit-tested).
// Decides cadence treatment for a queue row based on its publish_origin.
//   feed   → existing max_per_day + min_gap cadence (unchanged, decided in index.ts).
//   studio → SKIP max_per_day AND profile min_gap; apply only a fixed 10-minute
//            burst floor (STUDIO_MIN_GAP_MINUTES) so an operator cannot machine-gun
//            a client+platform faster than once per 10 minutes. ASAP otherwise.
//   series → treated as feed (only created_by='content-studio' is studio).
//
// This module owns ONLY the studio burst-floor decision. Every hard safety gate
// (approval, token, publish_enabled/paused, asset-guard, backstop, dry_run) lives
// in index.ts and applies to studio rows identically — origin never bypasses them.

export const STUDIO_MIN_GAP_MINUTES = 10;

export function isStudioOrigin(publishOrigin: string | null | undefined): boolean {
  return (publishOrigin ?? "feed") === "studio";
}

export type StudioGapDecision =
  | { defer: false }
  | { defer: true; scheduledForMs: number; reason: string };

// decideStudioMinGap: pure 10-minute burst floor for studio rows.
//   lastPublishedAtMs = epoch ms of the client+platform's last PUBLISHED post
//                       (m.post_publish by destination_id, status='published'),
//                       or null if none.
//   nowMs             = current epoch ms.
// Returns defer:true (with the new scheduled_for and a stable last_error reason)
// when the last publish was < STUDIO_MIN_GAP_MINUTES ago; otherwise defer:false.
// Mirrors the existing min_gap defer mechanics, with the studio constant instead
// of profile.min_gap_minutes — and with NO max_per_day check.
export function decideStudioMinGap(
  lastPublishedAtMs: number | null,
  nowMs: number,
  gapMinutes: number = STUDIO_MIN_GAP_MINUTES,
): StudioGapDecision {
  const gapMs = gapMinutes * 60_000;
  if (lastPublishedAtMs !== null && nowMs - lastPublishedAtMs < gapMs) {
    return {
      defer: true,
      scheduledForMs: lastPublishedAtMs + gapMs,
      reason: `studio_min_gap_floor:${gapMinutes}m`,
    };
  }
  return { defer: false };
}
