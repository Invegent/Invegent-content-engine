// b1_video_kinetic.ts — CREATIVE-LIBRARY VIDEO TMR / GOVERNED video_short_kinetic (video-worker).
//
// Pure helper module for the governed VIDEO kinetic-typography branch inside the EXISTING
// production video-worker loop. Sibling of ./b1_video_stat.ts (governed video_short_stat) — same
// spine-driven, fail-loud shape (public.select_template → governed plan → template-mode render),
// applied to the DIFFERENT (multi-scene hook/point/cta) kinetic narrative instead of the single-stat
// reveal. video_short_kinetic_voice is DELIBERATELY EXCLUDED (a later, separately-elected mission —
// WS-4 package v1 §11/§15 Q3).
//
// v1.0.0 (2026-08-01, WS-4/WS-5 D4 — PP YouTube kinetic graduation):
//   NEW pure module. Governing design record: `docs/briefs/ws4-pp-yt-kinetic-operator-transposition-
//   package-v1.md` (§4-§9, §5e RETRACTION section — 3-point/26-element design STANDS, PK ruling
//   `ff5cacb`) + `docs/briefs/results/ws5-constraints-shape-design-lane-result-v1.md` (probe evidence,
//   worker collapse guidance: ".time=9999 + .duration=0.01 + .text=''"). Every modification key below
//   traces to those two documents' element/key tables — NOTHING invented.
//
//   CRITICAL, VERIFIED DIVERGENCE FROM b1_video_stat.ts: this template uses SUFFIXED modification
//   keys (`HookHeadline.text`, not bare `HookHeadline`) — the OPPOSITE of buildGovernedVideoStatPlan's
//   bare-key convention (`b1_video_stat.ts:422-430`). This is independently probe-confirmed (WS-5 live
//   renders against the real kinetic template `0bd871ae…`/registry row `9ad024cc…`), NOT copied from
//   stat's pattern — stat's bare-key convention is specific to that one template and must not be
//   assumed to generalise.
//
//   FIXED-SLOT DESIGN: the saved template has 3 top-level point slots (Point1/Point2/Point3) covering
//   the AI contract's 1-3 point range. A render using fewer than 3 points COLLAPSES the unused
//   PointN slot(s) OFF-TIMELINE (`.time=9999`, beyond any real composition duration) + `.duration=0.01`
//   + `.text=''` on the slot's text-bearing sub-elements — the mechanism WS-5's probe 2c proved
//   leak-free (near-zero-duration ALONE was proved NOT leak-free by probe 2b/WS-4's own Q2 probe; the
//   two-guard off-timeline recipe is the one actually adopted, per the PK ruling superseding the
//   package's earlier §5c/§5d draft). `PointNBar`/`PointNDivider` are SHAPE elements with no `.text`
//   modification key in the confirmed key map (§6.3) — the collapse for those two sub-elements applies
//   `.time`/`.duration` ONLY (no `.text` key exists to set).
//
//   TOP-LEVEL `duration` OVERRIDE: WS-4's probe Q4 (replicated by WS-5's probe 1) confirmed a bare
//   top-level `duration` modification key is an authoritative composition-length override (symmetric
//   with `B1_VIDEO_TEMPLATE_OUTPUT_PARITY`'s proven `width`/`height` overrides). The kinetic
//   composition length is VARIABLE (Σ active scene durations, unlike stat's fixed 12s) — this plan
//   builder always sets it explicitly per render.
//
//   COLOUR / LOGO SOURCING (WS-4 §6.1, §10): `Background`/`BarTop`/`BarBottom` are solid-fill SHAPES,
//   not asset rows — their `fill_color` comes from `c.client_brand_profile.brand_colour_primary` /
//   `brand_colour_secondary` (read by the CALLER's existing getBrand(), same as every legacy video
//   path — NOT resolve_brand_assets, no asset row involved). `Logo.source` is the ONLY governed VISUAL
//   asset — resolved via the SAME public.select_template slot_resolution the caller already has
//   (mirrors b1_video_stat.ts's Logo.source read), fail-loud, NO client-name-text fallback (unlike the
//   legacy buildKineticTextSpec branch, `index.ts:1079-1081`, which substitutes a text wordmark when
//   logoUrl is absent — governed paths in this repo never do that).
//
//   v1 SILENT SCOPE (WS-4 §11, PK decision 2026-08-01): VoiceAudio.source / MusicBed.source are ALWAYS
//   set to '' (present as keys, per the house N1 silent-bed convention — `source:''` renders silent,
//   not an error). No voice/music wiring in this module. STRICTLY OUT OF SCOPE.
//
//   TEXT HARD-GATE (WS-4 §9 — mirrors b1_video_stat.ts's assertStatFieldsWithinGate / the
//   'hard_gate_throw' policy already governing the sibling format): fail loud, no truncation, no AI
//   rewrite, BEFORE any selector/render work. Limits are the WIDENED "Recommended hard gate" column of
//   WS-4 §9 (a declared safety margin over the live ai-worker kinetic prompt contract,
//   `ai-worker/index.ts:728`), not invented values.
//
//   STRICTLY OUT OF SCOPE (this module + this lane): video_short_kinetic_voice, any ai-worker
//   char-clamp (explicitly deferred — PK 2026-08-01), the `off_timeline` validator-vocabulary carry
//   (WS-5's own open T2 follow-up — this module implements the PROVEN worker-side recipe directly, it
//   does not touch `c.tmr_validate_field_constraints` or the 15 conditional constraint rows), any DDL,
//   any registry status/assignment/proof-event mutation (a migration-lane concern, not this module's).

// The governed KINETIC format this branch owns. video_short_kinetic_voice is DELIBERATELY EXCLUDED —
// a separate, later, PK-elected mission (WS-4 §11/§15 Q3).
export const B1_VIDEO_KINETIC_GOVERNED_FORMAT = 'video_short_kinetic';

// render_spec.label for the governed kinetic production render. Must match the render_label seeded
// into c.client_creative_governance for (PP, video_short_kinetic) at the migration-lane gate — named
// here, not applied here.
export const B1_VIDEO_KINETIC_PRODUCTION_LABEL = 'creative_library_video_kinetic_production';

// Off-timeline collapse sentinel values — WS-5 probe 2c proved this exact recipe leak-free
// (near-zero-duration ALONE was proved NOT leak-free by probe 2b / WS-4's own Q2 probe; the combined
// off-timeline + near-zero-duration + empty-text recipe is the one adopted). 9999 is simply "far beyond
// any real composition duration" (kinetic compositions are bounded 20-45s per WS-4 §9); it carries no
// other meaning.
export const B1_VIDEO_KINETIC_COLLAPSE_TIME = 9999;
export const B1_VIDEO_KINETIC_COLLAPSE_DURATION = 0.01;

// Fixed point-slot count the saved template exposes (WS-4 §4 — 3-slot design STANDS per PK ruling).
export const B1_VIDEO_KINETIC_MAX_POINT_SLOTS = 3;

// Per-field hard-gate limits — WS-4 §9 "Recommended hard gate" column (widened over the live
// ai-worker kinetic prompt contract, `ai-worker/index.ts:728`, to give render-time slack).
export const B1_VIDEO_KINETIC_HOOK_HEADLINE_MAX_CHARS = 60;
export const B1_VIDEO_KINETIC_POINT_HEADLINE_MAX_CHARS = 55;
export const B1_VIDEO_KINETIC_POINT_BODY_MAX_CHARS = 100;
export const B1_VIDEO_KINETIC_CTA_HEADLINE_MAX_CHARS = 65;

export type KineticScene = {
  type: 'hook' | 'point' | 'cta';
  headline: string;
  body?: string | null;
  duration_s: number;
};

// Minimal hard-gate on the AI-authored scene array's SHAPE + text fields. Trims; throws (fail loud)
// BEFORE any selector/Creatomate work — mirrors assertStatFieldsWithinGate's 'hard_gate_throw' policy
// (no truncation, no AI rewrite). Structural shape (exactly one leading hook, 1-3 point scenes, one
// trailing cta) matches the live ai-worker kinetic contract (3-5 scenes total) and the fixed-slot
// template design (WS-4 §4).
export function assertKineticScenesWithinGate(scenes: KineticScene[] | null | undefined): void {
  if (!Array.isArray(scenes) || scenes.length < 3 || scenes.length > 5) {
    throw new Error('b1_video_kinetic: missing_or_invalid_scenes (expected 3-5 scenes: 1 hook + 1-3 point + 1 cta)');
  }
  const hook = scenes[0];
  const cta = scenes[scenes.length - 1];
  const points = scenes.slice(1, scenes.length - 1);
  if (hook.type !== 'hook') {
    throw new Error(`b1_video_kinetic: first scene must be type 'hook', got '${hook.type}'`);
  }
  if (cta.type !== 'cta') {
    throw new Error(`b1_video_kinetic: last scene must be type 'cta', got '${cta.type}'`);
  }
  if (points.length < 1 || points.length > B1_VIDEO_KINETIC_MAX_POINT_SLOTS) {
    throw new Error(`b1_video_kinetic: point scene count ${points.length} outside 1-${B1_VIDEO_KINETIC_MAX_POINT_SLOTS}`);
  }
  for (const p of points) {
    if (p.type !== 'point') {
      throw new Error(`b1_video_kinetic: scene between hook and cta must be type 'point', got '${p.type}'`);
    }
  }

  const hookHeadline = (hook.headline ?? '').trim();
  if (!hookHeadline) throw new Error('b1_video_kinetic: missing hook.headline');
  if (hookHeadline.length > B1_VIDEO_KINETIC_HOOK_HEADLINE_MAX_CHARS) {
    throw new Error(`b1_video_kinetic: hook.headline length ${hookHeadline.length} exceeds max_chars=${B1_VIDEO_KINETIC_HOOK_HEADLINE_MAX_CHARS} (no truncation / no AI rewrite)`);
  }
  const ctaHeadline = (cta.headline ?? '').trim();
  if (!ctaHeadline) throw new Error('b1_video_kinetic: missing cta.headline');
  if (ctaHeadline.length > B1_VIDEO_KINETIC_CTA_HEADLINE_MAX_CHARS) {
    throw new Error(`b1_video_kinetic: cta.headline length ${ctaHeadline.length} exceeds max_chars=${B1_VIDEO_KINETIC_CTA_HEADLINE_MAX_CHARS} (no truncation / no AI rewrite)`);
  }
  points.forEach((p, i) => {
    const headline = (p.headline ?? '').trim();
    if (!headline) throw new Error(`b1_video_kinetic: missing point[${i}].headline`);
    if (headline.length > B1_VIDEO_KINETIC_POINT_HEADLINE_MAX_CHARS) {
      throw new Error(`b1_video_kinetic: point[${i}].headline length ${headline.length} exceeds max_chars=${B1_VIDEO_KINETIC_POINT_HEADLINE_MAX_CHARS} (no truncation / no AI rewrite)`);
    }
    const body = (p.body ?? '').trim();
    if (body && body.length > B1_VIDEO_KINETIC_POINT_BODY_MAX_CHARS) {
      throw new Error(`b1_video_kinetic: point[${i}].body length ${body.length} exceeds max_chars=${B1_VIDEO_KINETIC_POINT_BODY_MAX_CHARS} (no truncation / no AI rewrite)`);
    }
  });
}

// ── selector response types — verbatim copies of b1_video_stat.ts's shapes (kept independent so this
// module has zero import coupling to the sibling; both mirror the SAME public.select_template /
// resolve_slot_assets response contract). ──────────────────────────────────────────────────────────
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

export type B1VideoKineticTmrEvidence = {
  winner: string | null;
  provider_template_id: string;
  registry_template_id: string | null;
  assignment_id: string | null;
  variant_key: string | null;
  seed: string | null;
  bind_mode: 'resolved';
  resolver_used: true;
  fallback_taken: false;
  slot_reasons: Array<{ slot: string | null; asset_key: string | null; reasons: unknown[] }>;
  slot_warnings: unknown[];
  selector_status: 'ok';
  // v1 silent scope (WS-4 §11) — always false; no voice/music wiring in this module.
  audio: { voiceover: false; music_bed: false };
  // The kinetic composition length is VARIABLE (unlike stat's fixed 12s) — recorded here so a render
  // log proves what was actually rendered (mirrors B1VideoTmrEvidence.output_spec's evidencing intent).
  scene_summary: { active_point_count: number; total_duration_seconds: number };
};

export type B1VideoKineticTemplateSpec = {
  implementation_id: string | null;
  template_id: string | null;
  provider: 'creatomate';
  provider_template_id: string;
  variant_key: string | null;
  format_key: string | null;
  aspect_ratio: string | null;
  resolver_used: true;
  fallback_taken: false;
  tmr: B1VideoKineticTmrEvidence;
};

export type B1VideoKineticPlan = {
  providerTemplateId: string;
  modifications: Record<string, string | number>;
  templateSpec: B1VideoKineticTemplateSpec;
};

// PURE spine-driven plan builder. Turns a public.select_template response + the AI-authored scene
// array + the caller's already-resolved brand colours/name into the Creatomate template-mode plan.
// Fail-loud contract (mirrors buildGovernedVideoStatPlan):
//   - scene shape/text invalid              → assertKineticScenesWithinGate throws (call FIRST)
//   - selector status !== 'ok'              → throw tmr_video_selector_fail_closed
//   - slot_resolution missing/status!=='ok' → throw tmr_video_selector_fail_closed
//   - missing selected.provider_template_id → throw tmr_video_selector_fail_closed
//   - missing/blank slot_resolution Logo.source → throw tmr_video_slot_resolution_incomplete
// NO fallback to the legacy buildKineticTextSpec for this branch.
export function buildGovernedVideoKineticPlan(
  selectorResponse: TmrSelectorResponse | null | undefined,
  scenes: KineticScene[],
  brand: { primaryColour: string; secondaryColour: string; clientName: string },
): B1VideoKineticPlan {
  // Hard-gate the scene array (fail loud) BEFORE consuming the selector.
  assertKineticScenesWithinGate(scenes);

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

  // Logo.source is REQUIRED (fail-loud) — the ONLY governed visual asset (WS-4 §6.1/§10). NO
  // client-name-text fallback (unlike the legacy buildKineticTextSpec branch).
  const slotMods = slot.modifications ?? {};
  const logoUrlRaw = slotMods['Logo.source'];
  const resolvedLogo = typeof logoUrlRaw === 'string' ? logoUrlRaw.trim() : '';
  if (!resolvedLogo) {
    throw new Error('tmr_video_slot_resolution_incomplete: missing Logo.source');
  }

  const points = scenes.slice(1, scenes.length - 1);
  const activePointCount = points.length;
  const hook = scenes[0];
  const cta = scenes[scenes.length - 1];

  // Cumulative scene start times — IDENTICAL walk to the legacy buildKineticTextSpec's `timings`
  // array (`index.ts:1064`), just applied as flat, absolute per-element modification values instead of
  // baked directly into a source-mode elements[] array (WS-4 §5).
  let t = 0;
  const timings = scenes.map((s) => {
    const e = { start: t, dur: s.duration_s };
    t += s.duration_s;
    return e;
  });
  const totalDuration = t;

  const modifications: Record<string, string | number> = {
    // Persistent chrome (WS-4 §6.1) — solid brand colours, NOT resolve_brand_assets (no asset row).
    'Background.fill_color': brand.primaryColour,
    'BarTop.fill_color': brand.secondaryColour,
    'BarBottom.fill_color': brand.secondaryColour,
    'Logo.source': resolvedLogo,
    // v1 silent scope (WS-4 §11, PK decision 2026-08-01) — present, always empty. No audio wiring.
    'VoiceAudio.source': '',
    'MusicBed.source': '',
    // WS-4 §5d Q4 (PASS, replicated by WS-5 probe 1): bare top-level `duration` is an authoritative
    // composition-length override. Kinetic's composition length is VARIABLE (Σ active scene
    // durations) — always set explicitly, unlike stat's fixed 12s.
    'duration': totalDuration,
  };

  // Hook slot (WS-4 §6.2, always active). HookSubtitle is a FIXED decorative string (worker-set, not
  // AI-authored) — mirrors the legacy buildKineticTextSpec's own hardcoded '↓ Keep watching' cue
  // (`index.ts:1092`).
  const hookTiming = timings[0];
  modifications['HookHeadline.text'] = hook.headline.trim();
  modifications['HookHeadline.time'] = hookTiming.start + 0.4;
  modifications['HookHeadline.duration'] = hookTiming.dur - 0.8;
  modifications['HookSubtitle.text'] = '↓ Keep watching';
  modifications['HookSubtitle.time'] = hookTiming.start + 1.2;
  modifications['HookSubtitle.duration'] = hookTiming.dur - 1.6;

  // Point1/Point2/Point3 slots (WS-4 §6.3). Active slots (1..activePointCount) get their real,
  // AI-authored content + computed timing; unused slots (activePointCount+1..3) are collapsed
  // OFF-TIMELINE across all 5 sub-elements (WS-4 §5e / WS-5 probe 2c — the proven recipe).
  for (let slotIdx = 1; slotIdx <= B1_VIDEO_KINETIC_MAX_POINT_SLOTS; slotIdx++) {
    const prefix = `Point${slotIdx}`;
    if (slotIdx <= activePointCount) {
      // ACTIVE slot. timings[] index: hook is index 0, points start at index 1.
      const scene = points[slotIdx - 1];
      const timing = timings[slotIdx];
      modifications[`${prefix}Counter.text`] = `${slotIdx}/${activePointCount}`;
      modifications[`${prefix}Counter.time`] = timing.start + 0.15;
      modifications[`${prefix}Counter.duration`] = timing.dur - 0.4;
      modifications[`${prefix}Bar.time`] = timing.start + 0.30;
      modifications[`${prefix}Bar.duration`] = timing.dur - 0.6;
      modifications[`${prefix}Headline.text`] = scene.headline.trim();
      modifications[`${prefix}Headline.time`] = timing.start + 0.50;
      modifications[`${prefix}Headline.duration`] = timing.dur - 0.8;
      const body = (scene.body ?? '').trim();
      if (body) {
        modifications[`${prefix}Divider.time`] = timing.start + 0.75;
        modifications[`${prefix}Divider.duration`] = timing.dur - 1.0;
        modifications[`${prefix}Body.text`] = body;
        modifications[`${prefix}Body.time`] = timing.start + 0.90;
        modifications[`${prefix}Body.duration`] = timing.dur - 1.0;
      } else {
        // WS-4 §6.3: PointNDivider is present only when PointNBody is non-empty — an active point
        // scene with no body collapses ONLY these two sub-elements, off-timeline (same recipe as an
        // unused slot; PointNDivider has no `.text` modification key to clear — shape element).
        modifications[`${prefix}Divider.time`] = B1_VIDEO_KINETIC_COLLAPSE_TIME;
        modifications[`${prefix}Divider.duration`] = B1_VIDEO_KINETIC_COLLAPSE_DURATION;
        modifications[`${prefix}Body.text`] = '';
        modifications[`${prefix}Body.time`] = B1_VIDEO_KINETIC_COLLAPSE_TIME;
        modifications[`${prefix}Body.duration`] = B1_VIDEO_KINETIC_COLLAPSE_DURATION;
      }
    } else {
      // UNUSED slot — collapse ALL 5 sub-elements off-timeline (WS-4 task instruction / WS-5 probe
      // 2c). `.text=''` applies ONLY to the 3 text-bearing sub-elements (Counter/Headline/Body) — the
      // confirmed key map (WS-4 §6.3) gives PointNBar/PointNDivider NO `.text` modification key (they
      // are shape elements); inventing one would be a key not in the doc's table.
      modifications[`${prefix}Counter.text`] = '';
      modifications[`${prefix}Counter.time`] = B1_VIDEO_KINETIC_COLLAPSE_TIME;
      modifications[`${prefix}Counter.duration`] = B1_VIDEO_KINETIC_COLLAPSE_DURATION;
      modifications[`${prefix}Bar.time`] = B1_VIDEO_KINETIC_COLLAPSE_TIME;
      modifications[`${prefix}Bar.duration`] = B1_VIDEO_KINETIC_COLLAPSE_DURATION;
      modifications[`${prefix}Headline.text`] = '';
      modifications[`${prefix}Headline.time`] = B1_VIDEO_KINETIC_COLLAPSE_TIME;
      modifications[`${prefix}Headline.duration`] = B1_VIDEO_KINETIC_COLLAPSE_DURATION;
      modifications[`${prefix}Divider.time`] = B1_VIDEO_KINETIC_COLLAPSE_TIME;
      modifications[`${prefix}Divider.duration`] = B1_VIDEO_KINETIC_COLLAPSE_DURATION;
      modifications[`${prefix}Body.text`] = '';
      modifications[`${prefix}Body.time`] = B1_VIDEO_KINETIC_COLLAPSE_TIME;
      modifications[`${prefix}Body.duration`] = B1_VIDEO_KINETIC_COLLAPSE_DURATION;
    }
  }

  // Cta slot (WS-4 §6.4, always active). CtaWatermark is a STATIC '?' glyph baked into the template
  // (no `.text` modification key — decorative, not AI content). CtaFooter is worker-computed
  // ("Follow {ClientName} for more"), mirroring the legacy buildKineticTextSpec's own string
  // (`index.ts:1098`).
  const ctaTiming = timings[timings.length - 1];
  modifications['CtaWatermark.time'] = ctaTiming.start;
  modifications['CtaWatermark.duration'] = ctaTiming.dur;
  modifications['CtaHeadline.text'] = cta.headline.trim();
  modifications['CtaHeadline.time'] = ctaTiming.start + 0.3;
  modifications['CtaHeadline.duration'] = ctaTiming.dur - 0.6;
  modifications['CtaFooter.text'] = `Follow ${brand.clientName} for more`;
  modifications['CtaFooter.time'] = ctaTiming.start + 0.9;
  modifications['CtaFooter.duration'] = ctaTiming.dur - 1.1;

  const slotReasons = (slot.selected ?? []).map((s) => ({
    slot: s?.slot ?? null,
    asset_key: s?.asset_key ?? null,
    reasons: Array.isArray(s?.reasons) ? s.reasons : [],
  }));

  const tmr: B1VideoKineticTmrEvidence = {
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
    audio: { voiceover: false, music_bed: false },
    scene_summary: { active_point_count: activePointCount, total_duration_seconds: totalDuration },
  };

  const templateSpec: B1VideoKineticTemplateSpec = {
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
