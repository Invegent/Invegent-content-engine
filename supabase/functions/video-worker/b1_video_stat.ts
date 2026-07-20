// b1_video_stat.ts — CREATIVE-LIBRARY VIDEO TMR / GOVERNED video_short_stat (video-worker).
//
// Pure helper module for the governed VIDEO stat-reveal branch inside the EXISTING production
// video-worker loop. It is the VIDEO counterpart of image-worker/b1_production.ts: every client
// without a governance-enabled row and every format other than video_short_stat stays
// byte-unchanged on the legacy processDraft() path.
//
// NO side effects: no Deno.serve, no network/DB/storage/secret access, no Date.now inside the
// pure functions. Governed-only / fail-loud: assertStatFieldsWithinGate + buildGovernedVideoStatPlan
// THROW rather than falling back, so the caller's existing production catch fails the draft
// (video_status='failed') — there is NO fallback to the legacy buildStatRevealSpec for the governed
// video_short_stat branch.
//
// v3.6.0 (cc-0032 step 5 — COMBO AUDIO): the governed plan drives combo audio — a voiceover over an
// optional music bed. buildGovernedVideoStatPlan takes voiceUrl (REQUIRED — throws
// b1_video_missing_voiceover if blank) and musicBedUrl (OPTIONAL — '' = explicitly silent bed, N1),
// adding 'VoiceAudio.source' + 'MusicBed.source' to the existing text/logo mods.
// composeGovernedVideoNarration composes a concise (~≤40-word) spoken form of the stat fields (N2 —
// CTA stays VISUAL, never spoken). Bed level stays TEMPLATE-controlled (70%, N3 — the worker never
// sets MusicBed.volume).
//
// v3.8.0 (Video D6 Lane 3 — SPINE DE-HARDCODE, D6-8 + D6-6 + D6-7, ATOMIC): the governed branch now
// consumes the LIVE TMR spine instead of the direct bind, mirroring image-worker/b1_production.
// buildGovernedVideoStatPlan is REWRITTEN to take the public.select_template(...) response and derive:
//   • provider_template_id ← selected.provider_template_id  (RETIRES the B1_VIDEO_PROVIDER_TEMPLATE_ID constant)
//   • Logo.source          ← slot_resolution.modifications['Logo.source']  (RETIRES brand.logoUrl)
//   • variant_key          ← selected.variant_key  (RETIRES the B1_VIDEO_VARIANT_KEY constant)
// The evidence is now resolver-driven (bind_mode:'resolved', resolver_used:true) and contract_ref is
// DROPPED entirely (D6-7 — mirrors image TmrEvidence, which carries none; B1_VIDEO_CONTRACT_REF is
// deleted). BAKED-BG DIVERGENCE FROM IMAGE (v3.8.0): the builder required Logo.source ONLY, never
// Background.source — the video background was BAKED into template c11bb8ab (D2 ruling), so the resolver
// returned no Background slot for this template. Fail-loud: selector status!='ok' / slot_resolution.status
// !='ok' / missing provider_template_id / missing Logo.source → throw (→ video_status='failed', no
// fallback). isB1GovernedVideoStat is RETAINED for reference/tests but is no longer the production gate
// (index.ts now gates on the runtime governance lookup, mirroring image's isImageGovernanceEnabled).
//
// v3.10.0 (cc-0044 Checkpoint E — OPTION B, DYNAMIC VIDEO BACKGROUND): the baked-bg divergence is now
// CONDITIONAL, not absolute. buildGovernedVideoStatPlan binds Background.source OPTIONALLY — when the
// resolver returns a Background.source (a generic video variant carrying a Background field mapping, the
// image-path pattern), the client's background is supplied by GOVERNED DATA; when the resolver returns
// no Background.source (a baked-bg variant, e.g. the PP client-scoped template with no Background field),
// the key is OMITTED and the provider template's baked background renders BYTE-UNCHANGED. This mirrors
// the existing optional MusicBed handling (present → bind, absent → template default) and lets a second
// client use the SAME generic video spine with its own background as data — no new Creatomate template,
// no per-client code (the c11bb8ab provider template already exposes an addressable `Background` image
// element). Logo.source stays REQUIRED (fail-loud). STRICTLY OUT OF SCOPE: the governance enable/flip,
// any registry mutation, the _voice variant / voice map (Lane 4), non-video-worker functions, and any DDL.

// The Property-Pulse client_id — retained as the reference identity for the hermetic gate tests and
// the governed smoke. It no longer gates the production path (index.ts gates on the runtime
// governance lookup, so a second governed brand is a DATA addition, not a code edit). A client_id,
// NOT a slug: getBrand() falls back to the client-id UUID when the c.client.client_slug read returns
// null. Mirrors b1_production.B1_GOVERNED_CLIENT_ID.
export const B1_VIDEO_GOVERNED_CLIENT_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';

// The governed VIDEO format this branch owns. The _voice variant is DELIBERATELY EXCLUDED
// (voice is a later lane — Lane 4).
export const B1_VIDEO_GOVERNED_FORMAT = 'video_short_stat';

// render_spec.label that marks the governed video stat production render (matches the seeded
// c.client_creative_governance.render_label for (PP, video_short_stat) — migration
// 20260708000000_seed_client_creative_governance_video_short_stat_v1.sql).
export const B1_VIDEO_PRODUCTION_LABEL = 'creative_library_video_stat_production';

// Per-field hard-gate limits (capability contract property_pulse.video_short_stat.market_stat.v1
// — property-pulse.json capability_contracts[].fields; policy 'hard_gate_throw' for all four).
export const B1_VIDEO_STAT_VALUE_MAX_CHARS = 12;
export const B1_VIDEO_STAT_LABEL_MAX_CHARS = 48;
export const B1_VIDEO_CONTEXT_LINE_MAX_CHARS = 160;
export const B1_VIDEO_CTA_TEXT_MAX_CHARS = 90;

// RETAINED FOR REFERENCE/TESTS ONLY (v3.8.0): the production gate no longer calls this — index.ts now
// gates on `fmt === B1_VIDEO_GOVERNED_FORMAT && await isVideoGovernanceEnabled(...)` (runtime
// governance, fail-closed), so a second governed brand is a data addition, not a code edit. This pure
// predicate documents the former PP-UUID gate and is exercised by the hermetic identity tests; it
// gates nothing live. Mirrors b1_production.isB1GovernedImageQuote (retained, not the gate).
export function isB1GovernedVideoStat(clientId: string, format: string): boolean {
  return clientId === B1_VIDEO_GOVERNED_CLIENT_ID && format === B1_VIDEO_GOVERNED_FORMAT;
}

// v3.8.0 (Video D6 Lane 3, PK follow-up — external review 747bc701 policy point) — SMOKE-ONLY
// fail-loud provider-drift guard. The governed_video_stat_smoke harness derives its provider template
// BY CONSTRUCTION (select_template + buildGovernedVideoStatPlan) and then asserts the derived id
// equals the id the smoke PROVES RENDER PARITY AGAINST (proven render 8c41689a's template). A
// mismatch means the live selector no longer resolves the template the parity proof was taken on, so
// the smoke must refuse to render rather than silently prove against a different surface (the C4-class
// hazard the image path retired). Mirrors image-worker/b1_production.assertExpectedProviderTemplate.
// This is a PROOF-HARNESS constraint ONLY — it is NEVER called on the production render path
// (renderGovernedVideoStat stays fully spine-driven). Pure / no I/O — unit-tested pass + throw paths.
export function assertExpectedVideoProviderTemplate(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(
      `governed_video_stat_smoke provider drift: expected ${expected} (the template the smoke proves render parity against), got ${actual} — refusing to render (smoke parity guard)`,
    );
  }
}

// The four AI-authored text fields the governed template exposes (Logo — and, for a generic variant,
// Background — are governed asset modifications supplied by the resolver in the plan builder; a baked-bg
// variant supplies no Background and its baked background renders unchanged, v3.10.0).
export type B1VideoStatFields = {
  statValue: string;
  statLabel: string;
  contextLine: string;
  ctaText: string;
};

// Minimal hard-gate for the four REQUIRED text fields. Trims; throws (fail loud) BEFORE any
// Creatomate call when a field is blank or exceeds its contract max_chars. No truncation, no AI
// rewrite (mirrors b1_production.assertHeadlineWithinGate; policy 'hard_gate_throw'). A throw here
// hits the EXISTING per-draft catch → video_status='failed'; there is NO governed fallback.
export function assertStatFieldsWithinGate(fields: B1VideoStatFields): void {
  const checks: Array<{ name: string; value: string; max: number }> = [
    { name: 'stat_value',   value: (fields.statValue   ?? '').trim(), max: B1_VIDEO_STAT_VALUE_MAX_CHARS },
    { name: 'stat_label',   value: (fields.statLabel   ?? '').trim(), max: B1_VIDEO_STAT_LABEL_MAX_CHARS },
    { name: 'context_line', value: (fields.contextLine ?? '').trim(), max: B1_VIDEO_CONTEXT_LINE_MAX_CHARS },
    { name: 'cta_text',     value: (fields.ctaText     ?? '').trim(), max: B1_VIDEO_CTA_TEXT_MAX_CHARS },
  ];
  for (const c of checks) {
    if (!c.value) {
      throw new Error(`b1_video: missing ${c.name}`);
    }
    if (c.value.length > c.max) {
      throw new Error(
        `b1_video: ${c.name} length ${c.value.length} exceeds max_chars=${c.max} (no truncation / no AI rewrite in v1)`,
      );
    }
  }
}

// PURE narration composer (cc-0032 step 5 D3 / N2). Deterministic spoken form of the governed stat
// fields for the ElevenLabs voiceover. CONCISE by design: statLabel + statValue + contextLine ONLY —
// the CTA is DELIBERATELY NOT spoken (N2: the CTA stays a VISUAL element), so the VO fits the 12s
// template. No Date/random/network — same inputs → same string. Trims each field; the caller runs
// assertStatFieldsWithinGate first (via buildGovernedVideoStatPlan), so blanks/overflows are already
// rejected fail-loud before this is spoken. Shape: "Market update. {statLabel} is {statValue}. {contextLine}".
export function composeGovernedVideoNarration(fields: B1VideoStatFields): string {
  const statLabel   = (fields.statLabel   ?? '').trim();
  const statValue   = (fields.statValue   ?? '').trim();
  const contextLine = (fields.contextLine ?? '').trim();
  // Ensure the context clause ends with terminal punctuation for natural TTS phrasing.
  const contextSpoken = /[.!?]$/.test(contextLine) ? contextLine : `${contextLine}.`;
  return `Market update. ${statLabel} is ${statValue}. ${contextSpoken}`;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// v3.8.0 — TMR selector consumption (pure). Mirrors image-worker/b1_production.ts.
// ─────────────────────────────────────────────────────────────────────────────────────

// Minimal structural view of the `public.select_template` jsonb response — ONLY the fields this
// module consumes (source of truth: supabase/migrations/20260703035154_create_select_template_v1.sql
// + the resolve_slot_assets migration). Names mirror b1_production's TmrSelectorResponse verbatim so
// the two modules read identically.
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

// Additive render_spec.tmr evidence block. RESOLVER-DRIVEN (v3.8.0): bind_mode='resolved',
// resolver_used=true — this is the live spine, not the retired direct bind. Mirrors
// b1_production.TmrEvidence (winner/ids/variant/seed/slot_reasons/slot_warnings/selector_status) and
// ADDS the video-specific combo-audio block. There is NO contract_ref (D6-7 — dropped, mirroring
// image). slot_reasons carries the Logo slot, plus the Background slot for a generic (Option-B) variant
// and only the Logo slot for a baked-bg variant (v3.10.0).
export type B1VideoTmrEvidence = {
  winner: string | null;                 // selected.provider_template_name (informational)
  provider_template_id: string;
  registry_template_id: string | null;
  assignment_id: string | null;
  variant_key: string | null;            // v3.8.0: from selected.variant_key (was the B1_VIDEO_VARIANT_KEY literal)
  seed: string | null;
  bind_mode: 'resolved';                 // v3.8.0: was 'direct_bind_pre_select_template'
  resolver_used: true;                   // v3.8.0: was false
  fallback_taken: false;
  slot_reasons: Array<{ slot: string | null; asset_key: string | null; reasons: unknown[] }>;
  slot_warnings: unknown[];
  selector_status: 'ok';
  // combo-audio evidence: voiceover is always true on the governed branch (VO REQUIRED). music_bed
  // reflects whether a bed URL was bound (false = explicitly silent, N1).
  audio: { voiceover: true; music_bed: boolean };
};

// The render_spec.template sub-object (nested inside the templateSpec passed to renderUploadAndLog,
// which emits render_spec.template verbatim — nesting the tmr evidence here keeps renderUploadAndLog
// BYTE-UNCHANGED). No contract_ref (D6-7). resolver_used=true (v3.8.0). Identity fields now come from
// the selector response (variant_key/format_key/aspect_ratio/template_id), mirroring the image smoke's
// resolver-derived templateSpec shape.
export type B1VideoTemplateSpec = {
  implementation_id: string | null;      // winner (provider_template_name)
  template_id: string | null;            // registry template id
  provider: 'creatomate';
  provider_template_id: string;
  variant_key: string | null;
  format_key: string | null;
  aspect_ratio: string | null;
  resolver_used: true;
  fallback_taken: false;
  tmr: B1VideoTmrEvidence;
};

export type B1VideoStatPlan = {
  providerTemplateId: string;
  // Creatomate template-mode modifications. All string-valued (4 text slots + Logo + 2 audio slots,
  // plus an OPTIONAL Background.source for a generic Option-B variant; a baked-bg variant omits it,
  // v3.10.0).
  modifications: Record<string, string>;
  templateSpec: B1VideoTemplateSpec;
};

// PURE spine-driven plan builder (v3.8.0). Turns a public.select_template response + the validated
// text fields + the combo audio URLs into the Creatomate template-mode plan. Fail-loud contract:
//   - any of the 4 text fields blank/overflow   → assertStatFieldsWithinGate throws (call FIRST)
//   - selector status !== 'ok'                   → throw tmr_video_selector_fail_closed
//   - slot_resolution missing / status !== 'ok'  → throw tmr_video_selector_fail_closed
//   - missing selected.provider_template_id      → throw tmr_video_selector_fail_closed
//   - missing/blank slot_resolution Logo.source  → throw tmr_video_slot_resolution_incomplete
//   - blank voiceover URL                        → throw b1_video_missing_voiceover (VO is REQUIRED)
// BAKED-BG DIVERGENCE FROM IMAGE: require Logo.source ONLY — Background is baked into the provider
// template (D2), so the resolver returns no Background slot; this builder never reads/requires
// Background.source (the one deliberate difference from b1_production.buildTmrRenderPlan). The music
// bed is OPTIONAL: musicBedUrl='' (or null/undefined) binds an EXPLICITLY SILENT bed
// ('MusicBed.source'='') — N1. Bed LEVEL stays template-controlled (N3 — never sets MusicBed.volume).
export function buildGovernedVideoStatPlan(
  selectorResponse: TmrSelectorResponse | null | undefined,
  fields: B1VideoStatFields,
  voiceUrl: string | null | undefined,
  musicBedUrl: string | null | undefined,
): B1VideoStatPlan {
  // Hard-gate the four text fields (fail loud) BEFORE consuming the selector.
  assertStatFieldsWithinGate(fields);

  const resp = selectorResponse ?? {};
  if (resp.status !== 'ok') {
    throw new Error(`tmr_video_selector_fail_closed: ${resp.fail_reason ?? 'unknown'}`);
  }
  const slot = resp.slot_resolution;
  if (!slot || slot.status !== 'ok') {
    throw new Error(`tmr_video_selector_fail_closed: slot_resolution:${slot?.fail_reason ?? 'missing'}`);
  }
  const selected = resp.selected;
  const providerTemplateId = (selected?.provider_template_id ?? '').trim();
  if (!providerTemplateId) {
    throw new Error('tmr_video_selector_fail_closed: missing_provider_template_id');
  }

  // Logo.source is REQUIRED (fail-loud). Background.source is OPTIONAL (v3.10.0 — Option B): a generic
  // video variant with a Background field mapping supplies it; a baked-bg variant does not.
  const slotMods = slot.modifications ?? {};
  const logoUrlRaw = slotMods['Logo.source'];
  const resolvedLogo = typeof logoUrlRaw === 'string' ? logoUrlRaw.trim() : '';
  if (!resolvedLogo) {
    throw new Error('tmr_video_slot_resolution_incomplete: missing Logo.source');
  }

  // v3.10.0 (cc-0044 Checkpoint E — OPTION B, DYNAMIC VIDEO BACKGROUND): read Background.source
  // OPTIONALLY. Present + non-blank → the client's governed background is bound below (dynamic bg).
  // Absent/blank → the key is OMITTED and the provider template's BAKED background renders unchanged
  // (the PP client-scoped variant path stays byte-identical). Mirrors the optional MusicBed contract.
  const backgroundUrlRaw = slotMods['Background.source'];
  const resolvedBackground = typeof backgroundUrlRaw === 'string' ? backgroundUrlRaw.trim() : '';

  // Combo branch: the voiceover is REQUIRED — a blank VO is a HARD failure (never render a silent
  // governed video; fail loud). The bed is OPTIONAL: '' binds an explicitly silent MusicBed (N1).
  const resolvedVoice = (voiceUrl ?? '').trim();
  if (!resolvedVoice) {
    throw new Error('b1_video_missing_voiceover');
  }
  const resolvedBed = (musicBedUrl ?? '').trim();

  // Template-mode modifications: 4 dynamic text slots + Logo + 2 audio slots (+ optional Background,
  // v3.10.0). MusicBed.volume is NOT set (N3 — template-controlled at 70%). Key presence is the guard
  // for the silent bed (N1: MusicBed.source is ALWAYS a key; omitting it plays the baked default).
  const modifications: Record<string, string> = {
    'StatValue': fields.statValue.trim(),
    'StatLabel': fields.statLabel.trim(),
    'ContextLine': fields.contextLine.trim(),
    'CtaText': fields.ctaText.trim(),
    'Logo.source': resolvedLogo,
    'VoiceAudio.source': resolvedVoice,
    'MusicBed.source': resolvedBed,
  };
  // OPTION B (v3.10.0): bind the dynamic background ONLY when the resolver supplied one. Unlike
  // MusicBed (always a key, '' = silent), Background.source is OMITTED when absent so a baked-bg
  // template's background is left untouched — sending Background.source='' would blank the element.
  if (resolvedBackground) {
    modifications['Background.source'] = resolvedBackground;
  }

  const slotReasons = (slot.selected ?? []).map((s) => ({
    slot: s?.slot ?? null,
    asset_key: s?.asset_key ?? null,
    reasons: Array.isArray(s?.reasons) ? s.reasons : [],
  }));

  const tmr: B1VideoTmrEvidence = {
    winner: selected?.provider_template_name ?? null,
    provider_template_id: providerTemplateId,
    registry_template_id: selected?.template_id ?? null,
    assignment_id: selected?.assignment_id ?? null,
    variant_key: selected?.variant_key ?? null,
    seed: (resp.context?.seed as string | null | undefined) ?? null,
    bind_mode: 'resolved',
    resolver_used: true,
    fallback_taken: false,
    slot_reasons: slotReasons,
    slot_warnings: Array.isArray(slot.warnings) ? slot.warnings : [],
    selector_status: 'ok',
    audio: { voiceover: true, music_bed: resolvedBed.length > 0 },
  };

  const templateSpec: B1VideoTemplateSpec = {
    implementation_id: selected?.provider_template_name ?? null,
    template_id: selected?.template_id ?? null,
    provider: 'creatomate',
    provider_template_id: providerTemplateId,
    variant_key: selected?.variant_key ?? null,
    format_key: selected?.format_key ?? null,
    aspect_ratio: selected?.aspect_ratio ?? null,
    resolver_used: true,
    fallback_taken: false,
    tmr,
  };

  return { providerTemplateId, modifications, templateSpec };
}
