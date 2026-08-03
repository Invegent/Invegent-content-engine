import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveCreativeContract } from "./creative_contract.ts";
import { buildContractStamp } from "./contract_stamp.ts";
import {
  buildEnvelopeBoundReminder,
  buildFallbackStatEnvelope,
  buildStatBoundsQa,
  decideStatBoundsNextStep,
  describeFieldLimit,
  isStatBoundsFailClosed,
  loadStatTemplateEnvelope,
  snapshotStatFields,
  STAT_BOUNDS_DEAD_REASON,
  validateStatScriptAgainstEnvelope,
  type StatBoundsAttempt,
  type StatBoundsQa,
  type StatEnvelope,
} from "./stat_envelope.ts";

const app = new Hono();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-worker-id, x-ai-worker-key",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const VERSION = "ai-worker-v2.26.0";
// v2.26.0 (2026-08-03) — WS-5 P1 STAT PRODUCTION-ENVELOPE ENFORCEMENT (PK ruling D-1, Option B).
//   marker: ai-worker-ws5-stat-envelope-enforcement (grep-able in the deployed bundle).
//   Lane: ws5-production-envelope-enforcement-foundation (Gate-1 approved 2026-08-03).
//   WHAT: the video_short_stat / video_short_stat_voice generator branch now VALIDATES its
//   parsed output against the PERSISTED per-template constraints instead of silently clamping.
//   NEW module stat_envelope.ts (pure core + thin loader, house pattern):
//     (1) loadStatTemplateEnvelope() resolves the would-be render-time winner by MIRRORING
//         video-worker's select_template call exactly (p_platform null, p_format
//         'video_short_stat', p_variant_intent null, p_seed=post_draft_id; select_template is
//         STABLE/read-only — verified in migrations 20260703035154 + 20260719010700), then reads
//         the winner's StatValue/StatLabel/ContextLine/CtaText rows from
//         c.creative_provider_template_field (constraints shape tmr_field_constraints_v1:
//         text_limits limit-TRIPLEs; basis='to_be_calibrated' → absent; unknown keys ignored;
//         max_words honored if ever present). ANY miss (selector fail-closed / RPC error /
//         unparseable or missing constraints / absent element rows / throw) → FALLBACK envelope
//         from the vendored render-gate char bounds (video_stat_bounds.ts: 12/48/160/90) with a
//         machine-readable fallback_reason. The fallback is still VALIDATION bounds — never a
//         clamp. The loader NEVER throws and never blocks the job loop.
//     (2) The stat system prompt now states the ACTUAL envelope limits (chars + lines/words when
//         persisted) instead of the old hardcoded 12/35/75/65.
//     (3) After parse: validate all 4 fields (same trimmed UTF-16 measurement as the render
//         gate). On violation: exactly ONE bounded re-prompt (same system prompt + an appended
//         bounds-reminder naming each violated field, actual vs limit) → re-parse → re-validate.
//         A second violation FAILS THE DRAFT CLOSED: set_draft_video_script is NOT called; the
//         draft is marked dead via the house pattern (pipeline-fixer render_attempts_exhausted
//         idiom: dead_reason COLUMN + terminal medium status + updated_at, approval untouched) —
//         dead_reason='stat_bounds_violation_after_bounded_reprompt', video_status='failed' (the
//         claim RPC public.claim_pending_video_drafts only claims 'pending', so a dead draft is
//         unreachable by the render path). The job itself still succeeds (mirrors every other
//         non-fatal content failure); the per-job result entry carries stat_bounds_outcome.
//     (4) The four v2.22.0 clampField() calls are REMOVED from the stat branch (D-1: NO silent
//         truncation, NO legacy clamp fallback, NO persistence of out-of-envelope content).
//         clampField itself stays exported (dialogue path + tests still use it).
//     (5) QA EVIDENCE (D-1 mandate): BOTH attempts (fields as generated, violations, envelope
//         source + limits, timestamps) persist additively as stat_bounds_qa — on success inside
//         video_script (rides the set_draft_video_script jsonb `||` merge); on fail-closed into
//         draft_format via READ-MERGE-WRITE (v2.24.1 clobber lesson: a plain .update() REPLACES
//         draft_format), deliberately NOT under video_script so a dead draft never looks
//         renderable.
//   Re-prompt infra/parse failure after a first-attempt violation → return null (no
//   video_script written — the existing non-fatal generation-failure behaviour); the violating
//   attempt-1 content is never persisted.
//   STRICTLY OUT OF SCOPE (unchanged): select_template itself, every publisher, routing,
//   capability-gate behaviour, the kinetic/avatar/dialogue generator branches, the schedule
//   pin, all DB schema (zero DDL — reads existing tables/RPCs only), any deploy.
// v2.25.0 (2026-07-29) — S9 CAPABILITY ENFORCEMENT, Objective 1 / LAYER 2 (resolver chokepoint).
//   marker: ai-worker-s9-capability-enforcement (grep-able in the deployed bundle).
//   Brief: docs/briefs/s9-resolver-enforcement-build-brief-v1.md
//   Architecture: docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md §2.1 Layer 2, §4.
//   WHAT: one fail-closed call to public.classify_format_capability(client_slug, platform, format)
//   immediately before the single write site that finalises recommended_format — on BOTH draft
//   paths: the main success path (after the Advisor's pick AND after all three unconditional pins,
//   so it is the true last word regardless of which of the 11 documented fallback paths produced
//   decidedFormat) and the evergreen path (§1.3 path #6, which writes recommended_format directly
//   from input_payload.format and bypasses Advisor + resolver entirely, so it carries its own copy).
//   READY -> behaviour byte-unchanged. NON-READY -> canonical blocked state, using EXISTING
//   format-authority columns only (PK ruling 3, zero DDL):
//     recommended_format   = NULL  (NEVER a substitute — no legacy format is ever written back;
//                                   every renderer/publisher keys off an exact value, so NULL is
//                                   unreachable downstream by construction)
//     requested_format     preserved unconditionally
//     final_format_authority = 'blocked_by_capability'
//     final_format_reason  = '<classifier status>:<reason_code>'; full classifier jsonb verbatim
//                            in resolver_evidence (never re-derived locally)
//   NOT written on a block: approval_status (skeleton stays 'draft', so m.auto_approver_fetch_drafts
//   — WHERE approval_status='needs_review' — cannot see it), video_status, any publish-failure
//   status, draft_title/draft_body. ai_job -> 'cancelled' (NOT 'failed': pipeline-fixer re-queues
//   'locked' and dead-letters 'failed' but never touches 'cancelled', so a block cannot enter a
//   retry/dead-letter loop). slot -> 'skipped' + skip_reason 'capability_blocked:<status>:<format>'.
//   The check runs BEFORE writeVisualSpec/assemblePrompts/the LLM call and before any video-script
//   or dialogue generation, so a blocked draft incurs zero generation cost (PK ruling 2026-07-29).
//   TEMPLATE-LESS CARVE-OUT (PK ruling 2026-07-29, "Option A"): a non-ready verdict does NOT block
//   when the format's registry row says render_engine='none' — such formats need no visual template,
//   so select_template legitimately fail-closes and the classifier reports unsupported_silent_degrade
//   (a coverage artefact, not a capability gap). Without it the gate would stop ALL plain-text posting.
//   The exempt set is read from the registry via public.is_capability_exempt_format(text) — the SAME
//   accessor Layer 1 uses, never a list hardcoded here, so the layers cannot drift. Checked ONLY after
//   a non-ready verdict, so the ready path is byte-unchanged and pays no extra round-trip. Exemption
//   lookup failure => NOT exempt => stays gated.
//   FAIL-CLOSED ALWAYS: RPC error, throw, unresolvable client_slug, or unrecognised classifier
//   payload all classify as NOT ready — no path turns a failure into 'ready'. The ready test is
//   generic (status === 'ready'), never an enumeration of blocked statuses, so a future 7th/8th
//   classifier status is covered by construction. Layer 1 (m.fill_pending_slots) ships in the
//   paired migration 20260729143000. STRICTLY OUT OF SCOPE (separate future brief): publisher-side
//   enforcement, the auto-approver guard, Layer 3 render-dispatch, WordPress.
// v2.24.1 (2026-07-28) — cc-0084 Slice 2 write-order fix (Slice 3 live proof). marker unchanged:
//   ai-worker-cc0084-dialogue-script. The dialogue-success path was persisting video_script via
//   set_draft_video_script (a jsonb `||` MERGE into draft_format) and THEN doing a plain
//   .update({ draft_format: { ...draftMeta, scene_count } }) — a FULL COLUMN REPLACE that clobbered
//   the just-merged video_script (live: draft_format.video_script=null → heygen-worker found no
//   dialogue[] → no multi-scene render). FIX: stamp draft_format scene_count FIRST (safe full replace —
//   video_script not written yet), THEN call set_draft_video_script so its `||` merge adds video_script
//   on top → final draft_format = { ...draftMeta, scene_count, video_script }. dialogueHandled flips
//   true ONLY after BOTH writes succeed; either failure → monologue fallback (unchanged). No other
//   behaviour changed; monologue path untouched.
// v2.24.0 (2026-07-27) — cc-0084 Slice 2 (multi-character dialogue script generation). ADDITIVE.
//   marker: ai-worker-cc0084-dialogue-script (grep-able in the deployed bundle). NEW avatar format
//   video_short_avatar_dialogue: when input_payload.format === 'video_short_avatar_dialogue', a
//   dialogue OVERRIDE (sibling of the A2 avatar override) forces decidedFormat='video_short_avatar'
//   (so prompt/visual-spec/recommended_format all behave EXACTLY like the monologue avatar format —
//   heygen-worker keys pickup on recommended_format='video_short_avatar', then detects dialogue[])
//   and flags dialogueMode. At the video_script write, a NEW generateDialogueScript() emits
//   { format:'avatar_dialogue', dialogue:[{speaker_role, line}], render_style:'realistic',
//   total_duration_s } from the brief (input_payload.source_material) + input_payload.dialogue_roles
//   validated against the client's ACTIVE c.brand_stakeholder role_code set (same query
//   suggestAvatarRole uses). draft_format.scene_count = dialogue.length (heygen qa.scene_count reads
//   it). Pure helpers resolveParticipatingRoles / normalizeDialogueTurns / dialogueIsRenderable do
//   the validation/repair (drop/repair any turn whose role ∉ participating valid set; require ≥2
//   distinct roles AND ≥2 turns; each speaker_role exactly one participating valid role; a returned
//   role_code is mapped to speaker_role). FAIL-SAFE: missing/invalid dialogue_roles, generation
//   failure, or a non-renderable result → DEGRADE to the existing single-role monologue avatar path
//   (cc-0083) so a bad dialogue signal still yields a video; generateDialogueScript NEVER throws into
//   the draft lifecycle. STRICTLY OUT OF SCOPE: the monologue path (byte-identical — its block body is
//   unchanged, only guarded by !dialogueHandled) · persona-derived role selection · >4 turns · any
//   heygen-worker change (Slice 1, LIVE) · any DB schema/migration · any deploy/publish.
// v2.23.0 (2026-07-27) — cc-0083 Slice B (selection seam): PROMOTE the presenter-role
//   suggestion into the CONSUMED field. cc-0083-marker: ai-worker-cc0083-stakeholder-role-promote.
//   The v2.15.0 shadow suggestion (video_script.avatar_role_suggestion) is UNCHANGED and still
//   written for observability. NEW: in the SAME non-fatal avatar guard, when the suggestion has a
//   non-empty single role_code AND suggested_stakeholder_role_confidence >= AVATAR_ROLE_MIN_CONFIDENCE
//   (0.6), the worker ALSO sets video_script.stakeholder_role = that role — the field heygen-worker
//   actually filters avatars on. Otherwise stakeholder_role is LEFT UNSET → heygen-worker resolves
//   the client default host (cc-0083 Slice B change 2). Fail-open: reads off the best-effort
//   suggestion object, stays inside the existing try, NEVER throws, and never blocks the video_script
//   write. STRICTLY OUT OF SCOPE: no change to avatar_role_suggestion (still written verbatim), no
//   change to suggestAvatarRole's role derivation, no format-selection/prompt/render change, no
//   stakeholder_role write for non-video_short_avatar formats, no heygen-worker/poller change here,
//   no DB schema/migration, no dashboard.
// v2.22.0 (2026-07-26) — Schedule-authority pin for the governed video_short_stat golden path
//   + a deterministic stat-script field clamp. ADDITIVE + NARROW. THREE changes:
//   (1) new fail-closed helper isVideoStatGovernanceEnabled() — mirrors video-worker's
//       isVideoGovernanceEnabled: reads c.client_creative_governance(enabled) for
//       (client_id, format='video_short_stat'); any error/throw/missing → false.
//   (2) a one-format schedule-authority pin placed immediately AFTER the F-HEYGEN A2 avatar
//       override: when the SCHEDULE demands video_short_stat on YouTube (the only platform where
//       it is valid) AND the client is governance-enabled, the schedule's choice survives the
//       Advisor into recommended_format so the governed Creatomate video path fires. Records what
//       the advisor would have chosen (schedule_authority_pin reason). Every other Advisor power
//       is intact; guard checks input_payload.format + platform (cheap) BEFORE the async read.
//   (3) a deterministic clampField() applied to the stat generator's parsed output
//       (stat_value≤12 · stat_label≤35 · context_line≤75 · cta_text≤65 — all ≤ the video
//       contract maxima), truncating at a word boundary. No-op for already-compliant fields;
//       narration_text untouched. Stops an over-long model stat field (observed cta_text=133)
//       from dying fail-loud at video-worker's contract gate.
//   STRICTLY OUT OF SCOPE: no Advisor/prompt change beyond the single pin, no change to any
//   OTHER format's selection, no render change, no DB schema/migration, no dashboard, no change
//   to the R3a shadow columns or recommended_reason writers. Only the pinned format's
//   recommended_format value changes, and only for governed YouTube video_short_stat slots.
// v2.21.0 (2026-07-25) — R3a resolver-enforcement SHADOW wiring. ADDITIVE + SHADOW-ONLY.
//   On both draft-write paths (main success path baseUpdate + evergreen path) the worker now
//   makes a BEST-EFFORT call to the governed DB resolver m.resolve_final_format(client_id,
//   platform, requested_format, format_mode, advisor_format) and stamps its jsonb decision into
//   NEW nullable m.post_draft columns ONLY: advisor_format · requested_format · format_mode ·
//   shadow_resolved_format · final_format_authority · final_format_reason · format_policy_version ·
//   format_resolved_at · resolver_evidence. The resolver call is FAIL-SAFE (helper resolveShadow:
//   any RPC error/throw → null, draft proceeds normally with shadow columns null +
//   final_format_reason 'resolver_unavailable') — shadow must never reduce production reliability.
//   recommended_format / recommended_reason keep their EXACT current values AND current writers on
//   every path (the Advisor pick on the main path; job.input_payload?.format ?? 'text' verbatim on
//   the evergreen path). STRICTLY OUT OF SCOPE: no format-SELECTION change, no prompt/advisor
//   change, no render change, no change to what recommended_format/recommended_reason write, no
//   DB schema/migration here (the shadow columns + resolver fn are applied separately), no
//   dashboard. Nothing downstream reads the shadow columns yet.
// v2.20.0 (2026-07-18) — cc-0040 Step 2 (advisor image_headline char budget) + the shared
//   creative_contract.ts cc-0040 edits (PP+NDIS headline max_chars 90→180; NDIS footer
//   ''→'NDIS Yarns' — D7 fold-in), applied IDENTICALLY to the ai-worker vendored twin
//   (parity guard unchanged). Two prompt-only changes tighten the AUTHORED headline toward a
//   single strong pull-quote line: (1) callFormatAdvisor system prompt gains a FIELD RULE
//   "image_headline should be ≤ ~60 characters"; (2) buildFormatOutputSchema replaces the
//   "10-15 word pull quote" framing with a ≤~60-character budget (Starting-point seed kept).
//   No truncation/assert here — the RENDER worker (image-worker) owns the hard gate (now 180
//   + a 40-char unbreakable-token guard). buildFormatOutputSchema is EXPORTED and the
//   top-level Deno.serve is guarded with `if (import.meta.main)` so it is hermetically
//   unit-testable; deployed behaviour is byte-identical (proven pattern — heygen-worker/
//   pipeline-fixer). STRICTLY OUT OF SCOPE: no format-SELECTION change (recommended_format
//   untouched), no video/other-format branch change beyond the shared image_headline
//   instruction, no truncation/validation/repair, no render change, no image-worker runtime
//   change, no DB schema/migration, no dashboard, no stamp-shape change.
// v2.19.0 (2026-07-18) — TMR D7 N7b — register NDIS_IMAGE_QUOTE_NEWS_CARD_V1 in
//   CREATIVE_CONTRACT_REGISTRY; data addition, no logic change. (Entrypoint version bump only,
//   to reclassify the drift gate off A-LE — the actual change is in creative_contract.ts.)
// v2.18.0 (2026-07-17) — SPINE GEN v2 D6-3 (parity with image-worker): the vendored
//   resolveCreativeContract in creative_contract.ts is now a per-(client_id, recommended_format)
//   REGISTRY lookup instead of the hardcoded PP-UUID literal branch. PP behaviour is IDENTICAL
//   (same frozen PP_IMAGE_QUOTE_NEWS_CARD_V1 for PP+image_quote; null for every other pair —
//   the contract-stamp gate/path is byte-unchanged), but a second governed brand is now a DATA
//   addition (one registry entry) rather than a code edit. Both vendored copies stay
//   byte-identical (parity guard unchanged). STRICTLY OUT OF SCOPE: no AI-prompt/format-selection/
//   stamp-shape/render change, no new stamped fields, no DB schema/migration, no image-worker
//   runtime change here, no dashboard. VERSION bump only for the resolver-internals change.
// v2.17.0 (2026-07-04) — LANE 4 / B1-v3: vendored creative contract v2 — background pool
//   3→5, aligned to the governed resolver (resolve_slot_assets) eligible-pool rank order
//   (PK decision 2026-07-04 "Option A-now-D-later"). contract_version stamped into
//   draft_format.contract goes v1→v2; contract_key/contract_ref/variant identity and the
//   stamping gate/path are UNCHANGED. No AI-prompt/format-selection/render change.
// v2.16.0 (2026-06-27) — ACI Foundation v0 / Slice B1: creative-contract stamp.
//   ADDITIVE METADATA ONLY. When ai-worker writes a Property-Pulse image_quote draft,
//   it now resolves the vendored creative contract (resolveCreativeContract, gated on
//   client_id + recommended_format === 'image_quote') and stamps a compact provenance
//   record into m.post_draft.draft_format.contract (variant_key / contract_ref /
//   contract_version / selector_reason / registry_version / source_commit / resolved_at).
//   For ANY non-PP client OR non-image_quote format the resolver returns null and NO
//   `contract` key is added — the draft_format shape is byte-unchanged on the default path.
//   Vendored per-worker copy of creative_contract.ts (Slice A2 image-worker projection,
//   registry v0.3 @ 2ac172b); buildContractStamp is a pure helper (injected nowIso, no I/O).
//   STRICTLY OUT OF SCOPE: no AI-prompt change, no format-selection change (recommended_format
//   untouched), no callFormatAdvisor / writeVisualSpec change, no validation/repair, no render
//   change, no image-worker runtime change, no DB schema/migration, no dashboard. Inert for all
//   non-PP-image_quote drafts; reviewed by diff at the single call site.
// v2.15.0 — F-SERIES-AVATAR-DIFFERENTIATION Stage 1 (shadow avatar-role suggestion).
//   OBSERVABILITY-ONLY. For video_short_avatar drafts, derive a SUGGESTED presenter
//   stakeholder role (constrained to the brand's active c.brand_stakeholder.role_code
//   set) from the episode persona (persona_label / avatar_preference / persona_notes,
//   read via slot -> creative_intent) and store it under
//   draft_format.video_script.avatar_role_suggestion — a field heygen-worker does NOT
//   read for avatar selection. Does NOT write stakeholder_role (the consumed field),
//   which stays NULL/unchanged; does NOT alter avatar selection, rendering, the HeyGen
//   payload, or the draft lifecycle. Best-effort + never throws. No schema change, no
//   migration. Role promotion to the consumed field is a later, separately-gated stage.
// v2.14.0 — T0: Content Studio governed path (manual slots).
//   slot_fill_synthesis_v1 gains synthesis_mode === 'manual': the seed is the
//   slot-carried operator brief (input_payload.source_material) mapped onto the
//   existing rewrite_v1 path — the global canonical pool is NEVER consulted for
//   operator briefs. The draft then passes the identical Advisor + compliance +
//   approval chain as automated content.
//   Advisor preference visibility: when a manual job carries an EXPLICIT
//   operator format preference (format_preference_explicit === true), that
//   preference is passed to callFormatAdvisor as the preferred format (same
//   bias-instruction mechanism as the client platform preference). Preference
//   only — the Advisor retains format authority. Scheduled/breaking slots are
//   unchanged (their input_payload.format is a fill-time fallback, not an
//   operator pick, and is NOT surfaced as a preference).
// v2.13.0 — F-HEYGEN-NEVER-PRODUCED Option A (A2/A3): avatar YouTube support.
//   Brief: docs/briefs/f-heygen-never-produced.md. A1 config (add youtube:true to
//   video_short_avatar.platform_support in t."5.3_content_format") already applied.
//   A2 — avatar-only override: after callFormatAdvisor, if the slot's
//   input_payload.format === 'video_short_avatar', force decidedFormat to
//   'video_short_avatar' (the YouTube palette excludes avatar so the advisor can
//   never pick it) and record advisor_would_have=<prev decidedFormat> in
//   advisorReason. NARROW — only video_short_avatar is overridden; no other format.
//   A3 — generateVideoScript now has a video_short_avatar branch returning JSON
//   { format:'avatar', narration_text, render_style:'realistic', total_duration_s }.
// v2.12.0 — F-YT-NY-FORMAT-SELECTION fix
//   ROOT CAUSE: format-advisor-v1 received no platform context and the
//   candidate-list filter in fetchFormatContext used opt-out semantics
//   (`s[platform] === false`). 5 of 10 buildable rows in
//   t."5.3_content_format" have no `youtube` key in `platform_support`
//   JSONB, so they all leaked through to the YouTube candidate set.
//   Result: NDIS-Yarns × YouTube selected `text` for 100% of last 14
//   days' drafts (8/8); Property-Pulse × YouTube selected `text` for
//   76% (13/17). YouTube cannot publish text — 0 published posts on
//   NY×YT and 24% publish rate on PP×YT.
//   Fix part A — fetchFormatContext: opt-in semantics. `s[platform]
//   !== true` excludes any row where the platform key is absent or
//   not-true. Verified across all 4 platforms: identical candidate
//   sets for facebook (10), linkedin (4), instagram (5); youtube
//   correctly drops from 10 to the 5 video formats only.
//   Fix part B — callFormatAdvisor: now receives `platform` and
//   injects "Target platform: ${platform}. Choose only formats
//   compatible with ${platform}." into the system prompt. Defence-
//   in-depth — keeps the advisor platform-aware even if a future
//   format row is added with missing platform keys.
//   Diagnosed via Supabase MCP read-only catalogue inspection +
//   ai-worker source read. See:
//   docs/briefs/2026-05-05-f-yt-ny-format-selection.md (sha 7d71eda6)
//   D-01 review_id: 64230c18-362b-4d0c-bf82-b5ab6eda3856 (PASS)
// v2.11.1 — F-AI-WORKER-PARSER-SKIP-BUG fix + raw response capture on failure
//   ROOT CAUSE: callClaude and callOpenAI parsers checked for {title, body}
//   BEFORE checking the skip flag, throwing anthropic_missing_title_or_body
//   when the model correctly returned a compliance-skip response
//   ({skip: true, reason: "compliance_block: ..."}). Affected CFW × LinkedIn
//   × image_quote with 33% success rate; cascade caused F-AAP-DRAFTS-STUCK
//   + F-RECOVER-LOOP-001. Fix: check skip before title/body in both parsers.
//   Plus: capture raw model response on parse failure into ai_job.output_payload
//   for future diagnosis (closes B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING).
//   Implementation note: introduced AiParseError subclass that carries the
//   raw cleaned response. Outer per-job catch reads err.rawResponse and
//   writes it to ai_job.output_payload.error_response_raw on failure.
//   Forward-only, non-skip paths and success paths unchanged.
//   Diagnosed via Supabase MCP source-read + format-success-rate analysis,
//   not via worker logs (which were silent on the bug). See:
//   docs/briefs/2026-05-04-or-later-fai-worker-parser-skip-bug.md
//   docs/runtime/sessions/2026-05-04-baudit-check5-retired-faap007-revised.md
// v2.11.0 — Lesson #33: explicit error destructuring on every Supabase JS write
// v2.10.1 — Fix-up: column-name correction for f.canonical_content_body
// v2.10.0 — Slot-driven payload + LD7 prompt caching + LD18 + slot status transitions (Stage 11)
// v2.9.0 — ID003 remediation (D157)
// v2.8.0 — Format advisor preferred format bias
// v2.7.1 — Write compliance_flags to m.post_draft (D088)
// v2.7.0 — Profession-scoped compliance rule loading (D066)
// v2.6.1 — Fix format advisor seed extraction
// v2.6.0 — YouTube pipeline Stage A
// v2.5.1 — Fix writeVisualSpec: destructure {error} from .rpc() call.
// v2.5.0 — Content advisor promoted upstream (D043 Step 8)
//
// (Detailed v2.11.0 / v2.10.x / v2.9.0 changelog comments preserved in the original v2.11.0 source.
//  Trimmed here for size; deployed binary is the patched source — full version history is in git.)

const FORMAT_ADVISOR_PROMPT_KEY = "format-advisor-v1";
const VIDEO_FORMATS = new Set([
  'video_short_kinetic', 'video_short_stat',
  'video_short_kinetic_voice', 'video_short_stat_voice',
  'video_short_avatar', 'video_long_explainer', 'video_long_podcast_clip',
]);

// cc-0084 Slice 2 — grep-able marker string for the deployed bundle (bundles-from-CWD guard).
const CC0084_DIALOGUE_MARKER = 'ai-worker-cc0084-dialogue-script';
// cc-0084 Slice 2 — dialogue caps. Keeps the whole multi-scene HeyGen video within its ~2-min
// ceiling: at most DIALOGUE_MAX_TURNS talking-head cuts, each line clamped to a concise length.
const DIALOGUE_MAX_TURNS = 4;
const DIALOGUE_LINE_MAX_CHARS = 320;   // ~55 words → ~20s per cut; 4 cuts ≈ 80s ≤ HeyGen ceiling

// cc-0083 (Slice B) — minimum suggestion confidence to PROMOTE a presenter role suggestion
// into the CONSUMED field video_script.stakeholder_role. Below this (or no single clear role),
// stakeholder_role is left unset → heygen-worker resolves the client default host. Tunable;
// documents PK's "default_host only when there is no clear role" rule.
const AVATAR_ROLE_MIN_CONFIDENCE = 0.6;

// cc-0083 (Slice B) — the promotion GATE, factored out as a pure fn so it is hermetically
// unit-testable (house pattern: clampField / buildFormatOutputSchema). Returns the role string to
// write into video_script.stakeholder_role, or null to leave it unset (→ default host). Reads off
// the best-effort suggestAvatarRole object; never throws; a non-string / empty / below-threshold /
// null-confidence suggestion → null. Deployed behaviour is identical to the inline guard.
export function promoteAvatarRole(roleSuggestion: unknown): string | null {
  const sr = (roleSuggestion as any)?.suggested_stakeholder_role;
  const srConf = Number((roleSuggestion as any)?.suggested_stakeholder_role_confidence ?? 0);
  return (typeof sr === 'string' && sr && Number.isFinite(srConf) && srConf >= AVATAR_ROLE_MIN_CONFIDENCE) ? sr : null;
}

// cc-0084 Slice 2 — pure helper: resolve the SLICE-2 dialogue signal (input_payload.dialogue_roles)
// against the client's ACTIVE role_code set. Returns the ordered, de-duplicated list of participating
// role_codes that are BOTH requested AND active. The dialogue path requires >= 2 distinct valid roles;
// fewer → the caller degrades to the monologue path. Hermetically testable; never throws.
export function resolveParticipatingRoles(dialogueRoles: unknown, activeRoles: unknown): string[] {
  const active = new Set((Array.isArray(activeRoles) ? activeRoles : [])
    .map((r) => (typeof r === 'string' ? r.trim() : '')).filter(Boolean));
  const seen = new Set<string>();
  const out: string[] = [];
  if (!Array.isArray(dialogueRoles)) return out;
  for (const r of dialogueRoles) {
    const role = typeof r === 'string' ? r.trim() : '';
    if (role && active.has(role) && !seen.has(role)) { seen.add(role); out.push(role); }
  }
  return out;
}

// cc-0084 Slice 2 — pure helper: validate/repair raw LLM dialogue turns into the exact shape
// heygen-worker v2.6.0 consumes ({ speaker_role, line }). Drops any turn whose role is not one of the
// participating valid roles, whose line is empty, or that is malformed; maps a returned `role_code`
// onto `speaker_role`; trims lines and caps them at maxLineChars; caps the number of turns at maxTurns.
// Purely structural (no renderability decision here — that is dialogueIsRenderable). Never throws.
export function normalizeDialogueTurns(
  rawTurns: unknown,
  participatingRoles: string[],
  opts?: { maxTurns?: number; maxLineChars?: number },
): Array<{ speaker_role: string; line: string }> {
  const maxTurns = opts?.maxTurns ?? DIALOGUE_MAX_TURNS;
  const maxLineChars = opts?.maxLineChars ?? DIALOGUE_LINE_MAX_CHARS;
  const valid = new Set(participatingRoles);
  const out: Array<{ speaker_role: string; line: string }> = [];
  if (!Array.isArray(rawTurns)) return out;
  for (const t of rawTurns) {
    if (out.length >= maxTurns) break;
    if (!t || typeof t !== 'object') continue;
    const roleRaw = (t as any).speaker_role ?? (t as any).role_code;   // map role_code -> speaker_role
    const role = typeof roleRaw === 'string' ? roleRaw.trim() : '';
    if (!role || !valid.has(role)) continue;                            // drop out-of-set / missing role
    const lineRaw = (t as any).line;
    if (typeof lineRaw !== 'string') continue;                          // drop non-string (garbage) lines
    const line = clampField(lineRaw, maxLineChars);
    if (!line) continue;                                                // drop empty / whitespace-only lines
    out.push({ speaker_role: role, line });
  }
  return out;
}

// cc-0084 Slice 2 — pure helper: a dialogue is renderable only with >= 2 turns AND >= 2 DISTINCT
// speaker roles (an actual conversation). Below that the caller degrades to the monologue path.
export function dialogueIsRenderable(turns: Array<{ speaker_role: string }>): boolean {
  if (!Array.isArray(turns) || turns.length < 2) return false;
  return new Set(turns.map((t) => t.speaker_role)).size >= 2;
}

// cc-0084 Slice 2 — pure helper: estimate total spoken seconds for a dialogue (sum of per-turn
// estimates at ~150 wpm, min 4s per cut). Used only for total_duration_s telemetry; capped turns +
// clamped lines already keep the video within HeyGen's ceiling.
export function estimateDialogueDurationS(turns: Array<{ line: string }>): number {
  let total = 0;
  for (const t of turns) {
    const words = String(t?.line ?? '').trim().split(/\s+/).filter(Boolean).length;
    total += Math.max(4, Math.ceil(words / 2.5));
  }
  return total;
}

// D157 ID003: hard fetch timeout applied to both LLM providers.
// Generous enough for large responses, tight enough to prevent indefinite hangs
// that previously burned the Edge Function's own response timeout window.
const LLM_FETCH_TIMEOUT_MS = 120_000;

// v2.11.1 — Custom error class that carries the raw model response.
// Thrown by callClaude/callOpenAI on parse failure so the outer per-job catch
// can read err.rawResponse and persist it to ai_job.output_payload.error_response_raw
// for forensic diagnosis. Closes B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING.
class AiParseError extends Error {
  rawResponse: string;
  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = 'AiParseError';
    this.rawResponse = rawResponse;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeParseJson<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } {
  try { return { ok: true, value: JSON.parse(raw) as T }; }
  catch (e: any) { return { ok: false, error: e?.message ?? "invalid_json" }; }
}

// v2.22.0 — deterministic length clamp for the video_short_stat generator's fields.
// Pure + no-op for already-compliant input (the common case). Truncates at a word
// boundary when over `max`; falls back to a hard slice when the tail has no usable space
// (the last space sits before 60% of max). null/undefined → ''. Used to keep stat fields
// within the generator's own stated prompt limits, all of which are ≤ the downstream
// video-worker contract maxima, so a clamped draft always survives the render contract gate.
export function clampField(s: unknown, max: number): string {
  const v = String(s ?? '').trim();
  if (v.length <= max) return v;
  const cut = v.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return (sp >= Math.floor(max * 0.6) ? cut.slice(0, sp) : cut).trim();
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// v2.22.0 — mirrors video-worker's isVideoGovernanceEnabled. Returns whether a client has an
// ENABLED governed video_short_stat row in c.client_creative_governance. FAIL-CLOSED: any
// query error, throw, or missing/disabled row → false, so it can never push a draft onto the
// governed video path by accident and never throws into the draft lifecycle.
export async function isVideoStatGovernanceEnabled(
  supabase: ReturnType<typeof getServiceClient>,
  clientId: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.schema('c').from('client_creative_governance')
      .select('enabled').eq('client_id', clientId).eq('format', 'video_short_stat').maybeSingle();
    if (error) return false;                 // fail-closed
    return data?.enabled === true;
  } catch { return false; }                  // never throws into the draft lifecycle
}

// v2.22.0 — pure predicate for the schedule-authority pin (the async governance read stays
// separate so this is trivially testable). The pin fires ONLY when the schedule authoritatively
// requested video_short_stat, the platform is YouTube (the only platform where video_short_stat
// is valid), AND the client is governance-enabled for it.
export function shouldPinVideoStat(
  inputFormat: string | null | undefined,
  platform: string | null | undefined,
  governanceEnabled: boolean,
): boolean {
  return inputFormat === 'video_short_stat' && platform === 'youtube' && governanceEnabled === true;
}

function nowIso() { return new Date().toISOString(); }

// R3a SHADOW — best-effort call to the governed DB resolver m.resolve_final_format.
// FAIL-SAFE: a resolver error/throw NEVER breaks the draft; it returns null and the
// caller stamps the shadow columns null (+ final_format_reason 'resolver_unavailable').
// Writes ONLY the additive m.post_draft shadow columns downstream — it does NOT influence
// format SELECTION and does NOT touch recommended_format / recommended_reason.
async function resolveShadow(
  supabase: ReturnType<typeof getServiceClient>,
  clientId: string,
  platform: string,
  requestedFormat: string | null,
  formatMode: string | null,
  advisorFormat: string,
): Promise<any | null> {
  try {
    const { data, error } = await supabase.schema('m').rpc('resolve_final_format', {
      p_client_id: clientId,
      p_platform: platform,
      p_requested_format: requestedFormat,
      p_format_mode: formatMode,
      p_advisor_format: advisorFormat,
    });
    if (error) {
      console.error('[ai-worker] resolve_final_format shadow error', { code: error.code, message: error.message });
      return null;
    }
    return data;
  } catch (e) {
    console.error('[ai-worker] resolve_final_format shadow threw', { message: e instanceof Error ? e.message : String(e) });
    return null;
  }
}

// ── S9 LAYER 2 — capability enforcement (fail-closed) ────────────────────────
// Brief:        docs/briefs/s9-resolver-enforcement-build-brief-v1.md
// Architecture: docs/briefs/s9-capability-enforcement-architecture-gate1-v1.md §2.1 Layer 2, §4.
//
// This is the resolver chokepoint: EVERY one of the 11 fallback paths enumerated in
// the architecture packet §1.3 terminates at the single write site that finalises
// recommended_format, so ONE check placed immediately before it — and AFTER the
// Advisor's pick and all three unconditional pins — is the true last word on format.
//
// FAIL-CLOSED, ALWAYS: an RPC error, a throw, an unresolvable client_slug, or an
// unrecognised classifier payload are ALL treated as NOT ready. There is no branch
// anywhere below that turns a failure into 'ready' — a capability check that cannot
// prove readiness must never let content through.
//
// The ready test is generic (status === 'ready'); blocked statuses are NEVER
// enumerated, so any status the classifier gains later (e.g. the 7th,
// publisher_path_missing) is covered by construction rather than by a list to update.
export const S9_CAPABILITY_MARKER = 'ai-worker-s9-capability-enforcement';

export type CapabilityVerdict = {
  status: string;
  reason_code: string | null;
  routed_lane: string | null;
  evidence: any | null;
  error: string | null;
};

// client_slug is not carried on the ai_job (the worker works purely in client_id uuid),
// and classify_format_capability is keyed by slug — so resolve it explicitly. Cached per
// isolate: the mapping is immutable in practice and this runs once per client per cold start.
// A negative result is cached as null and still fails closed at the call site.
const s9ClientSlugCache = new Map<string, string | null>();

// Test-only: the slug cache is process-global, so hermetic tests must be able to clear it.
export function __resetClientSlugCacheForTests(): void { s9ClientSlugCache.clear(); }

export async function getClientSlug(
  supabase: ReturnType<typeof getServiceClient>,
  clientId: string,
): Promise<string | null> {
  if (s9ClientSlugCache.has(clientId)) return s9ClientSlugCache.get(clientId) ?? null;
  let slug: string | null = null;
  try {
    const { data, error } = await supabase.schema('c').from('client')
      .select('client_slug').eq('client_id', clientId).maybeSingle();
    if (error) console.error('[ai-worker] getClientSlug error', { code: error.code, message: error.message });
    slug = (data as any)?.client_slug ?? null;
  } catch (e) {
    console.error('[ai-worker] getClientSlug threw', { message: e instanceof Error ? e.message : String(e) });
    slug = null;
  }
  s9ClientSlugCache.set(clientId, slug);
  return slug;
}

export async function classifyCapability(
  supabase: ReturnType<typeof getServiceClient>,
  clientId: string,
  platform: string,
  format: string | null,
): Promise<CapabilityVerdict> {
  const fail = (status: string, reason: string, error: string | null = null): CapabilityVerdict =>
    ({ status, reason_code: reason, routed_lane: null, evidence: null, error });

  if (!format) return fail('unknown', 'format_absent');

  const slug = await getClientSlug(supabase, clientId);
  if (!slug) return fail('unknown', 'client_slug_unresolved');

  try {
    const { data, error } = await supabase.rpc('classify_format_capability', {
      p_client_slug: slug, p_platform: platform, p_format: format,
    });
    if (error) {
      console.error('[ai-worker] classify_format_capability error', { code: error.code, message: error.message });
      return fail('capability_check_error', 'rpc_error', `${error.code ?? ''}:${error.message ?? ''}`.slice(0, 400));
    }
    const status = (data as any)?.status;
    if (typeof status !== 'string' || status.length === 0) {
      // Unrecognised payload shape — never guess, never assume ready.
      return fail('unknown', 'classifier_shape_unrecognised');
    }
    return {
      status,
      reason_code: (data as any)?.reason_code ?? null,
      routed_lane: (data as any)?.routed_lane ?? null,
      evidence: data ?? null,
      error: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[ai-worker] classify_format_capability threw', { message: msg });
    return fail('capability_check_error', 'rpc_threw', msg.slice(0, 400));
  }
}

export const isCapabilityReady = (v: CapabilityVerdict): boolean => v.status === 'ready';

// ── Template-less carve-out (PK ruling 2026-07-29, "Option A") ────────────────
// A format whose registry row says render_engine='none' needs no visual template, so
// public.select_template legitimately fail-closes 'format_unmapped' for it, and because
// such posts DO publish, the classifier's precedence-first silent-degrade overlay reports
// unsupported_silent_degrade. That is a classifier-COVERAGE artefact, not a capability
// gap — without this carve-out the gate would stop ALL plain-text posting.
//
// The exempt set is NEVER hardcoded here: it is read from the registry through
// public.is_capability_exempt_format(text), the same accessor Layer 1 uses, so the two
// layers cannot drift from each other or from the registry. Audit it with one query:
//   SELECT ice_format_key FROM t."5.3_content_format" WHERE render_engine='none';
// (An RPC is required rather than a direct read because schema `t` grants USAGE to
// postgres/inspector_ro/retool_ui only — service_role cannot read it.)
//
// FAIL-CLOSED: any error, throw, or non-true payload => NOT exempt => stays gated.
// An exemption that cannot be proven is never granted. Not cached — this runs only on
// the already-rare non-ready path, so a stale exemption is not worth the risk.
export async function isCapabilityExemptFormat(
  supabase: ReturnType<typeof getServiceClient>,
  format: string | null,
): Promise<boolean> {
  if (!format) return false;
  try {
    const { data, error } = await supabase.rpc('is_capability_exempt_format', { p_format: format });
    if (error) {
      console.error('[ai-worker] is_capability_exempt_format error (treated as NOT exempt)', { code: error.code, message: error.message });
      return false;
    }
    return data === true;
  } catch (e) {
    console.error('[ai-worker] is_capability_exempt_format threw (treated as NOT exempt)', { message: e instanceof Error ? e.message : String(e) });
    return false;
  }
}

// The single block decision, shared by the main and evergreen paths.
// Evaluated in this order deliberately: ready short-circuits FIRST, so the common path
// pays no extra round-trip and stays byte-unchanged; and the exemption is checked against
// exactly the format string that was classified, so the two cannot diverge.
//
// SCOPED TO THE STATUS CLASS THE RULING ADDRESSES (db-rls-auditor SF-1). The carve-out
// exists because a template-less format makes select_template fail closed spuriously —
// and that artefact surfaces ONLY as template_missing / unsupported_silent_degrade. A
// template-less format can still have a GENUINE capability gap (publisher_path_missing,
// governance_unproven, asset_shortage, pipeline_missing) and those must still block.
// Note the enumeration sits on the EXEMPTION (narrowing) side, never on the block side:
// any status not listed — including a future 8th — is NOT exempt and therefore still
// blocks. Fail-closed by construction, the same property the generic block test has.
export const CARVE_OUT_ELIGIBLE_STATUSES: ReadonlySet<string> = new Set([
  'template_missing',
  'unsupported_silent_degrade',
]);

export async function shouldBlockOnCapability(
  supabase: ReturnType<typeof getServiceClient>,
  v: CapabilityVerdict,
  format: string | null,
): Promise<boolean> {
  if (isCapabilityReady(v)) return false;
  if (!CARVE_OUT_ELIGIBLE_STATUSES.has(v.status)) return true;   // genuine gap -> always blocks
  if (await isCapabilityExemptFormat(supabase, format)) {
    console.log(`[ai-worker] ${S9_CAPABILITY_MARKER} EXEMPT (template-less, render_engine=none) format=${format} classifier_status=${v.status} — proceeding unblocked`);
    return false;
  }
  return true;
}

// The canonical blocked-state write (PK ruling 3 — existing format-authority columns ONLY,
// zero new schema). Deliberate omissions are as load-bearing as the fields present:
//   * recommended_format -> null. NEVER a substitute value ('text' or otherwise). Every
//     renderer and queue-population path keys off an exact recommended_format value
//     (heygen-worker .eq('recommended_format','video_short_avatar'), video-worker IN (...)),
//     so null matches none of them and the draft is unreachable downstream.
//   * requested_format   -> preserved unconditionally: what was actually asked for.
//   * approval_status    -> NOT WRITTEN. The skeleton row is still 'draft', so
//     m.auto_approver_fetch_drafts (WHERE approval_status='needs_review') cannot see it.
//     Writing 'needs_review' here would hand a blocked draft straight to the auto-approver.
//   * video_status / any publish-failure status -> NOT WRITTEN. Capability blocking is not
//     a render failure and not an approval decision (PK ruling 3 forbids conflating them).
//   * draft_title / draft_body -> NOT WRITTEN: no generation ran.
export function buildBlockedDraftUpdate(
  v: CapabilityVerdict,
  opts: { requestedFormat: string | null; advisorFormat: string | null; formatMode: string | null; blockedFormat: string | null; at: string },
): Record<string, unknown> {
  return {
    recommended_format: null,
    recommended_reason: null,
    advisor_format: opts.advisorFormat,
    requested_format: opts.requestedFormat,
    format_mode: opts.formatMode,
    shadow_resolved_format: null,
    final_format_authority: 'blocked_by_capability',
    final_format_reason: `${v.status}:${v.reason_code ?? 'none'}`,
    format_resolved_at: opts.at,
    resolver_evidence: {
      gate: 's9_layer2',
      marker: S9_CAPABILITY_MARKER,
      blocked_format: opts.blockedFormat,
      capability_status: v.status,
      capability_reason_code: v.reason_code,
      capability_routed_lane: v.routed_lane,
      capability_error: v.error,
      capability: v.evidence,
    },
    updated_at: opts.at,
  };
}

function trimSeedPayload(raw: any, jobType: string): any {
  if (!raw || typeof raw !== 'object') return raw;
  const lean = { ...raw };

  if (jobType === 'rewrite_v1' && lean.digest_item && typeof lean.digest_item === 'object') {
    const di = { ...lean.digest_item };
    if (typeof di.body_excerpt === 'string' && di.body_excerpt.trim().length > 0) {
      di.body_text = di.body_excerpt;
    } else if (typeof di.body_text === 'string' && di.body_text.length > 3000) {
      di.body_text = di.body_text.slice(0, 3000);
    }
    delete di.body_excerpt;
    delete di.raw_html;
    delete di.full_content;
    lean.digest_item = di;
  } else if (jobType === 'synth_bundle_v1' && Array.isArray(lean.items)) {
    lean.items = lean.items.map((it: any) => {
      if (!it || typeof it !== 'object') return it;
      const trimmed = { ...it };
      if (typeof trimmed.body_excerpt === 'string' && trimmed.body_excerpt.trim().length > 0) {
        trimmed.body_text = trimmed.body_excerpt;
      } else if (typeof trimmed.body_text === 'string' && trimmed.body_text.length > 2000) {
        trimmed.body_text = trimmed.body_text.slice(0, 2000);
      }
      delete trimmed.body_excerpt;
      delete trimmed.raw_html;
      delete trimmed.full_content;
      return trimmed;
    });
  }
  return lean;
}

// WS-5 P1 — grep-able marker string for the deployed bundle (bundles-from-CWD guard).
export const WS5_STAT_ENVELOPE_MARKER = 'ai-worker-ws5-stat-envelope-enforcement';

async function generateVideoScript(opts: {
  anthropicKey: string;
  formatKey: string;
  postTitle: string;
  postBody: string;
  clientName: string;
  vertical: string;
  // WS-5 P1 (D-1): the persisted per-template envelope for the stat formats, loaded by the
  // caller BEFORE generation. Optional so every non-stat call site is byte-compatible; the
  // stat branch falls back to the vendored char bounds when absent (validation, never a clamp).
  statEnvelope?: StatEnvelope;
}): Promise<object | null> {
  const { anthropicKey, formatKey, postTitle, postBody, clientName, vertical } = opts;

  if (formatKey === 'video_short_kinetic' || formatKey === 'video_short_kinetic_voice') {
    const systemPrompt = `You are a YouTube Shorts script writer for ${clientName}, a ${vertical} sector social media presence.\n\nYour task: take a social media post and convert it into a tight kinetic text video script.\n\nRules:\n- Produce exactly 3-5 scenes: one hook (first), one to three point scenes (middle), one cta (last)\n- hook: headline max 60 chars, no body, duration_s 5-7\n- point: headline max 55 chars, body max 100 chars (one supporting line), duration_s 6-9\n- cta: headline max 65 chars (engagement question), no body, duration_s 4-6\n- Total video: 25-40 seconds\n- narration_text: natural spoken version of all scenes in sequence (~60-80 words)\n- Headlines must be punchy standalone statements — someone reading them in 1 second must get the point\n- Body text provides the single most credible supporting fact or stat\n\nReturn ONLY valid JSON:\n{\n  \"format\": \"kinetic_text\",\n  \"scenes\": [\n    {\"type\": \"hook\", \"headline\": string, \"body\": null, \"duration_s\": number},\n    {\"type\": \"point\", \"headline\": string, \"body\": string, \"duration_s\": number},\n    {\"type\": \"cta\", \"headline\": string, \"body\": null, \"duration_s\": number}\n  ],\n  \"total_duration_s\": number,\n  \"narration_text\": string\n}`;
    const userPrompt = `Post title: ${postTitle || '(none)'}\n\nPost body:\n${postBody.slice(0, 1000)}\n\nGenerate the video script.`;
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 700, temperature: 0.25, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
    });
    if (!resp.ok) { console.error('[ai-worker] video_script_kinetic http', resp.status); return null; }
    const data = await resp.json();
    const raw = data?.content?.[0]?.text ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed?.scenes) || parsed.scenes.length < 3) return null;
      const total = parsed.scenes.reduce((s: number, sc: any) => s + Number(sc.duration_s ?? 7), 0);
      parsed.total_duration_s = total;
      return parsed;
    } catch { console.error('[ai-worker] video_script_kinetic parse failed'); return null; }
  }

  if (formatKey === 'video_short_stat' || formatKey === 'video_short_stat_voice') {
    // WS-5 P1 (v2.26.0, PK ruling D-1 Option B): the prompt states the ACTUAL envelope limits,
    // the parsed output is VALIDATED against them (never clamped), one bounded re-prompt is
    // allowed, and a second violation returns the fail-closed sentinel (the caller marks the
    // draft dead). The v2.22.0 clampField() calls are REMOVED from this branch — no silent
    // truncation, no persistence of out-of-envelope content.
    const envelope = opts.statEnvelope ?? buildFallbackStatEnvelope('envelope_not_provided');
    const lim = envelope.limits;
    const systemPrompt = `You are extracting data for an animated social media video for ${clientName}.\n\nIdentify the single most compelling numeric stat and build a 20-second video spec.\n\nRules:\n- stat_value: the number formatted for screen, ${describeFieldLimit(lim.stat_value)} (e.g. \"$62.17/hr\", \"4.35%\", \"+3.7%\"). Include unit/symbol.\n- stat_label: what the number IS, ${describeFieldLimit(lim.stat_label)}.\n- context_line: one sentence making the stat meaningful, ${describeFieldLimit(lim.context_line)}.\n- cta_text: one engagement question, ${describeFieldLimit(lim.cta_text)}.\n- narration_text: spoken 20-second script (~45-55 words).\n\nReturn ONLY valid JSON:\n{\n  \"format\": \"stat_reveal\",\n  \"stat_value\": string,\n  \"stat_label\": string,\n  \"context_line\": string,\n  \"cta_text\": string,\n  \"total_duration_s\": 20,\n  \"narration_text\": string\n}`;
    const userPrompt = `Post title: ${postTitle || '(none)'}\n\nPost body:\n${postBody.slice(0, 600)}\n\nExtract the video stat spec.`;

    // One model call: fetch → parse → minimal shape check. Same request shape/model/params as
    // v2.25.0; an http/parse/shape miss returns null (the existing non-fatal behaviour).
    const callStatModel = async (userText: string): Promise<any | null> => {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, temperature: 0.1, system: systemPrompt, messages: [{ role: 'user', content: userText }] }),
      });
      if (!resp.ok) { console.error('[ai-worker] video_script_stat http', resp.status); return null; }
      const data = await resp.json();
      const raw = data?.content?.[0]?.text ?? '';
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      try {
        const parsed = JSON.parse(cleaned);
        if (!parsed?.stat_value) return null;
        return parsed;
      } catch { console.error('[ai-worker] video_script_stat parse failed'); return null; }
    };

    const attempts: StatBoundsAttempt[] = [];

    // Attempt 1.
    const first = await callStatModel(userPrompt);
    if (!first) return null;   // infra/parse miss — unchanged legacy non-fatal behaviour
    const v1 = validateStatScriptAgainstEnvelope(first, envelope);
    attempts.push({ attempt: 1, fields: snapshotStatFields(first), violations: v1, at: nowIso() });
    if (decideStatBoundsNextStep(1, v1.length) === 'accept') {
      first.total_duration_s = 20;
      first.stat_bounds_qa = buildStatBoundsQa(envelope, attempts, 'accepted_first_attempt');
      return first;
    }

    // Exactly ONE bounded re-prompt: same system prompt, user prompt + appended bounds
    // reminder naming each violated field with actual vs limit (D-1).
    console.log(`[ai-worker] ${WS5_STAT_ENVELOPE_MARKER} attempt 1 violated bounds (${envelope.source}) — one bounded re-prompt:`, JSON.stringify(v1));
    const second = await callStatModel(`${userPrompt}\n\n${buildEnvelopeBoundReminder(v1)}`);
    if (!second) {
      // Re-prompt infra/parse miss: attempt-1 content is KNOWN out-of-envelope so it is never
      // persisted (D-1); mirror the existing non-fatal generation-failure handling (no
      // video_script written) rather than killing the draft on an infra blip.
      console.error(`[ai-worker] ${WS5_STAT_ENVELOPE_MARKER} re-prompt call failed after attempt-1 violations — no video_script written`);
      return null;
    }
    const v2 = validateStatScriptAgainstEnvelope(second, envelope);
    attempts.push({ attempt: 2, fields: snapshotStatFields(second), violations: v2, at: nowIso() });
    if (decideStatBoundsNextStep(2, v2.length) === 'accept') {
      second.total_duration_s = 20;
      second.stat_bounds_qa = buildStatBoundsQa(envelope, attempts, 'accepted_after_reprompt');
      return second;
    }

    // Second violation → FAIL CLOSED (D-1). The sentinel carries BOTH attempts as QA
    // evidence; the caller marks the draft dead and never calls set_draft_video_script.
    return { stat_bounds_fail_closed: true, stat_bounds_qa: buildStatBoundsQa(envelope, attempts, 'fail_closed') };
  }

  if (formatKey === 'video_short_avatar') {
    // F-HEYGEN Option A (A3) — talking-head avatar narration for HeyGen render.
    const systemPrompt = `You are a script writer for a short talking-head avatar video for ${clientName}, a ${vertical} sector presence.\n\nConvert a social media post into a natural, first-person spoken narration for a realistic AI presenter (e.g. a HeyGen talking photo).\n\nRules:\n- narration_text: the exact words to be spoken, first person, conversational. 55-90 words (~25-40s at normal pace). One hook sentence, 1-2 value points, one engagement close.\n- No stage directions, scene labels, markdown, emojis, or hashtags — only the spoken words.\n- total_duration_s: estimated spoken length in seconds (integer, 20-45).\n\nReturn ONLY valid JSON:\n{\n  \"format\": \"avatar\",\n  \"narration_text\": string,\n  \"render_style\": \"realistic\",\n  \"total_duration_s\": number\n}`;
    const userPrompt = `Post title: ${postTitle || '(none)'}\n\nPost body:\n${postBody.slice(0, 1000)}\n\nGenerate the avatar narration script.`;
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 500, temperature: 0.3, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
    });
    if (!resp.ok) { console.error('[ai-worker] video_script_avatar http', resp.status); return null; }
    const data = await resp.json();
    const raw = data?.content?.[0]?.text ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (!parsed?.narration_text || String(parsed.narration_text).trim().length === 0) return null;
      parsed.format = 'avatar';
      parsed.render_style = 'realistic';
      parsed.total_duration_s = Number(parsed.total_duration_s) || 30;
      return parsed;
    } catch { console.error('[ai-worker] video_script_avatar parse failed'); return null; }
  }

  return null;
}

// WS-5 P1 (v2.26.0, D-1) — the fail-closed dead-draft write for a stat draft whose generated
// content violated the envelope on BOTH attempts. Mirrors the EXISTING house dead-draft
// pattern (pipeline-fixer's render_attempts_exhausted idiom on m.post_draft: dead_reason
// COLUMN + terminal medium-status + updated_at; approval_status untouched):
//   video_status = 'failed'  → public.claim_pending_video_drafts only claims 'pending', so the
//                              draft is unreachable by the render path;
//   dead_reason  = 'stat_bounds_violation_after_bounded_reprompt' (the D-1 named reason).
// QA evidence goes into draft_format ADDITIVELY via READ-MERGE-WRITE (the v2.24.1 clobber
// lesson: a plain .update() REPLACES the whole draft_format column) — deliberately NOT under
// video_script, so a dead draft never looks like it has a renderable script. If the read
// misses, the caller-supplied draftMeta (the value baseUpdate just wrote) is the merge base.
// BEST-EFFORT: never throws into the job loop (mirrors persistDialogueDraft's posture).
async function markStatDraftDeadOnBounds(
  supabase: ReturnType<typeof getServiceClient>,
  postDraftId: string,
  draftMetaFallback: Record<string, unknown> | null | undefined,
  qa: StatBoundsQa,
): Promise<boolean> {
  try {
    let current: Record<string, unknown> | null = null;
    try {
      const { data, error } = await supabase.schema('m').from('post_draft')
        .select('draft_format').eq('post_draft_id', postDraftId).maybeSingle();
      if (error) console.error('[ai-worker] markStatDraftDeadOnBounds read error:', error.message);
      const df = (data as any)?.draft_format;
      if (df && typeof df === 'object' && !Array.isArray(df)) current = df;
    } catch (re: any) { console.error('[ai-worker] markStatDraftDeadOnBounds read threw:', re?.message); }
    const base = current
      ?? ((draftMetaFallback && typeof draftMetaFallback === 'object') ? draftMetaFallback : {});
    const { error: updErr } = await supabase.schema('m').from('post_draft').update({
      draft_format: { ...base, stat_bounds_qa: qa },
      video_status: 'failed',
      dead_reason: STAT_BOUNDS_DEAD_REASON,
      updated_at: nowIso(),
    }).eq('post_draft_id', postDraftId);
    if (updErr) { console.error('[ai-worker] markStatDraftDeadOnBounds update error:', updErr.message); return false; }
    console.log(`[ai-worker] ${WS5_STAT_ENVELOPE_MARKER} draft ${postDraftId} FAILED CLOSED dead_reason=${STAT_BOUNDS_DEAD_REASON} (envelope=${qa.envelope.source})`);
    return true;
  } catch (e: any) {
    console.error('[ai-worker] markStatDraftDeadOnBounds threw:', e?.message);
    return false;
  }
}

// v2.15.0 — F-SERIES-AVATAR-DIFFERENTIATION Stage 1 (shadow, observability-only).
// Map an episode persona to ONE of the brand's ACTIVE stakeholder role_codes and return
// a SUGGESTION object. The caller stores it under video_script.avatar_role_suggestion —
// a field heygen-worker does NOT read for avatar selection. This function itself NEVER
// writes stakeholder_role. Best-effort: returns a null-role object on any miss and NEVER
// throws, so it cannot affect the draft or render. No schema change.
// v2.23.0 — cc-0083 Slice B: the CALLER now ALSO conditionally promotes this suggestion into
// the consumed field video_script.stakeholder_role — only when suggested_stakeholder_role is a
// non-empty single role_code AND suggested_stakeholder_role_confidence >= AVATAR_ROLE_MIN_CONFIDENCE.
// The promotion lives at the call site (not here); this helper's shape/contract is unchanged.
async function suggestAvatarRole(
  supabase: ReturnType<typeof getServiceClient>,
  anthropicKey: string,
  opts: { clientId: string; slotId: string | null },
): Promise<Record<string, unknown>> {
  const at = nowIso();
  const base = { shadow: true, stage: 1, feature: 'F-SERIES-AVATAR-DIFFERENTIATION', at };
  try {
    const { data: roleRows } = await supabase.rpc('exec_sql', {
      query: `SELECT role_code, role_label, COALESCE(demographic_hint, '') AS demographic_hint
              FROM c.brand_stakeholder
              WHERE client_id = '${opts.clientId}' AND is_active = true
              ORDER BY sort_order ASC, role_code ASC`,
    });
    const roles = (roleRows ?? []) as Array<{ role_code: string; role_label: string; demographic_hint: string }>;
    if (!roles.length) {
      return { ...base, suggested_stakeholder_role: null, suggested_stakeholder_role_confidence: 0,
        suggested_stakeholder_role_reason: 'no_active_brand_roles', role_source: 'none',
        persona_signal: null, candidate_roles: [], model: null };
    }
    let personaLabel: string | null = null, avatarPreference: string | null = null, personaNotes: string | null = null;
    if (opts.slotId) {
      const { data: personaRows } = await supabase.rpc('exec_sql', {
        query: `SELECT ci.source_material->'persona'->>'persona_label'     AS persona_label,
                       ci.source_material->'persona'->>'avatar_preference' AS avatar_preference,
                       ci.source_material->'persona'->>'persona_notes'     AS persona_notes
                FROM m.slot s
                JOIN m.creative_intent ci ON ci.intent_id = s.intent_id
                WHERE s.slot_id = '${opts.slotId}'
                LIMIT 1`,
      });
      const p = ((personaRows ?? []) as any[])[0] ?? {};
      personaLabel = p.persona_label ?? null;
      avatarPreference = p.avatar_preference ?? null;
      personaNotes = p.persona_notes ?? null;
    }
    if (!personaLabel && !avatarPreference && !personaNotes) {
      return { ...base, suggested_stakeholder_role: null, suggested_stakeholder_role_confidence: 0,
        suggested_stakeholder_role_reason: 'no_persona_available', role_source: 'none',
        persona_signal: null, candidate_roles: roles.map(r => r.role_code), model: null };
    }
    const roleList = roles.map(r => `- ${r.role_code} (${r.role_label})${r.demographic_hint ? ` — ${r.demographic_hint}` : ''}`).join('\n');
    const validRoleCodes = roles.map(r => r.role_code);
    const sgModel = 'claude-sonnet-4-6';
    const systemPrompt = `You choose the single best PRESENTER role for a short talking-head video, mapping a content persona to one role from a FIXED list.\n\nAllowed role_codes (choose exactly one, or null if none is a reasonable presenter):\n${roleList}\n\nGuidance:\n- "avatar_preference" describes the PRESENTER who delivers the video — weight it most heavily.\n- "persona_label" often describes the AUDIENCE/subject; use it as secondary context. If the presenter is meant to embody that subject at peer level (first-person lived experience), map to the matching role; otherwise prefer the role the avatar_preference describes.\n- "persona_notes" gives tone/nuance only.\n- If the persona is composite or multi-role, pick the single most appropriate PRIMARY presenter.\n- role_code MUST be exactly one of the allowed codes, or null. Never invent a code.\n\nReturn ONLY valid JSON: {"role_code": string|null, "confidence": number (0.0-1.0), "reason": string (max 25 words)}`;
    const userPrompt = `persona_label: ${personaLabel ?? '(none)'}\navatar_preference: ${avatarPreference ?? '(none)'}\npersona_notes: ${personaNotes ?? '(none)'}\n\nChoose the presenter role_code.`;
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: sgModel, max_tokens: 200, temperature: 0.0, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
    });
    const personaSignal = { persona_label: personaLabel, avatar_preference: avatarPreference, persona_notes: personaNotes };
    if (!resp.ok) {
      return { ...base, suggested_stakeholder_role: null, suggested_stakeholder_role_confidence: 0,
        suggested_stakeholder_role_reason: `suggest_http_${resp.status}`, role_source: 'llm_error',
        persona_signal: personaSignal, candidate_roles: validRoleCodes, model: sgModel };
    }
    const data = await resp.json();
    const raw = data?.content?.[0]?.text ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    let parsed: any = null;
    try { parsed = JSON.parse(cleaned); } catch { parsed = null; }
    const rawRole = parsed && typeof parsed.role_code === 'string' ? parsed.role_code.trim() : null;
    const role = rawRole && validRoleCodes.includes(rawRole) ? rawRole : null;
    let conf = Number(parsed?.confidence);
    if (!Number.isFinite(conf)) conf = 0;
    conf = Math.max(0, Math.min(1, conf));
    const reason = role
      ? String(parsed?.reason ?? '').slice(0, 240)
      : (rawRole ? `rejected_out_of_set:${String(rawRole).slice(0, 40)}` : (parsed ? 'no_confident_role' : 'suggest_parse_failed'));
    return {
      ...base,
      suggested_stakeholder_role: role,
      suggested_stakeholder_role_confidence: role ? conf : 0,
      suggested_stakeholder_role_reason: reason,
      role_source: 'llm',
      persona_signal: personaSignal,
      candidate_roles: validRoleCodes,
      model: sgModel,
    };
  } catch (e: any) {
    // Best-effort: NEVER throw into the draft/render lifecycle.
    return { ...base, suggested_stakeholder_role: null, suggested_stakeholder_role_confidence: 0,
      suggested_stakeholder_role_reason: `suggest_error: ${(e?.message ?? String(e)).slice(0, 200)}`,
      role_source: 'error', persona_signal: null, candidate_roles: [], model: null };
  }
}

// cc-0084 Slice 2 — generate the multi-character dialogue script that heygen-worker v2.6.0 renders.
// Given a brief + the SLICE-2 participating roles (input_payload.dialogue_roles), validated against the
// client's ACTIVE c.brand_stakeholder role_code set (SAME query suggestAvatarRole uses), it produces an
// ordered, alternating conversation as { speaker_role, line } turns — the EXACT keys heygen-worker reads.
// Returns { format:'avatar_dialogue', dialogue, render_style:'realistic', total_duration_s } on success,
// or null to signal FALLBACK (the caller then degrades to the monologue avatar path). Hard validation via
// the pure helpers: drop/repair any turn whose role ∉ participating valid set; require >= 2 distinct roles
// AND >= 2 turns. Best-effort — NEVER throws into the draft/render lifecycle (mirrors suggestAvatarRole).
async function generateDialogueScript(opts: {
  supabase: ReturnType<typeof getServiceClient>;
  anthropicKey: string;
  clientId: string;
  brief: string;
  dialogueRoles: unknown;
  clientName: string;
  vertical: string;
}): Promise<
  | { format: 'avatar_dialogue'; dialogue: Array<{ speaker_role: string; line: string }>; render_style: 'realistic'; total_duration_s: number }
  | null
> {
  const { supabase, anthropicKey, clientId, brief, dialogueRoles, clientName, vertical } = opts;
  try {
    // Active-role source: reuse the SAME query suggestAvatarRole uses (the client's active roles).
    const { data: roleRows } = await supabase.rpc('exec_sql', {
      query: `SELECT role_code, role_label, COALESCE(demographic_hint, '') AS demographic_hint
              FROM c.brand_stakeholder
              WHERE client_id = '${clientId}' AND is_active = true
              ORDER BY sort_order ASC, role_code ASC`,
    });
    const roles = (roleRows ?? []) as Array<{ role_code: string; role_label: string; demographic_hint: string }>;
    const activeRoleCodes = roles.map((r) => r.role_code);

    // Participating roles = the requested dialogue_roles that are ALSO active. Require >= 2 distinct.
    const participatingRoles = resolveParticipatingRoles(dialogueRoles, activeRoleCodes);
    if (participatingRoles.length < 2) {
      console.log(`[ai-worker] ${VERSION} — dialogue fallback: <2 valid participating roles (requested=${JSON.stringify(dialogueRoles)}, active=${JSON.stringify(activeRoleCodes)})`);
      return null;
    }
    const briefText = String(brief ?? '').trim();
    if (!briefText) {
      console.log(`[ai-worker] ${VERSION} — dialogue fallback: empty brief`);
      return null;
    }

    const labelByRole = new Map(roles.map((r) => [r.role_code, r.role_label]));
    const roleList = participatingRoles.map((rc) => `- ${rc} (${labelByRole.get(rc) ?? rc})`).join('\n');
    const systemPrompt = `You are a script writer for a short multi-speaker talking-head video for ${clientName}, a ${vertical} sector presence.\n\nWrite a natural, ALTERNATING conversation between the following speakers about the brief topic. Each speaker is a realistic AI presenter (HeyGen talking photo) delivered as a separate cut.\n\nSpeakers (use these role_code values EXACTLY, no others):\n${roleList}\n\nRules:\n- Produce ${DIALOGUE_MAX_TURNS <= 2 ? 2 : `2-${DIALOGUE_MAX_TURNS}`} turns total, ALTERNATING between the speakers so it reads as a real conversation.\n- Each turn: one speaker's concise spoken line (first person, conversational, no stage directions, no markdown, no emojis, no hashtags) — the exact words to be spoken. Keep each line short enough for a brief talking-head clip.\n- Every role_code MUST be exactly one of the allowed codes above. Use at least two DISTINCT speakers.\n- Order the turns as the conversation flows.\n\nReturn ONLY valid JSON:\n{\n  \"dialogue\": [\n    {\"role_code\": string, \"line\": string}\n  ]\n}`;
    const userPrompt = `Brief:\n${briefText.slice(0, 1200)}\n\nWrite the alternating dialogue.`;
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 700, temperature: 0.3, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
    });
    if (!resp.ok) { console.error('[ai-worker] video_script_dialogue http', resp.status); return null; }
    const data = await resp.json();
    const raw = data?.content?.[0]?.text ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    let parsed: any = null;
    try { parsed = JSON.parse(cleaned); } catch { console.error('[ai-worker] video_script_dialogue parse failed'); return null; }

    // HARD validation / repair — drop out-of-set roles, empty lines; cap turns + line length.
    const dialogue = normalizeDialogueTurns(parsed?.dialogue, participatingRoles, { maxTurns: DIALOGUE_MAX_TURNS, maxLineChars: DIALOGUE_LINE_MAX_CHARS });
    if (!dialogueIsRenderable(dialogue)) {
      console.log(`[ai-worker] ${VERSION} — dialogue fallback: not renderable after validation (turns=${dialogue.length})`);
      return null;
    }
    return { format: 'avatar_dialogue', dialogue, render_style: 'realistic', total_duration_s: estimateDialogueDurationS(dialogue) };
  } catch (e: any) {
    // Best-effort: NEVER throw into the draft/render lifecycle → caller degrades to monologue.
    console.error('[ai-worker] generateDialogueScript error (non-fatal):', (e?.message ?? String(e)).slice(0, 200));
    return null;
  }
}

// cc-0084 Slice 2 (v2.24.1) — persist a dialogue draft with the CORRECT write order. WHY ORDER MATTERS:
// a plain .update({ draft_format }) is a FULL-COLUMN REPLACE, but set_draft_video_script MERGES
// video_script into draft_format via jsonb `||`. If the plain update runs SECOND it clobbers the
// just-merged video_script (Slice 3 live: draft_format.video_script=null → heygen-worker found no
// dialogue[] → no multi-scene render). So we (1) stamp draft_format = { ...draftMeta, scene_count }
// FIRST — a safe full replace, video_script is not written yet — then (2) call set_draft_video_script
// so its merge adds video_script ON TOP → final draft_format = { ...draftMeta, scene_count, video_script }.
// Returns true ONLY when BOTH writes succeed; either failure → false so the caller degrades to the
// monologue fallback. Extracted (from the request loop) purely so the ordered writes are hermetically
// unit-testable — behaviour at the call site is unchanged.
export async function persistDialogueDraft(
  supabase: ReturnType<typeof getServiceClient>,
  postDraftId: string,
  draftMeta: Record<string, unknown>,
  dlg: { dialogue: Array<{ speaker_role: string; line: string }> } & Record<string, unknown>,
): Promise<boolean> {
  // (1) scene_count stamp FIRST (full replace is safe — video_script not yet written).
  const { error: scErr } = await supabase.schema('m').from('post_draft')
    .update({ draft_format: { ...draftMeta, scene_count: dlg.dialogue.length }, updated_at: nowIso() })
    .eq('post_draft_id', postDraftId);
  if (scErr) { console.error('[ai-worker] dialogue scene_count update error:', scErr.message); return false; }
  // (2) THEN merge video_script on top via the RPC's jsonb `||`.
  const { error: vsErr } = await supabase.rpc('set_draft_video_script', { p_post_draft_id: postDraftId, p_video_script: dlg as any });
  if (vsErr) { console.error('[ai-worker] set_draft_video_script (dialogue) error:', vsErr.message); return false; }
  return true;
}

type FormatInfo = { ice_format_key: string; format_name: string; advisor_description: string; best_for: string; min_content_signals: string; };

async function fetchFormatContext(supabase: ReturnType<typeof getServiceClient>, clientId: string, platform: string): Promise<{ formats: FormatInfo[]; perfSummary: string; preferredFormat: string | null }> {
  try {
    const { data: formatRows } = await supabase.rpc("exec_sql", {
      query: `
        SELECT f.ice_format_key, f.format_name,
          COALESCE(f.advisor_description,'') AS advisor_description,
          COALESCE(f.best_for,'') AS best_for,
          COALESCE(f.min_content_signals,'') AS min_content_signals,
          COALESCE(f.platform_support,'{}')::text AS platform_support_raw
        FROM "t"."5.3_content_format" f
        WHERE f.is_buildable = true AND f.ice_format_key IS NOT NULL
          AND (
            EXISTS (SELECT 1 FROM c.client_format_config cfc
              WHERE cfc.client_id = '${clientId}' AND cfc.ice_format_key = f.ice_format_key
                AND cfc.is_enabled = true AND (cfc.platform IS NULL OR cfc.platform = '${platform}'))
            OR NOT EXISTS (SELECT 1 FROM c.client_format_config cfc2 WHERE cfc2.client_id = '${clientId}')
          )
        ORDER BY f.sort_order ASC
      `
    });
    const allFormats: FormatInfo[] = [];
    for (const r of (formatRows ?? [])) {
      try { const s = JSON.parse(r.platform_support_raw ?? '{}'); if (s[platform] !== true) continue; } catch { }
      allFormats.push({ ice_format_key: r.ice_format_key, format_name: r.format_name, advisor_description: r.advisor_description, best_for: r.best_for, min_content_signals: r.min_content_signals });
    }
    const formats = allFormats.length > 0 ? allFormats : [{ ice_format_key: 'text', format_name: 'Text post', advisor_description: 'Plain text post.', best_for: 'General content', min_content_signals: 'Any' }];
    let perfSummary = '';
    try {
      const { data: perfRows } = await supabase.rpc('exec_sql', { query: `SELECT ice_format_key, avg_engagement_rate, post_count FROM m.post_format_performance WHERE client_id = '${clientId}' AND rolling_window_days = 30 AND post_count >= 3 ORDER BY avg_engagement_rate DESC NULLS LAST LIMIT 5` });
      const perf: any[] = perfRows ?? [];
      if (perf.length > 0) perfSummary = `\nPerformance data (last 30 days):\n${perf.map((p: any) => `  ${p.ice_format_key}: ${(Number(p.avg_engagement_rate ?? 0) * 100).toFixed(1)}% avg engagement (${p.post_count} posts)`).join('\n')}\n`;
    } catch { }
    let preferredFormat: string | null = null;
    try {
      const { data: publishProfile } = await supabase.rpc('exec_sql', {
        query: `SELECT preferred_format_facebook FROM c.client_publish_profile
                WHERE client_id = '${clientId}' AND platform = '${platform}'
                AND status = 'active' LIMIT 1`
      });
      preferredFormat = (publishProfile as any[])?.[0]?.preferred_format_facebook ?? null;
    } catch { }

    return { formats, perfSummary, preferredFormat };
  } catch (e: any) {
    console.error('[ai-worker] fetchFormatContext failed:', e?.message);
    return { formats: [{ ice_format_key: 'text', format_name: 'Text post', advisor_description: 'Plain text.', best_for: 'General', min_content_signals: 'Any' }], perfSummary: '', preferredFormat: null };
  }
}

async function callFormatAdvisor(opts: { anthropicKey: string; seedTitle: string; seedBody: string; clientName: string; vertical: string; formats: FormatInfo[]; perfSummary: string; preferredFormat?: string | null; platform: string; }): Promise<{ formatKey: string; reason: string; imageHeadline: string; durationMs: number }> {
  const { anthropicKey, seedTitle, seedBody, clientName, vertical, formats, perfSummary, preferredFormat, platform } = opts;
  const startMs = Date.now();
  const formatPalette = formats.map(f => `FORMAT: ${f.ice_format_key} (${f.format_name})\n${f.advisor_description}\nBest for: ${f.best_for}\nMinimum signals: ${f.min_content_signals}`).join('\n\n');
  const preferredFormatInstruction = preferredFormat
    ? `\n\nCLIENT FORMAT PREFERENCE:\nThis client prefers ${preferredFormat} format. When the content quality is borderline (e.g., has one reasonably interesting insight but not a definitive standout stat), bias toward ${preferredFormat} over text. Only fall back to text if the content is genuinely conversational/reactive with no visual potential whatsoever.`
    : '';
  const systemPrompt = `You are a content format advisor for ${clientName}, a ${vertical} sector social media presence.\n\nTarget platform: ${platform}. Choose only formats compatible with ${platform}.\n\nYour task: read a content seed and select the optimal format from the available palette.\n\nAVAILABLE FORMATS:\n${formatPalette}\n${perfSummary}\nDECISION RULES:\n- Choose the format that best serves the content's natural structure\n- Default to text if the content is conversational, reactive, or opinionated\n- carousel requires 3+ distinct structured points and minimum 200 words\n- image_quote requires one interesting stat, insight, or key message that works as a visual headline — it doesn't need to be a hard number, a clear declarative statement about a sector development works\n- video_short_kinetic requires 3+ distinct points expressible in 60 chars each\n- video_short_stat requires one striking numeric stat that anchors the story\n- Never choose a visual format to add interest if the content doesn't support it${preferredFormatInstruction}\n\nFIELD RULES:\n- image_headline should be ≤ ~60 characters — a single strong pull-quote line.\n\nReturn ONLY valid JSON: {\"format_key\": string, \"reason\": string, \"image_headline\": string}`;
  const userPrompt = `Content seed:\nTitle: ${seedTitle || '(no title)'}\nBody preview: ${seedBody.slice(0, 600)}${seedBody.length > 600 ? '...' : ''}\n\nSelect the optimal format.`;
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, temperature: 0.2, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
  });
  if (!resp.ok) throw new Error(`format_advisor_http_${resp.status}`);
  const data = await resp.json();
  const raw = data?.content?.[0]?.text ?? '';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  let parsed: any;
  try { parsed = JSON.parse(cleaned); } catch { throw new Error(`format_advisor_bad_json: ${cleaned.slice(0, 200)}`); }
  const validKeys = formats.map(f => f.ice_format_key);
  const formatKey = validKeys.includes(parsed?.format_key ?? '') ? parsed.format_key : 'text';
  return { formatKey, reason: String(parsed?.reason ?? '').trim(), imageHeadline: String(parsed?.image_headline ?? '').trim(), durationMs: Date.now() - startMs };
}

async function writeVisualSpec(supabase: ReturnType<typeof getServiceClient>, postDraftId: string, formatKey: string, reason: string, imageHeadline: string, durationMs: number): Promise<void> {
  try {
    const { error } = await supabase.rpc('write_visual_spec', { p_post_draft_id: postDraftId, p_ice_format_key: formatKey, p_advisor_model: 'claude-sonnet-4-6', p_advisor_prompt_key: FORMAT_ADVISOR_PROMPT_KEY, p_spec: { format_key: formatKey, reason, image_headline: imageHeadline }, p_generation_ms: durationMs });
    if (error) console.error('[ai-worker] writeVisualSpec RPC error:', error.message);
  } catch (e: any) { console.error('[ai-worker] writeVisualSpec threw:', e?.message); }
}

async function fetchComplianceBlock(
  supabase: ReturnType<typeof getServiceClient>,
  clientId: string
): Promise<string> {
  try {
    const { data: scopeRows } = await supabase.rpc('exec_sql', {
      query: `
        SELECT DISTINCT cv.vertical_slug
        FROM c.client_content_scope ccs
        JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id
        WHERE ccs.client_id = '${clientId}'
          AND cv.is_active = true
          AND cv.vertical_slug IS NOT NULL
      `
    });
    const slugs: string[] = (scopeRows ?? []).map((r: any) => r.vertical_slug).filter(Boolean);
    if (!slugs.length) return '';

    const { data: clientRow } = await supabase.rpc('exec_sql', {
      query: `SELECT profession_slug FROM c.client WHERE client_id = '${clientId}'`
    });
    const professionSlug: string | null = (clientRow as any[])?.[0]?.profession_slug ?? null;

    const slugList = slugs.map(s => `'${s}'`).join(',');
    const professionFilter = professionSlug
      ? `OR '${professionSlug}' = ANY(profession_slugs)`
      : '';

    const { data: ruleRows } = await supabase.rpc('exec_sql', {
      query: `
        SELECT DISTINCT ON (rule_key)
          rule_name, rule_text, risk_level, enforcement, examples_good, examples_bad, sort_order
        FROM t."5.7_compliance_rule"
        WHERE is_active = true
          AND (
            (
              vertical_slug IN (${slugList})
              AND (profession_slugs IS NULL ${professionFilter})
            )
            OR vertical_slug IS NULL
          )
        ORDER BY rule_key, sort_order ASC
      `
    });

    const rules: any[] = ruleRows ?? [];
    if (!rules.length) return '';

    const lines: string[] = [
      '=== COMPLIANCE REQUIREMENTS ===',
      'HARD_BLOCK: if violated, return {\"skip\": true, \"reason\": \"compliance_block: [rule_name]\"}.',
      'SOFT_WARN: apply best judgment.',
      '',
    ];
    for (const rule of rules) {
      lines.push(`RULE: ${rule.rule_name} [${rule.risk_level.toUpperCase()} \u2014 ${rule.enforcement}]`);
      lines.push(rule.rule_text);
      if (rule.examples_bad && !rule.examples_bad.startsWith('TBD'))
        lines.push(`  PROHIBITED: ${rule.examples_bad}`);
      if (rule.examples_good && !rule.examples_good.startsWith('TBD'))
        lines.push(`  PREFERRED: ${rule.examples_good}`);
      lines.push('');
    }
    if (professionSlug) {
      lines.push(`[Rules loaded for vertical(s): ${slugs.join(', ')} | profession: ${professionSlug}]`);
    }
    lines.push('=== END COMPLIANCE ===', '');
    return lines.join('\n');

  } catch (e: any) {
    console.error('[ai-worker] fetchComplianceBlock failed:', e?.message);
    return '';
  }
}

async function calculateCostUsd(supabase: ReturnType<typeof getServiceClient>, provider: string, model: string, inputTokens: number, outputTokens: number): Promise<number> {
  try {
    const { data } = await supabase.schema('m').from('ai_model_rate').select('rate_input_per_1m, rate_output_per_1m').eq('provider', provider).eq('model', model).is('effective_until', null).limit(1).maybeSingle();
    if (!data) return 0;
    return Math.round(((inputTokens / 1_000_000) * Number(data.rate_input_per_1m) + (outputTokens / 1_000_000) * Number(data.rate_output_per_1m)) * 1_000_000) / 1_000_000;
  } catch { return 0; }
}

async function writeUsageLog(supabase: ReturnType<typeof getServiceClient>, opts: { clientId: string; aiJobId?: string | null; postDraftId?: string | null; provider: string; model: string; contentType: string; platform: string; inputTokens: number; outputTokens: number; costUsd: number; fallbackUsed: boolean; errorCall: boolean; }): Promise<void> {
  try {
    const { error: usageErr } = await supabase.schema('m').from('ai_usage_log').insert({ client_id: opts.clientId, ai_job_id: opts.aiJobId ?? null, post_draft_id: opts.postDraftId ?? null, provider: opts.provider, model: opts.model, content_type: opts.contentType, platform: opts.platform, input_tokens: opts.inputTokens, output_tokens: opts.outputTokens, cost_usd: opts.costUsd, fallback_used: opts.fallbackUsed, error_call: opts.errorCall });
    if (usageErr) console.error('[ai_usage_log] write failed:', usageErr.message);
  } catch (e) { console.error('[ai_usage_log] write failed:', e); }
}

async function callClaude(opts: { apiKey: string; model: string; systemPrompt: string; systemBlocks?: SystemBlock[]; userPrompt: string; temperature: number; maxOutputTokens: number; }) {
  const { apiKey, model, systemPrompt, systemBlocks, userPrompt, temperature, maxOutputTokens } = opts;
  const systemPayload: any = (systemBlocks && systemBlocks.length > 0) ? systemBlocks : systemPrompt;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: maxOutputTokens, temperature, system: systemPayload, messages: [{ role: 'user', content: userPrompt }] }),
      signal: controller.signal,
    });
    const text = await resp.text();
    if (!resp.ok) throw new Error(`anthropic_http_${resp.status}: ${text.slice(0, 1200)}`);
    const outer = safeParseJson<any>(text);
    if (!outer.ok) throw new Error(`anthropic_bad_json: ${outer.error}`);
    const content = outer.value?.content?.[0]?.text;
    if (!content) throw new Error('anthropic_empty_content');
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = safeParseJson<any>(cleaned);
    if (!parsed.ok) throw new AiParseError(`anthropic_non_json: ${parsed.error} | raw: ${cleaned.slice(0, 400)}`, cleaned);
    // v2.11.1 — F-AI-WORKER-PARSER-SKIP-BUG FIX
    // Check skip flag BEFORE checking title/body. The model may legitimately
    // return {skip: true, reason: "compliance_block: ..."} per the system
    // prompt's instructions.
    if (parsed.value?.skip !== true && (!parsed.value?.title || !parsed.value?.body)) {
      throw new AiParseError('anthropic_missing_title_or_body', cleaned);
    }
    const usage = outer.value?.usage ?? {};
    return {
      title: parsed.value?.skip === true ? '' : String(parsed.value.title).trim(),
      body:  parsed.value?.skip === true ? '' : String(parsed.value.body).trim(),
      imageHeadline: String(parsed.value.image_headline ?? '').trim(),
      meta: parsed.value.meta ?? {},
      skip: parsed.value.skip === true,
      skipReason: parsed.value.reason ?? '',
      inputTokens: Number(usage.input_tokens ?? 0),
      outputTokens: Number(usage.output_tokens ?? 0),
      cacheCreationInputTokens: Number(usage.cache_creation_input_tokens ?? 0),
      cacheReadInputTokens: Number(usage.cache_read_input_tokens ?? 0),
    };
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error(`anthropic_fetch_timeout_${LLM_FETCH_TIMEOUT_MS}ms`);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callOpenAI(opts: { apiKey: string; model: string; systemPrompt: string; userPrompt: string; temperature: number; maxOutputTokens: number; }) {
  const { apiKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens } = opts;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature, max_tokens: maxOutputTokens, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }] }),
      signal: controller.signal,
    });
    const text = await resp.text();
    if (!resp.ok) throw new Error(`openai_http_${resp.status}: ${text.slice(0, 1200)}`);
    const outer = safeParseJson<any>(text);
    if (!outer.ok) throw new Error(`openai_bad_json_outer: ${outer.error}`);
    const content = outer.value?.choices?.[0]?.message?.content;
    if (!content) throw new Error('openai_empty_content');
    const parsed = safeParseJson<any>(content);
    if (!parsed.ok) throw new AiParseError(`openai_non_json: ${parsed.error}`, content);
    // v2.11.1 — F-AI-WORKER-PARSER-SKIP-BUG FIX (mirror of callClaude)
    if (parsed.value?.skip !== true && (!parsed.value?.title || !parsed.value?.body)) {
      throw new AiParseError('openai_missing_title_or_body', content);
    }
    const usage = outer.value?.usage ?? {};
    return {
      title: parsed.value?.skip === true ? '' : String(parsed.value.title).trim(),
      body:  parsed.value?.skip === true ? '' : String(parsed.value.body).trim(),
      imageHeadline: String(parsed.value.image_headline ?? '').trim(),
      meta: parsed.value.meta ?? {},
      skip: parsed.value.skip === true,
      skipReason: parsed.value.reason ?? '',
      inputTokens: Number(usage.prompt_tokens ?? 0),
      outputTokens: Number(usage.completion_tokens ?? 0),
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
    };
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error(`openai_fetch_timeout_${LLM_FETCH_TIMEOUT_MS}ms`);
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function buildFormatOutputSchema(decidedFormat: string, advisorImageHeadline: string): string {
  const needsImage = ['image_quote', 'carousel', 'animated_text_reveal', 'animated_data'].includes(decidedFormat);
  const isVideo = VIDEO_FORMATS.has(decidedFormat);
  const imageHeadlineInstruction = needsImage
    ? `- image_headline: a single strong pull-quote line for the visual overlay, target ≤ ~60 characters (one line; keep it well under the render limit). Starting point: \"${advisorImageHeadline}\"`
    : `- image_headline: empty string`;
  const formatInstruction = isVideo
    ? `This post will be published as a ${decidedFormat} YouTube Short. Write a structured, informative post with clear distinct points. The video scenes will be generated separately from this body.`
    : decidedFormat === 'text' ? 'This post will be published as plain text. Write a conversational, engaging post.'
    : decidedFormat === 'image_quote' ? 'This post will be published with a branded image overlay. Write a post with one strong central insight.'
    : decidedFormat === 'carousel' ? 'This post will be published as a multi-slide carousel. Write a structured post with clearly distinct sections (3-5 strong points).'
    : `This post will be published as ${decidedFormat}. Write accordingly.`;
  return `${formatInstruction}\n\nReturn ONLY valid JSON:\n{\n  \"title\": string,\n  \"body\": string,\n  \"image_headline\": string,\n  \"meta\": object\n}\nIf the source content violates a HARD_BLOCK compliance rule:\n{\"skip\": true, \"reason\": \"compliance_block: [rule name]\"}\n\nField rules:\n- title: 8-12 word headline\n- body: full post body text optimised for ${decidedFormat} format\n${imageHeadlineInstruction}\n- meta: any extra metadata as object`;
}

async function assemblePrompts(supabase: ReturnType<typeof getServiceClient>, clientId: string, platform: string, jobType: string, seedPayload: any, decidedFormat: string, advisorImageHeadline: string): Promise<{ systemPrompt: string; systemBlocks: SystemBlock[]; userPrompt: string; model: string; temperature: number; maxOutputTokens: number; usedLegacy: boolean; complianceRuleCount: number; }> {
  const complianceBlock = await fetchComplianceBlock(supabase, clientId);
  const complianceRuleCount = complianceBlock ? (complianceBlock.match(/^RULE:/gm) ?? []).length : 0;
  const { data: brand } = await supabase.schema('c').from('client_brand_profile').select('*').eq('client_id', clientId).eq('is_active', true).limit(1).maybeSingle();
  const { data: platProfile } = await supabase.schema('c').from('client_platform_profile').select('platform_voice_prompt').eq('client_id', clientId).eq('platform', platform).eq('is_active', true).limit(1).maybeSingle();
  const { data: ctPrompt } = await supabase.schema('c').from('content_type_prompt').select('task_prompt, output_schema_hint').eq('client_id', clientId).eq('platform', platform).eq('job_type', jobType).eq('is_active', true).limit(1).maybeSingle();
  if (brand) {
    const model = (brand.model ?? 'claude-sonnet-4-6').toString();
    const temperature = Number(brand.temperature ?? 0.72);
    const maxOutputTokens = Number(brand.max_output_tokens ?? 1200);
    const blocks: SystemBlock[] = [];
    if (complianceBlock) blocks.push({ type: 'text', text: complianceBlock, cache_control: { type: 'ephemeral' } });
    if (brand.brand_identity_prompt) blocks.push({ type: 'text', text: String(brand.brand_identity_prompt), cache_control: { type: 'ephemeral' } });
    if (platProfile?.platform_voice_prompt) blocks.push({ type: 'text', text: String(platProfile.platform_voice_prompt), cache_control: { type: 'ephemeral' } });
    const systemPrompt = blocks.map(b => b.text).join('\n\n');
    const outputSchema = ctPrompt?.output_schema_hint ?? buildFormatOutputSchema(decidedFormat, advisorImageHeadline);
    const taskInstruction = ctPrompt?.task_prompt ?? 'Rewrite the seed content into a valuable, engaging post for the target platform.';
    const userPrompt = [taskInstruction, `\nSeed content (JSON):\n${JSON.stringify(seedPayload)}`, `\n${outputSchema}`].join('\n');
    return { systemPrompt, systemBlocks: blocks, userPrompt, model, temperature, maxOutputTokens, usedLegacy: false, complianceRuleCount };
  }
  const { data: legacyProfile } = await supabase.schema('c').from('client_ai_profile').select('system_prompt, model, generation, persona, guidelines, platform_rules').eq('client_id', clientId).eq('status', 'active').order('is_default', { ascending: false }).limit(1).maybeSingle();
  if (!legacyProfile) throw new Error('no_client_profile_found');
  const model = (legacyProfile.model ?? 'claude-sonnet-4-6').toString();
  const gen = legacyProfile.generation ?? {};
  const legacySystemText = [complianceBlock, legacyProfile.system_prompt ?? '', 'Persona: ' + JSON.stringify(legacyProfile.persona ?? {}), 'Guidelines: ' + JSON.stringify(legacyProfile.guidelines ?? {}), 'Platform rules: ' + JSON.stringify(legacyProfile.platform_rules ?? {}), `Return ONLY valid JSON: {\"title\": string, \"body\": string, \"image_headline\": string, \"meta\": object}. If source violates HARD_BLOCK rule, return {\"skip\": true, \"reason\": \"compliance_block: [rule name]\"}`].filter(Boolean).join('\n\n');
  const legacyBlocks: SystemBlock[] = [{ type: 'text', text: legacySystemText }];
  const userPrompt = `Rewrite this seed into a platform-appropriate post optimised for ${decidedFormat} format.\n\nSeed:\n${JSON.stringify(seedPayload)}\n\nReturn ONLY JSON: {\"title\": string, \"body\": string, \"image_headline\": string, \"meta\": object}`;
  return { systemPrompt: legacySystemText, systemBlocks: legacyBlocks, userPrompt, model, temperature: Number(gen.temperature ?? 0.72), maxOutputTokens: Number(gen.max_output_tokens ?? 1200), usedLegacy: true, complianceRuleCount };
}

type WorkerRequest = { limit?: number; worker_id?: string; lock_seconds?: number; };
type AiJobRow = {
  ai_job_id: string;
  client_id: string;
  post_draft_id: string;
  platform: string;
  job_type: string;
  input_payload: any;
  slot_id: string | null;
  is_shadow: boolean;
};

type SystemBlock = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } };

app.options('*', () => new Response(null, { status: 204, headers: corsHeaders }));

app.use('*', async (c, next) => {
  if (c.req.method !== 'POST') return next();
  const expected = Deno.env.get('AI_WORKER_API_KEY');
  const provided = c.req.header('x-ai-worker-key');
  if (!expected) return jsonResponse({ ok: false, error: 'AI_WORKER_API_KEY_not_set' }, 500);
  if (!provided || provided !== expected) return jsonResponse({ ok: false, error: 'Unauthorized' }, 401);
  return next();
});

app.get('*', (c) => jsonResponse({ ok: true, function: 'ai-worker', version: VERSION }, 200));

app.post('*', async (c) => {
  const supabase = getServiceClient();
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!anthropicKey && !openaiKey) return jsonResponse({ ok: false, error: 'no_ai_api_key_configured' }, 500);

  const url = new URL(c.req.url);
  const bodyText = await c.req.text();
  const bodyJson = bodyText?.trim() ? safeParseJson<WorkerRequest>(bodyText) : ({ ok: true, value: {} as WorkerRequest } as const);
  if (!bodyJson.ok) return jsonResponse({ ok: false, error: 'bad_json' }, 400);

  const limit = Math.min(Math.max(Number(bodyJson.value.limit ?? url.searchParams.get('limit') ?? 1), 1), 20);
  const workerId = bodyJson.value.worker_id ?? url.searchParams.get('worker_id') ?? `worker-${crypto.randomUUID().slice(0, 8)}`;
  const lockSeconds = Math.min(Math.max(Number(bodyJson.value.lock_seconds ?? 600), 30), 3600);

  const { data: lockedData, error: lockErr } = await supabase.schema('f').rpc('ai_worker_lock_jobs_v1', { p_limit: limit, p_worker_id: workerId, p_lock_seconds: lockSeconds });
  if (lockErr) return jsonResponse({ ok: false, error: 'lock_jobs_failed', detail: lockErr }, 500);

  const jobs = (lockedData ?? []) as AiJobRow[];
  if (!jobs.length) return jsonResponse({ ok: true, message: 'no_jobs', worker_id: workerId, locked: 0 }, 200);

  const results: any[] = [];

  for (const job of jobs) {
    const jobId = job.ai_job_id;
    const platform = job.platform ?? 'facebook';
    const jobType = job.job_type ?? 'rewrite_v1';

    let effectiveJobType = jobType;
    let effectivePayload: any = job.input_payload ?? {};
    let isEvergreenRender = false;
    let evergreenContent: { title: string; body: string } | null = null;

    try {
      if (jobType === 'slot_fill_synthesis_v1') {
        const sp = job.input_payload ?? {};
        const synthesisMode: string = sp.synthesis_mode ?? 'single_item';

        if (synthesisMode === 'evergreen' && sp.evergreen_id) {
          const { data: evergreen } = await supabase
            .schema('t')
            .from('evergreen_library')
            .select('title, body, format_keys')
            .eq('evergreen_id', sp.evergreen_id)
            .maybeSingle();
          if (!evergreen) throw new Error(`evergreen_not_found:${sp.evergreen_id}`);
          isEvergreenRender = true;
          evergreenContent = {
            title: String(evergreen.title ?? '').trim(),
            body: String(evergreen.body ?? '').trim(),
          };
        } else if (synthesisMode === 'manual') {
          // T0 — manual operator brief carried on the slot. The canonical pool
          // is never consulted for operator briefs; the brief is the seed and
          // flows through the same rewrite_v1 → Advisor → compliance chain.
          const briefText = String(sp.source_material ?? '').trim();
          if (!briefText) throw new Error('manual_fill_no_source_material');
          effectivePayload = {
            digest_item: {
              title: briefText.slice(0, 80),
              body_text: briefText,
              url: '',
            },
            slot_meta: { slot_id: sp.slot_id, format: sp.format, manual: true, created_by: sp.created_by ?? null },
          };
          effectiveJobType = 'rewrite_v1';
        } else {
          const canonicalIds: string[] = Array.isArray(sp.canonical_ids) ? sp.canonical_ids : [];
          if (!canonicalIds.length) throw new Error('slot_fill_no_canonical_ids');

          const { data: bodies, error: bodiesErr } = await supabase
            .schema('f')
            .from('canonical_content_body')
            .select('canonical_id, extracted_text, extracted_excerpt, fetch_status')
            .in('canonical_id', canonicalIds);
          if (bodiesErr) throw new Error(`canonical_body_fetch:${bodiesErr.message}`);

          const { data: items, error: itemsErr } = await supabase
            .schema('f')
            .from('canonical_content_item')
            .select('canonical_id, canonical_title, canonical_url, first_seen_at')
            .in('canonical_id', canonicalIds);
          if (itemsErr) throw new Error(`canonical_item_fetch:${itemsErr.message}`);

          const merged = canonicalIds.map((cid) => {
            const body = (bodies ?? []).find((b: any) => b.canonical_id === cid);
            const item = (items ?? []).find((i: any) => i.canonical_id === cid);
            return {
              canonical_id: cid,
              title: item?.canonical_title ?? '',
              url: item?.canonical_url ?? '',
              body_text: body?.extracted_text ?? '',
              body_excerpt: body?.extracted_excerpt ?? '',
            };
          });

          const hasAnyBody = merged.some((m) => (m.body_text && m.body_text.length > 0) || (m.body_excerpt && m.body_excerpt.length > 0));
          if (!hasAnyBody) {
            throw new Error(`slot_fill_no_body_content: ${canonicalIds.length} canonicals all have empty extracted_text/extracted_excerpt`);
          }

          if (synthesisMode === 'single_item') {
            const m0 = merged[0];
            effectivePayload = {
              digest_item: {
                title: m0.title,
                body_text: m0.body_text,
                body_excerpt: m0.body_excerpt,
                url: m0.url,
              },
              slot_meta: { slot_id: sp.slot_id, format: sp.format, fitness_score: sp.fitness_score },
            };
            effectiveJobType = 'rewrite_v1';
          } else {
            effectivePayload = {
              items: merged.map((m) => ({
                title: m.title,
                body_text: m.body_text,
                body_excerpt: m.body_excerpt,
                url: m.url,
              })),
              slot_meta: { slot_id: sp.slot_id, format: sp.format, fitness_score: sp.fitness_score },
            };
            effectiveJobType = 'synth_bundle_v1';
          }
        }
      }

      if (isEvergreenRender && evergreenContent) {
        // R3a SHADOW — evergreen path. Advisor pick == the evergreen format. Shadow-only:
        // recommended_format below keeps its exact current value/writer.
        const evergreenFormat = job.input_payload?.format ?? 'text';
        const evergreenRequestedFormat = (job.input_payload?.requested_format ?? null) as string | null;
        const evergreenFormatMode = (job.input_payload?.format_mode ?? null) as string | null;
        // ── S9 LAYER 2 CAPABILITY CHOKEPOINT — evergreen path ──────────────────────
        // Architecture packet §1.3 fallback path #6: this path writes recommended_format
        // DIRECTLY from input_payload.format (defaulting to 'text'), bypassing both the
        // Advisor and the resolver — so it needs its own copy of the gate; the main-path
        // check below can never see it. Same canonical blocked state, same fail-closed
        // semantics, same 'cancelled' terminal job status.
        const evergreenCapability = await classifyCapability(supabase, job.client_id, platform, evergreenFormat);
        if (await shouldBlockOnCapability(supabase, evergreenCapability, evergreenFormat)) {
          console.log(`[ai-worker] ${VERSION} — job ${jobId}: ${S9_CAPABILITY_MARKER} BLOCKED (evergreen) format=${evergreenFormat} status=${evergreenCapability.status} reason=${evergreenCapability.reason_code ?? 'none'}`);

          const evBlockedAt = nowIso();
          const { error: evBlockedDraftErr } = await supabase.schema('m').from('post_draft')
            .update(buildBlockedDraftUpdate(evergreenCapability, {
              requestedFormat: evergreenRequestedFormat,
              advisorFormat: evergreenFormat,
              formatMode: evergreenFormatMode,
              blockedFormat: evergreenFormat,
              at: evBlockedAt,
            }))
            .eq('post_draft_id', job.post_draft_id);
          if (evBlockedDraftErr) throw new Error(`capability_blocked_evergreen_post_draft_update_failed:${evBlockedDraftErr.message}`);

          if (job.slot_id) {
            const { error: evBlockedSlotErr } = await supabase.schema('m').from('slot').update({
              status: 'skipped',
              skip_reason: `capability_blocked:${evergreenCapability.status}:${evergreenFormat}`,
              updated_at: evBlockedAt,
            }).eq('slot_id', job.slot_id);
            if (evBlockedSlotErr) throw new Error(`capability_blocked_evergreen_slot_update_failed:${evBlockedSlotErr.message}`);
          }

          const { error: evBlockedJobErr } = await supabase.schema('m').from('ai_job').update({
            status: 'cancelled',
            output_payload: {
              capability_blocked: true, evergreen_render: true, marker: S9_CAPABILITY_MARKER,
              blocked_format: evergreenFormat,
              capability_status: evergreenCapability.status,
              capability_reason_code: evergreenCapability.reason_code,
              capability_error: evergreenCapability.error,
            },
            error: null, locked_by: null, locked_at: null, updated_at: evBlockedAt,
          }).eq('ai_job_id', jobId);
          if (evBlockedJobErr) throw new Error(`capability_blocked_evergreen_ai_job_update_failed:${evBlockedJobErr.message}`);

          results.push({
            ai_job_id: jobId, post_draft_id: job.post_draft_id, status: 'capability_blocked',
            evergreen_render: true, blocked_format: evergreenFormat,
            capability_status: evergreenCapability.status,
            capability_reason_code: evergreenCapability.reason_code,
          });
          continue;
        }

        const evergreenShadow = await resolveShadow(supabase, job.client_id, platform, evergreenRequestedFormat, evergreenFormatMode, evergreenFormat);
        const { error: evergreenDraftErr } = await supabase.schema('m').from('post_draft').update({
          draft_title: evergreenContent.title,
          draft_body: evergreenContent.body,
          draft_format: { ai: { evergreen_render: true, evergreen_id: job.input_payload?.evergreen_id ?? null, ai_job_id: jobId, at: nowIso() } },
          approval_status: 'needs_review',
          recommended_format: job.input_payload?.format ?? 'text',
          image_headline: '',
          compliance_flags: [],
          updated_at: nowIso(),
          // R3a SHADOW additive columns (nullable) — do NOT gate rendering/selection.
          advisor_format: evergreenFormat,
          requested_format: evergreenRequestedFormat,
          format_mode: evergreenFormatMode,
          shadow_resolved_format: evergreenShadow?.effective_format ?? null,
          final_format_authority: evergreenShadow?.authority ?? null,
          final_format_reason: evergreenShadow?.reason ?? (evergreenShadow === null ? 'resolver_unavailable' : null),
          format_policy_version: evergreenShadow?.policy_version ?? null,
          format_resolved_at: evergreenShadow ? nowIso() : null,
          resolver_evidence: evergreenShadow ?? null,
        }).eq('post_draft_id', job.post_draft_id);
        if (evergreenDraftErr) throw new Error(`evergreen_post_draft_update_failed:${evergreenDraftErr.message}`);

        if (job.slot_id) {
          const { error: evergreenSlotErr } = await supabase.schema('m').from('slot').update({
            status: 'filled',
            updated_at: nowIso(),
          }).eq('slot_id', job.slot_id);
          if (evergreenSlotErr) throw new Error(`evergreen_slot_update_failed:${evergreenSlotErr.message}`);
        }

        const { error: evergreenJobErr } = await supabase.schema('m').from('ai_job').update({
          status: 'succeeded',
          output_payload: { evergreen_render: true, evergreen_id: job.input_payload?.evergreen_id ?? null },
          error: null,
          locked_by: null,
          locked_at: null,
          updated_at: nowIso(),
        }).eq('ai_job_id', jobId);
        if (evergreenJobErr) throw new Error(`evergreen_ai_job_update_failed:${evergreenJobErr.message}`);

        results.push({ ai_job_id: jobId, post_draft_id: job.post_draft_id, status: 'succeeded', evergreen_render: true });
        continue;
      }

      {
        const { data: priorSuccessLog } = await supabase
          .schema('m')
          .from('ai_usage_log')
          .select('id, provider, model, input_tokens, output_tokens, cost_usd, fallback_used, created_at')
          .eq('ai_job_id', jobId)
          .eq('error_call', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (priorSuccessLog) {
          const { data: existingDraft } = await supabase
            .schema('m')
            .from('post_draft')
            .select('draft_title, draft_body, approval_status')
            .eq('post_draft_id', job.post_draft_id)
            .maybeSingle();

          if (existingDraft && typeof existingDraft.draft_body === 'string' && existingDraft.draft_body.length > 0
              && typeof existingDraft.draft_title === 'string' && existingDraft.draft_title.length > 0) {
            const { error: idempotencyJobErr } = await supabase.schema('m').from('ai_job').update({
              status: 'succeeded',
              output_payload: {
                idempotency_skip: true,
                reason: 'prior_llm_call_succeeded_draft_already_populated',
                prior_log_id: priorSuccessLog.id,
                prior_provider: priorSuccessLog.provider,
                prior_model: priorSuccessLog.model,
                prior_call_at: priorSuccessLog.created_at,
                recovered_at: nowIso(),
              },
              error: null,
              locked_by: null,
              locked_at: null,
              updated_at: nowIso(),
            }).eq('ai_job_id', jobId);
            if (idempotencyJobErr) throw new Error(`idempotency_ai_job_update_failed:${idempotencyJobErr.message}`);

            console.log(`[ai-worker] ${VERSION} — job ${jobId}: IDEMPOTENCY SKIP (prior call ${priorSuccessLog.created_at})`);
            results.push({
              ai_job_id: jobId,
              post_draft_id: job.post_draft_id,
              status: 'idempotency_skip',
              reason: 'prior_llm_call_succeeded_draft_already_populated',
              prior_log_id: priorSuccessLog.id,
            });
            continue;
          }
        }
      }

      const { formats, perfSummary, preferredFormat } = await fetchFormatContext(supabase, job.client_id, platform);

      // T0 — explicit operator format preference (manual slots only). Surfaced
      // to the Advisor via the existing preference-bias mechanism; the Advisor
      // retains format authority. Scheduled/breaking slots never reach this
      // (their input_payload.format is a fill-time fallback, not a preference).
      const operatorPreferredFormat: string | null =
        (job.input_payload?.synthesis_mode === 'manual' && job.input_payload?.format_preference_explicit === true)
          ? (String(job.input_payload?.format ?? '') || null)
          : null;
      const effectivePreferredFormat = operatorPreferredFormat ?? preferredFormat;

      const rawPayload = effectivePayload;
      let seedTitle = String(rawPayload.title ?? rawPayload.headline ?? '');
      let seedBody  = String(rawPayload.body ?? rawPayload.content ?? rawPayload.excerpt ?? rawPayload.summary ?? '');

      if (!seedTitle && !seedBody) {
        if (effectiveJobType === 'rewrite_v1' && rawPayload.digest_item) {
          const di = rawPayload.digest_item;
          seedTitle = String(di.title ?? di.url ?? '');
          seedBody  = String(di.body_excerpt ?? di.body_text ?? di.content ?? di.excerpt ?? '');
        } else if (effectiveJobType === 'synth_bundle_v1' && Array.isArray(rawPayload.items) && rawPayload.items.length > 0) {
          seedTitle = String(rawPayload.items[0].title ?? rawPayload.items[0].url ?? '');
          seedBody  = rawPayload.items
            .map((it: any) => String(it.body_excerpt ?? it.body_text ?? it.content ?? it.excerpt ?? ''))
            .filter(Boolean)
            .join('\n\n---\n\n');
        }
      }

      const seed = trimSeedPayload(rawPayload, effectiveJobType);

      let clientName = '', vertical = 'professional services';
      try {
        const { data: brand } = await supabase.schema('c').from('client_brand_profile').select('brand_name').eq('client_id', job.client_id).eq('is_active', true).limit(1).maybeSingle();
        clientName = brand?.brand_name ?? '';
        const { data: scope } = await supabase.rpc('exec_sql', { query: `SELECT cv.vertical_name FROM c.client_content_scope ccs JOIN t.content_vertical cv ON cv.vertical_id = ccs.vertical_id WHERE ccs.client_id = '${job.client_id}' AND ccs.is_primary = true LIMIT 1` });
        vertical = (scope as any)?.[0]?.vertical_name ?? 'professional services';
      } catch { }

      let decidedFormat = 'text', advisorReason = '', advisorImageHeadline = '', advisorDurationMs = 0;
      let dialogueMode = false;   // cc-0084 Slice 2 — set by the dialogue override below
      if (anthropicKey && formats.length > 0) {
        try {
          const advised = await callFormatAdvisor({ anthropicKey, seedTitle, seedBody, clientName, vertical, formats, perfSummary, preferredFormat: effectivePreferredFormat, platform });
          decidedFormat = advised.formatKey; advisorReason = advised.reason; advisorImageHeadline = advised.imageHeadline; advisorDurationMs = advised.durationMs;
          console.log(`[ai-worker] ${VERSION} — job ${jobId}: advisor chose ${decidedFormat} (${advisorDurationMs}ms) seedTitle=\"${seedTitle.slice(0, 60)}\"`);
        } catch (advisorErr: any) {
          console.error(`[ai-worker] format advisor failed for ${jobId}, defaulting to text:`, advisorErr?.message);
        }
      }

      // F-HEYGEN Option A (A2) — avatar-only override. If the slot requested
      // video_short_avatar, honour it regardless of the advisor's pick: the YouTube
      // candidate palette excludes avatar, so callFormatAdvisor can never select it
      // and would otherwise silently downgrade. Narrow by design — ONLY this one
      // format is overridden. Record what the advisor would have chosen.
      if (job.input_payload?.format === 'video_short_avatar') {
        const advisorWouldHave = decidedFormat;
        decidedFormat = 'video_short_avatar';
        advisorReason = `avatar_override (F-HEYGEN A2); advisor_would_have=${advisorWouldHave}${advisorReason ? `; ${advisorReason}` : ''}`;
        console.log(`[ai-worker] ${VERSION} — job ${jobId}: avatar override (advisor_would_have=${advisorWouldHave})`);
      }

      // cc-0084 Slice 2 (${CC0084_DIALOGUE_MARKER}) — dialogue override, a sibling of the A2 avatar
      // override. When the slot requested video_short_avatar_dialogue, force decidedFormat to
      // 'video_short_avatar' (so prompt assembly, visual-spec, recommended_format and the monologue
      // fallback all behave EXACTLY like the monologue avatar format — heygen-worker keys pickup on
      // recommended_format='video_short_avatar', then detects video_script.dialogue[]) and flag
      // dialogueMode so the video_script write below emits the dialogue script. Narrow, one-format,
      // records what the advisor would have chosen; input_payload.format is one exact string so this
      // is mutually exclusive with the avatar override above.
      if (job.input_payload?.format === 'video_short_avatar_dialogue') {
        const advisorWouldHave = decidedFormat;
        decidedFormat = 'video_short_avatar';
        dialogueMode = true;
        advisorReason = `avatar_dialogue_override (cc-0084 Slice 2); advisor_would_have=${advisorWouldHave}${advisorReason ? `; ${advisorReason}` : ''}`;
        console.log(`[ai-worker] ${VERSION} — job ${jobId}: dialogue override ${CC0084_DIALOGUE_MARKER} (advisor_would_have=${advisorWouldHave})`);
      }

      // Schedule-authority pin (golden-path): when the SCHEDULE authoritatively demands the governed
      // video_short_stat format on YouTube (the only platform where video_short_stat is platform-valid)
      // AND the client is governance-enabled for it, the schedule's choice must survive the Advisor to
      // recommended_format so the governed Creatomate video path fires. Mirrors the A2 avatar override:
      // narrow, one-format, records what the Advisor would have chosen. Every other Advisor power is intact.
      // Cheap guards (input_payload.format + platform) are checked BEFORE the async governance read.
      if (job.input_payload?.format === 'video_short_stat'
          && platform === 'youtube'
          && await isVideoStatGovernanceEnabled(supabase, job.client_id)) {
        const advisorWouldHave = decidedFormat;
        decidedFormat = 'video_short_stat';
        advisorReason = `schedule_authority_pin (video_short_stat golden-path); advisor_would_have=${advisorWouldHave}${advisorReason ? `; ${advisorReason}` : ''}`;
        console.log(`[ai-worker] ${VERSION} — job ${jobId}: schedule-authority pin video_short_stat (advisor_would_have=${advisorWouldHave})`);
      }

      // ── S9 LAYER 2 CAPABILITY CHOKEPOINT (fail-closed) ────────────────────────────
      // Placed AFTER the Advisor's pick and AFTER all three unconditional pins (A2 avatar,
      // cc-0084 dialogue, schedule-authority video_short_stat) so it is the true last word
      // on decidedFormat regardless of which of the 11 fallback paths produced it — and
      // BEFORE writeVisualSpec / assemblePrompts / the LLM call, so a blocked draft incurs
      // NO generation cost for output that could never execute (PK ruling 2026-07-29:
      // short-circuit). Non-ready => canonical blocked state, no substitute format, and the
      // job terminates as 'cancelled' (NOT 'failed': pipeline-fixer re-queues 'locked' and
      // dead-letters 'failed', but never touches 'cancelled', so a capability block cannot
      // enter a retry or dead-letter loop).
      const capability = await classifyCapability(supabase, job.client_id, platform, decidedFormat);
      if (await shouldBlockOnCapability(supabase, capability, decidedFormat)) {
        console.log(`[ai-worker] ${VERSION} — job ${jobId}: ${S9_CAPABILITY_MARKER} BLOCKED format=${decidedFormat} status=${capability.status} reason=${capability.reason_code ?? 'none'}`);

        const blockedAt = nowIso();
        const { error: blockedDraftErr } = await supabase.schema('m').from('post_draft')
          .update(buildBlockedDraftUpdate(capability, {
            requestedFormat: (job.input_payload?.requested_format ?? null) as string | null,
            advisorFormat: decidedFormat,
            formatMode: (job.input_payload?.format_mode ?? null) as string | null,
            blockedFormat: decidedFormat,
            at: blockedAt,
          }))
          .eq('post_draft_id', job.post_draft_id);
        if (blockedDraftErr) throw new Error(`capability_blocked_post_draft_update_failed:${blockedDraftErr.message}`);

        if (job.slot_id) {
          const { error: blockedSlotErr } = await supabase.schema('m').from('slot').update({
            status: 'skipped',
            skip_reason: `capability_blocked:${capability.status}:${decidedFormat}`,
            updated_at: blockedAt,
          }).eq('slot_id', job.slot_id);
          if (blockedSlotErr) throw new Error(`capability_blocked_slot_update_failed:${blockedSlotErr.message}`);
        }

        const { error: blockedJobErr } = await supabase.schema('m').from('ai_job').update({
          status: 'cancelled',
          output_payload: {
            capability_blocked: true,
            marker: S9_CAPABILITY_MARKER,
            blocked_format: decidedFormat,
            capability_status: capability.status,
            capability_reason_code: capability.reason_code,
            capability_error: capability.error,
          },
          error: null, locked_by: null, locked_at: null, updated_at: blockedAt,
        }).eq('ai_job_id', jobId);
        if (blockedJobErr) throw new Error(`capability_blocked_ai_job_update_failed:${blockedJobErr.message}`);

        results.push({
          ai_job_id: jobId, post_draft_id: job.post_draft_id, status: 'capability_blocked',
          blocked_format: decidedFormat, capability_status: capability.status,
          capability_reason_code: capability.reason_code,
        });
        continue;   // no visual spec, no prompt assembly, no LLM call, no video script
      }

      // ACI v0 / Slice B1 — resolve the vendored creative contract for the FINAL decidedFormat.
      // Deterministic + pure; returns non-null ONLY for the governed PP image_quote gate,
      // null for everything else. Used downstream to stamp additive draft_format.contract
      // metadata; no effect on format selection, the prompt, or rendering.
      const creativeContract = resolveCreativeContract(job.client_id, decidedFormat);

      await writeVisualSpec(supabase, job.post_draft_id, decidedFormat, advisorReason, advisorImageHeadline, advisorDurationMs);

      const { systemPrompt, systemBlocks, userPrompt, model, temperature, maxOutputTokens, usedLegacy, complianceRuleCount } =
        await assemblePrompts(supabase, job.client_id, platform, effectiveJobType, seed, decidedFormat, advisorImageHeadline);
      if (complianceRuleCount > 0) console.log(`[ai-worker] ${jobId}: ${complianceRuleCount} compliance rules injected`);

      const isPrimary = model.startsWith('claude');
      const primaryProvider = isPrimary ? 'anthropic' : 'openai';
      let result: Awaited<ReturnType<typeof callClaude>> | null = null;
      let fallbackUsed = false, primaryError: string | null = null;
      let primaryRawResponse: string | null = null;

      if (isPrimary && anthropicKey) {
        try { result = await callClaude({ apiKey: anthropicKey, model, systemPrompt, systemBlocks, userPrompt, temperature, maxOutputTokens }); }
        catch (e: any) {
          primaryError = e?.message ?? String(e);
          if (e instanceof AiParseError) primaryRawResponse = e.rawResponse;
          console.error(`[ai-worker] Claude failed for ${jobId}:`, primaryError);
          await writeUsageLog(supabase, { clientId: job.client_id, aiJobId: jobId, postDraftId: job.post_draft_id, provider: 'anthropic', model, contentType: effectiveJobType, platform, inputTokens: 0, outputTokens: 0, costUsd: 0, fallbackUsed: false, errorCall: true });
        }
      } else if (!isPrimary && openaiKey) {
        try { result = await callOpenAI({ apiKey: openaiKey, model, systemPrompt, userPrompt, temperature, maxOutputTokens }); }
        catch (e: any) {
          primaryError = e?.message ?? String(e);
          if (e instanceof AiParseError) primaryRawResponse = e.rawResponse;
          await writeUsageLog(supabase, { clientId: job.client_id, aiJobId: jobId, postDraftId: job.post_draft_id, provider: 'openai', model, contentType: effectiveJobType, platform, inputTokens: 0, outputTokens: 0, costUsd: 0, fallbackUsed: false, errorCall: true });
        }
      }

      if (!result && primaryError && openaiKey) {
        fallbackUsed = true;
        const fallbackModel = 'gpt-4o';
        try {
          result = await callOpenAI({ apiKey: openaiKey, model: fallbackModel, systemPrompt, userPrompt, temperature, maxOutputTokens });
        } catch (e: any) {
          // v2.11.1 — if fallback also threw an AiParseError, prefer the fallback's rawResponse
          // (it's the more recent / final attempt's evidence). Re-throw to outer catch.
          if (e instanceof AiParseError) {
            const wrapped = new AiParseError(`primary:${primaryError} | fallback:${e.message}`, e.rawResponse);
            throw wrapped;
          }
          throw e;
        }
        await writeUsageLog(supabase, { clientId: job.client_id, aiJobId: jobId, postDraftId: job.post_draft_id, provider: 'openai', model: fallbackModel, contentType: effectiveJobType, platform, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: await calculateCostUsd(supabase, 'openai', fallbackModel, result.inputTokens, result.outputTokens), fallbackUsed: true, errorCall: false });
      } else if (result) {
        await writeUsageLog(supabase, { clientId: job.client_id, aiJobId: jobId, postDraftId: job.post_draft_id, provider: primaryProvider, model, contentType: effectiveJobType, platform, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: await calculateCostUsd(supabase, primaryProvider, model, result.inputTokens, result.outputTokens), fallbackUsed: false, errorCall: false });
      }

      if (!result) {
        // v2.11.1 — if primary failed with a parse error and no fallback was attempted (or fallback path skipped),
        // re-raise as AiParseError so the outer catch can persist primaryRawResponse.
        if (primaryRawResponse) throw new AiParseError(primaryError ?? 'all_providers_failed', primaryRawResponse);
        throw new Error(primaryError ?? 'all_providers_failed');
      }

      if (result.skip) {
        const skipReason = result.skipReason || 'compliance_block';
        const { error: complianceDraftErr } = await supabase.schema('m').from('post_draft').update({
          approval_status: 'dead',
          draft_format: { compliance_skip: true, reason: skipReason, at: nowIso() },
          compliance_flags: [{ rule: skipReason, severity: 'HARD_BLOCK', triggered: true, at: nowIso() }],
          updated_at: nowIso(),
        }).eq('post_draft_id', job.post_draft_id);
        if (complianceDraftErr) throw new Error(`compliance_post_draft_update_failed:${complianceDraftErr.message}`);
        if (job.slot_id) {
          const { error: complianceSlotErr } = await supabase.schema('m').from('slot').update({
            status: 'skipped',
            skip_reason: `compliance_skip:${skipReason}`.slice(0, 200),
            updated_at: nowIso(),
          }).eq('slot_id', job.slot_id);
          if (complianceSlotErr) throw new Error(`compliance_slot_update_failed:${complianceSlotErr.message}`);
        }
        const { error: complianceJobErr } = await supabase.schema('m').from('ai_job').update({ status: 'succeeded', output_payload: { skipped: true, reason: skipReason }, error: null, locked_by: null, locked_at: null, updated_at: nowIso() }).eq('ai_job_id', jobId);
        if (complianceJobErr) throw new Error(`compliance_ai_job_update_failed:${complianceJobErr.message}`);
        results.push({ ai_job_id: jobId, post_draft_id: job.post_draft_id, status: 'compliance_skip', reason: skipReason }); continue;
      }

      const finalImageHeadline = result.imageHeadline || advisorImageHeadline;
      const draftMeta = {
        ...(typeof result.meta === 'object' && result.meta ? result.meta : {}),
        ai: {
          provider: fallbackUsed ? 'openai' : primaryProvider,
          model: fallbackUsed ? 'gpt-4o' : model,
          fallback_used: fallbackUsed,
          legacy_profile: usedLegacy,
          compliance_rules_injected: complianceRuleCount,
          format_advisor_key: FORMAT_ADVISOR_PROMPT_KEY,
          format_decided: decidedFormat,
          format_reason: advisorReason,
          worker_id: workerId,
          ai_job_id: jobId,
          at: nowIso(),
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          cache_creation_input_tokens: result.cacheCreationInputTokens,
          cache_read_input_tokens: result.cacheReadInputTokens,
          slot_id: job.slot_id ?? null,
          job_type_input: jobType,
          job_type_effective: effectiveJobType,
          is_shadow: job.is_shadow,
        },
      };

      // ACI v0 / Slice B1 — additive contract stamp. ONLY when the resolver returned a
      // contract (governed PP image_quote): add a top-level sibling of draftMeta.ai. When
      // creativeContract is null (all other clients/formats) NO key is added — draft_format
      // shape is byte-unchanged on the default path.
      if (creativeContract) {
        (draftMeta as any).contract = buildContractStamp(creativeContract, nowIso);
      }

      // R3a SHADOW — read planner intent (may be absent) and call the governed resolver
      // best-effort. Shadow-only: recommended_format/recommended_reason below are UNCHANGED.
      const requestedFormat = (job.input_payload?.requested_format ?? null) as string | null;
      const formatMode = (job.input_payload?.format_mode ?? null) as string | null;
      const shadow = await resolveShadow(supabase, job.client_id, platform, requestedFormat, formatMode, decidedFormat);

      const baseUpdate: any = {
        draft_title: result.title,
        draft_body: result.body,
        draft_format: draftMeta,
        approval_status: 'needs_review',
        recommended_format: decidedFormat,
        recommended_reason: advisorReason,
        image_headline: finalImageHeadline,
        compliance_flags: [],
        updated_at: nowIso(),
        // R3a SHADOW additive columns (nullable) — do NOT gate rendering/selection.
        advisor_format: decidedFormat,
        requested_format: requestedFormat,
        format_mode: formatMode,
        shadow_resolved_format: shadow?.effective_format ?? null,
        final_format_authority: shadow?.authority ?? null,
        final_format_reason: shadow?.reason ?? (shadow === null ? 'resolver_unavailable' : null),
        format_policy_version: shadow?.policy_version ?? null,
        format_resolved_at: shadow ? nowIso() : null,
        resolver_evidence: shadow ?? null,
      };

      const { error: successDraftErr } = await supabase.schema('m').from('post_draft').update(baseUpdate).eq('post_draft_id', job.post_draft_id);
      if (successDraftErr) throw new Error(`success_post_draft_update_failed:${successDraftErr.message}`);

      if (job.slot_id) {
        const { error: successSlotErr } = await supabase.schema('m').from('slot').update({
          status: 'filled',
          updated_at: nowIso(),
        }).eq('slot_id', job.slot_id);
        if (successSlotErr) throw new Error(`success_slot_update_failed:${successSlotErr.message}`);
      }

      let videoScriptGenerated = false;
      let dialogueHandled = false;
      // WS-5 P1 (v2.26.0): per-job stat-bounds outcome for the results entry
      // ('accepted_first_attempt' | 'accepted_after_reprompt' | 'fail_closed' | null for
      // non-stat formats / generation misses).
      let statBoundsOutcome: string | null = null;

      // cc-0084 Slice 2 — dialogue avatar path. Fires ONLY when the slot requested
      // video_short_avatar_dialogue (dialogueMode). generateDialogueScript emits the { speaker_role,
      // line } dialogue heygen-worker v2.6.0 renders (recommended_format is already 'video_short_avatar',
      // its pickup key). WRITE ORDER MATTERS (v2.24.1 fix): a plain .update() REPLACES the whole
      // draft_format column, but set_draft_video_script MERGES video_script into it via jsonb `||`.
      // So we (1) stamp draft_format = { ...draftMeta, scene_count } FIRST (heygen qa.scene_count reads
      // it), then (2) call set_draft_video_script so its `||` merge adds video_script ON TOP of the
      // scene_count-bearing draft_format → final draft_format = { ...draftMeta, scene_count, video_script }.
      // Doing the plain update SECOND clobbered the just-written video_script (Slice 3 live: video_script
      // null → heygen found no dialogue[] → no multi-scene render). dialogueHandled flips true ONLY after
      // BOTH writes succeed. On ANY miss (null return / either write error) dialogueHandled stays false →
      // the UNCHANGED monologue block below runs as the fallback. Best-effort: never throws.
      if (dialogueMode && decidedFormat === 'video_short_avatar' && anthropicKey) {
        try {
          const brief = String(job.input_payload?.source_material ?? '').trim() || String(result.body ?? '').trim();
          const dlg = await generateDialogueScript({ supabase, anthropicKey, clientId: job.client_id, brief, dialogueRoles: job.input_payload?.dialogue_roles, clientName, vertical });
          if (dlg && await persistDialogueDraft(supabase, job.post_draft_id, draftMeta, dlg)) {
            videoScriptGenerated = true;
            dialogueHandled = true;
          }
          // dlg === null OR a persist write failed → fall through to the monologue fallback below
          // (dialogueHandled stays false).
        } catch (dlgErr: any) { console.error('[ai-worker] generateDialogueScript threw (non-fatal):', dlgErr?.message); }
      }

      if (!dialogueHandled && VIDEO_FORMATS.has(decidedFormat) && anthropicKey) {
        try {
          // WS-5 P1 (v2.26.0, D-1): for the stat formats ONLY, load the persisted per-template
          // envelope BEFORE generation. getClientSlug is the existing cached S9 resolver; a null
          // slug (or any loader miss) yields the fallback char-bounds envelope — the loader never
          // throws. Every other format passes statEnvelope=undefined (byte-compatible).
          let statEnvelope: StatEnvelope | undefined;
          if (decidedFormat === 'video_short_stat' || decidedFormat === 'video_short_stat_voice') {
            statEnvelope = await loadStatTemplateEnvelope(supabase, await getClientSlug(supabase, job.client_id), job.post_draft_id);
          }
          const videoScript = await generateVideoScript({ anthropicKey, formatKey: decidedFormat, postTitle: result.title, postBody: result.body, clientName, vertical, statEnvelope });
          if (isStatBoundsFailClosed(videoScript)) {
            // Second envelope violation → FAIL CLOSED (D-1): NO set_draft_video_script, draft
            // marked dead with the named dead_reason, BOTH attempts preserved in draft_format.
            // The job itself still completes (mirrors other non-fatal content failures).
            statBoundsOutcome = 'fail_closed';
            await markStatDraftDeadOnBounds(supabase, job.post_draft_id, draftMeta, videoScript.stat_bounds_qa);
          } else if (videoScript) {
            statBoundsOutcome = (videoScript as any)?.stat_bounds_qa?.outcome ?? null;
            // v2.15.0 — F-SERIES-AVATAR-DIFFERENTIATION Stage 1 (shadow, observability-only):
            // attach a SUGGESTED presenter role under video_script.avatar_role_suggestion.
            // heygen-worker does NOT read this key. suggestAvatarRole never throws; the extra
            // guard ensures a suggestion failure can never block the video_script write.
            // v2.23.0 — cc-0083 Slice B: in the SAME guard, PROMOTE a clear, confident single-role
            // suggestion into the CONSUMED field video_script.stakeholder_role (heygen-worker reads
            // this to filter avatars). Left unset otherwise → default host. Fail-open, never throws.
            if (decidedFormat === 'video_short_avatar') {
              try {
                const roleSuggestion = await suggestAvatarRole(supabase, anthropicKey, { clientId: job.client_id, slotId: job.slot_id });
                (videoScript as any).avatar_role_suggestion = roleSuggestion;   // KEEP — observability unchanged
                // cc-0083: promote a CLEAR, confident single-role suggestion into the CONSUMED field.
                const promotedRole = promoteAvatarRole(roleSuggestion);
                if (promotedRole) (videoScript as any).stakeholder_role = promotedRole;
                // else: leave stakeholder_role unset → heygen-worker resolves the default host.
              } catch (rsErr: any) { console.error('[ai-worker] suggestAvatarRole threw (non-fatal):', rsErr?.message); }
            }
            const { error: vsErr } = await supabase.rpc('set_draft_video_script', { p_post_draft_id: job.post_draft_id, p_video_script: videoScript as any });
            if (vsErr) console.error('[ai-worker] set_draft_video_script error:', vsErr.message);
            else videoScriptGenerated = true;
          }
        } catch (vsErr: any) { console.error('[ai-worker] generateVideoScript threw:', vsErr?.message); }
      }

      const { error: successJobErr } = await supabase.schema('m').from('ai_job').update({ status: 'succeeded', output_payload: { title: result.title, body: result.body, meta: draftMeta }, error: null, locked_by: null, locked_at: null, updated_at: nowIso() }).eq('ai_job_id', jobId);
      if (successJobErr) throw new Error(`success_ai_job_update_failed:${successJobErr.message}`);

      results.push({ ai_job_id: jobId, post_draft_id: job.post_draft_id, status: 'succeeded', provider: fallbackUsed ? 'openai_fallback' : primaryProvider, model: fallbackUsed ? 'gpt-4o' : model, format_decided: decidedFormat, format_reason: advisorReason, compliance_rules_injected: complianceRuleCount, video_script_generated: videoScriptGenerated, stat_bounds_outcome: statBoundsOutcome, input_tokens: result.inputTokens, output_tokens: result.outputTokens });

    } catch (e: any) {
      const msg = (e?.message ?? String(e)).slice(0, 4000);
      // v2.11.1 — capture raw model response if this was a parse error.
      // AiParseError carries err.rawResponse from inside callClaude/callOpenAI.
      // Closes B-AI-WORKER-NO-FAILURE-PAYLOAD-LOGGING.
      const failureOutput = (e instanceof AiParseError && e.rawResponse)
        ? { error_response_raw: e.rawResponse.slice(0, 4000) }
        : null;
      const { error: failureJobErr } = await supabase.schema('m').from('ai_job').update({
        status: 'failed',
        error: msg,
        output_payload: failureOutput,
        locked_by: null,
        locked_at: null,
        updated_at: nowIso(),
      }).eq('ai_job_id', jobId);
      if (failureJobErr) console.error(`[ai-worker] failure_ai_job_update_failed for ${jobId}:`, failureJobErr.message);
      results.push({ ai_job_id: jobId, post_draft_id: job.post_draft_id, status: 'failed', error: msg });
    }
  }

  return jsonResponse({ ok: true, version: VERSION, worker_id: workerId, locked: jobs.length, processed: results.length, results });
});

app.all('*', (c) => jsonResponse({ ok: false, error: 'route_not_found', version: VERSION }, 404));

// Guard the top-level server so pure helpers (e.g. buildFormatOutputSchema) can be imported
// by hermetic unit tests without starting the listener. Deployed behaviour is byte-identical:
// under `deno run`/the edge runtime `import.meta.main` is true, so Deno.serve still fires.
// (Proven house pattern — heygen-worker / pipeline-fixer.)
if (import.meta.main) {
  Deno.serve(app.fetch);
}
