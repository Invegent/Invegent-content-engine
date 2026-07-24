CLAIMED v7.04 · cc-0081 lever evidence addendum (A0 STOP — non-clean review) · S8 · shared checkout · gate: PK escalation + re-review required · 2026-07-24

# cc-0081 — A0 external review returned NON-CLEAN → **STOPPED at A0.** Evidence addendum for re-review

**Status:** `A0 STOP · LEVER NOT APPLIED · NO DML EXECUTED · EVIDENCE GAPS NOW CLOSED · RE-REVIEW + PK GATE REQUIRED`
**Base:** CE `main` @ `052a9ba3ec8f1b7251bfe8e0eb399a3e51a5fcb9`, parity 0/0 (stale-ref gate passed pre-A0).
**Base artifact (unchanged):** `docs/briefs/cc-0081-containment-window-runbook-v1.md`, frozen `08b2c7cb65b4ef432579e05d3643db8d863cd6c2ecad4e63766f38b12b56ddb2`.

---

## 1. A0 result — the gate held, and the review bridge is proven live

`ask_chatgpt_review` · `action_type: sql_destructive` · `review_id` **`95e515c1-565d-4bf0-a6f5-adfc6aa98a00`** · `reviewed_input_hash` **`08b2c7cb…`** · `idempotent: false`.

| field | value |
|---|---|
| **verdict** | **`partial`** — NOT clean |
| decision | **`escalate_explicit_flag`** · `escalate: true` · `requires_pk_escalation: true` |
| risk_level / confidence | `medium` / `high` |
| escalation_reason | *"impacts authorization flows and requires a thorough understanding of client interactions across multiple OAuth frameworks"* |

**Per the standing instruction — anything other than a clean verdict is a STOP — A2/A3 were not run. No DML has been executed.**

**Positive side-effect, and it is the evidence step ② of the original sequence wanted:** the call returned a fully structured verdict, so **`mcp-chatgpt-bridge` and the `ask_chatgpt_review` gate are proven live right now — obtained with no deploy and no redeploy.**

### Triage classification (ranked, per `CLAUDE.md` §external-review-gate rule 5)

1. **`missing_evidence`** — the 401 causation and the "no other reader" claim were asserted from source-reading, not demonstrated. **→ routing: stop → gather evidence → re-review.** Closed in §2 below.
2. **`structural_DDL_DML_escalation`** — production DML on an authorization table. **→ routing: PK judgment gate, hard stop.** Unchanged by §2; only PK clears it.

---

## 2. The two evidence gaps — closed, read-only

### Gap A — *"Clarity on the impact of appending `.cc0081-disabled` on other processes is needed."*

**Exhaustively enumerated. `m.mcp_oauth_client.client_secret` is read in exactly TWO places, one per bridge, both at `/token`:**

| Site | Role |
|---|---|
| `mcp-github-bridge/index.ts:407` `.select('client_id, client_secret, token_endpoint_auth_method')` → `:416` `clientSecret !== client.client_secret` | the comparison the lever targets |
| `mcp-chatgpt-bridge/index.ts:391` → `:400` — **identical** | see cross-effect below |

Writes are `/register`-only (`:258` / `:236` insert) plus the registration-response echo (`:283` / `:261`), neither of which reads a stored value. **Every other `client_secret` hit in the repo is an unrelated Google/YouTube OAuth env var** (`email-ingest`, `subscription-email-ingest`, `youtube-insights-worker`, `youtube-publisher`) — different credential, different table, untouched.

**Database side — zero dependents.** A single catalog sweep for views, matviews, functions, triggers, RLS policies and indexes referencing `mcp_oauth_client` or `client_secret` returned an **empty set**. No view, no function, no trigger, no policy, no index.

**Dashboard repo (`invegent-dashboard`) — no reference to `mcp_oauth_client` at all.**

> **⚠ One real cross-effect, and the reviewer was right to probe for it.** Because the two bridges *share* this table, suffixing the secret of the three `mcp_gh_*` rows **also blocks those same three client_ids at the ChatGPT bridge's `/token`** (identical lookup at `:391`/`:400`). For GitHub-bridge clients that is intended and harmless — but it is a genuine cross-bridge consequence, it is the **same shared-table defect as L3**, and it belongs in the record rather than being discovered later. **It does not touch the seven ChatGPT-bridge rows**, which are excluded by explicit enumeration.

### Gap B — *"The assumption that appending `.cc0081-disabled` will cause 401 invalid_client is not verified."*

**Static proof chain, now complete and exhaustive:**

1. `issueTokens` has exactly **two** call sites per bridge — `handleTokenAuthCode` (`:482`) and `handleTokenRefresh` (`:496`).
2. Both are reachable **only** from `handleToken`.
3. `handleToken` is reachable **only** from a single route line: `if (req.method === 'POST' && path === '/token') return await handleToken(req);` (`mcp-github-bridge:924`).
4. `handleToken` executes, before dispatching to either grant:
   `if (client.token_endpoint_auth_method !== 'none') { if (!clientSecret || clientSecret !== client.client_secret) return 401 invalid_client }`
5. All three targets are `token_endpoint_auth_method = 'client_secret_post'` (re-read live), so branch 4 is **taken**.
6. The client presents the secret it was issued at registration; the stored value after the lever is `original + '.cc0081-disabled'`; the comparison is strict `!==` → mismatch → **401 `invalid_client`**.

> **→ The `client_secret` comparison sits on the SOLE token-issuance path of the bridge. There is no bypass.** This is a complete static proof over an enumerated call graph — not an assumption. What it is *not* is an empirical demonstration: proving it by observation would require driving a real `/token` request with a real client secret, which this lane will not do (it would mean handling a live credential).

### Pushback point 2 — *"potential lack of evidence for complete containment"*

**The packet never claims complete containment, and says so five ways.** Restated so no downstream record can drift: the lever blocks the refresh and authorization-code exchanges for three credentials. It does **not** invalidate an already-issued access token (moot — all three floors, 2026-06-03 / 06-13 / 06-17, have passed), does **not** stop a new consent flow, does **not** close **L3**, and **L2 remains open even after all three patch parts land**.

**Sanctioned wording, unchanged:** *"outstanding renewal chains blocked for 3 credentials; access-token and static-secret exposure remains."*

---

## 3. `corrected_action` from the reviewer — assessed

> *"Consider a method to verify and document that appending '.cc0081-disabled' to client_secret does not inadvertently introduce other issues in the broader authentication flow, possibly requiring further testing or rollback mechanisms in case of failure."*

- **"verify and document …other issues"** → **done, §2 Gap A**: two readers, both enumerated; zero DB dependents; one cross-bridge effect newly surfaced and recorded.
- **"further testing"** → **declined, with reason.** Empirical proof needs a live `/token` exchange using a real client secret; that means handling a credential, which this lane will not do. The static proof over the enumerated call graph (§2 Gap B) is offered instead, and its limit is stated rather than papered over.
- **"rollback mechanisms in case of failure"** → **already present and validated before apply**: exact-length `left()` strip restoring the original bytes, fail-closed on `ROW_COUNT <> 3`. Runbook A6.

---

## 4. Where this now sits

| | |
|---|---|
| **A0** | ✅ run · **verdict `partial`** · **STOP taken** |
| **A1–A6** | ⛔ **not run.** No DML. No deploy. Nothing mutated |
| Evidence gaps | ✅ closed read-only (§2) |
| **Re-review** | **REQUIRED** — the packet has changed, so review `95e515c1…` on `08b2c7cb…` is **stale for the amended artifact** (`CLAUDE.md` rule 1 + rule 4). Re-review must pin this addendum's hash |
| **PK escalation** | **REQUIRED and independent of the re-review** — `requires_pk_escalation: true` and `structural_DDL_DML_escalation` are a PK judgment gate. A clean re-review does **not** discharge it |
| External send | ⛔ **held.** A0's authorisation was for one send of one artifact; the re-review is a second send of a different artifact and awaits explicit authorisation |

**Two distinct clearances are needed before A1 resumes: (i) a clean re-review pinned to the amended hash, and (ii) PK clearing the escalation.** Neither substitutes for the other.

## 5. Non-claims

No DML was executed. Nothing was deployed, redeployed, committed, staged or rolled back. No secret was read; no `client_secret` value appears in any artifact or transcript. The A0 verdict is recorded as received, verbatim in the fields above — it is **not** re-characterised as clean. §2 Gap B is a **static** proof over an enumerated call graph, explicitly **not** an empirical demonstration. The refresh-window dates remain **floors**. No exploitation of L1/L2/L3 is claimed or evidenced.

## 6. Draft register pointer (for S4 — S8 does not cut register versions)

> **v7.04 — cc-0081 A0 external review NON-CLEAN → STOPPED (S8 · T2 · SAFETY_GATE · ZERO MUTATION).** `ask_chatgpt_review` `95e515c1-565d-4bf0-a6f5-adfc6aa98a00` on `08b2c7cb…` returned **`partial` / medium / high / `escalate_explicit_flag` / `requires_pk_escalation: true`** — **STOP taken at A0; A1–A6 not run, no DML, nothing mutated.** ✅ **Side-benefit: the call proves `mcp-chatgpt-bridge` + the `ask_chatgpt_review` gate LIVE with no deploy** — the evidence the original step ② wanted. Triage: **`missing_evidence`** (→ gather → re-review) + **`structural_DDL_DML_escalation`** (→ PK hard stop). **Both evidence gaps closed read-only:** `client_secret` has **exactly 2 readers**, one per bridge, both at `/token` (`github:407/416`, `chatgpt:391/400`); **zero** DB views/functions/triggers/policies/indexes reference the table (empty catalog sweep); dashboard repo has no reference; all other repo `client_secret` hits are unrelated Google/YouTube env vars. **401 causation proved statically over the enumerated call graph** — `issueTokens` has 2 call sites, both only via `handleToken`, reachable only from `POST /token`, which compares the secret first; **sole issuance path, no bypass** — but it is a static proof, **not** an empirical one (that would require handling a live credential; declined). 🆕 **Cross-effect surfaced: the shared table means the lever also blocks those 3 client_ids at the ChatGPT bridge's `/token`** — intended/harmless for `mcp_gh_*` rows, same shared-table defect as L3, now recorded. Containment wording unchanged: *"outstanding renewal chains blocked for 3 credentials; access-token and static-secret exposure remains."* **Needs BOTH a clean re-review pinned to the amended hash AND PK clearing the escalation — neither substitutes for the other.** Addendum: `docs/briefs/cc-0081-lever-evidence-addendum-v1.md`.
