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

// The Property-Pulse client_id — the RELIABLE gate identity (a client_id, NOT a slug: getBrand()
// falls back to the client-id UUID when the c.client.client_slug read returns null, which would
// silently mis-gate a slug-keyed check). Mirrors b1_production.B1_GOVERNED_CLIENT_ID.
export const B1_VIDEO_GOVERNED_CLIENT_ID = '4036a6b5-b4a3-406e-998d-c2fe14a8bbdd';

// The governed VIDEO format this branch owns. The _voice variant is DELIBERATELY EXCLUDED
// (voice is a later lane — brief IMPLEMENTATION #1).
export const B1_VIDEO_GOVERNED_FORMAT = 'video_short_stat';

// DIRECT-BIND provider template id (PK-confirmed 2026-07-09). The provider template is the
// PP-specific baked-background 9:16 stat-reveal (D2 ruling: baked still-image Ken-Burns over a
// governed Perth-CBD still + 0.55 scrim; PP accent baked; logo the ONLY governed asset).
//
// NOTE — this is a DIRECT bind, NOT a select_template resolution. select_template fail-closes for
// video_short_stat because the variant is not visually-approved yet (property-pulse.json evidence:
// proof_status='unproven'). The registry therefore carries the placeholder
// provider_template_id='PENDING_CREATOMATE_AUTHORING' at the variant + contract sites; this
// constant is the concrete id PK pinned for the DARK build + supervised smoke. When the render is
// visually approved, select_template routing (mirroring image-worker/b1_production.buildTmrRenderPlan)
// REPLACES this constant and the placeholder registry ids are pinned — this constant then dies.
export const B1_VIDEO_PROVIDER_TEMPLATE_ID = '901a30ce-292a-4e4f-8e46-fef93f71e098';

// render_spec.label that marks the governed video stat production render (matches the seeded
// c.client_creative_governance.render_label for (PP, video_short_stat) — migration
// 20260708000000_seed_client_creative_governance_video_short_stat_v1.sql).
export const B1_VIDEO_PRODUCTION_LABEL = 'creative_library_video_stat_production';

// Registry identities (property-pulse.json v0.7 — variant + capability contract).
export const B1_VIDEO_VARIANT_KEY = 'stat-reveal-9x16-video-v1';
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

// PURE plan builder. Turns the gated + validated text fields + the governed logo URL into the
// Creatomate template-mode plan (provider template id + modifications + evidence). Fail-loud:
//   - any of the 4 text fields blank/overflow  → assertStatFieldsWithinGate throws (call FIRST)
//   - blank governed logo URL                   → throw b1_video_missing_governed_logo
// Background is BAKED into the provider template and is deliberately NOT a modification.
export function buildGovernedVideoStatPlan(
  fields: B1VideoStatFields,
  logoUrl: string | null | undefined,
): B1VideoStatPlan {
  // Hard-gate the four text fields (fail loud) BEFORE building anything.
  assertStatFieldsWithinGate(fields);

  const resolvedLogo = (logoUrl ?? '').trim();
  if (!resolvedLogo) {
    // Governed branch: the logo is the ONLY governed asset — a missing/blank logo is a HARD
    // failure (no wordmark fallback in the governed video path; fail loud → video_status='failed').
    throw new Error('b1_video_missing_governed_logo');
  }

  // Template-mode modifications for the 5 dynamic slots. Element-name keys mirror the authored
  // Creatomate template + the image-worker '<Element>.<prop>' convention. Background is BAKED.
  const modifications: Record<string, string> = {
    'StatValue': fields.statValue.trim(),
    'StatLabel': fields.statLabel.trim(),
    'ContextLine': fields.contextLine.trim(),
    'CtaText': fields.ctaText.trim(),
    'Logo.source': resolvedLogo,
  };

  const tmr: B1VideoTmrEvidence = {
    provider_template_id: B1_VIDEO_PROVIDER_TEMPLATE_ID,
    registry_template_variant: B1_VIDEO_VARIANT_KEY,
    contract_ref: B1_VIDEO_CONTRACT_REF,
    bind_mode: 'direct_bind_pre_select_template',
    resolver_used: false,
    fallback_taken: false,
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
