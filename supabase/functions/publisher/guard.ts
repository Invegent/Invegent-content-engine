// publisher v1.9.0 — interim assetless-release guard (pure, dependency-free, unit-tested).
// Facebook only. Decides whether/how a draft may publish based on the rendered
// asset it requires. NEVER allows an asset-required format to publish as text.

export const IMAGE_HOLD_MINUTES = 30;

// classifyFbFormat: which kind of post Facebook can actually build for a format.
//   text     → plain feed post (no asset required)
//   image    → single photo (image_quote)
//   carousel → multi-photo organic carousel
//   video    → motion render (video_*) — FB publisher has NO video path
//   unknown  → any other asset-required format → DEFAULT DENY (never text)
export function classifyFbFormat(fmt: string | null | undefined): "text" | "image" | "carousel" | "video" | "unknown" {
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

// decideAssetGuard: the single source of truth for whether/how to publish.
// NEVER returns publish:text for an asset-required format.
export function decideAssetGuard(i: AssetGuardInput): AssetGuardDecision {
  const holdMinutes = i.holdMinutes ?? IMAGE_HOLD_MINUTES;
  const minutesWaiting = i.minutesWaiting ?? 0;

  if (i.assetClass === "text") return { kind: "publish", method: "text" };

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
    return { kind: "block", reason: ready ? "fb_video_publish_not_supported_interim" : `video_required_but_${i.video_status ?? "missing"}` };
  }

  // unknown asset-required format → default deny
  return { kind: "block", reason: "unknown_asset_required_format_default_deny" };
}
