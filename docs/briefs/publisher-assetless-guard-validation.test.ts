// Publisher v1.9.0 interim assetless-release guard — validation.
// Imports the REAL classifyFbFormat + decideAssetGuard from the shipped publisher.
import { assertEquals } from "jsr:@std/assert";
import { classifyFbFormat, decideAssetGuard } from "../Invegent-content-engine/supabase/functions/publisher/guard.ts";

const HOLD = 30;

// ── classifyFbFormat mapping ────────────────────────────────────────────────
Deno.test("classify: text/null/empty → text", () => {
  assertEquals(classifyFbFormat("text"), "text");
  assertEquals(classifyFbFormat(null), "text");
  assertEquals(classifyFbFormat(""), "text");
});
Deno.test("classify: image_quote → image", () => assertEquals(classifyFbFormat("image_quote"), "image"));
Deno.test("classify: carousel → carousel", () => assertEquals(classifyFbFormat("carousel"), "carousel"));
Deno.test("classify: video_* → video", () => {
  for (const f of ["video_short", "video_short_kinetic", "video_short_avatar", "video_long_explainer", "video_short_stat_voice"]) {
    assertEquals(classifyFbFormat(f), "video", f);
  }
});
Deno.test("classify: animated_*/unknown → unknown (default deny)", () => {
  assertEquals(classifyFbFormat("animated_data"), "unknown");
  assertEquals(classifyFbFormat("animated_text_reveal"), "unknown");
  assertEquals(classifyFbFormat("some_future_format"), "unknown");
});

// ── Required validation cases ───────────────────────────────────────────────
Deno.test("1. text post publishes without asset", () => {
  const d = decideAssetGuard({ assetClass: "text" });
  assertEquals(d, { kind: "publish", method: "text" });
});

Deno.test("2. image_quote with generated image publishes (photo)", () => {
  const d = decideAssetGuard({ assetClass: "image", image_status: "generated", image_url: "https://x/y.png" });
  assertEquals(d, { kind: "publish", method: "image" });
});

Deno.test("3. image_quote with FAILED image does not publish (the incident)", () => {
  const d = decideAssetGuard({ assetClass: "image", image_status: "failed", image_url: null });
  assertEquals(d.kind, "block");
  assertEquals((d as any).reason, "image_required_but_failed");
});

Deno.test("4. image_quote with MISSING image does not publish", () => {
  const d = decideAssetGuard({ assetClass: "image", image_status: null, image_url: null });
  assertEquals(d.kind, "block");
  assertEquals((d as any).reason, "image_required_but_missing");
});

Deno.test("4b. image_quote generated but URL absent → block (not publish)", () => {
  const d = decideAssetGuard({ assetClass: "image", image_status: "generated", image_url: null });
  assertEquals(d.kind, "block");
});

Deno.test("5. carousel with <2 slides does not publish", () => {
  const d = decideAssetGuard({ assetClass: "carousel", image_status: "generated", slideCount: 1 });
  assertEquals(d.kind, "block");
  assertEquals((d as any).reason, "carousel_incomplete_slides:1");
});

Deno.test("6. carousel with >=2 generated slides publishes", () => {
  const d = decideAssetGuard({ assetClass: "carousel", image_status: "generated", slideCount: 4 });
  assertEquals(d, { kind: "publish", method: "carousel" });
});

Deno.test("6b. carousel image failed/missing → block", () => {
  assertEquals(decideAssetGuard({ assetClass: "carousel", image_status: "failed", slideCount: 5 }).kind, "block");
  assertEquals(decideAssetGuard({ assetClass: "carousel", image_status: null }).kind, "block");
});

Deno.test("7. video with missing video does not publish", () => {
  const d = decideAssetGuard({ assetClass: "video", video_status: null, video_url: null });
  assertEquals(d.kind, "block");
  assertEquals((d as any).reason, "video_required_but_missing");
});

Deno.test("7b. video failed → block", () => {
  assertEquals(decideAssetGuard({ assetClass: "video", video_status: "failed" }).kind, "block");
});

Deno.test("8. video PENDING holds (does NOT publish as text)", () => {
  const d = decideAssetGuard({ assetClass: "video", video_status: "pending" });
  assertEquals(d.kind, "hold");
  assertEquals((d as any).reason, "video_pending");
});

Deno.test("8b. video generated but FB has no video path → block, never text", () => {
  const d = decideAssetGuard({ assetClass: "video", video_status: "generated", video_url: "https://x/v.mp4" });
  assertEquals(d.kind, "block");
  assertEquals((d as any).reason, "fb_video_publish_not_supported_interim");
});

Deno.test("image pending within hold window → hold; beyond → block (never publish)", () => {
  assertEquals(decideAssetGuard({ assetClass: "image", image_status: "pending", minutesWaiting: 5, holdMinutes: HOLD }).kind, "hold");
  assertEquals(decideAssetGuard({ assetClass: "image", image_status: "pending", minutesWaiting: 45, holdMinutes: HOLD }).kind, "block");
});

Deno.test("unknown asset-required format → default deny (block)", () => {
  const d = decideAssetGuard({ assetClass: "unknown" });
  assertEquals(d.kind, "block");
  assertEquals((d as any).reason, "unknown_asset_required_format_default_deny");
});

Deno.test("9. every block carries a clear non-empty reason", () => {
  const blocks = [
    decideAssetGuard({ assetClass: "image", image_status: "failed" }),
    decideAssetGuard({ assetClass: "carousel", image_status: "generated", slideCount: 0 }),
    decideAssetGuard({ assetClass: "video", video_status: "failed" }),
    decideAssetGuard({ assetClass: "unknown" }),
  ];
  for (const b of blocks) {
    assertEquals(b.kind, "block");
    if (b.kind === "block") assertEquals(typeof b.reason === "string" && b.reason.length > 0, true);
  }
});

Deno.test("10. NO asset-required format ever decides publish-as-text", () => {
  const assetRequired: Array<[string, any]> = [
    ["image", { assetClass: "image", image_status: "failed" }],
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
    const d = decideAssetGuard(inp);
    const isPublishText = d.kind === "publish" && (d as any).method === "text";
    assertEquals(isPublishText, false, `${name} must NOT publish as text`);
  }
});
