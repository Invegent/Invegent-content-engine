// image_governance.ts — Spine Gen v2 / D6-1 + D6-2 (image-worker).
//
// Runtime governance + governed-slug resolution for the governed image render path. These
// two I/O helpers REPLACE the PP-UUID-literal gate (isB1GovernedImageQuote) and the frozen
// B1_GOVERNED_CLIENT_SLUG constant on the PRODUCTION image_quote render path, so the path is
// no longer hardcoded to a single brand — a second governed brand is a DATA addition (a
// c.client_creative_governance row + a c.client.client_slug), never a code edit.
//
// They live in their OWN module (not index.ts) ONLY so they can be unit-tested hermetically
// with a mocked supabase client — index.ts has a top-level Deno.serve. This is NOT a
// _shared module: it is image-worker-local, imported only by ./index.ts.
//
// The read logic MIRRORS the proven video-worker isVideoGovernanceEnabled
// (supabase/functions/video-worker/index.ts) VERBATIM: same table, same fail-closed contract.

// Minimal structural view of the service-role Supabase client used by the two reads below.
// Loosely typed (house style) so the real client and a hermetic mock both satisfy it.
// deno-lint-ignore no-explicit-any
export type GovernanceSupabaseClient = any;

// D6-1 — DARK-CAPABLE governance gate. Reads c.client_creative_governance.enabled
// (service-role, read-only) for (clientId, format). FAIL-CLOSED: any error / missing row /
// null → false → the governed branch does NOT fire → the byte-unchanged legacy image path
// runs. PP's (image_quote) governance row is enabled=true live, so PP still enters the
// governed branch — identical routing, now data-driven instead of a UUID literal.
export async function isImageGovernanceEnabled(
  supabase: GovernanceSupabaseClient,
  clientId: string,
  format: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.schema('c').from('client_creative_governance')
      .select('enabled').eq('client_id', clientId).eq('format', format).maybeSingle();
    if (error) { console.error('[image-worker] governance read error (fail-closed → false):', error.message); return false; }
    return data?.enabled === true;
  } catch (e: any) {
    console.error('[image-worker] governance read threw (fail-closed → false):', e?.message);
    return false;
  }
}

// D6-2 — resolve the governed client's CANONICAL slug for select_template + the storage path.
// Reads c.client.client_slug keyed on client_id and THROWS `governed_slug_unresolved` on a
// read error or a null/empty slug. Deliberately NOT getBrandAndSlug's clientSlug, which falls
// back to the client-id UUID when c.client.client_slug is null (the v3.14.0 defect) — a UUID
// slug would silently break select_template's slug→client_id→assignment resolution. A throw
// here hits the EXISTING per-draft catch → image_status='failed' (fail loud, never a
// wrong-slug render).
export async function getGovernedClientSlug(
  supabase: GovernanceSupabaseClient,
  clientId: string,
): Promise<string> {
  const { data, error } = await supabase.schema('c').from('client')
    .select('client_slug').eq('client_id', clientId).limit(1).maybeSingle();
  if (error) throw new Error(`governed_slug_unresolved: ${error.message}`);
  const slug = (data?.client_slug ?? '').trim();
  if (!slug) throw new Error('governed_slug_unresolved');
  return slug;
}
