// LinkedIn interim assetless-publish guard — validation (F-PUBLISHER-ASSETGUARD-LINKEDIN).
// Imports the REAL classifyLinkedinFormat + decideLinkedinAssetGuard from the shipped guard.
// (Both LinkedIn function dirs carry a byte-identical copy; this tests the zapier copy.)
import { assertEquals } from "jsr:@std/assert";
import { classifyLinkedinFormat, decideLinkedinAssetGuard } from "../../supabase/functions/linkedin-zapier-publisher/guard.ts";

const HOLD = 30;
const INTERIM = { mediaPublishSupported: false } as const;
const MEDIA = { mediaPublishSupported: true } as const;

// ── classifyLinkedinFormat mapping ───────────────────────────────────────────
Deno.test("classify: text/null/empty → text", () => {
  assertEquals(classifyLinkedinFormat("text"), "text");
  assertEquals(classifyLinkedinFormat(null), "text");
  assertEquals(classifyLinkedinFormat(undefined), "text");
  assertEquals(classifyLinkedinFormat(""), "text");
  assertEquals(classifyLinkedinFormat("  TEXT  "), "text");
});
Deno.test("classify: image_quote → image", () => assertEquals(classifyLinkedinFormat("image_quote"), "image"));
Deno.test("classify: carousel → carousel", () => assertEquals(classifyLinkedinFormat("carousel"), "carousel"));
Deno.test("classify: video_* → video", () => {
  for (const f of ["video_short", "video_short_kinetic", "video_short_avatar", "video_long_explainer", "video_short_stat_voice"]) {
    assertEquals(classifyLinkedinFormat(f), "video", f);
  }
});
Deno.test("classify: animated_*/unknown → unknown (default deny)", () => {
  assertEquals(classifyLinkedinFormat("animated_data"), "unknown");
  assertEquals(classifyLinkedinFormat("animated_text_reveal"), "unknown");
  assertEquals(classifyLinkedinFormat("some_future_format"), "unknown");
});

// ── INTERIM (mediaPublishSupported:false) — both EFs today ───────────────────
Deno.test("interim 1. text post publishes without asset", () => {
  assertEquals(decideLinkedinAssetGuard({ assetClass: "text" }, INTERIM), { kind: "publish", method: "text" });
});

Deno.test("interim 2. image_quote → block li_media_publish_not_supported_interim", () => {
  const d = decideLinkedinAssetGuard({ assetClass: "image", image_status: "generated", image_url: "https://x/y.png" }, INTERIM);
  assertEquals(d.kind, "block");
  assertEquals((d as any).reason, "li_media_publish_not_supported_interim");
});

Deno.test("interim 3. carousel → block li_media_publish_not_supported_interim", () => {
  const d = decideLinkedinAssetGuard({ assetClass: "carousel", image_status: "generated", slideCount: 4 }, INTERIM);
  assertEquals(d.kind, "block");
  assertEquals((d as any).reason, "li_media_publish_not_supported_interim");
});

Deno.test("interim 4. video → block li_media_publish_not_supported_interim", () => {
  const d = decideLinkedinAssetGuard({ assetClass: "video", video_status: "generated", video_url: "https://x/v.mp4" }, INTERIM);
  assertEquals(d.kind, "block");
  assertEquals((d as any).reason, "li_media_publish_not_supported_interim");
});

Deno.test("interim 5. image_quote with FAILED/missing image → still block (interim), never publish", () => {
  for (const inp of [
    { assetClass: "image" as const, image_status: "failed", image_url: null },
    { assetClass: "image" as const, image_status: null, image_url: null },
    { assetClass: "image" as const, image_status: "pending", image_url: null },
  ]) {
    const d = decideLinkedinAssetGuard(inp, INTERIM);
    assertEquals(d.kind, "block");
    assertEquals((d as any).reason, "li_media_publish_not_supported_interim");
  }
});

Deno.test("interim 6. animated_*/unknown → block unknown_asset_required_format_default_deny", () => {
  for (const fmt of ["animated_data", "animated_text_reveal", "some_future_format"]) {
    const d = decideLinkedinAssetGuard({ assetClass: classifyLinkedinFormat(fmt) }, INTERIM);
    assertEquals(d.kind, "block");
    assertEquals((d as any).reason, "unknown_asset_required_format_default_deny");
  }
});

Deno.test("interim 7. NO non-text format ever decides publish-as-text", () => {
  const nonText: Array<[string, any]> = [
    ["image-generated", { assetClass: "image", image_status: "generated", image_url: "u" }],
    ["image-failed", { assetClass: "image", image_status: "failed" }],
    ["image-missing", { assetClass: "image", image_status: null }],
    ["image-pending", { assetClass: "image", image_status: "pending" }],
    ["carousel-ok", { assetClass: "carousel", image_status: "generated", slideCount: 4 }],
    ["carousel-incomplete", { assetClass: "carousel", image_status: "generated", slideCount: 1 }],
    ["video-generated", { assetClass: "video", video_status: "generated", video_url: "u" }],
    ["video-missing", { assetClass: "video", video_status: null }],
    ["unknown", { assetClass: "unknown" }],
  ];
  for (const [name, inp] of nonText) {
    const d = decideLinkedinAssetGuard(inp, INTERIM);
    const isPublishText = d.kind === "publish" && (d as any).method === "text";
    assertEquals(isPublishText, false, `${name} must NOT publish as text`);
    assertEquals(d.kind, "block", `${name} must block in interim`);
  }
});

Deno.test("interim 8. every block carries a clear non-empty reason", () => {
  const blocks = [
    decideLinkedinAssetGuard({ assetClass: "image", image_status: "failed" }, INTERIM),
    decideLinkedinAssetGuard({ assetClass: "carousel", image_status: "generated", slideCount: 0 }, INTERIM),
    decideLinkedinAssetGuard({ assetClass: "video", video_status: "generated", video_url: "u" }, INTERIM),
    decideLinkedinAssetGuard({ assetClass: "unknown" }, INTERIM),
  ];
  for (const b of blocks) {
    assertEquals(b.kind, "block");
    if (b.kind === "block") assertEquals(typeof b.reason === "string" && b.reason.length > 0, true);
  }
});

// ── FORWARD-COMPAT (mediaPublishSupported:true) — not used this lane ──────────
Deno.test("fwd 1. text post publishes without asset", () => {
  assertEquals(decideLinkedinAssetGuard({ assetClass: "text" }, MEDIA), { kind: "publish", method: "text" });
});

Deno.test("fwd 2. image generated+url → publish image", () => {
  assertEquals(decideLinkedinAssetGuard({ assetClass: "image", image_status: "generated", image_url: "https://x/y.png" }, MEDIA), { kind: "publish", method: "image" });
});

Deno.test("fwd 3. image generated but URL absent → block (not publish)", () => {
  assertEquals(decideLinkedinAssetGuard({ assetClass: "image", image_status: "generated", image_url: null }, MEDIA).kind, "block");
});

Deno.test("fwd 4. image failed/missing → block with reason", () => {
  const f = decideLinkedinAssetGuard({ assetClass: "image", image_status: "failed", image_url: null }, MEDIA);
  assertEquals(f.kind, "block"); assertEquals((f as any).reason, "image_required_but_failed");
  const m = decideLinkedinAssetGuard({ assetClass: "image", image_status: null, image_url: null }, MEDIA);
  assertEquals(m.kind, "block"); assertEquals((m as any).reason, "image_required_but_missing");
});

Deno.test("fwd 5. image pending within hold window → hold; beyond → block (never publish)", () => {
  assertEquals(decideLinkedinAssetGuard({ assetClass: "image", image_status: "pending", minutesWaiting: 5, holdMinutes: HOLD }, MEDIA).kind, "hold");
  assertEquals(decideLinkedinAssetGuard({ assetClass: "image", image_status: "pending", minutesWaiting: 45, holdMinutes: HOLD }, MEDIA).kind, "block");
});

Deno.test("fwd 6. carousel pending → hold; <2 slides → block; >=2 generated → publish", () => {
  assertEquals(decideLinkedinAssetGuard({ assetClass: "carousel", image_status: "pending" }, MEDIA).kind, "hold");
  const inc = decideLinkedinAssetGuard({ assetClass: "carousel", image_status: "generated", slideCount: 1 }, MEDIA);
  assertEquals(inc.kind, "block"); assertEquals((inc as any).reason, "carousel_incomplete_slides:1");
  assertEquals(decideLinkedinAssetGuard({ assetClass: "carousel", image_status: "generated", slideCount: 4 }, MEDIA), { kind: "publish", method: "carousel" });
  assertEquals(decideLinkedinAssetGuard({ assetClass: "carousel", image_status: "failed", slideCount: 5 }, MEDIA).kind, "block");
});

Deno.test("fwd 7. video pending → hold; missing/failed → block; generated → block (no media post path yet), never text", () => {
  assertEquals(decideLinkedinAssetGuard({ assetClass: "video", video_status: "pending" }, MEDIA).kind, "hold");
  const miss = decideLinkedinAssetGuard({ assetClass: "video", video_status: null }, MEDIA);
  assertEquals(miss.kind, "block"); assertEquals((miss as any).reason, "video_required_but_missing");
  assertEquals(decideLinkedinAssetGuard({ assetClass: "video", video_status: "failed" }, MEDIA).kind, "block");
  const gen = decideLinkedinAssetGuard({ assetClass: "video", video_status: "generated", video_url: "https://x/v.mp4" }, MEDIA);
  assertEquals(gen.kind, "block");
  assertEquals((gen as any).reason, "li_video_publish_not_supported_interim");
});

Deno.test("fwd 8. unknown asset-required format → default deny (block)", () => {
  const d = decideLinkedinAssetGuard({ assetClass: "unknown" }, MEDIA);
  assertEquals(d.kind, "block");
  assertEquals((d as any).reason, "unknown_asset_required_format_default_deny");
});

Deno.test("fwd 9. NO asset-required format ever decides publish-as-text", () => {
  const assetRequired: Array<[string, any]> = [
    ["image-failed", { assetClass: "image", image_status: "failed" }],
    ["image-missing", { assetClass: "image", image_status: null }],
    ["image-pending", { assetClass: "image", image_status: "pending", minutesWaiting: 999, holdMinutes: HOLD }],
    ["carousel-incomplete", { assetClass: "carousel", image_status: "generated", slideCount: 1 }],
    ["carousel-failed", { assetClass: "carousel", image_status: "failed" }],
    ["video-missing", { assetClass: "video", video_status: null }],
    ["video-failed", { assetClass: "video", video_status: "failed" }],
    ["video-generated", { assetClass: "video", video_status: "generated", video_url: "u" }],
    ["unknown", { assetClass: "unknown" }],
  ];
  for (const [name, inp] of assetRequired) {
    const d = decideLinkedinAssetGuard(inp, MEDIA);
    const isPublishText = d.kind === "publish" && (d as any).method === "text";
    assertEquals(isPublishText, false, `${name} must NOT publish as text`);
  }
});
