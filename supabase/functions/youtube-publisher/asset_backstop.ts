// asset_backstop.ts — CANONICAL COPY (publisher).
// Uniform publish-time safety backstop: the LAST gate before a platform POST.
// Pure, dependency-free, unit-tested. NEVER throws; returns a structured outcome
// so the caller can skip/hold the item and continue. NEVER publish-empty.
//
// DUPLICATION NOTE: there is no supabase/functions/_shared dir in this repo, and the
// existing in-EF convention is a per-function helper module (see publisher/guard.ts).
// This file is therefore duplicated BYTE-IDENTICAL into instagram-publisher/ and
// youtube-publisher/. Keep the three copies in lockstep. If a _shared dir is ever
// introduced, collapse these into one import.
//
// This backstop does NOT replace the existing per-platform asset guards (FB
// decideAssetGuard, IG image/video hold gates, YT select predicates). It runs AFTER
// them as a final defence-in-depth assertion.

export type DraftLike = {
  recommended_format?: string | null;
  draft_format?: Record<string, unknown> | null;
  image_url?: string | null;
  image_status?: string | null;
  video_url?: string | null;
  video_status?: string | null;
  approval_status?: string | null;
};

export type BackstopOutcome = { publish: boolean; reason: string };

// asset class from COALESCE(recommended_format, draft_format->>'original_format',
// draft_format->>'post_type'). Lower-cased, trimmed.
export function backstopAssetClass(d: DraftLike): string {
  const df = (d.draft_format ?? {}) as Record<string, unknown>;
  const raw =
    d.recommended_format ??
    (typeof df["original_format"] === "string" ? (df["original_format"] as string) : null) ??
    (typeof df["post_type"] === "string" ? (df["post_type"] as string) : null) ??
    "";
  return String(raw).trim().toLowerCase();
}

const IMAGE_CLASSES = new Set([
  "image_quote",
  "carousel",
  "animated_text_reveal",
  "animated_data",
]);

const VIDEO_CLASSES = new Set([
  "video_short_kinetic",
  "video_short_stat",
  "video_short_kinetic_voice",
  "video_short_stat_voice",
  "video_short_avatar",
]);

// requireAssetPresent: the uniform final assertion.
//   - text/news → publish:true
//   - image classes → require image_url + image_status='generated'
//   - video classes → require video_url + video_status='generated'
//   - render status 'failed' → render_failed; 'pending' → hold
//   - APPROVAL backstop → require approval_status approved (see opts for YT)
//
// opts.allowPublishedApproval: YouTube treats approval_status as a cross-platform
// field and is correctly gated by IN ('approved','published') (youtube-publisher
// v1.9.0). For YT, set this true so a draft already published elsewhere is not
// regressed by this backstop. FB/IG leave it false ('approved' only).
//
// opts.carouselSlideCount: for carousel, the count of generated slide images so
// the backstop can mirror the existing "needs >= 2 slides" logic. Pass undefined
// when not applicable (the caller's primary guard already enforces this).
export function requireAssetPresent(
  draft: DraftLike,
  opts?: { allowPublishedApproval?: boolean; carouselSlideCount?: number },
): BackstopOutcome {
  const cls = backstopAssetClass(draft);

  // APPROVAL backstop (applies to all classes incl. text — a never-approved draft
  // must never publish).
  const approval = (draft.approval_status ?? "").trim().toLowerCase();
  const approvalOk = opts?.allowPublishedApproval
    ? approval === "approved" || approval === "published"
    : approval === "approved";
  if (!approvalOk) return { publish: false, reason: "not_approved" };

  // text / news → no asset required.
  if (cls === "" || cls === "text" || cls === "news") {
    return { publish: true, reason: "ok_text" };
  }

  if (IMAGE_CLASSES.has(cls)) {
    if (draft.image_status === "failed") return { publish: false, reason: "render_failed" };
    if (draft.image_status === "pending") return { publish: false, reason: "render_pending" };
    const imageReady = draft.image_status === "generated" && !!draft.image_url;
    if (!imageReady) return { publish: false, reason: "missing_image" };
    if (cls === "carousel" && opts?.carouselSlideCount !== undefined && opts.carouselSlideCount < 2) {
      return { publish: false, reason: "missing_image" };
    }
    return { publish: true, reason: "ok_image" };
  }

  if (VIDEO_CLASSES.has(cls)) {
    if (draft.video_status === "failed") return { publish: false, reason: "render_failed" };
    if (draft.video_status === "pending") return { publish: false, reason: "render_pending" };
    const videoReady = draft.video_status === "generated" && !!draft.video_url;
    if (!videoReady) return { publish: false, reason: "missing_video" };
    return { publish: true, reason: "ok_video" };
  }

  // Unknown asset-required format → default deny (never publish-empty).
  return { publish: false, reason: "unknown_asset_required_format" };
}
