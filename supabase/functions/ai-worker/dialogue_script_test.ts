// dialogue_script_test.ts — cc-0084 Slice 2 hermetic tests for the multi-character dialogue-script
// validation/repair contract. Fully hermetic: NO DB, NO network, NO Deno.serve (index.ts guards its
// listener behind `if (import.meta.main)`, so importing it here does NOT start the server). Exercises
// the pure helpers that generateDialogueScript composes: resolveParticipatingRoles (dialogue_roles ∩
// active roles, >= 2 distinct) · normalizeDialogueTurns (drop/repair turns, role_code -> speaker_role,
// caps) · dialogueIsRenderable (>= 2 turns AND >= 2 distinct roles) · estimateDialogueDurationS.
//
// Maps to the Slice-2 spec §5 test list:
//  - 2 valid roles + brief -> alternating dialogue[], >= 2 turns, all roles in-set, speaker_role+line keys.
//  - dialogue_roles with an out-of-set role -> dropped; if < 2 valid remain -> monologue fallback.
//  - no dialogue_roles / format='video_short_avatar' -> unchanged monologue path (regression: fallback).
//  - generation returns an out-of-set role in a turn -> that turn repaired/dropped.
//  - pure-helper unit for the validation/repair.
//
// Run: deno test --allow-read --allow-env supabase/functions/ai-worker/dialogue_script_test.ts

import { assert, assertEquals, assertExists, assertFalse } from 'jsr:@std/assert@1';
import {
  resolveParticipatingRoles,
  normalizeDialogueTurns,
  dialogueIsRenderable,
  estimateDialogueDurationS,
  persistDialogueDraft,
} from './index.ts';

const ACTIVE = ['local_area_coordinator', 'participant', 'support_coordinator'];

// --- resolveParticipatingRoles --------------------------------------------------------------------

// 2 valid requested roles that are ALSO active -> both participate, in request order.
Deno.test('cc-0084 roles: two valid active roles => both participate (ordered, deduped)', () => {
  assertEquals(
    resolveParticipatingRoles(['participant', 'local_area_coordinator'], ACTIVE),
    ['participant', 'local_area_coordinator'],
  );
});

// An out-of-set requested role is dropped; if < 2 valid remain the caller gets an under-2 set => fallback.
Deno.test('cc-0084 roles: out-of-set role dropped, < 2 valid => fallback signal (length < 2)', () => {
  const got = resolveParticipatingRoles(['participant', 'ceo_not_a_role'], ACTIVE);
  assertEquals(got, ['participant']);           // 'ceo_not_a_role' dropped (not active)
  assert(got.length < 2);                        // caller degrades to monologue
});

// Duplicates collapse to distinct; still needs 2 DISTINCT to be a dialogue.
Deno.test('cc-0084 roles: duplicate requested role collapses => single (fallback)', () => {
  const got = resolveParticipatingRoles(['participant', 'participant'], ACTIVE);
  assertEquals(got, ['participant']);
  assert(got.length < 2);
});

// Regression: no dialogue_roles (format='video_short_avatar' monologue path) => empty => fallback.
Deno.test('cc-0084 roles: missing/undefined dialogue_roles => [] (monologue regression)', () => {
  assertEquals(resolveParticipatingRoles(undefined, ACTIVE), []);
  assertEquals(resolveParticipatingRoles(null, ACTIVE), []);
  assertEquals(resolveParticipatingRoles('participant', ACTIVE), []);   // non-array
});

// Garbage entries are ignored, never throw.
Deno.test('cc-0084 roles: garbage entries ignored, no throw', () => {
  assertEquals(resolveParticipatingRoles([123, '', '  ', 'participant', { x: 1 }], ACTIVE), ['participant']);
  assertEquals(resolveParticipatingRoles(['participant', 'local_area_coordinator'], 'not-an-array'), []);
});

// --- normalizeDialogueTurns ------------------------------------------------------------------------

const PARTICIPATING = ['local_area_coordinator', 'participant'];

// Happy path: alternating turns, all roles in-set -> exact { speaker_role, line } shape emitted.
Deno.test('cc-0084 turns: valid alternating turns => speaker_role + line keys, in order', () => {
  const raw = [
    { role_code: 'local_area_coordinator', line: 'Welcome — let me explain how supports work.' },
    { role_code: 'participant', line: 'Thanks, that makes it much clearer for me.' },
  ];
  const out = normalizeDialogueTurns(raw, PARTICIPATING);
  assertEquals(out.length, 2);
  assertEquals(out[0], { speaker_role: 'local_area_coordinator', line: 'Welcome — let me explain how supports work.' });
  assertEquals(out[1], { speaker_role: 'participant', line: 'Thanks, that makes it much clearer for me.' });
  // Every emitted turn carries exactly the two heygen-consumed keys.
  for (const t of out) assertEquals(Object.keys(t).sort(), ['line', 'speaker_role']);
});

// role_code is mapped onto speaker_role; a pre-mapped speaker_role is also accepted.
Deno.test('cc-0084 turns: role_code mapped to speaker_role; speaker_role accepted directly', () => {
  const out = normalizeDialogueTurns(
    [
      { role_code: 'participant', line: 'From role_code.' },
      { speaker_role: 'local_area_coordinator', line: 'From speaker_role.' },
    ],
    PARTICIPATING,
  );
  assertEquals(out.map((t) => t.speaker_role), ['participant', 'local_area_coordinator']);
});

// A turn whose role is NOT in the participating set is dropped (repair by exclusion).
Deno.test('cc-0084 turns: out-of-set role in a turn => that turn dropped', () => {
  const raw = [
    { role_code: 'local_area_coordinator', line: 'In set, kept.' },
    { role_code: 'ceo_not_participating', line: 'Out of set, dropped.' },
    { role_code: 'participant', line: 'In set, kept.' },
  ];
  const out = normalizeDialogueTurns(raw, PARTICIPATING);
  assertEquals(out.map((t) => t.speaker_role), ['local_area_coordinator', 'participant']);
});

// Empty / whitespace / non-string lines are dropped; malformed turns ignored; never throws.
Deno.test('cc-0084 turns: empty-line and malformed turns dropped (no throw)', () => {
  const raw = [
    { role_code: 'participant', line: '   ' },            // whitespace -> dropped
    { role_code: 'participant', line: 42 },               // non-string -> dropped
    null,                                                  // malformed -> ignored
    'nope',                                                // malformed -> ignored
    { role_code: 'participant', line: 'Kept line.' },
    { role_code: 'local_area_coordinator', line: 'Also kept.' },
  ];
  const out = normalizeDialogueTurns(raw, PARTICIPATING);
  assertEquals(out, [
    { speaker_role: 'participant', line: 'Kept line.' },
    { speaker_role: 'local_area_coordinator', line: 'Also kept.' },
  ]);
});

// Turn count is capped at maxTurns; line length is clamped at maxLineChars (word boundary).
Deno.test('cc-0084 turns: caps turn count and clamps line length', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({
    role_code: i % 2 === 0 ? 'participant' : 'local_area_coordinator',
    line: `Turn number ${i}.`,
  }));
  assertEquals(normalizeDialogueTurns(many, PARTICIPATING, { maxTurns: 4 }).length, 4);

  const longLine = 'word '.repeat(200).trim();           // ~1000 chars
  const clamped = normalizeDialogueTurns(
    [
      { role_code: 'participant', line: longLine },
      { role_code: 'local_area_coordinator', line: 'short' },
    ],
    PARTICIPATING,
    { maxLineChars: 40 },
  );
  assert(clamped[0].line.length <= 40);
});

// Non-array raw turns => empty (never throws).
Deno.test('cc-0084 turns: non-array raw => [] (no throw)', () => {
  assertEquals(normalizeDialogueTurns(null, PARTICIPATING), []);
  assertEquals(normalizeDialogueTurns(undefined, PARTICIPATING), []);
  assertEquals(normalizeDialogueTurns({ dialogue: [] }, PARTICIPATING), []);
});

// --- dialogueIsRenderable --------------------------------------------------------------------------

Deno.test('cc-0084 renderable: >= 2 turns AND >= 2 distinct roles => true', () => {
  assert(dialogueIsRenderable([
    { speaker_role: 'participant' },
    { speaker_role: 'local_area_coordinator' },
  ]));
});

Deno.test('cc-0084 renderable: < 2 turns => false (fallback)', () => {
  assertFalse(dialogueIsRenderable([{ speaker_role: 'participant' }]));
  assertFalse(dialogueIsRenderable([]));
});

Deno.test('cc-0084 renderable: 2 turns but only 1 distinct role => false (fallback)', () => {
  assertFalse(dialogueIsRenderable([
    { speaker_role: 'participant' },
    { speaker_role: 'participant' },
  ]));
});

// --- integrated validate -> repair -> decide (mock LLM output, no network) -------------------------

// Full contract as generateDialogueScript composes it: given the participating set + a raw model
// dialogue containing an out-of-set turn, the pipeline drops it, keeps 2 distinct in-set turns, and
// the result is renderable with speaker_role/line keys.
Deno.test('cc-0084 integrated: 2 valid roles + mixed model output => renderable in-set dialogue', () => {
  const participating = resolveParticipatingRoles(['local_area_coordinator', 'participant'], ACTIVE);
  assertEquals(participating.length, 2);
  const modelOut = {
    dialogue: [
      { role_code: 'local_area_coordinator', line: 'Here is how your plan supports you.' },
      { role_code: 'ceo_not_participating', line: 'Injected out-of-set turn.' },     // must be dropped
      { role_code: 'participant', line: 'That is reassuring to hear.' },
    ],
  };
  const dialogue = normalizeDialogueTurns(modelOut.dialogue, participating, { maxTurns: 4 });
  assert(dialogueIsRenderable(dialogue));
  assertEquals(dialogue.map((t) => t.speaker_role), ['local_area_coordinator', 'participant']);
  assert(estimateDialogueDurationS(dialogue) > 0);
});

// Full fallback contract: an out-of-set-heavy request that leaves < 2 valid participating roles yields
// an under-2 set (generateDialogueScript returns null there => caller degrades to monologue).
Deno.test('cc-0084 integrated: < 2 valid participating roles => fallback (monologue)', () => {
  const participating = resolveParticipatingRoles(['participant', 'ceo_not_a_role', 'also_bogus'], ACTIVE);
  assert(participating.length < 2);   // generateDialogueScript short-circuits to null here
});

// --- estimateDialogueDurationS ---------------------------------------------------------------------

Deno.test('cc-0084 duration: sums per-turn estimates, >= 4s floor per turn', () => {
  const d = estimateDialogueDurationS([{ line: 'one two three' }, { line: 'four' }]);
  assert(d >= 8);                     // two turns, each floored at 4s
  assertEquals(estimateDialogueDurationS([]), 0);
});

// --- persistDialogueDraft: WRITE ORDER (v2.24.1 clobber-bug regression) -----------------------------
// A draft-store stub that faithfully models the two write semantics:
//   * .update({ draft_format }) is a FULL-COLUMN REPLACE of draft_format.
//   * set_draft_video_script (rpc) MERGES video_script into the CURRENT draft_format (jsonb `||`).
// It seeds draft_format with the earlier baseUpdate meta (as production does), records every write,
// and exposes the FINAL draft_format so we can prove both scene_count AND video_script survive.
function draftStoreStub(opts?: { failUpdate?: boolean; failRpc?: boolean }) {
  const state: { draft_format: Record<string, unknown> } = {
    // Seeded as after baseUpdate: caption/compliance meta, NO video_script yet.
    draft_format: { ai: { model: 'claude' }, compliance_ok: true },
  };
  const writes: Array<{ kind: 'update' | 'rpc'; payload: any }> = [];
  const chainUpdate = {
    update(payload: any) {
      writes.push({ kind: 'update', payload });
      return {
        async eq(_k: string, _v: unknown) {
          if (opts?.failUpdate) return { error: { message: 'update boom' } };
          // FULL REPLACE of draft_format (the production .update semantics).
          state.draft_format = payload.draft_format;
          return { error: null };
        },
      };
    },
  };
  const supabase: any = {
    schema: (_s: string) => ({ from: (_t: string) => chainUpdate }),
    async rpc(fn: string, args: any) {
      writes.push({ kind: 'rpc', payload: { fn, args } });
      if (fn !== 'set_draft_video_script') return { error: { message: `unexpected rpc ${fn}` } };
      if (opts?.failRpc) return { error: { message: 'rpc boom' } };
      // MERGE video_script into the CURRENT draft_format (jsonb `||`), like the DB function.
      state.draft_format = { ...state.draft_format, video_script: args.p_video_script };
      return { error: null };
    },
  };
  return { supabase, state, writes };
}

const DRAFT_META = { ai: { model: 'claude' }, compliance_ok: true };
const DLG = {
  format: 'avatar_dialogue' as const,
  render_style: 'realistic' as const,
  total_duration_s: 24,
  dialogue: [
    { speaker_role: 'local_area_coordinator', line: 'Here is how your plan works.' },
    { speaker_role: 'participant', line: 'That is really helpful, thank you.' },
  ],
};

// THE regression: final draft_format must carry BOTH scene_count AND video_script.dialogue (the
// pre-fix order clobbered video_script -> null). Also proves the write ORDER: update BEFORE rpc.
Deno.test('cc-0084 persist: final draft_format has BOTH scene_count AND video_script.dialogue', async () => {
  const { supabase, state, writes } = draftStoreStub();
  const ok = await persistDialogueDraft(supabase, 'draft-1', DRAFT_META, DLG);
  assertEquals(ok, true);

  // scene_count survived AND video_script survived (the bug made video_script null).
  assertEquals(state.draft_format.scene_count, 2);
  assertExists(state.draft_format.video_script);
  assertEquals((state.draft_format.video_script as any).dialogue.length, 2);
  assertEquals((state.draft_format.video_script as any).dialogue[0].speaker_role, 'local_area_coordinator');
  // Earlier caption/compliance meta is still present too.
  assertEquals(state.draft_format.compliance_ok, true);

  // Order proof: the scene_count .update() ran BEFORE the set_draft_video_script rpc.
  assertEquals(writes.map((w) => w.kind), ['update', 'rpc']);
  assertEquals((writes[0].payload.draft_format as any).scene_count, 2);
  assertEquals(writes[1].payload.fn, 'set_draft_video_script');
});

// Fail-safe: a failed scene_count update => false, and the rpc is NOT attempted (caller -> monologue).
Deno.test('cc-0084 persist: scene_count update failure => false, rpc not attempted', async () => {
  const { supabase, writes } = draftStoreStub({ failUpdate: true });
  const ok = await persistDialogueDraft(supabase, 'draft-1', DRAFT_META, DLG);
  assertEquals(ok, false);
  assertEquals(writes.map((w) => w.kind), ['update']);   // rpc never reached
});

// Fail-safe: a failed video_script rpc => false (caller degrades to monologue).
Deno.test('cc-0084 persist: video_script rpc failure => false', async () => {
  const { supabase, writes } = draftStoreStub({ failRpc: true });
  const ok = await persistDialogueDraft(supabase, 'draft-1', DRAFT_META, DLG);
  assertEquals(ok, false);
  assertEquals(writes.map((w) => w.kind), ['update', 'rpc']);
});
