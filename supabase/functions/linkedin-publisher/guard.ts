// linkedin asset guard v1 — interim assetless-publish guard (pure, dependency-free, unit-tested).
// LinkedIn only. Decides whether/how a draft may publish based on the rendered asset
// it requires. NEVER allows an asset-required format to publish as text.
//
// Mirrors supabase/functions/publisher/guard.ts (Facebook). Duplicated per-function
// (each Supabase function deploys from its own dir — do NOT cross-import). Keep this
// file byte-identical to linkedin-publisher/guard.ts.
//
// INTERIM POLICY (this lane): neither LinkedIn EF has a media-publish path today.
//   - Zapier bridge carries text only.
//   - Direct API posts `commentary` text only.
//   So decideLinkedinAssetGuard is called with { mediaPublishSupported: false } and any
//   non-text format BLOCKS (never degrades to text). The forward-compat branch
//   (mediaPublishSupported: true) adopts FB hold/publish/block semantics for when a
//   real LinkedIn media path is built — a one-line flip of the option at the call site.

export const IMAGE_HOLD_MINUTES = 30;

// classifyLinkedinFormat: which kind of post a format requires.
//   text     → plain post (no asset required)
//   image    → single image (image_quote)
//   carousel → multi-image carousel
//   video    → motion render (video_*)
//   unknown  → any other asset-required format → DEFAULT DENY (never text)
// Same mapping as classifyFbFormat.
export function classifyLinkedinFormat(fmt: string | null | undefined): "text" | "image" | "carousel" | "video" | "unknown" {
  const f = (fmt ?? "").trim().toLowerCase();
  if (f === "" || f === "text") return "text";
  if (f === "carousel") return "carousel";
  if (f === "image_quote") return "image";
  if (f.startsWith("video")) return "video";
  return "unknown"; // animated_* / future formats: deny rather than assetless-publish
}

export type AssetGuardInput = {
  assetClass: "text" | "image" | "carousel" | "video" | "unknown";
  image_status?: string | null; image_url?: string | null;
  video_status?: string | null; video_url?: string | null;
  minutesWaiting?: number; holdMinutes?: number; slideCount?: number;
};
export type AssetGuardDecision =
  | { kind: "publish"; method: "text" | "image" | "carousel" }
  | { kind: "hold"; reason: string; minutes: number }
  | { kind: "block"; reason: string };

export type LinkedinAssetGuardOptions = {
  // false (this lane): no media-publish path → any non-text format blocks.
  // true (future): a real LinkedIn media path exists → FB-like hold/publish/block.
  mediaPublishSupported: boolean;
};

// decideLinkedinAssetGuard: the single source of truth for whether/how to publish.
// NEVER returns publish:text for an asset-required format.
export function decideLinkedinAssetGuard(i: AssetGuardInput, opts: LinkedinAssetGuardOptions): AssetGuardDecision {
  if (i.assetClass === "text") return { kind: "publish", method: "text" };

  // ── Interim: no media path → block any non-text format, never text-fallback ──
  if (!opts.mediaPublishSupported) {
    if (i.assetClass === "image" || i.assetClass === "carousel" || i.assetClass === "video") {
      return { kind: "block", reason: "li_media_publish_not_supported_interim" };
    }
    // unknown asset-required format → default deny
    return { kind: "block", reason: "unknown_asset_required_format_default_deny" };
  }

  // ── Forward-compat: media path exists → FB hold/publish/block semantics ──
  // (not used this lane; reserved for a real LinkedIn media-publish capability)
  const holdMinutes = i.holdMinutes ?? IMAGE_HOLD_MINUTES;
  const minutesWaiting = i.minutesWaiting ?? 0;

  if (i.assetClass === "image") {
    if (i.image_status === "generated" && i.image_url) return { kind: "publish", method: "image" };
    if (i.image_status === "pending") {
      return minutesWaiting < holdMinutes
        ? { kind: "hold", reason: `image_pending:${Math.round(minutesWaiting)}m`, minutes: 15 }
        : { kind: "block", reason: `image_pending_timeout:${Math.round(minutesWaiting)}m` };
    }
    return { kind: "block", reason: `image_required_but_${i.image_status ?? "missing"}` };
  }

  if (i.assetClass === "carousel") {
    if (i.image_status === "pending") return { kind: "hold", reason: "carousel_image_pending", minutes: 15 };
    if (i.image_status !== "generated") return { kind: "block", reason: `carousel_image_${i.image_status ?? "missing"}` };
    if ((i.slideCount ?? 0) < 2) return { kind: "block", reason: `carousel_incomplete_slides:${i.slideCount ?? 0}` };
    return { kind: "publish", method: "carousel" };
  }

  if (i.assetClass === "video") {
    if (i.video_status === "pending") return { kind: "hold", reason: "video_pending", minutes: 15 };
    const ready = i.video_status === "generated" && !!i.video_url;
    return { kind: "block", reason: ready ? "li_video_publish_not_supported_interim" : `video_required_but_${i.video_status ?? "missing"}` };
  }

  // unknown asset-required format → default deny
  return { kind: "block", reason: "unknown_asset_required_format_default_deny" };
}
