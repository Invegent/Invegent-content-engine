// b1_video_stat.ts — CREATIVE-LIBRARY VIDEO TMR / GOVERNED video_short_stat (video-worker).
//
// Pure helper module for the Property-Pulse-ONLY governed VIDEO stat-reveal branch inside the
// EXISTING production video-worker loop. It is the VIDEO counterpart of image-worker/
// b1_production.ts: every non-PP client and every format other than video_short_stat stays
// byte-unchanged on the legacy processDraft() path.
//
// NO side effects: no Deno.serve, no network/DB/storage/secret access, no Date.now inside the
// pure functions (renderDate is injected). Governed-only / fail-loud: assertStatFieldsWithinGate
// + buildGovernedVideoStatPlan THROW rather than falling back, so the caller's existing
// production catch fails the draft (video_status='failed') — there is NO fallback to the legacy
// buildStatRevealSpec for the governed PP video_short_stat branch.
//
// DARK: the governed branch that consumes this module is gated on BOTH isB1GovernedVideoStat()
// AND c.client_creative_governance.enabled (read at runtime, fail-closed). The governance row for
// (PP, video_short_stat) is enabled=false today, so the branch does NOT fire and the legacy
// isStat path runs byte-identically. See index.ts for the gate + early return.
//
// v3.6.0 (cc-0032 step 5 — COMBO AUDIO, DARK): the governed plan is re-pointed to the registered v2
// provider template c11bb8ab (VoiceAudio + MusicBed slots) and now drives combo audio — a voiceover
// over an optional music bed. buildGovernedVideoStatPlan takes voiceUrl (REQUIRED — throws
// b1_video_missing_voiceover if blank) and musicBedUrl (OPTIONAL — '' = explicitly silent bed, N1),
// adding 'VoiceAudio.source' + 'MusicBed.source' to the existing 5 mods. composeGovernedVideoNarration
// composes a concise (~≤40-word) spoken form of the stat fields (N2 — CTA stays VISUAL, never spoken)
// so the VO fits the 12s template. Bed level stays TEMPLATE-controlled (70%, N3 — the worker never
// sets MusicBed.volume). STRICTLY OUT OF SCOPE: the enabled=true flip, any live render/publish, the
// legacy _voice/MUSIC_LIBRARY paths, non-PP clients, and the step-6 smoke execution.

// The Property-Pulse client_id — the RELIABLE gate identity (a client_id, NOT a slug: getBrand()
// falls back to the client-id UUID when the c.client.client_slug read returns null, which would
// silently mis-gate a slug-keyed check). Mirrors b1_production.B1_GOVERNED_CLIENT_ID.
export const B1_VIDEO_GOVERNED_CLIENT_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';

// The governed VIDEO format this branch owns. The _voice variant is DELIBERATELY EXCLUDED
// (voice is a later lane — brief IMPLEMENTATION #1).
export const B1_VIDEO_GOVERNED_FORMAT = 'video_short_stat';

// DIRECT-BIND provider template id — v2 COMBO-AUDIO template (cc-0032 step 5, 2026-07-09).
// Re-pointed from the v1 silent baseline 901a30ce to the REGISTERED v2 template c11bb8ab, which
// carries the VoiceAudio + MusicBed audio elements (ledger 20260709205827,
// register_video_provider_template_vid_market_stat_reveal_v2). The PP-specific baked-background
// 9:16 stat-reveal (D2 ruling: baked still-image Ken-Burns over a governed Perth-CBD still + 0.55
// scrim; PP accent baked; logo the ONLY governed VISUAL asset) is unchanged; v2 adds the two audio
// slots the governed combo branch drives (VO over a music bed). The v1 template 901a30ce stays the
// SILENT baseline (no audio elements) and is NOT used by this branch any more.
//
// NOTE — this is still a DIRECT bind, NOT a select_template resolution. select_template fail-closes
// for video_short_stat because the variant is not visually-approved yet (property-pulse.json
// evidence: proof_status='unproven'). This constant is the concrete id PK pinned for the DARK build
// + supervised smoke. When the render is visually approved, select_template routing (mirroring
// image-worker/b1_production.buildTmrRenderPlan) REPLACES this constant.
export const B1_VIDEO_PROVIDER_TEMPLATE_ID = 'c11bb8ab-18bd-45ff-aedd-0a59cb3773ab';

// render_spec.label that marks the governed video stat production render (matches the seeded
// c.client_creative_governance.render_label for (PP, video_short_stat) — migration
// 20260708000000_seed_client_creative_governance_video_short_stat_v1.sql).
export const B1_VIDEO_PRODUCTION_LABEL = 'creative_library_video_stat_production';

// Registry identities (property-pulse.json v0.9 — variant + capability contract). The v2 combo-audio
// variant (registered ledger 20260709205827) supersedes the v1 silent variant for this branch.
export const B1_VIDEO_VARIANT_KEY = 'stat-reveal-9x16-video-v2';
export const B1_VIDEO_CONTRACT_REF = 'property_pulse.video_short_stat.market_stat';

// Per-field hard-gate limits (capability contract property_pulse.video_short_stat.market_stat.v1
// — property-pulse.json capability_contracts[].fields; policy 'hard_gate_throw' for all four).
export const B1_VIDEO_STAT_VALUE_MAX_CHARS = 12;
export const B1_VIDEO_STAT_LABEL_MAX_CHARS = 48;
export const B1_VIDEO_CONTEXT_LINE_MAX_CHARS = 160;
export const B1_VIDEO_CTA_TEXT_MAX_CHARS = 90;

// True ONLY for the single governed PP client_id AND the video_short_stat format (NOT the _voice
// variant). Every other client_id / format → false → legacy processDraft path. Mirrors
// b1_production.isB1GovernedImageQuote (gate keys on the reliable client_id).
export function isB1GovernedVideoStat(clientId: string, format: string): boolean {
  return clientId === B1_VIDEO_GOVERNED_CLIENT_ID && format === B1_VIDEO_GOVERNED_FORMAT;
}

// The four AI-authored text fields the governed template exposes (Background is BAKED — never a
// modification; Logo is a governed asset modification handled in the plan builder).
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

// Additive render_spec.tmr evidence block (mirrors b1_production.TmrEvidence shape for the video
// slice). DIRECT-BIND variant: there is no live selector response, so assignment_id/seed are null
// and selector_status marks the bind mode.
export type B1VideoTmrEvidence = {
  provider_template_id: string;
  registry_template_variant: string;
  contract_ref: string;
  bind_mode: 'direct_bind_pre_select_template';
  resolver_used: false;
  fallback_taken: false;
  // v3.6.0 (cc-0032 step 5): combo-audio evidence. voiceover is always true on the governed branch
  // (VO is REQUIRED). music_bed reflects whether a bed URL was bound (false = explicitly silent, N1).
  audio: { voiceover: true; music_bed: boolean };
};

// The render_spec.template sub-object (nested inside the templateSpec passed to renderUploadAndLog
// — that caller emits render_spec.template verbatim via composeRenderSpec, so nesting the tmr
// evidence here keeps renderUploadAndLog BYTE-UNCHANGED). label is applied by the caller via the
// renderSpecLabel opt.
export type B1VideoTemplateSpec = {
  implementation_id: string;
  provider: 'creatomate';
  provider_template_id: string;
  variant_key: string;
  contract_ref: string;
  resolver_used: false;
  fallback_taken: false;
  tmr: B1VideoTmrEvidence;
};

export type B1VideoStatPlan = {
  providerTemplateId: string;
  // Creatomate template-mode modifications. Keys mirror the image-worker convention exactly
  // ('<ElementName>.<property>' for asset sources, '<ElementName>' bare — here '.text' style is
  // matched to the authored template element names). Background is BAKED — NOT present here.
  modifications: Record<string, string>;
  templateSpec: B1VideoTemplateSpec;
};

// PURE plan builder. Turns the gated + validated text fields + the governed logo URL + the combo
// audio URLs into the Creatomate template-mode plan (provider template id + modifications +
// evidence). Fail-loud:
//   - any of the 4 text fields blank/overflow  → assertStatFieldsWithinGate throws (call FIRST)
//   - blank governed logo URL                   → throw b1_video_missing_governed_logo
//   - blank voiceover URL                       → throw b1_video_missing_voiceover (VO is REQUIRED)
// The music bed is OPTIONAL: musicBedUrl='' (or null/undefined) binds an EXPLICITLY SILENT bed
// ('MusicBed.source'='') — N1: fail-closed music means "no bed", NOT "baked bed". Bed LEVEL stays
// template-controlled (N3 — this builder NEVER sets MusicBed.volume). Background is BAKED into the
// provider template and is deliberately NOT a modification.
export function buildGovernedVideoStatPlan(
  fields: B1VideoStatFields,
  logoUrl: string | null | undefined,
  voiceUrl: string | null | undefined,
  musicBedUrl: string | null | undefined,
): B1VideoStatPlan {
  // Hard-gate the four text fields (fail loud) BEFORE building anything.
  assertStatFieldsWithinGate(fields);

  const resolvedLogo = (logoUrl ?? '').trim();
  if (!resolvedLogo) {
    // Governed branch: the logo is the ONLY governed VISUAL asset — a missing/blank logo is a HARD
    // failure (no wordmark fallback in the governed video path; fail loud → video_status='failed').
    throw new Error('b1_video_missing_governed_logo');
  }

  const resolvedVoice = (voiceUrl ?? '').trim();
  if (!resolvedVoice) {
    // Combo branch: the voiceover is REQUIRED (the whole point of v2 is audio). A blank VO is a
    // HARD failure — never render a silent video on the governed combo branch (fail loud).
    throw new Error('b1_video_missing_voiceover');
  }

  // N1: the bed is optional. '' binds an explicitly silent MusicBed — no throw.
  const resolvedBed = (musicBedUrl ?? '').trim();

  // Template-mode modifications: 5 dynamic visual/text slots + 2 audio slots. Element-name keys
  // mirror the authored Creatomate template + the image-worker '<Element>.<prop>' convention.
  // Background is BAKED. MusicBed.volume is NOT set (N3 — template-controlled at 70%).
  const modifications: Record<string, string> = {
    'StatValue': fields.statValue.trim(),
    'StatLabel': fields.statLabel.trim(),
    'ContextLine': fields.contextLine.trim(),
    'CtaText': fields.ctaText.trim(),
    'Logo.source': resolvedLogo,
    'VoiceAudio.source': resolvedVoice,
    'MusicBed.source': resolvedBed,
  };

  const tmr: B1VideoTmrEvidence = {
    provider_template_id: B1_VIDEO_PROVIDER_TEMPLATE_ID,
    registry_template_variant: B1_VIDEO_VARIANT_KEY,
    contract_ref: B1_VIDEO_CONTRACT_REF,
    bind_mode: 'direct_bind_pre_select_template',
    resolver_used: false,
    fallback_taken: false,
    audio: { voiceover: true, music_bed: resolvedBed.length > 0 },
  };

  const templateSpec: B1VideoTemplateSpec = {
    implementation_id: B1_VIDEO_VARIANT_KEY,
    provider: 'creatomate',
    provider_template_id: B1_VIDEO_PROVIDER_TEMPLATE_ID,
    variant_key: B1_VIDEO_VARIANT_KEY,
    contract_ref: B1_VIDEO_CONTRACT_REF,
    resolver_used: false,
    fallback_taken: false,
    tmr,
  };

  return { providerTemplateId: B1_VIDEO_PROVIDER_TEMPLATE_ID, modifications, templateSpec };
}
