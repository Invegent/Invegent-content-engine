// b1_production.ts — CREATIVE-LIBRARY BRANCH B / LANE B1 (image-worker).
//
// Pure helper module for the Property-Pulse-ONLY governed branch inside the EXISTING
// production `image_quote` loop. Every non-PP client and every other format stays
// byte-unchanged on the legacy path.
//
// OPTION D (2026-07-05, TMR-live B1 slice — PK Gate-1 D1–D7): the legacy hardcoded
// rotation is RETIRED ("the constant dies"). B1_BACKGROUND_KEYS / B1_BACKGROUND_KEY /
// B1_ASSET_KEYS / B1_LOGO_KEY / selectB1BackgroundKey are DELETED — the production
// branch now consumes the live TMR spine: ONE RPC `public.select_template(...)` returns
// the winner template AND its embedded slot_resolution (governed Background.source /
// Logo.source URLs + Scrim.opacity). This module contributes the PURE pieces of that
// consumption: the D1 fail-closed winner→text-field mapping (TMR_WINNER_TEXT_FIELDS)
// and the pure render-plan builder (buildTmrRenderPlan) that turns a selector response
// + draft-derived fields into { providerTemplateId, modifications, tmrEvidence } — or
// THROWS (fail loud, never guesses a layout).
//
// NO side effects: no Deno.serve, no network/DB/storage/secret access, no Date.now
// inside the pure functions (renderDate is injected). Governed-only / fail-loud:
// assertHeadlineWithinGate + buildTmrRenderPlan THROW rather than falling back, so the
// caller's existing production catch fails the draft (image_status='failed') — there is
// NO fallback to the legacy buildImageQuoteScript for PP.

// The Property-Pulse client_id — the RELIABLE gate identity for B1. The governed branch
// keys on this client_id (NOT a slug) because getBrandAndSlug() falls back to the client-id
// UUID when the PostgREST c.client.client_slug read returns null, which silently sent the
// governed branch back to legacy in production (v3.14.0 defect).
export const B1_GOVERNED_CLIENT_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';

// The CANONICAL Property-Pulse slug passed to select_template + used in the storage
// path for the governed branch. This is a fixed constant — it is NO LONGER derived from
// getBrandAndSlug (whose slug can be the UUID fallback). Every non-PP client stays legacy.
export const B1_GOVERNED_CLIENT_SLUG = 'property-pulse';

// Headline-length OUTER SANITY BOUND. This is NOT a fit guarantee and never was — it
// never fired on any real collision; fit is owned by TMR_WINNER_LAYOUT_GUARD (bounded
// height + font auto-shrink). Its only job is to keep input far above the auto-shrink
// floor (at 90 chars the font lands nowhere near the 30px minimum — probe P1d) and to
// reject absurd/blank input fail-loud. No truncation, no AI rewrite.
export const B1_HEADLINE_MAX_CHARS = 90; // outer sanity bound, not a fit guarantee

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

// render_spec.label that marks the B1 production governed render (distinct from the
// B0 _smoke/ proof label and from legacy renders). UNCHANGED under Option D (design
// decision D3): the S1 stamper's scan predicate keys on this label, so forward TMR
// shadow rows continue automatically.
export const B1_PRODUCTION_LABEL = 'creative_library_b1_production';

// cc-0037 (v3.25.0) — render_spec.label for the SUPERVISED SMOKE surface
// (mode==='governed_image_quote_smoke'). DELIBERATELY DISTINCT from B1_PRODUCTION_LABEL:
// stamp_tmr_shadow_forward's candidate-pool AND remaining-count queries BOTH filter
// render_spec->>'label' = 'creative_library_b1_production' AND post_draft_id IS NOT NULL
// (supabase/migrations/20260703130939_create_stamp_tmr_shadow_forward_v1.sql:147-152, :289-293).
// A smoke row already carries post_draft_id IS NULL (structurally unstampable); this distinct
// label is defence-in-depth if that NOT NULL clause is ever dropped. The invariant
// B1_SMOKE_LABEL !== B1_PRODUCTION_LABEL is what the stamper safety rests on, and is unit-tested.
// The label lives HERE, beside its production sibling, so the invariant travels with the pair.
export const B1_SMOKE_LABEL = 'creative_library_b1_smoke';

// True ONLY for the single governed B1 client_id. The gate keys on client_id (NOT slug)
// because getBrandAndSlug() can fall back to the client-id UUID when the c.client.client_slug
// read returns null — gating on the slug then yielded false and silently routed PP back to
// legacy. client_id is the reliable identity; the canonical slug (B1_GOVERNED_CLIENT_SLUG) is
// passed to select_template/path explicitly, never derived from getBrandAndSlug. Every other
// client_id → false → legacy path.
export function isB1GovernedImageQuote(clientId: string): boolean {
  return clientId === B1_GOVERNED_CLIENT_ID;
}

// Minimal headline-length hard-gate. Trims; throws (fail loud) BEFORE any Creatomate /
// selector call when the headline is blank or exceeds B1_HEADLINE_MAX_CHARS. No truncation.
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

// cc-0037 (v3.25.0, OQ-1 option B) — fail-loud provider-drift guard for the supervised smoke.
// The smoke derives its provider template BY CONSTRUCTION (select_template + buildTmrRenderPlan),
// never by a hardcoded pin, then calls this to assert the derived id equals the id-of-record.
// A hardcoded template_smoke pin is exactly what Lane W retired: 48cba556… had been
// paste-repurposed to the live 1:1 market-insight card, so a pinned surface rendered WRONG
// output SILENTLY (the C4 hazard — see the template_smoke 410 guard comment in index.ts). This
// converts that silent drift into a LOUD, immediate throw naming BOTH the expected and actual
// ids. The caller MUST NOT render on mismatch. Pure / no I/O — unit-tested pass + throw paths.
export function assertExpectedProviderTemplate(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(
      `governed_image_quote_smoke provider drift: expected ${expected} (generic_market_insight_card_1x1_v1), got ${actual} — refusing to render (cc-0037 option B assert)`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────────────
// OPTION D — TMR selector consumption (pure).
// ─────────────────────────────────────────────────────────────────────────────────────

// The 6 draft-derived text fields (same value set the legacy path used); asset URLs +
// scrim arrive via slot_resolution.modifications, NEVER via this shape.
export type B1Fields = {
  category: string;
  headline: string;
  subtitle: string;
  location: string;
  date: string;
  footer: string;
};

// Minimal structural view of the `public.select_template` jsonb response — ONLY the
// fields this module consumes (source of truth: supabase/migrations/
// 20260703035154_create_select_template_v1.sql + 20260704002811_update_resolve_slot_assets_v1_1_scrim48.sql).
export type TmrSlotSelected = {
  slot?: string;
  asset_key?: string;
  asset_id?: string;
  asset_url?: string;
  reasons?: unknown[];
};

export type TmrSlotResolution = {
  status?: string;
  modifications?: Record<string, unknown>;
  selected?: TmrSlotSelected[];
  rejected?: unknown[];
  warnings?: unknown[];
  fail_reason?: string | null;
  context?: Record<string, unknown>;
};

export type TmrSelectorResponse = {
  status?: string;
  selected?: {
    assignment_id?: string;
    template_id?: string;
    provider_template_id?: string;
    provider_template_name?: string;
    variant_key?: string;
    format_key?: string;
    aspect_ratio?: string;
    assignment_status?: string;
    reasons?: unknown[];
    proof?: Record<string, unknown>;
  } | null;
  slot_resolution?: TmrSlotResolution | null;
  alternatives?: unknown[];
  rejected?: unknown[];
  warnings?: unknown[];
  fail_reason?: string | null;
  context?: Record<string, unknown>;
};

// D1 — fail-closed winner allowlist. v1 ships a vendored text-field mapping for
// `generic_market_insight_card_1x1_v1` ONLY (its dynamic field set is EXACTLY the legacy
// one — CategoryBadge/Headline/Subtitle/Location/Date/Footer + Background/Logo/Scrim from
// slot_resolution). If the selector ever returns a winner without a mapping (ranking flip,
// approval change, future intent calls), buildTmrRenderPlan THROWS — the render fails loud
// (image_status='failed'), it never guesses a layout. quote_card / intent support =
// follow-up mapping additions.
export const TMR_WINNER_TEXT_FIELDS: Record<string, (f: B1Fields) => Record<string, string>> = {
  'generic_market_insight_card_1x1_v1': (f) => ({
    'CategoryBadge.text': f.category,
    'Headline.text': f.headline,
    'Subtitle.text': f.subtitle,
    'Location.text': f.location,
    'Date.text': f.date,
    'Footer.text': f.footer,
  }),
};

// Layout guard — the STRUCTURAL fix for the headline/subtitle overprint (cc-0033a).
// The provider template under-specifies the card: `Subtitle` carries no `y` (it falls back to
// the provider default, 50% → 540px) while `Headline` is top-anchored at 26% with NO height
// bound, so it grows downward without limit and prints through the subtitle. Bounding the
// headline's height and letting its font auto-shrink makes overflow structurally impossible:
// no headline length can collide, so nothing has to be rejected to keep the card readable.
//
// These values are geometry for template `generic_market_insight_card_1x1_v1` ONLY. They are
// NOT a portable constant and NOT a line budget — a line count is a CONSEQUENCE of this
// geometry, never an input to it. (The earlier "max_lines: 3" was the budget implied by the
// OLD geometry; it does not survive the fix. Do not re-derive it, do not encode it.)
// Evidence: _harness/cc0033_headline_calibration/p1_probe/P1_FINDINGS.md
export const TMR_WINNER_LAYOUT_GUARD: Record<string, Record<string, string | number | null>> = {
  'generic_market_insight_card_1x1_v1': {
    'Headline.height': '22%',           // top 26% + 22% = bottom 518.4px, above Subtitle's 540px
    'Headline.font_size': null,         // null => auto-fit within the bounded height
    'Headline.font_size_minimum': '30 px',
    'Headline.font_size_maximum': '74 px', // the template's authored size; never grow past it
  },
};

// Additive render_spec.tmr evidence block (design decision D3).
export type TmrEvidence = {
  winner: string;
  provider_template_id: string;
  registry_template_id: string | null;
  assignment_id: string | null;
  variant_key: string | null;
  seed: string | null;
  slot_reasons: Array<{ slot: string | null; asset_key: string | null; reasons: unknown[] }>;
  slot_warnings: unknown[];
  selector_status: 'ok';
};

export type TmrRenderPlan = {
  providerTemplateId: string;
  modifications: Record<string, string | number | null>;
  tmrEvidence: TmrEvidence;
  // db-rls-auditor must-fix (Option D lane): the selected Background/Logo asset_keys from
  // slot_resolution.selected. backgroundAssetKey feeds the TOP-LEVEL render_spec.background_key
  // field (legacy field name preserved EXACTLY) that stamp_tmr_shadow_forward reads via
  // render_spec->>'background_key' to compute v_background_match — omitting it would stamp
  // every Option-D render background_match=false ('background_divergence'), inverting the
  // D7 supervised proof. logoAssetKey is exposed for symmetry (template.asset_keys carries both).
  backgroundAssetKey: string;
  logoAssetKey: string;
};

// PURE render-plan builder. Turns a select_template response + the draft-derived text
// fields into the Creatomate template-mode plan. Fail-loud contract:
//   - selector status !== 'ok'                 → throw tmr_selector_fail_closed
//   - slot_resolution missing / status !== 'ok' → throw tmr_selector_fail_closed
//   - winner missing / not in TMR_WINNER_TEXT_FIELDS (D1) → throw tmr_winner_unmapped
//   - slot_resolution.modifications missing Background.source / Logo.source URLs
//                                              → throw tmr_slot_resolution_incomplete
// `renderDate` is injected (no Date.now here) — it becomes Date.text via the winner map.
// Text fields are spread AFTER slot modifications; the winner map deliberately contains
// NO asset/scrim keys, so slot_resolution stays authoritative for Background/Logo/Scrim.
export function buildTmrRenderPlan(
  selectorResponse: TmrSelectorResponse | null | undefined,
  fields: B1Fields,
  renderDate: string,
): TmrRenderPlan {
  const resp = selectorResponse ?? {};
  if (resp.status !== 'ok') {
    throw new Error(`tmr_selector_fail_closed: ${resp.fail_reason ?? 'unknown'}`);
  }
  const slot = resp.slot_resolution;
  if (!slot || slot.status !== 'ok') {
    throw new Error(`tmr_selector_fail_closed: slot_resolution:${slot?.fail_reason ?? 'missing'}`);
  }
  const selected = resp.selected;
  const winnerName = selected?.provider_template_name ?? '';
  const textFieldsFor = TMR_WINNER_TEXT_FIELDS[winnerName];
  if (!winnerName || !textFieldsFor) {
    // D1: never guess a layout — an unmapped winner is a HARD failure.
    throw new Error(`tmr_winner_unmapped: ${winnerName || '(missing provider_template_name)'}`);
  }
  const providerTemplateId = selected?.provider_template_id ?? '';
  if (!providerTemplateId) {
    throw new Error('tmr_selector_fail_closed: missing_provider_template_id');
  }
  const slotMods = slot.modifications ?? {};
  const backgroundUrl = slotMods['Background.source'];
  const logoUrl = slotMods['Logo.source'];
  if (typeof backgroundUrl !== 'string' || !backgroundUrl || typeof logoUrl !== 'string' || !logoUrl) {
    throw new Error('tmr_slot_resolution_incomplete: missing Background.source / Logo.source');
  }
  // Selected per-slot asset_keys (stamper contract: the Background key must reach the
  // TOP-LEVEL render_spec.background_key under the legacy field name — see TmrRenderPlan
  // comment). Absent/blank entries = incomplete slot evidence → throw (consistent with above).
  const slotSelectedEntries = slot.selected ?? [];
  const backgroundAssetKey = slotSelectedEntries.find((s) => s?.slot === 'Background')?.asset_key ?? '';
  const logoAssetKey = slotSelectedEntries.find((s) => s?.slot === 'Logo')?.asset_key ?? '';
  if (!backgroundAssetKey || !logoAssetKey) {
    throw new Error('tmr_slot_resolution_incomplete: missing Background/Logo selected entry (asset_key)');
  }
  const textFields = textFieldsFor({ ...fields, date: renderDate });
  const layoutGuard = TMR_WINNER_LAYOUT_GUARD[winnerName] ?? {};
  const modifications: Record<string, string | number | null> = {
    ...(slotMods as Record<string, string | number | null>),
    ...layoutGuard,
    ...textFields,
  };
  const tmrEvidence: TmrEvidence = {
    winner: winnerName,
    provider_template_id: providerTemplateId,
    registry_template_id: selected?.template_id ?? null,
    assignment_id: selected?.assignment_id ?? null,
    variant_key: selected?.variant_key ?? null,
    seed: (resp.context?.seed as string | null | undefined) ?? null,
    slot_reasons: (slot.selected ?? []).map((s) => ({
      slot: s?.slot ?? null,
      asset_key: s?.asset_key ?? null,
      reasons: Array.isArray(s?.reasons) ? s.reasons : [],
    })),
    slot_warnings: Array.isArray(slot.warnings) ? slot.warnings : [],
    selector_status: 'ok',
  };
  return { providerTemplateId, modifications, tmrEvidence, backgroundAssetKey, logoAssetKey };
}
