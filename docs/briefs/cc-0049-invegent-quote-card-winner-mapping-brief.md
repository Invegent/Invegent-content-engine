> ## 🔖 CANONICAL ID: **cc-0049** — RETAINED (no collision found)
> Verified 2026-07-24 against `origin/main` and all `origin/*` refs: no competing claim on
> `cc-0049` exists. Ledger: `docs/briefs/results/governance-recovery-lane-2026-07-24-result-v1.md` §3.

# Brief cc-0049 — Invegent Governed Quote-Card Winner Mapping Recovery

**Created:** 2026-07-22 Sydney
**Author:** Claude Code (orchestrator-direct — CCF-02 R1 substitution)
**Executor:** Claude Code + PK gates
**Status:** draft **rev-2** — **STOP #1 CLEARED (§12: authoritative element inventory found in a governed DB table, no Creatomate credential needed). STOP #2 CLEARED by PK ruling. ⛔ NEW STOP #3 RAISED (§12.4: PK's two literals have no client-scoped home in the winner map — cross-client brand-leak risk). No build authorized.**
**Lane classification (CCF-02):** SAFETY_GATE / production incident · **T2 build; T3 deploy + T3 containment DML gates**
**Result file:** `docs/briefs/results/cc-0049-invegent-quote-card-winner-mapping.md`

---

## 0. Predecessor status — cc-0048 RECORDED

**`REGISTRY RECOVERY PROVEN — CFW RECOVERED; INVEGENT DOWNSTREAM CARRY`**

image-worker **v3.32.0 stays live** (commit `5a6c998`, canonical main). `brand_payload_contract_unresolved` stopped for both clients; CFW renders successfully with governed TMR evidence; Invegent now reaches the next governed fail-closed guard; no publish or duplicate-render regression. Not rolled back.

**Two evidence carries retained before cc-0048 fully closes:**

- **C-1** — obtain one natural post-deploy PP or NDIS `image_quote` render (or equivalent governed proof) confirming no live regression. *(Neither has rendered since deploy; hermetic T1/T2 byte-identity passed but live proof is outstanding.)*
- **C-2** — reconcile the exact deployed v3.32.0 bytes and the incident result doc into canonical main through the normal repository gate.

**F-A** (undeployed ai-worker parity change) remains a follow-up. ai-worker is NOT deployed in this incident. **F-C** (unbounded retry / unreachable `RENDER_ATTEMPT_CAP`) is NOT fixed here.

## 1. Incident

| | |
|---|---|
| Failure | `tmr_winner_unmapped: generic_quote_card_1x1_v1` |
| Affected client | `invegent` only (currently) |
| Format | `image_quote` |
| Exposed | after the cc-0048 registry guard was repaired — a second, independent, pre-existing defect that the first was masking |
| Live since | 2026-07-22 06:45Z (first occurrence); Invegent's drafts continue to retry and fail |

`buildTmrRenderPlan` (`image-worker/b1_production.ts:285-289`) looks the selector's winner up in `TMR_WINNER_TEXT_FIELDS` and **throws when unmapped — deliberately, "never guess a layout" (D1)**. That guard is correct and must not be relaxed.

## 2. Read-only findings

**(1) Live template identity — PROVEN.** `select_template('invegent', …, 'image_quote')` returns `status=ok`, winner `generic_quote_card_1x1_v1`, registry template `1cfe0f9c-3810-4bf1-8785-083fead4eefe`, **provider (Creatomate) template `2140ca19-d075-49d3-9dc9-30d924805e22`**, variant `quote_card.v1`, assignment `ecba211b-5217-4790-afe5-a2f98616712f`, family `generic.news.quote_card`. Identity independently corroborated by the cached Creatomate account dump (`_harness/cc0033_headline_calibration/account_templates.json`: id `2140ca19…` = name `generic_quote_card_1x1_v1`).

**(2) Authoritative element names — ⛔ NOT OBTAINED.** See §4.

**(3) Current `TMR_WINNER_TEXT_FIELDS` schema + every registered winner.** Type: `Record<string, (f: B1Fields) => Record<string,string>>`. It contains **exactly ONE** winner:

```ts
'generic_market_insight_card_1x1_v1': (f) => ({
  'CategoryBadge.text': f.category,  'Headline.text': f.headline,
  'Subtitle.text':      f.subtitle,  'Location.text': f.location,
  'Date.text':          f.date,      'Footer.text':   f.footer,
})
```

The source comment already anticipates this lane: *"quote_card / intent support = follow-up mapping additions."*

**(4) What `b1_production.ts` reads/writes for a winner.** It reads `selected.provider_template_name` (map key) and `provider_template_id`; it writes `modifications` = slot_resolution modifications (`Background.source`, `Logo.source`, `Scrim.opacity`) **spread first**, then the winner's text fields spread **after** (winner map deliberately contains no asset/scrim keys so slot_resolution stays authoritative). It also requires non-empty `Background.source` + `Logo.source` (else `tmr_slot_resolution_incomplete`) and non-empty Background/Logo `asset_key`s for the stamper. Input type is `B1Fields` = `{category, headline, subtitle, location, date, footer}`.

**(5) Geometry / constraints — a portability trap, explicitly flagged in-source.** `TMR_WINNER_LAYOUT_GUARD` exists for `generic_market_insight_card_1x1_v1` ONLY (Headline height 22%, auto-fit font 30–74px) and its own comment states: *"These values are geometry for template `generic_market_insight_card_1x1_v1` ONLY. They are NOT a portable constant."* It was the structural fix for the cc-0033a headline/subtitle overprint. **The quote card has no guard.** Whether it needs one — and with what values — is unknown until its geometry is read from an authoritative source. Reusing the market-insight guard is forbidden.

**(6) Is this winner used by any other client/path? YES — a latent risk.** `c.creative_template_client_assignment` on registry template `1cfe0f9c` has **two** `visually_approved` assignments, each with a passed visual proof: `invegent` (`ecba211b…`) **and `property-pulse` (`7e95190e…`)**. PP currently renders `generic_market_insight_card_1x1_v1` (live evidence), so ranking currently keeps PP off the quote card — but **PP is one ranking flip away from the same `tmr_winner_unmapped` failure**. This strengthens the case for the mapping and is itself worth recording.

**(7) Downstream blockers after the mapping is added.** `resolve_slot_assets('invegent','facebook','image_quote', 1cfe0f9c…)` returns **ok** with a governed Background and Logo, so `tmr_slot_resolution_incomplete` should not fire. The residual unknowns are render-time and geometric, not resolution-time: whether the quote card needs a layout guard (§2.5) and whether all its required elements are covered by `B1Fields` (§4.2).

**(8) Vendoring / parity.** `TMR_WINNER_TEXT_FIELDS` lives **only** in `image-worker/b1_production.ts` (plus its two test files and the `index.ts` import). It is **NOT vendored into ai-worker** and has no cross-copy parity test. **Unlike cc-0048, no parity edit is required** — this is a single-file change in image-worker only.

## 3. ⛔ STOP #1 — element names cannot be proven with available credentials

Per the Gate-1 instruction to read names from the authoritative Creatomate template JSON and **STOP rather than guess**:

| Source attempted | Result |
|---|---|
| `GET https://api.creatomate.com/v1/templates/2140ca19…` with local `CREATOMATE_API_KEY` | **HTTP 401 Unauthorized** — matches the recorded gotcha that the local key is invalid and only the deployed function holds a valid key |
| Cached account dump `account_templates.json` | Confirms **identity only** (`id`, `name`, `tags`, timestamps) — **no `source` / element tree** |
| Live render logs for this template | **Zero rows** — no governed render of the quote card has ever been logged |

**Strong but NON-PROBATIVE evidence exists.** The cc-0044 CP-D proof render (`3db0351b`, PK-visually-approved) on this exact template used:

```
Background.source · Logo.source · Scrim.opacity          (slot modifications)
QuoteText · Attribution · SourceLabel · Footer            (text — NOTE: bare keys, NO ".text" suffix)
```

This is **not proof**, for two concrete reasons:

1. **Creatomate silently ignores unknown modification keys.** A successful, good-looking render does not establish that every key matched a real element — an ignored key simply leaves the template's baked default visible. Some of those four could be inert.
2. **The key *shape* conflicts with the only registered mapping.** Market-insight uses suffixed `<Element>.text` keys; the CP-D payload used **bare** element names. Both forms exist in Creatomate's API. Guessing which form the quote card requires is exactly the "never guess a layout" failure the guard prevents.

## 4. ⛔ STOP #2 — the mapping is also a PRODUCT decision, not only a lookup

Even with authoritative element names, the mapping is not mechanically derivable, because the quote card's fields **do not correspond 1:1 to `B1Fields`**:

| Quote-card element (from the CP-D payload) | Which `B1Fields` member feeds it? |
|---|---|
| `QuoteText` | `headline`? (plausible, unconfirmed) |
| `Attribution` | **no B1Fields member exists** — CP-D used the literal "Invegent — AI & Technology" |
| `SourceLabel` | **no B1Fields member exists** — CP-D used "invegent.com" |
| `Footer` | `footer` (= "Invegent" per cc-0048's PK-authored value) |

`B1Fields` supplies `{category, headline, subtitle, location, date, footer}`. There is no `attribution` and no `source_label`. So adding this winner requires PK to decide **what feeds `Attribution` and `SourceLabel`** — new contract fields, existing fields reused, or omitted entirely (leaving the template default). That is brand/product judgment, exactly like the cc-0048 `category`/`footer` values, and must not be inferred from the one-off CP-D literals.

## 5. What would unblock this lane

Any ONE of:

- **A valid Creatomate API key** for a read-only `GET /v1/templates/2140ca19-d075-49d3-9dc9-30d924805e22` (the deployed function holds a working key; a fresh read-only key would also do). This yields element names, types and geometry in one call and closes STOP #1 outright. Conveyance must follow the CCF-02 R2 secret rider (which secret · how conveyed · never in transcript · read-only use, not a posture change).
- **Another authoritative governed source** for the element tree (an exported template JSON committed to the repo, or a Creatomate dashboard export PK provides).

STOP #2 additionally requires a PK ruling on the `Attribution` / `SourceLabel` semantics.

**Until STOP #1 and STOP #2 are both cleared, no mapping is written.** Guessing would defeat the very guard this lane exists to satisfy.

## 6. Minimal repair posture (CONDITIONAL — not authorized)

Once unblocked, and only then:

- Add the **proven** `generic_quote_card_1x1_v1` entry to `TMR_WINNER_TEXT_FIELDS` (single file, image-worker only — no parity edit, §2.8).
- Add a layout guard **only if** the authoritative geometry proves one is needed; never reuse the market-insight values.
- Add focused tests (§7).
- Bump image-worker v3.32.0 → v3.33.0 (drift gate hashes only `index.ts`, so the bump is mandatory for a helper-only change).
- Deploy image-worker only, at a separate T3 gate.

**Do not:** change the Creatomate template · change template selection · change assignments or visual proofs · alter asset resolution · reuse the market-insight mapping unless exact equality is proven · relax the unknown-winner fail-closed guard · modify publishing · fix F-C · resume cc-0047 · deploy ai-worker.

## 7. Required tests (all eight)

1. Invegent's governed winner resolves to the **exact authoritative** text elements (asserted against the element names read from the authoritative source, not from the CP-D payload).
2. Category, footer, body/headline and every other required field populate the **correct** elements.
3. Property Pulse mappings unchanged (byte-identical function output for market-insight).
4. NDIS Yarns mappings unchanged.
5. Care For Welfare's market-insight mapping unchanged.
6. Unknown winner templates still fail closed with `tmr_winner_unmapped` (including a near-miss name and an empty name).
7. No template selection, asset, assignment, publishing or sourcing behaviour changes.
8. The patch permits **no cross-template field-name guessing** — assert the two winners' key sets are independent, and that market-insight keys are absent from the quote-card mapping and vice versa.

## 8. Controlled recovery requirement (containment BEFORE the deploy gate)

The next deploy must **not** rely on an uncontrolled natural sweep of all three Invegent drafts. Observed at 06:45Z (**must be re-confirmed fresh at the gate — this set shifts as retries run**):

| Draft | Queue platform | Queue status | Scheduled |
|---|---|---|---|
| `26aaa129` | facebook | `queued` | 2026-07-22 22:06Z |
| `33a9acf9` | instagram | `queued` | 2026-07-23 00:36Z |
| `6a23e01a` | linkedin | `queued` | 2026-07-23 02:36Z |

**Preferred containment — narrowest existing governed mechanism:** row-level reschedule of **two** of the three `m.post_publish_queue` rows (push `scheduled_for` beyond the verification window), leaving exactly one eligible for the first recovery. This touches only the publish schedule, which the publisher already consults.

Constraints: **do not** change approval state · **do not** revive terminal rows · **do not** disable publishing for unrelated clients · client-wide publish disable (`c.client_publish_profile.status`) only if no safe row-level mechanism exists, and then with an exact restoration plan.

**Caveat to solve at the gate:** the image render sweep selects on `image_status='pending'` with `limit 3` and has **no per-draft entrypoint**, so rescheduling publish rows contains *publication* but not *rendering*. Constraining which draft renders first would need either draft-state DML (forbidden) or accepting that up to three render while only one can publish. **Recommendation: contain publication (row-level reschedule), accept that rendering may cover more than one draft, and verify per-draft.** Any containment DML requires its own explicit T3 authorization at the deploy gate.

**After one Invegent draft proves** successful governed render · correct template and text fields · expected TMR evidence · no duplicate output · no publish side effect — **return for PK approval before releasing the other two.**

## 9. cc-0047 carry

cc-0047 stays **paused and clean** (worktree verified clean at `8a885df` by branch-warden during cc-0048). Its evidence model must classify Invegent as:

```
coverage_verdict = inconclusive
coverage_reason  = telemetry_blocked_by_execution_failure
```

until a successful **attributable** governed Invegent render exists. Note the cc-0048 deploy did **not** clear this: Invegent still has zero successful governed renders. CFW now does, which will change CFW's verdict when cc-0047 resumes.

## 10. STOP conditions

Element names not proven from an authoritative source · `Attribution`/`SourceLabel` semantics unruled · geometry unknown and a guard may be required · any mapping value would be inferred from the CP-D payload, a label, a screenshot or another template · PP/NDIS/CFW mapping output changes · the fail-closed guard weakens · containment DML attempted without its own T3 authorization · more than one Invegent draft publishes before PK approval · any non-clean review verdict.

## 12. rev-2 — AUTHORITATIVE MAPPING OBTAINED (supersedes §3 STOP #1)

### 12.1 The source — governed, in-DB, no credential required

`c.creative_provider_template_field` (columns `element_id · element_name · element_type · dynamic · field_kind · default_value_safe · constraints · required_for_render`) holds the element inventory **captured from live Creatomate** during the v4.71 "Creatomate is truth" fresh-capture (register `docs/00_sync_state.md` v4.71: 7 templates → 57 fields). This is an authoritative governed source and needs **no Creatomate API key**. The 401 on the local key is therefore no longer blocking.

### 12.2 Source validated against the known-good mapping

For `generic_market_insight_card_1x1_v1` the table lists exactly: `Background`(image) · `Logo`(image) · `Scrim`(shape, dynamic=false) · `CategoryBadge` · `Headline` · `Subtitle` · `Location` · `Date` · `Footer` (all text, dynamic=true).

The live, production-proven winner map uses precisely those **six dynamic text elements**, each suffixed `.text`. **This validates the table against known-good behaviour AND establishes the key form: `<element_name>.text`.** It also retires the CP-D payload as a mapping source — its bare, unsuffixed keys are not the form this codebase has proven.

### 12.3 `generic_quote_card_1x1_v1` (`2140ca19…`) — authoritative inventory (8 elements)

| element_name | type | dynamic | required_for_render | default_value_safe |
|---|---|---|---|---|
| `Background` | image | true | **true** | `""` |
| `Logo` | image | true | false | `""` |
| `Scrim` | shape | **false** | false | — |
| `QuoteMark` | text | **false** | false | `"` (baked) |
| **`QuoteText`** | text | true | **true** | "Quote text goes here with a clear attribution below" |
| **`Attribution`** | text | true | false | "Attribution name, role" |
| **`SourceLabel`** | text | true | false | "Source label" |
| **`Footer`** | text | true | false | "Footer" |

`constraints` and `style_summary` are NULL for every row on both templates — so the table carries **no geometry/wrapping/font/length constraints**. The market-insight layout guard was derived separately (cc-0033a probe), so **whether the quote card needs its own guard remains unproven** and is a residual risk, not something this table answers. Note `Background` is `required_for_render=true` and `resolve_slot_assets` already supplies it (ok for Invegent).

Dynamic text elements to map: **`QuoteText` (required), `Attribution`, `SourceLabel`, `Footer`.** `QuoteMark` and `Scrim` are non-dynamic — do not map them.

### 12.4 ⛔ NEW STOP #3 — PK's two literals have no safe home in the winner map

PK ruled `Attribution = "Invegent — AI & Automation"` and `SourceLabel = "invegent.com"`. **These cannot be written into `TMR_WINNER_TEXT_FIELDS`.**

The winner map's signature is `(f: B1Fields) => Record<string,string>` — it is keyed by **template**, not by client, and receives **no client context**. `B1Fields` = `{category, headline, subtitle, location, date, footer}` and has no `attribution` / `source_label` member.

**Hardcoding Invegent's brand strings into a template-keyed map would leak them onto any other client that selects this winner — and Property Pulse holds a live `visually_approved` assignment with a passed visual proof on this exact template (§2.6).** That is precisely the cross-brand leak the retired `brand_payload_non_pp_fail_closed` guard, and then cc-0048's contract registry, exist to prevent.

**Options for PK:**

- **(a) RECOMMENDED — put them where per-client brand values already live.** Add `attribution` + `source_label` to Invegent's `renderer_fixed` in `creative_contract.ts` (exactly like cc-0048's `category`/`footer`), extend `B1Fields` + `buildProofFieldsFromDraft` to carry them, and map `Attribution.text ← f.attribution`, `SourceLabel.text ← f.source_label`. Client-scoped, consistent with the proven pattern, no leak. Cost: touches three files instead of one, so it exceeds the "add the mapping only" posture and needs PK's explicit widening.
- **(b) Literals in the winner map** — smallest diff, but **unsafe**: PP inherits Invegent's attribution the moment ranking flips. Not recommended.
- **(c) Map only `QuoteText`/`Footer`** and leave the other two unmapped — they would render their template **defaults** ("Attribution name, role", "Source label"), i.e. visible placeholder text. Not acceptable.

**Proposed mapping, conditional on PK electing (a):**

```ts
'generic_quote_card_1x1_v1': (f) => ({
  'QuoteText.text':   f.headline,       // required element
  'Attribution.text': f.attribution,    // NEW B1Fields member, from the client contract
  'SourceLabel.text': f.source_label,   // NEW B1Fields member, from the client contract
  'Footer.text':      f.footer,
}),
```

`QuoteText ← headline` is the one remaining judgement call (the alternative is `subtitle`); PK should confirm. Scrim/Background/Logo stay authoritative from `slot_resolution`; `QuoteMark` is baked and untouched.

## 11. Stop condition

Report per `docs/briefs/_template_result.md`, then stop. **Next gate: PK supplies an authoritative element source (§5) + rules on `Attribution`/`SourceLabel` (§4), then Gate-1. No build, containment DML, or deploy is authorized.**
