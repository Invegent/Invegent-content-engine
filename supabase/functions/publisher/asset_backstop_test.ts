// Minimal local unit test for requireAssetPresent (Lane A backstop matrix).
// Run: deno test supabase/functions/publisher/asset_backstop_test.ts
import { assertEquals } from "jsr:@std/assert@1";
import { requireAssetPresent, backstopAssetClass } from "./asset_backstop.ts";

const approved = { approval_status: "approved" } as const;

Deno.test("text/news → publish", () => {
  assertEquals(requireAssetPresent({ ...approved, recommended_format: "text" }).publish, true);
  assertEquals(requireAssetPresent({ ...approved, recommended_format: "news" }).publish, true);
  assertEquals(requireAssetPresent({ ...approved, recommended_format: null }).publish, true);
});

Deno.test("image classes require generated image_url", () => {
  for (const f of ["image_quote", "carousel", "animated_text_reveal", "animated_data"]) {
    assertEquals(
      requireAssetPresent({ ...approved, recommended_format: f, image_status: "generated", image_url: "http://x/i.png" }).publish,
      true,
      `${f} ready`,
    );
    assertEquals(
      requireAssetPresent({ ...approved, recommended_format: f, image_status: "generated", image_url: null }),
      { publish: false, reason: "missing_image" },
      `${f} no url`,
    );
  }
});

Deno.test("carousel slide count < 2 → missing_image", () => {
  assertEquals(
    requireAssetPresent({ ...approved, recommended_format: "carousel", image_status: "generated", image_url: "http://x/i.png" }, { carouselSlideCount: 1 }),
    { publish: false, reason: "missing_image" },
  );
  assertEquals(
    requireAssetPresent({ ...approved, recommended_format: "carousel", image_status: "generated", image_url: "http://x/i.png" }, { carouselSlideCount: 2 }).publish,
    true,
  );
});

Deno.test("video classes require generated video_url", () => {
  for (const f of ["video_short_kinetic", "video_short_stat", "video_short_kinetic_voice", "video_short_stat_voice", "video_short_avatar"]) {
    assertEquals(
      requireAssetPresent({ ...approved, recommended_format: f, video_status: "generated", video_url: "http://x/v.mp4" }).publish,
      true,
      `${f} ready`,
    );
    assertEquals(
      requireAssetPresent({ ...approved, recommended_format: f, video_status: "generated", video_url: null }),
      { publish: false, reason: "missing_video" },
      `${f} no url`,
    );
  }
});

Deno.test("render failed/pending blocked", () => {
  assertEquals(requireAssetPresent({ ...approved, recommended_format: "image_quote", image_status: "failed" }), { publish: false, reason: "render_failed" });
  assertEquals(requireAssetPresent({ ...approved, recommended_format: "image_quote", image_status: "pending" }), { publish: false, reason: "render_pending" });
  assertEquals(requireAssetPresent({ ...approved, recommended_format: "video_short_stat", video_status: "failed" }), { publish: false, reason: "render_failed" });
  assertEquals(requireAssetPresent({ ...approved, recommended_format: "video_short_stat", video_status: "pending" }), { publish: false, reason: "render_pending" });
});

Deno.test("approval backstop — not approved blocks all classes", () => {
  assertEquals(requireAssetPresent({ recommended_format: "text", approval_status: "draft" }), { publish: false, reason: "not_approved" });
  assertEquals(requireAssetPresent({ recommended_format: "image_quote", image_status: "generated", image_url: "http://x/i.png", approval_status: "rejected" }), { publish: false, reason: "not_approved" });
});

Deno.test("approval backstop — published only allowed when allowPublishedApproval (YT)", () => {
  const d = { recommended_format: "video_short_avatar", video_status: "generated", video_url: "http://x/v.mp4", approval_status: "published" } as const;
  // FB/IG default: 'published' is NOT 'approved' → blocked
  assertEquals(requireAssetPresent(d), { publish: false, reason: "not_approved" });
  // YT: published is a truthful cross-platform state → allowed
  assertEquals(requireAssetPresent(d, { allowPublishedApproval: true }).publish, true);
});

Deno.test("unknown asset-required format → default deny", () => {
  assertEquals(requireAssetPresent({ ...approved, recommended_format: "hologram_3d" }), { publish: false, reason: "unknown_asset_required_format" });
});

Deno.test("asset class resolution falls back through draft_format", () => {
  assertEquals(backstopAssetClass({ draft_format: { original_format: "Image_Quote" } }), "image_quote");
  assertEquals(backstopAssetClass({ draft_format: { post_type: "TEXT" } }), "text");
  assertEquals(backstopAssetClass({ recommended_format: "video_short_stat", draft_format: { original_format: "text" } }), "video_short_stat");
});
