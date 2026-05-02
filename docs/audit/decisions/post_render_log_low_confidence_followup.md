# LOW-confidence followup — m.post_render_log column purposes

Brief: `docs/briefs/post-render-log-column-purposes.md`
Migration applied: `supabase/migrations/20260502102054_audit_post_render_log_column_purposes.sql`
Run: `docs/runtime/runs/post-render-log-column-purposes-2026-05-02T102054Z.md`

15/16 columns populated HIGH-confidence on the first pass. **1/16 deferred LOW-confidence**, parked here for joint chat+CC resolution.

## LOW-confidence rows

### m.post_render_log.render_spec (jsonb, nullable, column_id 824258)

**Why deferred LOW**

The brief's strict JSONB rule:

> HIGH confidence ONLY if the JSONB schema is referenced by an Edge
> Function source file in `supabase/functions/image-worker/` or
> `supabase/functions/video-worker/` that constructs/parses its keys,
> OR a SQL function/trigger body, OR an existing markdown doc.
> LOW if the only schema evidence is a single sample row.

`render_spec` does not satisfy the HIGH gate today:

- The producer (`supabase/functions/image-worker/index.ts` v3.9.2,
  `renderUploadAndLog`) **always passes `p_render_spec: null`** — on
  both the success and the failure branches (lines populating the
  `write_render_log` RPC call). No code path constructs or stores a
  `render_spec` payload.
- The RPC `public.write_render_log(... p_render_spec jsonb)` is a
  straight-through INSERT — it accepts the parameter but enforces no
  schema. The function body therefore documents only the column's
  **type**, not its key contract.
- Production rows: `render_spec IS NOT NULL` count is **0 of 932**
  rows. There is not even a single sample row to anchor a schema on.
- `supabase/functions/video-worker/` does not exist (only `heygen-worker/`
  is present in the repo, and it does not write to `m.post_render_log`).

The table_purpose says render_spec is meant to hold "the full payload
sent to Creatomate" — i.e. the same object structure that
`buildImageQuoteScript` / `buildAnimatedTextRevealScript` /
`buildAnimatedDataScript` / `buildCarouselSlideScript` construct for
the POST /v2/renders body. But the **column is currently never written**,
so the HIGH gate ("constructs/parses its keys" — i.e. **render_spec**'s
keys, not the Creatomate payload's keys) is not met.

**Schema sketch (informational — do not write to column_registry until
producer code is updated)**

If/when image-worker starts populating `render_spec`, the natural
shape would mirror the Creatomate v2/renders request body that
`renderUploadAndLog` already constructs for the `renderScript` arg:

- `output_format` — `'png' | 'gif'` (single-image / animated)
- `width`, `height` — numeric pixels (always 1080 × 1080 today)
- `fill_color` — hex string (brand primary)
- `frame_rate`, `duration`, `loop` — present on GIF outputs only
- `elements` — array of Creatomate element objects, each with
  `type` (`'shape' | 'text' | 'image'`), positional / sizing keys
  (`x`, `y`, `width`, `height`, `x_anchor`, `y_anchor`, …), and
  format-specific keys (`fill_color`, `font_family`, `font_weight`,
  `font_size`, `text`, `enter`, `time`, …).

The exact payload differs across the four `buildXScript` functions
(headline-only quote, animated text reveal, animated data with stat
extraction, per-slide carousel). A column purpose that names a single
schema would be misleading — the column has to describe the
**discriminated union over `ice_format_key`**, which is a heavier
documentation lift than the brief's HIGH-track allows.

**Resolution paths**

Pick one in a follow-up brief:

1. **Update image-worker to populate `render_spec`** (pass
   `p_render_spec: renderScript` at the success branch and
   `p_render_spec: renderScript` plus `null` on early-fail) — then a
   future column-purpose pass can document the per-format schema with
   real production samples behind it.
2. **Drop the column** if the cost-monitoring / debugging story is
   already covered by `creatomate_render_id` + Creatomate's own logs
   and there is no plan to populate it.
3. **Document the discriminated union now** — author a markdown spec at
   `docs/audit/decisions/render_spec_jsonb_schema.md` covering the four
   `buildXScript` shapes verbatim and cite that doc in the column
   purpose. This satisfies the HIGH gate's "OR an existing markdown
   doc" branch.

PK + chat to choose. None of the three is urgent — `render_spec` is
not load-bearing for any current pipeline (publishers consume
`storage_url`, dashboards consume `render_duration_ms` /
`credits_used` / `status`).
