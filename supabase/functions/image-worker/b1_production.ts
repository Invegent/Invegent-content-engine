// b1_production.ts — CREATIVE-LIBRARY BRANCH B / LANE B1-v1 (image-worker).
//
// Pure helper module for the SMALLEST-SAFE production slice: a Property-Pulse-ONLY
// governed branch inside the EXISTING production `image_quote` loop. Every non-PP
// client and every other format stays byte-unchanged on the legacy path.
//
// NO side effects: no Deno.serve, no network/DB/storage/secret access. This module only
// exposes the PP gate predicate, the fixed governed asset-key contract, the production
// label, and a MINIMAL headline-length hard-gate (cut-plan decision D — cheap insurance
// against the B0 overflow defect going public; NOT a precise fit guarantee, and NOT an
// AI rewrite). Governed-only / fail-loud: assertHeadlineWithinGate THROWS rather than
// truncating, so the caller's existing production catch fails the draft
// (image_status='failed') — there is NO fallback to the legacy buildImageQuoteScript for PP.

// The Property-Pulse client_id — the RELIABLE gate identity for B1-v1. The governed branch
// keys on this client_id (NOT a slug) because getBrandAndSlug() falls back to the client-id
// UUID when the PostgREST c.client.client_slug read returns null, which silently sent the
// governed branch back to legacy in production (v3.14.0 defect).
export const B1_GOVERNED_CLIENT_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';

// The CANONICAL Property-Pulse slug passed to resolve_brand_assets + used in the storage
// path for the governed branch. This is a fixed constant — it is NO LONGER derived from
// getBrandAndSlug (whose slug can be the UUID fallback). Every non-PP client stays legacy.
export const B1_GOVERNED_CLIENT_SLUG = 'property-pulse';

// Fixed governed logo key for B1 (cut-plan decisions B + the PP pilot). Logo stays FIXED.
export const B1_LOGO_KEY = 'pp_logo_primary';

// B1-v3: the 5 governed Property-Pulse background keys, aligned to the governed resolver
// (`resolve_slot_assets`) eligible-pool rank order — text-safe class, created_at ASC,
// asset_id ASC — per PK decision 2026-07-04 (Option A-now-D-later). NOTE: this alignment
// holds ONLY while the governed eligible pool is exactly these 5 keys in this order; any
// future promotion/deactivation re-diverges it silently. This constant is a STOPGAP until
// B1 consumes the TMR selection spine (select_template/resolve_slot_assets) directly
// (Option D), at which point it is deleted. bg_perth_cbd stays index 0 (the v1 default),
// so the B1_BACKGROUND_KEY back-compat surface is unchanged.
export const B1_BACKGROUND_KEYS = ['bg_perth_cbd', 'bg_sydney_cbd', 'bg_brisbane_cbd', 'bg_pp_au_suburb_aerial_grid', 'bg_pp_home_keys_contract_table'] as const;

// Back-compat: the v1 fixed-default background key is the rotation set's index 0.
export const B1_BACKGROUND_KEY = B1_BACKGROUND_KEYS[0];

// Deterministic, pure, synchronous background selection. FNV-1a 32-bit over the
// post_draft_id string, modulo the set length. Same draft id -> same key, ALWAYS.
// No randomness, no Date, no crypto.subtle (async), no I/O. Stable across redeploys.
export function selectB1BackgroundKey(postDraftId: string): string {
  let h = 0x811c9dc5;                       // FNV offset basis
  for (let i = 0; i < postDraftId.length; i++) {
    h ^= postDraftId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);           // FNV prime
  }
  return B1_BACKGROUND_KEYS[(h >>> 0) % B1_BACKGROUND_KEYS.length];
}

// Minimal headline-length hard-gate (cut-plan decision D). PROVISIONAL / to_be_calibrated:
// a minimal hard-gate, NOT a precise fit guarantee. No truncation, no AI rewrite in v1.
export const B1_HEADLINE_MAX_CHARS = 90; // PROVISIONAL / to_be_calibrated (cut-plan decision D)

// B1-v2 subtitle (PK contract 2026-06-27): "same overflow limit as the headline".
export const B1_SUBTITLE_MAX_CHARS = B1_HEADLINE_MAX_CHARS; // 90; to_be_calibrated

// Derive the governed subtitle from draft_body: the FIRST non-empty paragraph, truncated
// (word-boundary + ellipsis) to B1_SUBTITLE_MAX_CHARS. Pure / deterministic / no I/O.
// UNLIKE the headline (a REQUIRED hard-gate that THROWS on overflow), the subtitle is
// DERIVED + OPTIONAL: empty/whitespace/absent body -> '' (no subtitle; render proceeds),
// and an over-length first paragraph is TRUNCATED, never failed.
export function deriveB1Subtitle(draftBody: string | null | undefined, maxChars: number = B1_SUBTITLE_MAX_CHARS): string {
  const normalized = (draftBody ?? '').replace(/\r\n?/g, '\n');
  const firstPara = normalized.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p.length > 0) ?? '';
  if (firstPara.length <= maxChars) return firstPara;
  const slice = firstPara.slice(0, maxChars - 1);            // leave room for the ellipsis
  const lastSpace = slice.lastIndexOf(' ');
  const head = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).replace(/[\s.,;:!?-]+$/, '');
  return head + '…';
}

// render_spec.label that marks the B1-v1 production governed render (distinct from the
// B0 _smoke/ proof label and from legacy renders). Keeps governed rows identifiable.
export const B1_PRODUCTION_LABEL = 'creative_library_b1_production';

// The two governed asset keys the resolver must return, in the {logo, background} shape
// mapResolvedAssets() consumes.
export const B1_ASSET_KEYS = { logo: B1_LOGO_KEY, background: B1_BACKGROUND_KEY } as const;

// True ONLY for the single governed B1-v1 client_id. The gate keys on client_id (NOT slug)
// because getBrandAndSlug() can fall back to the client-id UUID when the c.client.client_slug
// read returns null — gating on the slug then yielded false and silently routed PP back to
// legacy. client_id is the reliable identity; the canonical slug (B1_GOVERNED_CLIENT_SLUG) is
// passed to the resolver/path explicitly, never derived from getBrandAndSlug. Every other
// client_id → false → legacy path.
export function isB1GovernedImageQuote(clientId: string): boolean {
  return clientId === B1_GOVERNED_CLIENT_ID;
}

// Minimal headline-length hard-gate. Trims; throws (fail loud) BEFORE any Creatomate /
// resolver call when the headline is blank or exceeds B1_HEADLINE_MAX_CHARS. No truncation.
export function assertHeadlineWithinGate(headline: string | null | undefined): void {
  const trimmed = (headline ?? '').trim();
  if (!trimmed) {
    throw new Error('b1: missing image_headline');
  }
  if (trimmed.length > B1_HEADLINE_MAX_CHARS) {
    throw new Error(
      `b1: headline length ${trimmed.length} exceeds B1_HEADLINE_MAX_CHARS=${B1_HEADLINE_MAX_CHARS} (no truncation / no AI rewrite in v1)`,
    );
  }
}
