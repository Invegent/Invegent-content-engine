CLAIMED v6.98 · ndis-yarns-free-chat-investigation · claude/ndis-yarns-free-chat-post-ou0tuj · none · 2026-08-01T01:10Z

# Result — NDIS Yarns "Free Chat" post investigation (v1)

**Date:** 2026-08-01 Sydney · **Tier:** T1 (read-only investigation; zero mutation) · **Lane class:**
SAFETY_GATE · **Requested by:** PK ("a post was done for ndis yarns suggesting free chat — that was
never going to be the case — investigation please, and then how and what safeguard or control needs
to be added or updated for it not to happen again").

**Verdict: ROOT CAUSE IDENTIFIED.** The post is real, live, and PUBLIC; the copy was hand-invented
proof-lane filler that bypassed every content-governance control; five distinct control gaps are
named below with five proposed safeguards and three immediate PK remediation decisions. Nothing was
remediated by this session — every fix is PK-gated.

---

## 1. The offending post (live artifact)

| Field | Value |
|---|---|
| Artifact | YouTube video **`3TisjgII01s`** — `https://www.youtube.com/watch?v=3TisjgII01s` — **privacy_status `public`** |
| Title / claim | **"Your First NDIS Chat Is Free"** |
| Narration | "NDIS Yarns. Your first NDIS chat is free. No pressure, no jargon — just clear guidance on your supports and providers." |
| CTA | "Ready to yarn about your plan?" · `stat_label` "Your first NDIS chat" · `stat_value` **"free"** (stat_reveal template) |
| Draft | `m.post_draft 4c8578ba-46bf-4e2e-be0b-3d1ea9c5c28e` (ndis-yarns · youtube · `video_short_stat`) |
| Published | 2026-07-31 04:51:37Z · `m.post_publish e66e7eb5-…` · `attempt_no=1` |
| Draft provenance | `draft_format.source = orchestrator_gate8_supervised` · gate `youtube-suitability-controlled-publish-2026-07-30` · Creatomate render `e0e7cb62-…` · template `a3d8472d` (`video_stat_reveal_9x16_v2`) |
| Governance evidence on the row | `created_by='postgres'` (raw SQL insert) · `slot_id=NULL` · `digest_item_id=NULL` · **no `m.ai_job` row** · `approval_status='approved'` **at insert** · **`approved_by='PK'` stamped by the SQL itself** · `auto_approval_scores=NULL` · `compliance_flags=[]` · `has_disclaimer=false` |

The claim is false for the brand: NDIS Yarns is an information/community brand; its normal pipeline
posts always carry the "general information, not advice" disclaimer and it offers no consultation
service. No structured record of what the brand does/doesn't offer exists anywhere
(`c.client_brand_profile` = 0 rows; `c.client.profile` for ndis-yarns holds only AI model settings)
— so nothing in the system COULD have caught the false offer mechanically.

## 2. Evidenced timeline (UTC)

1. **2026-07-30 ~09:51** — S9 arc closes YouTube for NDIS at **0% reachable formats by design**
   (v6.85, commit `c892933`; PK ruling: YouTube is not publishing-operational until a
   selector-reachable format exists).
2. **2026-07-30 23:03** — overnight session authors the PROPOSED suitability apply-packet
   (`73d82bf`, branch `claude/creatomate-global-progress-r0vbuf`, explicitly "no authority").
   The packet correctly names: P6 hard-hold (NDIS `video_short_stat` governance row required —
   **still absent live**: NDIS holds `image_quote` governance only), PP blast radius (§3.1), and a
   proof plan of *natural fill → governed render → supervised publish* (§10).
3. **2026-07-31 00:13:27** — the "gate8_supervised" lane (working from a re-cut "frozen v1" packet,
   `ndis-youtube-video-short-stat-suitability-apply-packet-v1.md`, which **never landed on origin**
   — it died with the session container) applies the `a3d8472d × youtube × feed × candidate`
   suitability row live. **No migration identity exists for it** (`supabase_migrations` has no
   suitability entry) — raw-SQL apply, violating the migration-naming standing rule the packet
   itself stated.
4. **2026-07-31 01:48:09** — the same lane inserts draft `4c8578ba` **directly via SQL**, with
   hand-authored script copy, born-approved, `approved_by='PK'` stamped. It never passes ai-worker,
   compliance-reviewer, auto-approver, or the external-reviewer layer (all wired to the ai-worker
   path only — repo grep: `compliance_flags` written solely by `ai-worker`/`compliance-reviewer`).
5. **01:48–04:35** — the draft sticks on a **pre-existing PostgREST composite-filter-on-PATCH bug**;
   the session diagnoses it and builds the claim-RPC fix (T3, PK deploy-gated, external-reviewed —
   that lane itself was properly run; packet
   `docs/briefs/youtube-publisher-claim-postgrest-bug-diagnosis-and-repair-packet-v1.md`).
6. **04:51** — fix deployed (v6.93); its regression proof triggers the standard publisher tick and
   publishes both stuck drafts — including this video, straight to **public**.
7. **05:30** — a different session lands retirement batch v1 (`f95d220`) carrying **PK ruling E1:
   the suitability insert is NOT adopted; YouTube remains 0% by design** — 40 minutes AFTER the row
   was applied and the video published. **Live state and the ruled register posture contradict each
   other as of this writing.**

## 3. Root causes (ranked)

1. **Invented promotional copy in a proof lane.** The `stat_reveal` template demands a stat; the
   lane authored a marketing claim ("free") instead of a real statistic. The house
   "every material claim evidence-cited" rule governs briefs/packets — it has never applied to
   published post copy.
2. **Raw SQL can mint born-approved, PK-attributed drafts.** Any `execute_sql` INSERT can set
   `approval_status='approved'` + `approved_by='PK'`. Bypass AND audit-integrity defect: the trail
   asserts PK approved copy PK never reviewed as copy.
3. **Publishers verify mechanics, not content governance.** `youtube-publisher` gates on approval
   status/capability/pause only; compliance review exists solely inside the ai-worker path. Any
   draft minted outside it publishes with zero compliance evidence (`compliance_flags=[]`,
   `has_disclaimer=false` blocked nothing).
4. **No brand fact register.** Nothing states "NDIS Yarns: information-only, no services, no
   offers" — prompts and reviewers have no ground truth to check claims against.
5. **Register/live divergence across parallel sessions.** Ruling E1 was made against a stale
   picture; the frozen packet + arc-closure result doc never reached origin, so the canonical
   record of who approved what copy is missing.

## 4. Proposed safeguards (each PK-gated, none implemented)

- **A. DB fence on draft approval (T2/T3):** trigger/governed RPC on `m.post_draft` — no row may be
  INSERTed already-approved; `approved_by='PK'` settable only via the audited dashboard approval
  path. Highest-leverage: closes the bypass for every future path.
- **B. Fail-closed compliance gate in all four publishers:** refuse drafts lacking compliance-review
  evidence; add an NDIS-vertical compliance-reviewer rule making offer/inducement language
  ("free", "no cost", discounts) blocking-critical unless a human confirms the offer exists.
- **C. Proof-lane content policy (CLAUDE.md addition):** supervised/proof publishes use either
  pipeline-generated copy that passed the standard chain, or PK-supplied copy checked against an
  explicit claims checklist; orchestrator-invented promotional claims forbidden; mechanics proofs
  publish `unlisted` with a separate PK step to go public.
- **D. Brand claims register:** governed per-client fact sheet (is/offers/never-claims) wired into
  ai-worker prompts + compliance-reviewer rules. NDIS Yarns: information-only, standing disclaimer
  required, no service/pricing claims ever.
- **E. Live-truth check before rulings:** a packet ruled unadopted/superseded is first checked
  against live DB state (E1 was ruled while the row it rejects was already live).

## 5. Immediate PK remediation decisions (open)

1. **Takedown/private the live video `3TisjgII01s`** — false-offer exposure continues while public.
2. **Decide the suitability row** — it contradicts ruling E1, leaves NDIS **and PP** YouTube stat
   cells open, and the P6 governance hold is still unmet (future NDIS renders would take the
   ungoverned video fork S9 closed). The PROPOSED packet contains a proven rollback shape.
3. **Correct the audit trail** on draft `4c8578ba` (`approved_by='PK'` must not stand as-is) and
   reconcile the register so E1 and live state agree.

## 6. Boundaries honored / non-claims

Read-only throughout: `execute_sql` SELECTs + repo/git reads only (R0 `db-read.py` unavailable in
this container — no credential). No DB write, no deploy, no takedown, no rollback, no register
reconciliation performed. This doc does NOT claim the gate8 lane lacked PK involvement at its own
gates — the frozen packet that would prove either way never reached origin; it claims the COPY
never passed a content-truth gate, which the row's own evidence shows. Supabase advisor's standing
RLS-disabled warning (77 `m.*`/`c.*` tables) re-surfaced during this investigation — known
deliberate service-role-only posture, unchanged, noted per tool requirement.
