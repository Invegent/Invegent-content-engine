# Runbook — "Instagram isn't publishing / no posts showing up"

> **Purpose:** a 2-minute diagnostic so we never re-derive the same IG-silence loop from scratch.
> **Last verified:** 2026-05-27 (live against Supabase `mbkmaxqhsohbtwsqolns`).
> **Project:** `mbkmaxqhsohbtwsqolns` · **Publisher EF:** `instagram-publisher` (currently v2.4.0).
> Living doc — update the "worked examples" section whenever a new IG-silence cause is found.

---

## 30-second mental model

Instagram (like every ICE platform) has **three independent stages**, each with its own switch. A post only appears if **all three** pass:

```
1. GENERATE   slot → draft        gated by:  m.is_publish_eligible() inside m.fill_pending_slots
2. APPROVE    draft → approved    gated by:  c.client_publish_profile.auto_approve_enabled  (or manual approval)
3. PUBLISH    queued → live       gated by:  c.client_publish_profile.publish_enabled  + cron 53 running
```

**The trap to remember:** `publish_enabled` is read at BOTH stage 3 (publish) AND stage 1 (generate, via the cc-0019 fill-gate). So a client with `publish_enabled=false` doesn't just stop publishing — it **stops generating drafts entirely**, leaving an empty inbox/queue with nothing to even approve. "Nothing in the inbox" is a symptom of disablement, not proof everything's fine.

Two switches people confuse:
- `c.client_publish_profile.publish_enabled` — master on/off; gates publish **and** (via the fill-gate) generation.
- `c.client_publish_schedule.enabled` — which day/time slots exist for the client. Usually fine; rarely the culprit.

The active generation path is the **slot system** (`m.slot` → `m.fill_pending_slots`). The legacy `seed-and-enqueue-instagram` cron (jobid 64) is **OFF and superseded** — do **not** assume it needs turning on; CFW/Invegent generate fine with it off.

---

## Fast diagnostic — run these top to bottom

Copy-paste into Supabase SQL editor (or via MCP `execute_sql`). All read-only.

```sql
-- 1) PROFILE FLAGS — the master switches + token presence (the #1 cause lives here)
SELECT c.client_name, cpp.publish_enabled, cpp.auto_approve_enabled,
       cpp.destination_id, (cpp.page_access_token IS NOT NULL) AS has_token,
       cpp.token_expires_at, cpp.max_per_day
FROM c.client c
JOIN c.client_publish_profile cpp ON cpp.client_id = c.client_id
WHERE cpp.platform = 'instagram'
ORDER BY c.client_name;

-- 2) CRONS — publisher must be active; note 64 is legacy/off (not a fault)
SELECT jobid, jobname, schedule, active FROM cron.job
WHERE jobid IN (48,53,64) ORDER BY jobid;
--   48 enqueue-publish-queue-every-5m   -> ON  (generic approved-draft enqueue)
--   53 instagram-publisher-every-15m    -> ON  (the publisher)
--   64 seed-and-enqueue-instagram        -> OFF (legacy; ignore)

-- 3) DRAFT INBOX — anything stuck awaiting approval?
SELECT approval_status, platform, count(*) FROM m.post_draft
WHERE platform='instagram' GROUP BY approval_status, platform ORDER BY approval_status;
--   needs_review > 0  => auto-approve off or sweep not running
--   approved but not publishing => check queue (step 5)

-- 4) SLOTS — *** THE KEY QUERY *** why drafts are/aren't being generated
SELECT c.client_name, s.status, s.skip_reason, count(*) AS rows,
       min(s.scheduled_publish_at) AS earliest, max(s.scheduled_publish_at) AS latest
FROM m.slot s JOIN c.client c ON c.client_id = s.client_id
WHERE s.platform='instagram' AND s.scheduled_publish_at > now() - interval '14 days'
GROUP BY c.client_name, s.status, s.skip_reason ORDER BY c.client_name, s.status;
--   skip_reason='publish_path_disabled'  => cc-0019 fill-gate skipped it (publish_enabled was false)
--   status='future'                       => not filled yet; will fill when window opens IF eligible
--   status='filled'                       => draft was generated (good)

-- 5) ELIGIBILITY GATE — does the fill-gate currently pass per client?
SELECT c.client_name, m.is_publish_eligible(c.client_id,'instagram') AS ig_eligible_now
FROM c.client c
WHERE c.client_name IN ('NDIS-Yarns','Property Pulse','Care For Welfare Pty Ltd','Invegent')
ORDER BY c.client_name;
--   false => generation is being suppressed for that client RIGHT NOW

-- 6) QUEUE — is approved content actually queued for the publisher?
SELECT c.client_name, ppq.status, count(*), min(ppq.scheduled_for) AS earliest_due
FROM m.post_publish_queue ppq JOIN c.client c ON c.client_id = ppq.client_id
WHERE ppq.platform='instagram' AND ppq.status NOT IN ('dead','purged')
GROUP BY c.client_name, ppq.status ORDER BY c.client_name, ppq.status;
--   status='queued' with future scheduled_for => paced; will publish on/after that time (max_per_day caps it)
--   nothing here + approved drafts exist       => enqueue (cron 48) hasn't run or draft already has a stale queue row

-- 7) RECENT PUBLISH RESULTS — successes vs failures
SELECT c.client_name, pp.status, pp.platform_post_id, pp.created_at
FROM m.post_publish pp JOIN c.client c ON c.client_id = pp.client_id
WHERE pp.platform='instagram' AND pp.created_at > now() - interval '14 days'
ORDER BY pp.created_at DESC LIMIT 20;
```

---

## Symptom → cause → fix (fingerprints)

| Symptom in the data | Cause | Fix |
|---|---|---|
| Slots `skipped` with `skip_reason='publish_path_disabled'`; empty inbox/queue for that client | **`publish_enabled=false`** → cc-0019 fill-gate suppressed generation (most common) | Set `publish_enabled=true` (UI Clients tab). Forward slots then fill automatically. Already-skipped slots do **not** auto-recover. |
| `is_publish_eligible()` returns `false` despite `publish_enabled=true` | token missing / `destination_id` null / profile not `active` | Reconnect IG / fix the profile row, then re-check the function. |
| Drafts piling up in `approval_status='needs_review'` | `auto_approve_enabled=false` (or auto-approver sweep not running) | Turn auto-approve on (UI), or approve manually. |
| Approved drafts but `status='queued'` rows with a **future** `scheduled_for` | Working as intended — throttle/pacing (`max_per_day`, one per day spread) | Wait; or lower the schedule spacing if you want faster cadence. |
| `queued` rows present, due now, but never publish; cron 53 active | publisher erroring at publish (auth/format) — check step 7 `failed` rows + `last_error` | Inspect the failed `m.post_publish` row; common: token, or `text`/`carousel`/`video` format not postable to IG. |
| Approved draft, no queue row at all, has an old `purged`/`dead` queue row | enqueue (cron 48) won't create a new row because one already exists for that draft | Needs a manual requeue decision (gated mutation). |
| Everything green but no posts and queue empty | nothing approved/generated recently | Check slots (step 4) — generation may be skipped or no fresh signal. |

---

## Worked example — 2026-05-27 (NDIS-Yarns + Property Pulse silent)

**Reported:** CFW + Invegent posted to IG ~3 days prior (24 May); NY/PP showed nothing. PK enabled `publish_enabled` + `auto_approve_enabled` for NY/PP and approved the visible inbox, expecting posts.

**Found:** NY/PP each had 5 IG slots `skipped` / `publish_path_disabled` (26–28 May) — the cc-0019 fill-gate had suppressed draft generation while `publish_enabled` was false during the IG fresh-restart. So there was nothing in their inbox to approve and nothing to publish; the enabled-then-empty state was the symptom of the earlier disablement, not a separate fault. Schedule was healthy (5 enabled IG schedule rows each). CFW/Invegent slots were all `filled` and had 7 approved drafts paced in the queue.

**Resolution:** Flipping `publish_enabled=true` cleared the gate — `is_publish_eligible()` then returned `true` for NY/PP. Their `future` slots (29 May→2 Jun) fill automatically from there → generate → auto-approve → enqueue → publish. **No further mutation required**; self-heals from ~29 May. Residue: the already-skipped 26–28 May slots are terminal and won't backfill, so NY/PP have a ~2-3 day gap before the first new post.

**Lesson:** "no posts" almost always traces to stage 1 (generation), not stage 3 (publishing). Start at slots (step 4), not at the publisher.

---

## Reference

**Crons:** `53` instagram-publisher (`*/15`), `48` enqueue-publish-queue (`*/5`, generic), `64` seed-and-enqueue-instagram (legacy, **off**), `11` facebook seed (off), `65` linkedin seed (off).

**Tables:** `c.client_publish_profile` (publish_enabled / auto_approve_enabled / destination_id / page_access_token / token_expires_at / max_per_day); `c.client_publish_schedule` (day/time slot rows, `enabled`); `m.slot` (status / skip_reason / filled_draft_id); `m.slot_fill_attempt` (per-attempt decisions); `m.post_draft` (approval_status / platform / client_id); `m.post_publish_queue` (status); `m.post_publish` (results).

**Gate function:** `m.is_publish_eligible(client_id uuid, platform text) -> boolean`, called inside `m.fill_pending_slots`. False ⇒ slot skipped with `skip_reason='publish_path_disabled'`, no draft/ai_job created. (cc-0019 Unit A; migration `20260524091020`.)

**IG destination_ids (verified 2026-05-27):** CFW `17841448817496127` · Invegent `17841478620496802` · NDIS-Yarns `17841434187207336` · Property Pulse `17841428039984562`.

**Token caveat:** `token_expires_at` is a hardcoded `2099-12-31` sentinel (callback writes `now()+5y`) — it does **not** reflect real Google/Meta token validity (cf. F-YT-EXPIRY-DISPLAY-FAKE). A token can be dead while the column reads "valid". Confirm by an actual publish (step 7), not the expiry column.

**Format note:** `text` cannot post to IG; `carousel`/`video` have historically tripped a container-status GET (`100/33`). Most working IG content is `image_quote`.

---

## Governance

Diagnosis is read-only — run the queries freely. **Any fix that mutates production** (flipping `publish_enabled`/`auto_approve_enabled` outside the UI, enabling a cron, re-opening skipped slots, requeueing) is a `sql_destructive`/`config_change` and requires a **D-01 cross-review + PK approval phrase** before execution. Flag flips done through the dashboard UI are PK's own action and don't need a D-01.
