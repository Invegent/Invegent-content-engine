// geo_pairing.ts — C1 closure step 3: derive the copy's geography from the headline TEXT.
//
// PURE. No I/O, no network, no DB, no model call. Deterministic for a given string.
//
// ─────────────────────────────────────────────────────────────────────────────────────
// WHY DERIVE RATHER THAN DECLARE
//
// An LLM (`ai-worker`) writes `image_headline`. The cheap move is to have it also emit the
// geography. That is a SELF-REPORT: the model attesting to its own output. `render_spec` was
// the worker's self-report and could not witness what the provider received; a model asserting
// "this headline is about Perth" cannot witness what the headline says.
//
// This module is a WITNESS OVER THE ARTEFACT: a closed gazetteer applied to the actual string.
//
// ─────────────────────────────────────────────────────────────────────────────────────
// WHY NOTHING IS STORED
//
// The headline IS the source of truth. `copyGeoFromHeadline()` is called at render time, where
// both the copy and the resolved background are already in hand. A stored `copy_geo` column
// would be written once and never re-derived when the headline is edited — precisely the class
// of unread, drifting metadata that carry C1 is made of.
//
// ─────────────────────────────────────────────────────────────────────────────────────
// KNOWN HOLE — FAILS OPEN ON UNKNOWN PLACES. Read this before trusting a pass.
//
// A gazetteer only knows what is in it. Failing CLOSED on unrecognised capitalised tokens would
// trip on every proper noun ("Youth Allowance", "Gen Z"), so an unknown token yields NO place
// claim, and no claim pairs with anything — including `non_au`.
//
//   => A headline naming a place this lexicon does not know CAN pair with a non-Australian
//      background. Today that is survivable only because every `non_au` asset is deactivated.
//
// This is a real limitation, not a rounding error. It is the reason step 5 must ship WARN-ONLY
// first, and the reason `non_au` assets must stay fenced until the lexicon is exercised against
// real copy.

/** The asset-side vocabulary, ratified by PK 2026-07-10 (register v5.50). */
export type AssetGeoScope =
  | 'none'
  | 'unidentified'
  | 'au_generic'
  | 'au_wa_perth'
  | 'au_nsw'
  | 'au_qld'
  | 'non_au';

/**
 * The COPY-side vocabulary is a SUPERSET of the asset vocabulary.
 *
 * Production copy names capitals no asset depicts ("Brisbane was 37% cheaper than Melbourne").
 * The pairing assert asks `assetGeo ∈ copyGeo`, so the copy side must be able to say `au_vic`
 * even though no asset is scoped `au_vic`. These extra values are COPY-ONLY and are NOT valid
 * `asset_meta.geo_scope` values.
 *
 * NOT YET RATIFIED BY PK — the asset vocabulary was ratified; this extension is proposed.
 */
export type CopyGeoScope =
  | 'au_generic'
  | 'au_wa_perth'
  | 'au_nsw'
  | 'au_qld'
  | 'au_vic'
  | 'au_sa'
  | 'au_tas'
  | 'au_act'
  | 'au_nt';

export type GeoMatch = { token: string; scope: CopyGeoScope };
export type CopyGeo = {
  /** Deduplicated, sorted. Empty = the copy makes no place claim (~83% of production copy). */
  scopes: CopyGeoScope[];
  /** Evidence: which surface token produced which scope. For render_spec, never for the assert. */
  matches: GeoMatch[];
};

// ─────────────────────────────────────────────────────────────────────────────────────
// The gazetteer. Case-insensitive unless noted. Word-boundary matched.
//
// DELIBERATE COARSENING: `WA` / `Western Australia` map to `au_wa_perth`, because the only
// WA-scoped assets are Perth. A headline about regional WA would therefore pair with a Perth
// CBD skyline. Recorded here rather than hidden; revisit if a non-Perth WA asset is ever added.
// ─────────────────────────────────────────────────────────────────────────────────────
const GAZETTEER: ReadonlyArray<readonly [RegExp, CopyGeoScope]> = [
  // capitals
  [/\bperth\b/i, 'au_wa_perth'],
  [/\bsydney\b/i, 'au_nsw'],
  [/\bbrisbane\b/i, 'au_qld'],
  [/\bmelbourne\b/i, 'au_vic'],
  [/\badelaide\b/i, 'au_sa'],
  [/\bhobart\b/i, 'au_tas'],
  [/\bcanberra\b/i, 'au_act'],
  [/\bdarwin\b/i, 'au_nt'],
  // states, spelled out
  [/\bwestern australia\b/i, 'au_wa_perth'], // coarsening, see note above
  [/\bnew south wales\b/i, 'au_nsw'],
  [/\bqueensland\b/i, 'au_qld'],
  [/\bvictoria\b/i, 'au_vic'],
  [/\bsouth australia\b/i, 'au_sa'],
  [/\btasmania\b/i, 'au_tas'],
  [/\bnorthern territory\b/i, 'au_nt'],
  // national
  [/\baustralias?\b/i, 'au_generic'],
  [/\baustralian\b/i, 'au_generic'],
  [/\bnationwide\b/i, 'au_generic'],
  // 'national' was MISSING in the first draft: a dry-run over 766 production headlines found 6
  // that say "national" and were therefore read as making NO place claim (a fail-open). Added.
  [/\bnational\b/i, 'au_generic'],
];

/**
 * State abbreviations. CASE-SENSITIVE and uppercase-only, because `WA` is also Washington and
 * `wa` appears inside ordinary words. `\b` alone would match "Wa" in prose; requiring uppercase
 * is the cheap disambiguator. `SA`/`NT`/`ACT` are deliberately EXCLUDED: `ACT` is a common verb
 * and `SA`/`NT` collide too readily. Under-matching fails open, which this module already does.
 */
const ABBREVIATIONS: ReadonlyArray<readonly [RegExp, CopyGeoScope]> = [
  [/\bWA\b/, 'au_wa_perth'],
  [/\bNSW\b/, 'au_nsw'],
  [/\bQLD\b/, 'au_qld'],
  [/\bVIC\b/, 'au_vic'],
  [/\bTAS\b/, 'au_tas'],
];

/**
 * Derive the set of geographies a headline CLAIMS. Pure; deterministic; never throws.
 *
 * An empty `scopes` means "no place claim", NOT "unknown". See the fails-open note at the top:
 * an unrecognised place name is indistinguishable from no place at all.
 */
export function copyGeoFromHeadline(headline: string | null | undefined): CopyGeo {
  const text = (headline ?? '').trim();
  if (text.length === 0) return { scopes: [], matches: [] };

  const matches: GeoMatch[] = [];
  for (const [re, scope] of GAZETTEER) {
    const m = text.match(re);
    if (m) matches.push({ token: m[0], scope });
  }
  for (const [re, scope] of ABBREVIATIONS) {
    const m = text.match(re);
    if (m) matches.push({ token: m[0], scope });
  }

  const scopes = [...new Set(matches.map((m) => m.scope))].sort();
  return { scopes, matches };
}

/**
 * The pairing gate. Mirrors `assertHeadlineWithinGate`: pure, fail-loud, no fallback,
 * called BEFORE any provider request.
 *
 * Rules (PK-ratified 2026-07-10 except where noted):
 *  - asset `none` / `unidentified`  → always pass. The asset makes no claim.
 *  - copy claims nothing            → always pass. The copy makes no claim. (~83% of production.)
 *  - asset `au_generic`             → passes for ANY Australian copy, INCLUDING Perth. PK ratified:
 *                                     a generic AU suburb does not ASSERT it is Perth.
 *  - asset `non_au`                 → passes ONLY when the copy claims no place at all.
 *  - asset place-specific           → passes iff that place is among the copy's claims.
 *                                     `au_nsw` under a Perth headline is a lie: Sydney IS elsewhere.
 */
export function assertGeoPairingWithinGate(
  copyGeo: CopyGeo,
  assetGeo: AssetGeoScope,
  ctx: { assetKey?: string } = {},
): void {
  const where = ctx.assetKey ? ` (asset ${ctx.assetKey})` : '';

  if (assetGeo === 'none' || assetGeo === 'unidentified') return;

  const claims = copyGeo.scopes;
  if (claims.length === 0) {
    // No place claim. Anything pairs — including non_au.
    return;
  }

  if (assetGeo === 'non_au') {
    throw new Error(
      `geo-pairing: non-Australian background${where} cannot sit under copy claiming ` +
        `[${claims.join(', ')}]`,
    );
  }

  if (assetGeo === 'au_generic') {
    // Generic Australian imagery pairs with any Australian claim, per PK. It would NOT pair with
    // a claim about somewhere outside Australia — but the copy gazetteer emits AU scopes only,
    // so that case cannot arise today. Recorded so the next reader knows it was considered.
    return;
  }

  if (claims.includes(assetGeo as CopyGeoScope)) return;

  // RELAXED POLICY (PK ratified 2026-07-10): national copy licenses any Australian city.
  // "No rental in Australia is affordable" over a Perth skyline is ordinary editorial practice —
  // a Perth photo illustrating a national stat does not ASSERT the stat is Perth-specific.
  //
  // The `claims.length === 1` guard is load-bearing. "Brisbane leads Australia" claims BOTH
  // au_qld and au_generic; the copy names Brisbane, so a Perth background is still a mismatch.
  // Without the guard, any mention of "Australia" would launder every city contradiction into a
  // pass. National licenses a city ONLY when national is the copy's sole claim.
  if (claims.length === 1 && claims[0] === 'au_generic') return;

  throw new Error(
    `geo-pairing: background scoped ${assetGeo}${where} contradicts copy claiming ` +
      `[${claims.join(', ')}]`,
  );
}
