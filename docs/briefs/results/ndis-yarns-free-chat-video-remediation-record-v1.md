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

**Still open, each PK-owned, none actioned here:**
1. **`approved_by='PK'` audit correction** — a production row carries PK's approval on work PK did
   not approve. This is the most corrosive item: it makes the audit trail lie.
2. **Suitability-row rollback vs ruling E1** — the `a3d8472d × youtube × feed × candidate` row was
   applied by raw SQL with **no migration identity** (`supabase_migrations` holds no suitability
   entry), violating the migration-naming standing rule the packet itself stated.
3. **The five named control gaps + five proposed safeguards** from the investigation remain proposals.
4. **No structured brand-claims record exists** (`c.client_brand_profile` = 0 rows for ndis-yarns), so
   nothing in the system *could* have caught a false service offer mechanically. Until that exists,
   the same class of post can recur through any hand-authored path.

## 5. ⚠ Companion investigation record is OFF-MAIN

The full root-cause investigation —
`docs/briefs/results/ndis-yarns-free-chat-post-investigation-result-v1.md`, register **v6.98** — lives
**only** on the unmerged branch `claude/ndis-yarns-free-chat-post-ou0tuj` (`3dfc5ff`). It is not on
`main`.

This remediation record was written **onto `main` specifically so this register pointer does not
reference a document that `main` cannot resolve** — the exact off-main-governing-document defect the
v6.99 docs-hygiene lane was run to fix. **Landing that investigation record on `main` is recommended
and is NOT done here** (it belongs to its own lane; this lane holds no authority over it). Until it
lands, the evidence for §4 is off-main.

## 6. Constraints respected

- Zero mutation by this lane: no DB write, no code, no deploy, no publish-state change, no migration.
- The only external call was one unauthenticated public oEmbed GET (§2). No credential was read,
  requested, or handled.
- No branch merged, deleted, or pushed; `claude/ndis-yarns-free-chat-post-ou0tuj` untouched.
- Nothing marked proven, approved, or resolved; no open decision in §4 closed or pre-empted.
