CLAIMED v6.101 · ndis-yarns-free-chat-remediation · main · T1 record-only · 2026-08-01T02:40Z

# Remediation record — NDIS Yarns "free chat" video set PRIVATE (v1)

**Date:** 2026-08-01 Sydney · **Tier:** T1 (record-only; zero mutation by this lane) ·
**Lane class:** SAFETY_GATE · **Actioned by:** PK (manually, in YouTube Studio)

> **Scope of THIS document:** it records ONE completed containment action and its verification.
> It closes the live public exposure. It does **not** close the root cause, and it is **not** the
> investigation record — see §5.

---

## 1. The action

**YouTube video `3TisjgII01s` — "Your First NDIS Chat Is Free" (NDIS Yarns channel) — visibility
changed `public` → `private` by PK on 2026-08-01.**

Performed manually by PK in YouTube Studio. **No ICE code path was used, because none exists:**
`privacyStatus` is only ever set at upload time (`supabase/functions/youtube-publisher/index.ts:384`,
inside `uploadToYouTube`); there is no `videos.update` call anywhere in the repo, and every other
YouTube API call in the codebase is read-only (`youtube-insights-worker` → `/videos`, `/channels`;
`feed-discovery` → `/search`). Doing it programmatically would have required hand-rolling an
authenticated write using the live channel OAuth credential — declined on secret-handling grounds
(CCF-02 R2; secrets never in transcript). The manual route was also simply faster.

## 2. Verification

| Check | Result |
|---|---|
| PK attestation | Confirmed done |
| Independent, credential-free probe: YouTube oEmbed `GET /oembed?url=…3TisjgII01s&format=json` | **HTTP 404 "Not Found"** — no longer publicly resolvable |
| Baseline for comparison | Recorded `privacy_status = public` at 2026-08-01T01:10Z in the investigation record (§5) |

**Stated limit of this verification — not smoothed over:** an unauthenticated oEmbed 404 proves the
video is **no longer publicly accessible**. It does **not** by itself distinguish
`private` / `unlisted` / `deleted`. The specific end-state `private` rests on PK's attestation.
An authoritative reading is available without new code whenever `youtube-insights-worker` next runs
— it already captures `status.privacyStatus` as AUTHORITATIVE (`index.ts:248`) — and that reading
should be treated as the confirming evidence. A page-scrape verification was attempted first and was
inconclusive (YouTube renders client-side; the fetch returned footer nav only).

## 3. What this closes

- **The live public false-claim exposure.** The video asserted "Your First NDIS Chat Is Free" for a
  brand that offers no consultation service. It is no longer publicly viewable.

## 4. What this does NOT close (the actual defect)

The video was the symptom. Per the investigation, draft
`m.post_draft 4c8578ba-46bf-4e2e-be0b-3d1ea9c5c28e` was **hand-authored and inserted via raw SQL**,
`created_by='postgres'`, `slot_id=NULL`, `digest_item_id=NULL`, **no `m.ai_job` row**, born
`approval_status='approved'` with **`approved_by='PK'` stamped by the SQL itself** — an approval PK
never gave. It never passed ai-worker, compliance-reviewer, the auto-approver, or the external
reviewer (all wired to the ai-worker path only).

**Still open, each PK-owned, none actioned here** *(status updated below as items close):*
1. ~~**`approved_by='PK'` audit correction**~~ — **✅ CLOSED at v6.105 (2026-08-01).** A production
   row carried PK's approval on work PK did not approve; the audit trail asserted a human approval
   that never happened. `approved_by` `'PK'` → `'orchestrator_gate8_supervised'` under a guarded
   single-statement apply (pre-image assertion · CAS · `ROW_COUNT=1` · collateral-change check), PK
   decision "apply A". Packet:
   `docs/briefs/ndis-yarns-approved-by-audit-correction-apply-packet-v1.md`.
   **`approved_at = created_at` was deliberately left untouched** — that equality is the machine
   proof the row was born-approved inside the INSERT, and it is the evidence, not the defect.
2. **Suitability-row rollback vs ruling E1** — the `a3d8472d × youtube × feed × candidate` row was
   applied by raw SQL with **no migration identity** (`supabase_migrations` holds no suitability
   entry), violating the migration-naming standing rule the packet itself stated.
3. **The five named control gaps + five proposed safeguards** from the investigation remain proposals.
4. **No structured brand-claims record exists** (`c.client_brand_profile` = 0 rows for ndis-yarns), so
   nothing in the system *could* have caught a false service offer mechanically. Until that exists,
   the same class of post can recur through any hand-authored path.

## 5. ✅ Companion investigation record — LANDED on `main` (resolved at v6.104)

The full root-cause investigation —
`docs/briefs/results/ndis-yarns-free-chat-post-investigation-result-v1.md`, register **v6.98** — was
landed on `main` by PK instruction at **v6.104**, byte-exact from `3dfc5ff` (blob
`48cc64bb…`, sha256 `58182cee…`). **The evidence for §4 is now resolvable on `main`.**

> *This section originally recorded the investigation as OFF-MAIN and recommended landing it. It was
> corrected when the landing happened, rather than left to go stale — the same failure mode this
> record exists to document.*

**What was deliberately NOT landed with it:** the `docs/00_action_list.md` half of `3dfc5ff`. That
edit chains the marker off **v6.94** (four register versions stale by the time of landing —
v6.99/v6.100/v6.101/v6.102 have since landed) and re-asserts the video is **"still PUBLIC"**, which
§1–2 prove false. Landing it verbatim would have corrupted the marker chain and re-introduced a
statement contradicted by the remediation. The open items it carried are preserved in §4 above and in
the v6.101 register entry, so nothing is dropped.

**Register-number note:** `v6.98` remains the investigation's claimed number (its own claim stub,
`2026-08-01T01:10Z`) and is now **consumed by a landed record on `main`** — no longer "reserved
off-main", and it must not be re-cut. No separate `00_sync_state.md` entry was cut for v6.98 by this
lane: that is the investigation lane's own record to write, and this lane holds no authority to author
another lane's register entry. The v6.101 pointer resolves to the landed document, so nothing dangles.

## 6. Constraints respected

- Zero mutation by this lane: no DB write, no code, no deploy, no publish-state change, no migration.
- The only external call was one unauthenticated public oEmbed GET (§2). No credential was read,
  requested, or handled.
- No branch merged, deleted, or pushed; `claude/ndis-yarns-free-chat-post-ou0tuj` untouched.
- Nothing marked proven, approved, or resolved; no open decision in §4 closed or pre-empted.
