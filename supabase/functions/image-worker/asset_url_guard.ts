// asset_url_guard.ts — H2: validate an external asset URL before handing it to
// Creatomate, so a non-null but broken logo/asset URL can't hard-fail the render.
// Pure module: a single bounded ranged GET, no DB, no secrets, no other side effects.

export type AssetVerdict =
  | { ok: true; status: number; reason: 'ok' }
  | { ok: false; status: number | null; reason: 'broken_4xx' | 'transient_5xx' | 'timeout' | 'network' | 'malformed' };

// Single ranged GET (bytes=0-0) with an AbortController timeout. Classifies the URL.
export async function validateAssetUrl(url: string, timeoutMs = 4000): Promise<AssetVerdict> {
  try { new URL(url); } catch { return { ok: false, status: null, reason: 'malformed' }; }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' }, signal: ctrl.signal });
    const s = resp.status;
    try { await resp.body?.cancel(); } catch { /* ignore */ }
    if (s >= 200 && s < 300) return { ok: true, status: s, reason: 'ok' };
    if (s >= 400 && s < 500) return { ok: false, status: s, reason: 'broken_4xx' };
    if (s >= 500 && s < 600) return { ok: false, status: s, reason: 'transient_5xx' };
    return { ok: false, status: s, reason: 'transient_5xx' };
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return { ok: false, status: null, reason: 'timeout' };
    return { ok: false, status: null, reason: 'network' };
  } finally {
    clearTimeout(t);
  }
}

// Legacy logo resolver, per-run memoized. NEVER throws. Returns the logo URL to use,
// or null to trigger the EXISTING wordmark/no-logo fallback:
//   - null/empty raw URL        → { logoUrl: null,    fallback: 'null_logo' }
//   - reachable (2xx/206)       → { logoUrl: rawUrl }
//   - definitively broken       → { logoUrl: null,    fallback: 'logo_4xx' }   (4xx/malformed → wordmark)
//   - transient (5xx/timeout/   → { logoUrl: rawUrl,  fallback: 'transient_proceed' }
//     network)
// PROCEED-ON-TRANSIENT: a storage/network blip on the pre-flight ranged GET must NOT
// fail the render early — pass the ORIGINAL logo URL through and let Creatomate be the
// source of truth. Only a definitive 4xx/malformed drops the logo to the wordmark path.
export async function resolveLegacyLogo(
  rawUrl: string | null | undefined,
  memo: Map<string, Promise<AssetVerdict>>,
): Promise<{ logoUrl: string | null; fallback?: 'null_logo' | 'logo_4xx' | 'transient_proceed' }> {
  if (!rawUrl) return { logoUrl: null, fallback: 'null_logo' };
  let p = memo.get(rawUrl);
  if (!p) { p = validateAssetUrl(rawUrl); memo.set(rawUrl, p); }
  const v = await p;
  if (v.ok) return { logoUrl: rawUrl };
  if (v.reason === 'broken_4xx' || v.reason === 'malformed') return { logoUrl: null, fallback: 'logo_4xx' };
  // transient_5xx | timeout | network → proceed with the original URL (do NOT fail early).
  return { logoUrl: rawUrl, fallback: 'transient_proceed' };
}

// Governed assets: fail loud, NEVER fallback.
export async function assertGovernedAssetReachable(
  key: string, url: string, memo?: Map<string, Promise<AssetVerdict>>,
): Promise<void> {
  let p = memo?.get(url);
  if (!p) { p = validateAssetUrl(url); if (memo) memo.set(url, p); }
  const v = await p;
  if (!v.ok) throw new Error(`governed_asset_unreachable:${key}:HTTP_${v.status ?? v.reason}:${url}`);
}
