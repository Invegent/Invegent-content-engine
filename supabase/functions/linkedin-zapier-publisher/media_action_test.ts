// cc-0028 hermetic tests for the LinkedIn image_quote media-publish decision path.
// No network / DB / Deno.serve — imports the pure helper modules only (media_action.ts +
// guard.ts), never index.ts, so no port bind / no --allow-net.
//   * resolveZapierAction (media_action.ts): fail-closed method allowlist (text + image only).
//   * decideLinkedinAssetGuard (guard.ts): proves video stays blocked with mediaPublishSupported:true.
import { assertEquals, assert } from 'jsr:@std/assert@1';
import { resolveZapierAction } from './media_action.ts';
import { classifyLinkedinFormat, decideLinkedinAssetGuard } from './guard.ts';

// ── resolveZapierAction: text ──────────────────────────────────────────────
Deno.test('publish:text → post text-only, no image', () => {
  const r = resolveZapierAction({ kind: 'publish', method: 'text' }, {});
  assertEquals(r, { action: 'post', method: 'text', includeImage: false });
});

// ── resolveZapierAction: image, ready ──────────────────────────────────────
Deno.test('publish:image with generated image + url → post, includeImage true', () => {
  const r = resolveZapierAction(
    { kind: 'publish', method: 'image' },
    { image_status: 'generated', image_url: 'https://example.com/post-images/x.png' },
  );
  assertEquals(r, { action: 'post', method: 'image', includeImage: true });
});

// ── resolveZapierAction: image, fail-closed (missing url) ──────────────────
Deno.test('publish:image with null image_url → BLOCK, never post', () => {
  const r = resolveZapierAction(
    { kind: 'publish', method: 'image' },
    { image_status: 'generated', image_url: null },
  );
  assertEquals(r.action, 'block');
  assert(r.action === 'block' && r.reason.startsWith('image_method_no_image_url'), r.action === 'block' ? r.reason : '');
});

Deno.test('publish:image with empty/whitespace image_url → BLOCK', () => {
  const r = resolveZapierAction(
    { kind: 'publish', method: 'image' },
    { image_status: 'generated', image_url: '   ' },
  );
  assertEquals(r.action, 'block');
  assert(r.action === 'block' && r.reason.startsWith('image_method_no_image_url'));
});

// ── resolveZapierAction: image, fail-closed (status not generated) ─────────
Deno.test('publish:image with status!=generated → BLOCK, never post', () => {
  const r = resolveZapierAction(
    { kind: 'publish', method: 'image' },
    { image_status: 'pending', image_url: 'https://example.com/x.png' },
  );
  assertEquals(r.action, 'block');
  assert(r.action === 'block' && r.reason.startsWith('image_method_no_image_url'));
  // reason surfaces the offending status for review
  assert(r.action === 'block' && r.reason.includes('status=pending'));
});

// ── resolveZapierAction: carousel → BLOCK (v0 not enabled) ─────────────────
Deno.test('publish:carousel → BLOCK method_not_enabled_v0', () => {
  const r = resolveZapierAction({ kind: 'publish', method: 'carousel' }, {});
  assertEquals(r.action, 'block');
  assert(r.action === 'block' && r.reason.startsWith('method_not_enabled_v0'));
});

// ── resolveZapierAction: unknown method → BLOCK ────────────────────────────
Deno.test('publish:<unknown method> → BLOCK method_not_enabled_v0', () => {
  const r = resolveZapierAction({ kind: 'publish', method: 'lidar_hologram' }, {});
  assertEquals(r.action, 'block');
  assert(r.action === 'block' && r.reason.startsWith('method_not_enabled_v0'));
});

Deno.test('publish with undefined method → BLOCK method_not_enabled_v0', () => {
  const r = resolveZapierAction({ kind: 'publish' }, {});
  assertEquals(r.action, 'block');
  assert(r.action === 'block' && r.reason.startsWith('method_not_enabled_v0'));
});

// ── guard: video stays blocked even with mediaPublishSupported:true ────────
Deno.test('guard: video class stays kind:block with mediaPublishSupported:true', () => {
  const cls = classifyLinkedinFormat('video_short_kinetic');
  assertEquals(cls, 'video');
  // generated video + url present → still block (LinkedIn video publish not supported)
  const d = decideLinkedinAssetGuard(
    { assetClass: cls, video_status: 'generated', video_url: 'https://example.com/v.mp4' },
    { mediaPublishSupported: true },
  );
  assertEquals(d.kind, 'block');
});

Deno.test('guard: image class with generated+url → publish:image (mediaPublishSupported:true)', () => {
  const cls = classifyLinkedinFormat('image_quote');
  assertEquals(cls, 'image');
  const d = decideLinkedinAssetGuard(
    { assetClass: cls, image_status: 'generated', image_url: 'https://example.com/i.png' },
    { mediaPublishSupported: true },
  );
  assertEquals(d, { kind: 'publish', method: 'image' });
});

// end-to-end of the two pure stages for an image_quote draft with no image:
// guard would still say publish:image only if ready; if not ready guard blocks first.
// This asserts the resolver's own fail-closed even if a publish:image reaches it unready.
Deno.test('defence-in-depth: publish:image reaching resolver unready still blocks', () => {
  const r = resolveZapierAction(
    { kind: 'publish', method: 'image' },
    { image_status: undefined, image_url: undefined },
  );
  assertEquals(r.action, 'block');
  assert(r.action === 'block' && r.reason.startsWith('image_method_no_image_url'));
});
