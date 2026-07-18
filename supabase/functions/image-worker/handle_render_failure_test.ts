// handle_render_failure_test.ts — cc-0040 Step 1 hermetic tests (image-worker).
// Fully hermetic: NO real DB / network. A tiny mock stands in for the service-role supabase
// client (records supabase.rpc(...) calls and the schema().from().update().eq() chain). Proves,
// for each of the THREE single-render capped formats (image_quote / animated_text_reveal /
// animated_data), that a pre-render throw handled by handleRenderFailure():
//  (a) issues a write_render_log RPC with p_status:'failed' and the correct p_post_draft_id /
//      p_ice_format_key / p_client_id (the loop's raw draft.client_id);
//  (b) STILL performs the image_status='failed' update EVEN WHEN write_render_log THROWS
//      (best-effort — a logging failure never changes the existing failed-status behaviour).
// NOTE: importing ./index.ts starts its top-level Deno.serve (binds :8000) — harmless under
// `deno test` (the runner force-exits); this file only needs the exported handleRenderFailure.
// Run: deno test --allow-all supabase/functions/image-worker/handle_render_failure_test.ts

import { assert, assertEquals } from 'jsr:@std/assert@1';
import { handleRenderFailure } from './index.ts';

type RpcCall = { name: string; params: any };
type UpdateCall = { table: string; payload: any; eqCol: string; eqVal: any };

// Mock supabase: records rpc() calls and the schema('m').from('post_draft').update({...}).eq(...)
// chain. `rpcThrows` makes rpc() throw (exercises the best-effort swallow). `updateThrows` would
// let us prove the update ran (we assert on the recorded call instead).
function mockSupabase(opts: { rpcThrows?: boolean } = {}) {
  const rpcCalls: RpcCall[] = [];
  const updateCalls: UpdateCall[] = [];
  const supabase = {
    rpc: async (name: string, params: any) => {
      rpcCalls.push({ name, params });
      if (opts.rpcThrows) throw new Error('write_render_log boom (simulated)');
      return { data: null, error: null };
    },
    schema: (_s: string) => ({
      from: (table: string) => ({
        update: (payload: any) => ({
          eq: async (eqCol: string, eqVal: any) => {
            updateCalls.push({ table, payload, eqCol, eqVal });
            return { data: null, error: null };
          },
        }),
      }),
    }),
  };
  return { supabase, rpcCalls, updateCalls };
}

const FORMATS = ['image_quote', 'animated_text_reveal', 'animated_data'];

// ── (a) happy path: rpc(failed) + update(failed) for each capped format ──────────
for (const fmt of FORMATS) {
  Deno.test(`handleRenderFailure[${fmt}]: writes failed render-log + failed status`, async () => {
    const { supabase, rpcCalls, updateCalls } = mockSupabase();
    const draft = { post_draft_id: `pd-${fmt}`, client_id: `client-${fmt}` };
    await handleRenderFailure(supabase, draft, fmt, 'assertHeadlineWithinGate: too long');

    // exactly one write_render_log call, status=failed, correct identity fields
    assertEquals(rpcCalls.length, 1);
    assertEquals(rpcCalls[0].name, 'write_render_log');
    const p = rpcCalls[0].params;
    assertEquals(p.p_status, 'failed');
    assertEquals(p.p_post_draft_id, `pd-${fmt}`);
    assertEquals(p.p_ice_format_key, fmt);
    assertEquals(p.p_client_id, `client-${fmt}`);   // loop's RAW draft.client_id
    assertEquals(p.p_slide_id, null);
    assertEquals(p.p_render_engine, 'creatomate');
    assertEquals(p.p_creatomate_render_id, null);
    assertEquals(p.p_error_message, 'assertHeadlineWithinGate: too long');

    // the existing failed-status update still ran, unchanged
    assertEquals(updateCalls.length, 1);
    assertEquals(updateCalls[0].table, 'post_draft');
    assertEquals(updateCalls[0].payload.image_status, 'failed');
    assertEquals(updateCalls[0].eqCol, 'post_draft_id');
    assertEquals(updateCalls[0].eqVal, `pd-${fmt}`);
  });
}

// ── (b) best-effort: a THROW from write_render_log must NOT prevent the failed update ─
for (const fmt of FORMATS) {
  Deno.test(`handleRenderFailure[${fmt}]: log throw is swallowed, failed update still runs`, async () => {
    const { supabase, rpcCalls, updateCalls } = mockSupabase({ rpcThrows: true });
    const draft = { post_draft_id: `pd2-${fmt}`, client_id: `client2-${fmt}` };

    // must NOT throw even though rpc() throws
    let threw = false;
    try {
      await handleRenderFailure(supabase, draft, fmt, 'selector rpc failed');
    } catch { threw = true; }
    assert(!threw, 'handleRenderFailure must never throw (best-effort logging)');

    // rpc was attempted, and the image_status='failed' update STILL ran
    assertEquals(rpcCalls.length, 1);
    assertEquals(updateCalls.length, 1);
    assertEquals(updateCalls[0].payload.image_status, 'failed');
    assertEquals(updateCalls[0].eqVal, `pd2-${fmt}`);
  });
}

// ── (c) null draft.client_id is passed through verbatim (flag for db-rls-auditor) ──
Deno.test('handleRenderFailure: null draft.client_id passed through as p_client_id', async () => {
  const { supabase, rpcCalls, updateCalls } = mockSupabase();
  const draft = { post_draft_id: 'pd-null-client', client_id: null };
  await handleRenderFailure(supabase, draft, 'image_quote', 'x');
  assertEquals(rpcCalls[0].params.p_client_id, null);
  assertEquals(updateCalls.length, 1);   // failed update still runs regardless
});
