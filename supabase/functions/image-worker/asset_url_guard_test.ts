// Hermetic unit tests for asset_url_guard (H2 asset-URL validation before Creatomate).
// Run: deno test supabase/functions/image-worker/asset_url_guard_test.ts
// No network: globalThis.fetch is stubbed per test and ALWAYS restored after.
import { assert, assertEquals, assertRejects } from 'jsr:@std/assert@1';
import {
  validateAssetUrl,
  resolveLegacyLogo,
  assertGovernedAssetReachable,
  RenderAssetTransientError,
  type AssetVerdict,
} from './asset_url_guard.ts';

const realFetch = globalThis.fetch;
function restore() { globalThis.fetch = realFetch; }

// fetch stub that returns an empty-body Response with the given status.
function stubStatus(status: number) {
  globalThis.fetch = ((_url: string | URL | Request, _init?: RequestInit) =>
    Promise.resolve(new Response(null, { status }))) as typeof fetch;
}
// fetch stub that rejects with an AbortError-named exception (simulates timeout/abort).
function stubAbort() {
  globalThis.fetch = ((_url: string | URL | Request, _init?: RequestInit) => {
    const e = new DOMException('aborted', 'AbortError');
    return Promise.reject(e);
  }) as typeof fetch;
}
// fetch stub that throws a generic network error.
function stubNetworkError() {
  globalThis.fetch = ((_url: string | URL | Request, _init?: RequestInit) =>
    Promise.reject(new TypeError('network down'))) as typeof fetch;
}

// ── validateAssetUrl ─────────────────────────────────────────────────────────
Deno.test('validateAssetUrl: 200 → ok', async () => {
  stubStatus(200);
  try { assertEquals(await validateAssetUrl('https://x/a.png'), { ok: true, status: 200, reason: 'ok' } as AssetVerdict); }
  finally { restore(); }
});
Deno.test('validateAssetUrl: 206 (ranged) → ok', async () => {
  stubStatus(206);
  try { assertEquals(await validateAssetUrl('https://x/a.png'), { ok: true, status: 206, reason: 'ok' } as AssetVerdict); }
  finally { restore(); }
});
Deno.test('validateAssetUrl: 400 → broken_4xx', async () => {
  stubStatus(400);
  try { assertEquals(await validateAssetUrl('https://x/a.png'), { ok: false, status: 400, reason: 'broken_4xx' } as AssetVerdict); }
  finally { restore(); }
});
Deno.test('validateAssetUrl: 404 → broken_4xx', async () => {
  stubStatus(404);
  try { assertEquals(await validateAssetUrl('https://x/a.png'), { ok: false, status: 404, reason: 'broken_4xx' } as AssetVerdict); }
  finally { restore(); }
});
Deno.test('validateAssetUrl: 500 → transient_5xx', async () => {
  stubStatus(500);
  try { assertEquals(await validateAssetUrl('https://x/a.png'), { ok: false, status: 500, reason: 'transient_5xx' } as AssetVerdict); }
  finally { restore(); }
});
Deno.test('validateAssetUrl: 503 → transient_5xx', async () => {
  stubStatus(503);
  try { assertEquals(await validateAssetUrl('https://x/a.png'), { ok: false, status: 503, reason: 'transient_5xx' } as AssetVerdict); }
  finally { restore(); }
});
Deno.test('validateAssetUrl: abort/timeout → timeout', async () => {
  stubAbort();
  try { assertEquals(await validateAssetUrl('https://x/a.png'), { ok: false, status: null, reason: 'timeout' } as AssetVerdict); }
  finally { restore(); }
});
Deno.test('validateAssetUrl: fetch throws → network', async () => {
  stubNetworkError();
  try { assertEquals(await validateAssetUrl('https://x/a.png'), { ok: false, status: null, reason: 'network' } as AssetVerdict); }
  finally { restore(); }
});
Deno.test('validateAssetUrl: malformed URL → malformed (no fetch)', async () => {
  let called = 0;
  globalThis.fetch = (() => { called++; return Promise.resolve(new Response(null, { status: 200 })); }) as typeof fetch;
  try {
    assertEquals(await validateAssetUrl('not a url'), { ok: false, status: null, reason: 'malformed' } as AssetVerdict);
    assertEquals(called, 0);
  } finally { restore(); }
});

// ── resolveLegacyLogo ────────────────────────────────────────────────────────
Deno.test('resolveLegacyLogo: null → {logoUrl:null}', async () => {
  const r = await resolveLegacyLogo(null, new Map());
  assertEquals(r.logoUrl, null);
});
Deno.test('resolveLegacyLogo: undefined → {logoUrl:null}', async () => {
  const r = await resolveLegacyLogo(undefined, new Map());
  assertEquals(r.logoUrl, null);
});
Deno.test('resolveLegacyLogo: 2xx → {logoUrl: original}', async () => {
  stubStatus(200);
  try { assertEquals((await resolveLegacyLogo('https://x/logo.png', new Map())).logoUrl, 'https://x/logo.png'); }
  finally { restore(); }
});
Deno.test('resolveLegacyLogo: 404 → {logoUrl:null}', async () => {
  stubStatus(404);
  try { assertEquals((await resolveLegacyLogo('https://x/logo.png', new Map())).logoUrl, null); }
  finally { restore(); }
});
Deno.test('resolveLegacyLogo: malformed → {logoUrl:null}', async () => {
  const r = await resolveLegacyLogo('not a url', new Map());
  assertEquals(r.logoUrl, null);
});
Deno.test('resolveLegacyLogo: 5xx → throws RenderAssetTransientError', async () => {
  stubStatus(503);
  try {
    await assertRejects(() => resolveLegacyLogo('https://x/logo.png', new Map()), RenderAssetTransientError);
  } finally { restore(); }
});
Deno.test('resolveLegacyLogo: timeout → throws RenderAssetTransientError', async () => {
  stubAbort();
  try {
    await assertRejects(() => resolveLegacyLogo('https://x/logo.png', new Map()), RenderAssetTransientError);
  } finally { restore(); }
});
Deno.test('resolveLegacyLogo: network → throws RenderAssetTransientError', async () => {
  stubNetworkError();
  try {
    await assertRejects(() => resolveLegacyLogo('https://x/logo.png', new Map()), RenderAssetTransientError);
  } finally { restore(); }
});
Deno.test('resolveLegacyLogo: memoizes — same URL fetched exactly once', async () => {
  let called = 0;
  globalThis.fetch = (() => { called++; return Promise.resolve(new Response(null, { status: 200 })); }) as typeof fetch;
  try {
    const memo = new Map();
    const r1 = await resolveLegacyLogo('https://x/logo.png', memo);
    const r2 = await resolveLegacyLogo('https://x/logo.png', memo);
    assertEquals(r1.logoUrl, 'https://x/logo.png');
    assertEquals(r2.logoUrl, 'https://x/logo.png');
    assertEquals(called, 1);
  } finally { restore(); }
});

// ── assertGovernedAssetReachable ─────────────────────────────────────────────
Deno.test('assertGovernedAssetReachable: 2xx → resolves', async () => {
  stubStatus(200);
  try { await assertGovernedAssetReachable('logo', 'https://x/logo.png'); }
  finally { restore(); }
});
Deno.test('assertGovernedAssetReachable: 404 → throws governed_asset_unreachable:', async () => {
  stubStatus(404);
  try {
    const err = await assertRejects(() => assertGovernedAssetReachable('logo', 'https://x/logo.png'), Error);
    assert(err.message.startsWith('governed_asset_unreachable:'), `got: ${err.message}`);
  } finally { restore(); }
});
Deno.test('assertGovernedAssetReachable: network unreachable → throws governed_asset_unreachable:', async () => {
  stubNetworkError();
  try {
    const err = await assertRejects(() => assertGovernedAssetReachable('background', 'https://x/bg.png'), Error);
    assert(err.message.startsWith('governed_asset_unreachable:'), `got: ${err.message}`);
  } finally { restore(); }
});
