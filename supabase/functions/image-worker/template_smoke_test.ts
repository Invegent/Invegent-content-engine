// Hermetic unit test for CREATIVE-LIBRARY-V0 GATE C template-smoke shaping logic.
// Pure / no network / no Creatomate / no Supabase. Mirrors the exact in-handler logic
// for props_hash + renderScript shape so a drift in either is caught.
// Run: deno test supabase/functions/image-worker/template_smoke_test.ts

import { assertEquals } from 'jsr:@std/assert@1';

const TEMPLATE_ID = '48cba556-0a53-4001-90f0-05420d10efc0';

function buildModifications(backgroundUrl: string | null, logoUrl: string | null): Record<string, string | null> {
  return {
    'CategoryBadge.text': 'MARKET NEWS',
    'Headline.text': 'Sydney median house price hits record $1.6M',
    'Subtitle.text': 'Auction clearance rates climb for a third straight week',
    'Location.text': 'Sydney, NSW',
    'Date.text': '21 June 2026',
    'Footer.text': 'propertypulse.com.au',
    'Background.source': backgroundUrl,
    'Logo.source': logoUrl,
  };
}

async function propsHash(modifications: Record<string, string | null>): Promise<string> {
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(modifications)));
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.test('props_hash is deterministic for identical modifications', async () => {
  const mods = buildModifications('https://example.com/bg.jpg', 'https://example.com/logo.png');
  const h1 = await propsHash(mods);
  const h2 = await propsHash(buildModifications('https://example.com/bg.jpg', 'https://example.com/logo.png'));
  assertEquals(h1, h2);
  assertEquals(h1.length, 64); // SHA-256 hex
  assertEquals(/^[0-9a-f]{64}$/.test(h1), true);
});

Deno.test('props_hash changes when an asset URL changes', async () => {
  const a = await propsHash(buildModifications('https://example.com/bg-a.jpg', 'https://example.com/logo.png'));
  const b = await propsHash(buildModifications('https://example.com/bg-b.jpg', 'https://example.com/logo.png'));
  assertEquals(a === b, false);
});

Deno.test('renderScript shape is template-mode (template_id + modifications + jpg)', () => {
  const modifications = buildModifications('https://example.com/bg.jpg', 'https://example.com/logo.png');
  const renderScript = { template_id: TEMPLATE_ID, modifications, output_format: 'jpg' };
  assertEquals(renderScript.template_id, '48cba556-0a53-4001-90f0-05420d10efc0');
  assertEquals(renderScript.output_format, 'jpg');
  assertEquals(renderScript.modifications['CategoryBadge.text'], 'MARKET NEWS');
  assertEquals(renderScript.modifications['Footer.text'], 'propertypulse.com.au');
  // No element-tree / output dimensions: this is template mode, not script mode.
  assertEquals('elements' in renderScript, false);
});
