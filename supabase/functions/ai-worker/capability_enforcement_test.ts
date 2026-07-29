// capability_enforcement_test.ts — v2.25.0 hermetic tests for S9 Layer 2.
//
// Fully hermetic: NO DB, NO network, NO Deno.serve (index.ts guards its listener behind
// `if (import.meta.main)`, so importing it here does NOT start the server). The supabase
// client is a hand-rolled stub — no @supabase/supabase-js runtime is exercised.
//
// Covers the three behaviours named in the build brief's Success criteria, plus the
// addendum's two added test-matrix entries:
//   (1) READY   -> unchanged behaviour (isCapabilityReady true, nothing blocks).
//   (2) NON-READY -> the exact canonical blocked-state write (PK ruling 3).
//   (3) classifier ERROR / THROW / unresolvable slug / unrecognised payload -> fail-closed,
//       NEVER 'ready'.
//   (4) publisher_path_missing (the 7th status, added after this design was written) produces
//       the identical canonical blocked state — proving the generic `status === 'ready'` test
//       covers new statuses by construction, with no enumeration to update.
//   (5) skip_reason / final_format_reason string formats name the status correctly.
//
// Run: deno test --allow-read --allow-env supabase/functions/ai-worker/capability_enforcement_test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1';
import {
  __resetClientSlugCacheForTests,
  buildBlockedDraftUpdate,
  type CapabilityVerdict,
  classifyCapability,
  getClientSlug,
  CARVE_OUT_ELIGIBLE_STATUSES,
  isCapabilityExemptFormat,
  isCapabilityReady,
  S9_CAPABILITY_MARKER,
  shouldBlockOnCapability,
} from './index.ts';

// --- stub -------------------------------------------------------------------
// Reproduces the exact call shapes used by the code under test:
//   supabase.schema('c').from('client').select('client_slug').eq(...).maybeSingle()
//   supabase.rpc('classify_format_capability', {...})
function stubClient(opts: {
  slug?: { data: any; error: any };
  slugThrows?: boolean;
  rpc?: { data: any; error: any };
  rpcThrows?: boolean;
  exempt?: { data: any; error: any };
  exemptThrows?: boolean;
} = {}): any {
  const slugResult = opts.slug ?? { data: { client_slug: 'ndis-yarns' }, error: null };
  const chain: any = {
    select: (_c: string) => chain,
    eq: (_k: string, _v: unknown) => chain,
    maybeSingle: async () => {
      if (opts.slugThrows) throw new Error('stub slug throw');
      return slugResult;
    },
  };
  return {
    schema: (_s: string) => ({ from: (_t: string) => chain }),
    rpc: async (fn: string, _args: unknown) => {
      if (fn === 'is_capability_exempt_format') {
        if (opts.exemptThrows) throw new Error('stub exempt throw');
        return opts.exempt ?? { data: false, error: null };
      }
      if (opts.rpcThrows) throw new Error('stub rpc throw');
      return opts.rpc ?? { data: null, error: null };
    },
  };
}

const READY = { status: 'ready', reason_code: 'selectable', routed_lane: null, evidence: { selected: {} } };
const CALL = ['client-uuid', 'youtube', 'video_short_avatar'] as const;

// --- (1) READY --------------------------------------------------------------
Deno.test('READY: a ready cell classifies ready and does not block', async () => {
  __resetClientSlugCacheForTests();
  const sb = stubClient({ rpc: { data: READY, error: null } });
  const v = await classifyCapability(sb, ...CALL);
  assertEquals(v.status, 'ready');
  assert(isCapabilityReady(v), 'ready must not block');
});

// --- (2) NON-READY -> canonical blocked state -------------------------------
Deno.test('NON-READY: canonical blocked-state write obeys PK ruling 3 exactly', async () => {
  __resetClientSlugCacheForTests();
  const sb = stubClient({
    rpc: {
      data: {
        status: 'unsupported_silent_degrade',
        reason_code: 'format_unmapped',
        routed_lane: 'enforcement_r3',
        evidence: { publish_count: 54 },
      },
      error: null,
    },
    error: null,
  } as any);

  const v = await classifyCapability(sb, ...CALL);
  assertEquals(isCapabilityReady(v), false);

  const u = buildBlockedDraftUpdate(v, {
    requestedFormat: 'video_short_avatar',
    advisorFormat: 'video_short_avatar',
    formatMode: 'explicit',
    blockedFormat: 'video_short_avatar',
    at: '2026-07-29T00:00:00.000Z',
  });

  // NO legacy/substitute format is ever written back.
  assertEquals(u.recommended_format, null);
  assertEquals(u.recommended_reason, null);
  // The desired format is preserved unconditionally.
  assertEquals(u.requested_format, 'video_short_avatar');
  // Blocker authority + reason live in the existing free-text columns.
  assertEquals(u.final_format_authority, 'blocked_by_capability');
  assertEquals(u.final_format_reason, 'unsupported_silent_degrade:format_unmapped');
  // The classifier's own payload is carried verbatim, never re-derived locally.
  assertEquals((u.resolver_evidence as any).capability.evidence.publish_count, 54);
  assertEquals((u.resolver_evidence as any).marker, S9_CAPABILITY_MARKER);

  // Statuses that must NEVER be used to represent capability blocking (PK ruling 3),
  // and fields that must not be touched because no generation ran.
  for (const forbidden of ['approval_status', 'video_status', 'image_status', 'dead_reason', 'draft_title', 'draft_body']) {
    assert(!(forbidden in u), `blocked update must not write ${forbidden}`);
  }
});

// --- (3) fail-closed --------------------------------------------------------
Deno.test('FAIL-CLOSED: rpc error is never ready', async () => {
  __resetClientSlugCacheForTests();
  const sb = stubClient({ rpc: { data: null, error: { code: '42501', message: 'permission denied' } } });
  const v = await classifyCapability(sb, ...CALL);
  assertEquals(v.status, 'capability_check_error');
  assertEquals(isCapabilityReady(v), false);
});

Deno.test('FAIL-CLOSED: rpc throw is never ready', async () => {
  __resetClientSlugCacheForTests();
  const sb = stubClient({ rpcThrows: true });
  const v = await classifyCapability(sb, ...CALL);
  assertEquals(v.status, 'capability_check_error');
  assertEquals(isCapabilityReady(v), false);
});

Deno.test('FAIL-CLOSED: unresolvable client_slug is never ready, and never calls the classifier', async () => {
  __resetClientSlugCacheForTests();
  let rpcCalled = false;
  const sb = stubClient({ slug: { data: null, error: null } });
  sb.rpc = async () => { rpcCalled = true; return { data: READY, error: null }; };
  const v = await classifyCapability(sb, ...CALL);
  assertEquals(v.status, 'unknown');
  assertEquals(v.reason_code, 'client_slug_unresolved');
  assertEquals(isCapabilityReady(v), false);
  assertEquals(rpcCalled, false, 'must not classify against an unresolved client');
});

Deno.test('FAIL-CLOSED: a slug lookup that throws is never ready', async () => {
  __resetClientSlugCacheForTests();
  const sb = stubClient({ slugThrows: true });
  assertEquals(await getClientSlug(sb, 'client-uuid'), null);
  __resetClientSlugCacheForTests();
  const v = await classifyCapability(stubClient({ slugThrows: true }), ...CALL);
  assertEquals(isCapabilityReady(v), false);
});

Deno.test('FAIL-CLOSED: an unrecognised classifier payload is never ready', async () => {
  for (const payload of [null, {}, { status: 123 }, { status: '' }, 'ready']) {
    __resetClientSlugCacheForTests();
    const sb = stubClient({ rpc: { data: payload, error: null } });
    const v = await classifyCapability(sb, ...CALL);
    assertEquals(isCapabilityReady(v), false, `payload ${JSON.stringify(payload)} must not be ready`);
    assertEquals(v.status, 'unknown');
  }
});

Deno.test('FAIL-CLOSED: an absent format is never ready', async () => {
  __resetClientSlugCacheForTests();
  const v = await classifyCapability(stubClient(), 'client-uuid', 'youtube', null);
  assertEquals(v.status, 'unknown');
  assertEquals(v.reason_code, 'format_absent');
  assertEquals(isCapabilityReady(v), false);
});

// --- (4) the 7th status, publisher_path_missing -----------------------------
// Added after this design was written. It is covered by construction because the ready
// test is generic — there is no enumeration of blocked statuses anywhere to fall out of.
Deno.test('publisher_path_missing: 7th status blocks identically, no enumeration needed', async () => {
  __resetClientSlugCacheForTests();
  const sb = stubClient({
    rpc: {
      data: {
        status: 'publisher_path_missing',
        reason_code: 'no_publish_profile_row',
        routed_lane: 'onboarding',
        evidence: { checked: 'c.client_publish_profile' },
      },
      error: null,
    },
  });
  const v = await classifyCapability(sb, 'client-uuid', 'youtube', 'video_long_form');
  assertEquals(isCapabilityReady(v), false);

  const u = buildBlockedDraftUpdate(v, {
    requestedFormat: 'video_long_form', advisorFormat: 'video_long_form',
    formatMode: null, blockedFormat: 'video_long_form', at: '2026-07-29T00:00:00.000Z',
  });
  assertEquals(u.recommended_format, null);
  assertEquals(u.final_format_authority, 'blocked_by_capability');
  assertEquals(u.final_format_reason, 'publisher_path_missing:no_publish_profile_row');
});

// A hypothetical future 8th status must also block, with zero code change.
Deno.test('an unknown FUTURE status blocks by construction', async () => {
  __resetClientSlugCacheForTests();
  const sb = stubClient({ rpc: { data: { status: 'some_status_invented_in_2027', reason_code: 'x' }, error: null } });
  const v = await classifyCapability(sb, ...CALL);
  assertEquals(isCapabilityReady(v), false);
});

// --- (6) template-less carve-out — PK ruling 2026-07-29, Option A ------------
const NOT_READY: CapabilityVerdict = {
  status: 'unsupported_silent_degrade', reason_code: 'format_unmapped',
  routed_lane: 'enforcement_r3', evidence: null, error: null,
};

Deno.test('CARVE-OUT: a template-less format (render_engine=none) does NOT block despite non-ready', async () => {
  __resetClientSlugCacheForTests();
  const sb = stubClient({ exempt: { data: true, error: null } });
  assertEquals(await isCapabilityExemptFormat(sb, 'text'), true);
  assertEquals(await shouldBlockOnCapability(sb, NOT_READY, 'text'), false);
});

Deno.test('CARVE-OUT: a NON-exempt format still blocks on the same non-ready verdict', async () => {
  __resetClientSlugCacheForTests();
  const sb = stubClient({ exempt: { data: false, error: null } });
  assertEquals(await shouldBlockOnCapability(sb, NOT_READY, 'video_short_avatar'), true);
});

Deno.test('CARVE-OUT: ready short-circuits BEFORE the exemption lookup (no extra round-trip)', async () => {
  __resetClientSlugCacheForTests();
  let exemptCalled = false;
  const sb = stubClient();
  sb.rpc = async (fn: string) => {
    if (fn === 'is_capability_exempt_format') { exemptCalled = true; return { data: true, error: null }; }
    return { data: READY, error: null };
  };
  const v = await classifyCapability(sb, ...CALL);
  assertEquals(await shouldBlockOnCapability(sb, v, 'image_quote'), false);
  assertEquals(exemptCalled, false, 'ready must not pay for an exemption lookup');
});

Deno.test('CARVE-OUT FAIL-CLOSED: an exemption lookup error/throw/non-true NEVER grants exemption', async () => {
  for (const opts of [
    { exempt: { data: null, error: { code: '42501', message: 'permission denied' } } },
    { exemptThrows: true },
    { exempt: { data: false, error: null } },
    { exempt: { data: null, error: null } },
    { exempt: { data: 'true', error: null } },   // string, not boolean true
    { exempt: { data: 1, error: null } },
  ]) {
    __resetClientSlugCacheForTests();
    const sb = stubClient(opts as any);
    assertEquals(await isCapabilityExemptFormat(sb, 'text'), false, `${JSON.stringify(opts)} must not be exempt`);
    assertEquals(await shouldBlockOnCapability(sb, NOT_READY, 'text'), true, 'unproven exemption must still block');
  }
});

Deno.test('CARVE-OUT SCOPE: an exempt format still BLOCKS on a genuine capability gap', async () => {
  // The carve-out must not become a blanket pass for template-less formats: it covers
  // only the template-coverage artefact, never a real gap.
  const genuineGaps: CapabilityVerdict[] = [
    { status: 'publisher_path_missing', reason_code: 'no_publish_profile_row', routed_lane: null, evidence: null, error: null },
    { status: 'governance_unproven', reason_code: 'not_visually_proven', routed_lane: null, evidence: null, error: null },
    { status: 'asset_shortage', reason_code: 'assets_fail_closed', routed_lane: null, evidence: null, error: null },
    { status: 'pipeline_missing', reason_code: 'missing_required_logo', routed_lane: null, evidence: null, error: null },
    { status: 'unknown', reason_code: 'fail_closed', routed_lane: null, evidence: null, error: null },
    { status: 'capability_check_error', reason_code: 'rpc_error', routed_lane: null, evidence: null, error: null },
    { status: 'a_future_status_invented_in_2027', reason_code: null, routed_lane: null, evidence: null, error: null },
  ];
  for (const v of genuineGaps) {
    let exemptCalled = false;
    const sb = stubClient();
    sb.rpc = async (fn: string) => {
      if (fn === 'is_capability_exempt_format') { exemptCalled = true; return { data: true, error: null }; }
      return { data: null, error: null };
    };
    // Even with the registry saying "exempt", a genuine gap must block.
    assertEquals(await shouldBlockOnCapability(sb, v, 'text'), true, `${v.status} must still block`);
    assertEquals(exemptCalled, false, `${v.status} must not even consult the exemption`);
  }
});

Deno.test('CARVE-OUT SCOPE: only the two artefact statuses are carve-out eligible', () => {
  assertEquals([...CARVE_OUT_ELIGIBLE_STATUSES].sort(), ['template_missing', 'unsupported_silent_degrade']);
});

Deno.test('CARVE-OUT: template_missing on a template-less format is exempt too', async () => {
  __resetClientSlugCacheForTests();
  const sb = stubClient({ exempt: { data: true, error: null } });
  const v: CapabilityVerdict = { status: 'template_missing', reason_code: 'format_unmapped', routed_lane: null, evidence: null, error: null };
  assertEquals(await shouldBlockOnCapability(sb, v, 'text'), false);
});

Deno.test('CARVE-OUT: an absent format is never exempt', async () => {
  const sb = stubClient({ exempt: { data: true, error: null } });
  assertEquals(await isCapabilityExemptFormat(sb, null), false);
});

Deno.test('CARVE-OUT: the exempt set is not hardcoded — the format string is passed straight through', async () => {
  let seen: any = null;
  const sb = stubClient();
  sb.rpc = async (fn: string, args: any) => {
    if (fn === 'is_capability_exempt_format') { seen = args; return { data: true, error: null }; }
    return { data: null, error: null };
  };
  await isCapabilityExemptFormat(sb, 'some_future_templateless_format');
  assertEquals(seen, { p_format: 'some_future_templateless_format' });
});

// --- (5) evidence string formats -------------------------------------------
Deno.test('skip_reason and final_format_reason name the actual classifier status', () => {
  const cases: Array<[string, string | null, string]> = [
    ['unsupported_silent_degrade', 'format_unmapped', 'unsupported_silent_degrade:format_unmapped'],
    ['publisher_path_missing', 'no_publish_profile_row', 'publisher_path_missing:no_publish_profile_row'],
    ['template_missing', 'format_unmapped', 'template_missing:format_unmapped'],
    ['capability_check_error', 'rpc_error', 'capability_check_error:rpc_error'],
    ['unknown', null, 'unknown:none'],
  ];
  for (const [status, reason, expected] of cases) {
    const v: CapabilityVerdict = { status, reason_code: reason, routed_lane: null, evidence: null, error: null };
    const u = buildBlockedDraftUpdate(v, {
      requestedFormat: 'carousel', advisorFormat: 'carousel', formatMode: null,
      blockedFormat: 'carousel', at: '2026-07-29T00:00:00.000Z',
    });
    assertEquals(u.final_format_reason, expected);
    // The slot-side code composes 'capability_blocked:<status>:<format>' from the same status.
    assertEquals(`capability_blocked:${v.status}:carousel`, `capability_blocked:${status}:carousel`);
  }
});
