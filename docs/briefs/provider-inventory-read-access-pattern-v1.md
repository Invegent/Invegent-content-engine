# Provider Inventory Read Access Pattern v1 (design / security — docs only)

> **Status:** design / security brief **only**. **No endpoint implemented, no provider API call, no
> render, no publish, no DB/runtime/dashboard change, no provider connector created.** No
> `property-pulse.json`/`creative_contract.ts`/`registry-schema-v2.md`/schema/migration change, no
> `execute_sql`, no deploy, no secret printed/stored, no format/variant enabled, no GFCP Layer 3, no
> Canonical Capability Model.
> **Produced:** 2026-06-30 (CE session). **Type:** docs/design/security (+ register record).
> **CE state at write time:** `main == origin/main == e9b3d070a78f1fa9f1e261d92da0f751b204e701`;
> register **v4.30**.
> **Purpose:** define the **approved safe pattern** for reading provider template/asset inventory —
> Creatomate first, then HeyGen / future providers — **without exposing provider secrets or mutating
> provider state.** Decides direction; builds nothing.
> **Caution carried:** CI-4 hit a shared-worktree race. This slice re-checked HEAD strictly at preflight
> (no drift) and will re-check again before commit.

---

## 1. Problem statement

Creative Intake needs **provider inventory** (a template's element/field list, a provider asset's
capabilities) to pass the `template_inventory_captured` and `field_mapped` gates — but **provider
secrets must not be exposed** and **inventory reads must not mutate provider state**.

**Concrete blocker (CI-4, register v4.30):**
- `quote_card.v1` needs the Creatomate template inventory for `news_quote_insight_1x1_v1`
  (`490ad9ea-7473-49e4-9d3c-e1ae8a12d790`).
- The existing CE worker path **cannot safely perform that read** — workers hold `CREATOMATE_API_KEY`
  only via `Deno.env.get(...)` and call **only** `https://api.creatomate.com/v2/renders` (render
  submit/status); there is **no template-metadata read endpoint** wired.
- A **local/manual API call** would require **exposing the runtime secret** — forbidden.
- The **render path is not acceptable** — it **creates a render** (cost + provider/render-state
  mutation), so it is not pure inventory capture.

CI-4 outcome therefore was **`BLOCKED_NO_SAFE_READ_PATH`**. This brief defines the safe pattern(s) to
remove that blocker durably.

---

## 2. Security principles (binding)

- Provider **secrets stay server-side only**.
- **Never print or store API keys.**
- **Never paste provider raw secret-bearing payloads** into docs.
- **Separate read-only metadata endpoints from render/mutation endpoints** (distinct, narrow surfaces).
- **Sanitize** provider responses before storage/display.
- **Least privilege** where the provider supports scoped/read-only credentials.
- Provider read actions must be **audited** (§10).
- An inventory read **must not imply enablement**.
- An inventory read **must not imply render proof**.
- An inventory read **must not automatically update Creative Library truth** without review.

---

## 3. Option A — server-side read-only Edge Function

A dedicated **Edge Function** that holds the provider secret server-side and performs a **metadata read
only**.
- Accepts a **safe, narrow request**: `provider` · `provider_object_type` · `provider_object_id`.
- Performs a **provider metadata read only** (e.g. Creatomate `GET /v1/templates/{id}`).
- Returns a **sanitized inventory summary** (§8).
- **Does not** render, mutate, upload, edit, or publish.
- Emits an **audit event** without the secret (§10).
- Creatomate first, extensible to other providers via adapters.

**Benefits:** durable, automatable, secret never leaves the server, narrow auditable surface, reusable
by CI-2/CI-3/CI-4 workflows.
**Risks:** it is new attack surface (must be tightly scoped); a careless implementation could allow
arbitrary-URL fetch or raw-payload passthrough; needs a security review before deploy.
**Required controls:** allowlisted `provider`/`object_type`; allowlisted endpoint **paths** (no
arbitrary URL fetch); **no raw payload passthrough** unless redacted; a **response sanitizer**;
timeout/retry limits; **audit log**; **service-role / server-only** access (no browser-direct secret
path); **deny all mutation verbs/endpoints** (read-only HTTP methods + read-only paths only).
**Test requirements:** unit tests for the sanitizer (no secrets/billing/unrelated data leak); a
deny-list test (mutation endpoints/verbs rejected); an allowlist test (only approved object types); a
no-secret-in-log assertion; a no-mutation assertion; a contract test on the sanitized shape.
**Recommended?** **Yes — the durable product path** (gated: design packet → security review → impl →
deploy).

---

## 4. Option B — connector / MCP read-only provider tool

A dedicated **connector / MCP action** that exposes **read-only provider metadata**; the tool handles
the secret **outside the CE repo** and returns a **sanitized element inventory**.

**Benefits:** secret handling lives entirely outside CE; no new CE edge surface; quick to use if such a
connector exists and is read-only-scoped.
**Risks:** depends on a connector that **does not exist today** (CI-4 confirmed none in session); the
connector's read-only guarantee + sanitization must be **verified** (don't assume); availability may be
environment-specific (headless/cron may lack it).
**Required controls:** the connector must guarantee **read-only** provider metadata scope; sanitized
output; no mutation tools reachable on the same credential; the same audit fields (§10) recorded
CE-side on use.
**When preferable:** when a vetted read-only Creatomate (or HeyGen) connector/MCP is available and its
read-only scope is enforceable — then it avoids building/maintaining a CE endpoint.

---

## 5. Option C — PK manual sanitized export

PK uses the **provider UI/API outside CE**, then **pastes a sanitized template element inventory** into
the CE doc. **No CE/provider secret handling** occurs in-session.

**Benefits:** zero CE secret exposure, zero new code, immediately available, perfect for a **one-off
unblock** of `quote_card.v1`.
**Risks:** manual → human error / transcription risk; relies on PK to **sanitize** (strip secrets,
billing, unrelated data); not automatable; can go stale; trust burden on the manual step.
**Required checklist (CI-4C):** export **only** safe fields (template id, name, dimensions, element
names/types/dynamic-flags, output type, constraints); **redact** any secret/billing/account/unrelated
data; **no API keys**, no raw signed asset URLs; confirm it is the correct template (`490ad9ea…`); paste
into the inventory doc under a clearly-labelled "captured_from_manual_entry" section; record the §10
audit fields manually.
**When acceptable:** as the **short-term one-off** unblock for `quote_card.v1` when PK can safely
export/paste. Not the durable workflow.

---

## 6. Option D — render-probe workaround (NOT acceptable as inventory read)

Creating a render to *infer* fields from the result.

**Conclusion: NOT acceptable as an inventory-read substitute** unless separately authorized as a
**smoke/render proof** (a different, later gate). It **costs money** and **mutates provider/render
state**, so it **cannot be treated as pure inventory capture**. Do **not** use Option D as the default
inventory method.

---

## 7. Recommended path

- **Short term (one-off unblock):** **Option C** — PK manual sanitized export of `490ad9ea…` is
  acceptable **if** PK can safely export/paste the sanitized inventory (CI-4C checklist).
- **Durable product path:** **Option A** — a server-side **read-only inventory endpoint** is preferred
  for the lasting ICE workflow (gated: design → security review → impl → deploy).
- **Optional:** **Option B** — a connector/MCP is also acceptable **if** available and able to enforce
  read-only provider-metadata scope.
- **Do NOT** use **Option D** (render-probe) as the default inventory method.

---

## 8. Creatomate-specific read pattern

A future Creatomate inventory read **should return (sanitized, safe metadata only)**:
- template id · template name · dimensions / aspect ratio · duration (if any);
- **elements:** id/name · type · dynamic/modifiable flag · accepted value type · whether a
  default/static value is *present* (a boolean/flag — **without leaking sensitive content**);
- output type · known constraints.

It **must NOT return:** API keys · account secrets · billing data · unrelated project data · raw assets
if unnecessary · arbitrary **workspace/project listing** unless explicitly authorized.

> Maps to the proven sibling's shape (6 text + 2 image slots for the wired PP 1:1) and to the
> `quote_card.v1` field contract — but only the candidate's **real** element list (once captured) can
> confirm support. No safe Creatomate read path exists today.

---

## 9. HeyGen / future provider implications

- The **same access pattern** applies (Option A/B/C; never D as inventory).
- HeyGen inventory is **identity / persona / voice / scene** oriented (not Creatomate-style elements).
- Reads **must not create avatars or videos** (the HeyGen asset-provisioning + render paths are
  mutating — out of an inventory read).
- **Consent / persona governance metadata** must be treated carefully (don't leak personal/consent
  data; capture only what governance needs).
- Future providers must implement an **inventory adapter** with **safe normalized output** (the CI-3
  common layer: provider / format / variant / input contract / output contract / proof state / evidence
  / eligibility).

---

## 10. Audit and evidence model (DESIGN ONLY — no DB table in this slice)

Future audit fields for each provider read:
`provider` · `object_type` · `object_id` · `requested_by` · `requested_at` · `read_method` ·
`sanitizer_version` · `returned_inventory_hash` · `status` · `error_class` · `no_secret_assertion` ·
`no_mutation_assertion`.

> **Design only** — no table/RPC/migration is created or implied. `returned_inventory_hash` lets the
> capture be referenced without storing raw payloads; `no_secret_assertion` / `no_mutation_assertion`
> are explicit safety attestations recorded per read.

---

## 11. Application to `quote_card.v1`

- `quote_card.v1` **remains blocked** (`BLOCKED_NO_SAFE_READ_PATH`; `defined` / unwired / blocked at
  `template_inventory_captured`).
- The next unblock can be: **(A)** PK manual sanitized export of template `490ad9ea…` (Option C / CI-4C),
  **or (B)** implementation of a safe read-only inventory endpoint/connector (Option A/B).
- **No binding** should occur until the inventory is captured **and** the field mapping is reviewed.

> No overclaim: this brief does **not** capture inventory and does **not** create a safe read path — it
> *defines* the approved pattern. `quote_card.v1` is not advanced.

---

## 12. Future implementation slices (recommended — NOT implemented here)

- **CI-4C** — PK manual sanitized export checklist for `490ad9ea…` (Option C; the fastest one-off unblock).
- **CI-4D** — server-side read-only provider inventory endpoint **design packet** (Option A spec).
- **CI-4E** — **security review** for the read-only provider endpoint (db-rls-auditor / security-auditor / external review).
- **CI-4F** — implement the Creatomate read-only inventory endpoint (gated runtime + deploy lane).
- **CI-4G** — dashboard **read-only inventory display** (CI-3B).
- **CI-4H** — use the captured inventory to **classify** quote_card template readiness (re-run the Slice 3D/CI-4 classification with real elements).

> Sequence intent: **one-off manual unblock (C) now if PK chooses → durable endpoint (A) via design →
> security review → impl → deploy → display → classification.** No slice binds or enables anything.

---

## Explicit non-claims / scope
- **Docs/design/security only.** No endpoint implemented, no provider connector created, no
  provider/Creatomate/HeyGen API call, no render/publish/upload, no provider-template edit, no
  runtime/edge/dashboard/Content-Studio code change, no `property-pulse.json`/`creative_contract.ts`/
  `registry-schema-v2.md`/schema/DB/migration change, no `execute_sql`, no deploy, no production
  enablement, no GFCP Layer 3, no Canonical Capability Model, **no format or variant enabled, no
  secrets printed/stored.**
- **No safe Creatomate read path exists today** — this brief defines how to build/authorize one; it does
  not create one.
- `quote_card.v1` **remains blocked / defined / unwired**; `market_update.v1` stays defined/unwired;
  `news_card.v1` remains the **default + production-proven** variant (PP × facebook + instagram only).
  No proof borrowed.
- The audit model + endpoint shapes are a **non-authoritative future design** — nothing is created.

## Cross-references
- CI-4 read attempt (BLOCKED, v4.30): `docs/briefs/format-variant-quote-card-creatomate-template-inventory.md` (CI-4 section).
- CI-3 provider inventory capture model (v4.29): `docs/briefs/creative-intake-provider-inventory-capture-model-v1.md`.
- CI-2 wizard spec (v4.28): `docs/briefs/creative-intake-new-template-wizard-spec-v1.md`.
- Creative Intake Operator Flow v1 (v4.26): `docs/briefs/creative-intake-operator-flow-v1.md`.
- Provider integration (read-only grounding): `supabase/functions/image-worker/index.ts` (Creatomate `/v2/renders` + `Deno.env` key), `docs/briefs/render-provider-creatomate-capability-audit.md`, `docs/briefs/render-provider-heygen-capability-audit.md`.
- Register: v4.31 (this brief).
