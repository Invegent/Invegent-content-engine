// creatomate_submit.ts — Creatomate submit+poll HTTP logic, EXTRACTED verbatim from index.ts.
//
// v3.16.1 (WS-4/WS-5 D4 out-of-band proof render, 2026-08-01): moved out of index.ts (not
// reimplemented — every line below is unchanged from index.ts's own prior inline code) into its OWN
// sibling module for exactly one reason: index.ts has a TOP-LEVEL, unguarded `Deno.serve(...)` call
// (index.ts:1541-ish) — importing index.ts as a module (from a test, or a standalone script) would
// start a live HTTP listener as a side effect of the import. This module has ZERO such side effects
// (no Deno.serve, no Supabase client, no top-level env read) — it is pure/safe to import from
// anywhere, exactly like the sibling b1_video_stat.ts / b1_video_kinetic.ts pure modules.
//
// index.ts's renderUploadAndLog now imports submitAndPollCreatomateRender from HERE instead of
// defining it inline — its own behaviour is BYTE-IDENTICAL to before this extraction (same fetch
// calls, same poll loop, same error strings). This module additionally lets an out-of-band proof-
// render harness (scripts/ws4-d4-kinetic-proof-render.ts) fire the IDENTICAL real Creatomate
// submit+poll HTTP logic production uses, without importing index.ts (and therefore without starting
// its listener) and without pulling in renderUploadAndLog's storage-upload / write_render_log /
// record_music_usage DB-write side effects.
//
// v3.16.2 (2026-08-02, Fix 1 — db-rls-auditor finding on the v3.16.1 extraction): the FIRST cut of
// this extraction was NOT byte-identical to the original inline code in one real respect. In the
// ORIGINAL inline code, `renderId` was assigned in index.ts IMMEDIATELY after the Creatomate submit
// succeeded, BEFORE pollRender was called — so if pollRender then threw (a 2-minute render timeout is
// a real, DOCUMENTED, recurring ICE failure mode — see the file header note on POLL_MAX_ATTEMPTS/the
// 2-min ceiling — not hypothetical), the caller's outer catch still had the real Creatomate render ID
// for the failure write_render_log write (p_creatomate_render_id) and the render-QA
// provider_job_id_present flag. Wrapping submit+poll inside ONE awaited call that only returns on full
// success broke that: if pollRender throws, control never reaches the caller's `renderId = ...` line,
// so the failure-path log silently got null/false instead of the real id — a genuine loss of operator
// traceability on exactly the failure class that matters most. FIX: submitAndPollCreatomateRender now
// catches a poll-stage throw, attaches the already-known renderId to the SAME error object (as a
// plain `.creatomateRenderId` property — duck-typed, not a custom Error subclass, so it survives
// bundling/instanceof-identity edge cases) and rethrows it unchanged (same message, same stack) — the
// caller (index.ts's renderUploadAndLog) reads that property BEFORE rethrowing to its own outer catch.
// A submit-stage failure (no render ID was ever minted) is unaffected — there is nothing to attach.

export const CREATOMATE_API = 'https://api.creatomate.com/v2/renders';
export const POLL_INTERVAL_MS = 2500;
export const POLL_MAX_ATTEMPTS = 48;  // 2 min max — UNCHANGED from index.ts's own constant.

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

// Moved verbatim from index.ts's private pollRender.
export async function pollRender(renderId: string, apiKey: string, startMs: number): Promise<{ url: string; creditsUsed: number | null; durationMs: number }> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const resp = await fetch(`${CREATOMATE_API}/${renderId}`, { headers: { 'Authorization': `Bearer ${apiKey}` } });
    if (!resp.ok) throw new Error(`Poll failed: ${resp.status}`);
    const data = await resp.json();
    if (data.status === 'succeeded') return { url: data.url, creditsUsed: data.credits != null ? Number(data.credits) : null, durationMs: Date.now() - startMs };
    if (data.status === 'failed') throw new Error(`Creatomate failed: ${data.error_message ?? 'unknown'}`);
    console.log(`[video-worker] render ${renderId}: ${data.status} (${i + 1}/${POLL_MAX_ATTEMPTS})`);
  }
  throw new Error('Render timed out after 2 minutes');
}

// Moved verbatim from index.ts's inline renderUploadAndLog submit block (v3.16.1 extraction).
export async function submitAndPollCreatomateRender(
  renderScript: object,
  creatomateKey: string,
  startMs: number = Date.now(),
): Promise<{ renderId: string; url: string; creditsUsed: number | null; durationMs: number }> {
  const submitResp = await fetch(CREATOMATE_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creatomateKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(renderScript),
  });
  if (!submitResp.ok) throw new Error(`Creatomate submit ${submitResp.status}: ${await submitResp.text()}`);
  const sub = await submitResp.json();
  const render = Array.isArray(sub) ? sub[0] : sub;
  const renderId = render?.id ?? null;
  if (!renderId) throw new Error('No render ID in Creatomate response');
  try {
    const { url, creditsUsed, durationMs } = await pollRender(renderId, creatomateKey, startMs);
    return { renderId, url, creditsUsed, durationMs };
  } catch (e: any) {
    // v3.16.2 Fix 1: the render ID IS known at this point (submit succeeded) — surface it to the
    // caller even though this call is failing, so a failure-path write_render_log can still report
    // the real Creatomate render id. Same error object, same message/stack — only a new property.
    const err = e instanceof Error ? e : new Error(String(e));
    (err as Error & { creatomateRenderId?: string }).creatomateRenderId = renderId;
    throw err;
  }
}
