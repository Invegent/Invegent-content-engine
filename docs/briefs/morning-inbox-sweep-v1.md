---
brief_id: morning-inbox-sweep-v1
brief_version: v1.0
status: draft
risk_tier: 0
owner: cowork
created_by: PK + chat session 2026-05-08 Friday Sydney (post Crazy Domains $251/yr auto-renewal discovery — calibration anchor)
default_action: write_markdown_only
allowed_paths:
  - docs/audit/inbox/**
  - docs/runtime/runs/**
  - docs/runtime/claude_questions.md
  - docs/briefs/morning-inbox-sweep-v1.md
forbidden_actions:
  - sending email (any send action via Gmail MCP)
  - replying to email
  - archiving email
  - deleting email
  - marking email as read
  - modifying labels
  - any write action on Gmail of any kind
  - any production touch on c.*, m.*, f.*, t.*, a.*, k.* schemas
  - calling ask_chatgpt_review (Tier 0 boundary — do not escalate from inside this brief)
idempotency_check: "inbox_file_absent"
idempotency_pattern: "docs/audit/inbox/{YYYY-MM-DD}.md"
success_output:
  - docs/audit/inbox/{YYYY-MM-DD}.md
  - docs/runtime/runs/morning-inbox-sweep-v1-{YYYY-MM-DDTHHMMSSZ}.md
  - email-ping to PK confirming the file is ready (read-only summary; see Section "Email ping")
schedule: "0 20 * * *"  # 20:00 UTC = 06:00 AEST next day
---

# Brief: Morning Inbox Sweep (v1.0) — DRAFT

> **STATUS=DRAFT.** PK held this brief from going live on 2026-05-08 pending cool-headed amendment. Cowork must NOT pick this up while status=draft. Re-review and flip to status=review_required before scheduling.

Generate a daily summary of every email received in the last 24 hours across all PK Gmail accounts, classified into actionable vs FYI, with money-out / deadlines / account-security items always promoted to the top. Read-only Gmail access. Markdown output. Email ping notification when ready. Tier 0.

## Version history

- **v1.0** (2026-05-08 Friday Sydney) — first version. Calibration anchor: Crazy Domains $251/yr auto-renewal bleed discovered today. Money-out classification rules tuned to catch this pattern. **Status=draft per PK hold.**

## Purpose

PK already runs an ICE Nightly Health Check at 02:00 AEST that sweeps Supabase pipeline state. This brief extends the same pattern to PK's email — a daily 06:00 AEST sweep that surfaces what needs attention before the day starts. The morning summary is the only file PK needs to read to know what's important in their inbox.

The classifier is biased toward **false positives over false negatives**: better to flag something as urgent that isn't, than miss something that is. Tightening can come from review patterns over the first 2-4 weeks.

## Idempotency

If `docs/audit/inbox/{YYYY-MM-DD}.md` already exists for today's UTC date, write `already_applied` to the state file and stop. Do not overwrite. To force a re-run on the same UTC day, PK deletes the existing file before firing.

## Pre-flight: Gmail account configuration

This brief assumes Cowork has Gmail MCP configured for **all** of PK's Gmail accounts. At time of brief authoring (2026-05-08), this is unverified.

**Pre-flight check (run once before scheduling):**

1. Confirm Gmail MCP is connected.
2. Confirm whether `pk@invegent.com` is:
   - (a) A separate Google Workspace account → requires its own MCP connection AND a parallel scheduled task, OR
   - (b) An alias/forwarder under a single primary Google account → single connection covers it.
3. If (a), this brief must be duplicated as `morning-inbox-sweep-v1-invegent.md` with the second account configured. Both runs write into the SAME daily output file, in distinct sections.

For v1.0 this brief assumes case (b) — single account sweep. PK confirms or flags as a question on first run.

## Sweep window

**Look-back:** rolling last 24 hours from sweep run time.
**Sweep run time:** 06:00 AEST = 20:00 UTC previous day. So the window is approximately 20:00 UTC day-1 → 20:00 UTC day (run time).

**Anchor for "today's date" in filename:** the AEST date at the time the sweep runs. So a sweep that fires at 20:00 UTC on 2026-05-08 (= 06:00 AEST 2026-05-09) writes file `docs/audit/inbox/2026-05-09.md`.

## What to fetch

For each email in the 24h window, capture:

- `id` (Gmail message ID)
- `thread_id`
- `from` (display name + address)
- `to` / `cc` (recipients)
- `subject`
- `date` (timestamp received)
- `labels` (Gmail-applied labels — Inbox, Important, Starred, custom labels)
- `snippet` (first ~200 chars of body)
- `has_attachments` (boolean)
- `is_unread` (boolean)

Do NOT fetch full email bodies in v1.0. Snippets + subjects are sufficient for classification, and full-body fetches are slower + use more tokens. If a v2 needs body content for better classification, add then.

## Classification rules

Each email lands in exactly ONE of three buckets:

### 🔴 URGENT — needs PK attention today/this week

A message is URGENT if ANY of the following triggers fire:

**Money out (highest sensitivity — calibration anchor)**

- Subject or snippet contains: `invoice`, `receipt`, `payment`, `charged`, `auto-renew`, `auto-renewal`, `subscription renewed`, `your renewal`, `paid by`, `we have charged`, `transaction`, `billing`, `card ending`
- AND the sender appears to be a vendor/service (heuristic: not a person, not in PK's contacts as a person, domain is `.com` / `.com.au` / `.io` / `.co` etc with company-name pattern)
- Threshold: **flag every match regardless of dollar amount**. The Crazy Domains case proved that small recurring charges are exactly the pattern that hides bleed.

**Money in**

- Subject or snippet contains: `payment received`, `invoice paid`, `refund`, `credit`, `deposit`, `transferred`, `you've been paid`

**Deadlines**

- Subject or snippet contains: `respond by`, `action required`, `expires on`, `expires`, `deadline`, `due date`, `final notice`, `last reminder`, `verify by`, `confirm by`
- AND a date is detectable in the snippet (regex: `\d{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)`, `\d{4}-\d{2}-\d{2}`, etc.)

**Account / security**

- Subject or snippet contains: `password`, `2FA`, `verify your`, `unusual sign-in`, `suspicious activity`, `account suspended`, `account locked`, `policy violation`, `terms of service`, `data breach`, `security alert`, `disabled`, `restricted`

**Platform / vendor critical (ICE-specific)**

- Sender domain matches any of: `meta.com`, `facebook.com`, `linkedin.com`, `instagram.com`, `supabase.io`, `supabase.com`, `vercel.com`, `github.com`, `anthropic.com`, `openai.com`, `cloudflare.com`, `crazydomains.com.au`
- AND subject/snippet contains action-oriented terms: `deprecated`, `breaking change`, `migration required`, `usage limit`, `downtime`, `incident`, `policy update`, `new requirement`, `app review`, `quota`

**High-trust senders (always urgent regardless of content)**

- Sender is from any of these domains: `ato.gov.au`, `ndis.gov.au`, `auspost.com.au` (registered post tracking)
- Sender is a known accountant / lawyer / bank — list maintained in Notes section below; PK to populate
- Sender appears to be a **client** (NDIS Yarns, Property Pulse, Care for Welfare or external clients once onboarded — slug match to `c.client` table is out of scope for v1.0; v1.0 uses domain heuristic + PK-maintained allowlist)

**Reply-needed-to-own-thread**

- The thread was started by PK (heuristic: most-recent message in thread before this one was authored by PK's own address)
- AND the most recent reply is from someone else
- AND the message is unread
- This catches "someone replied to my own ask and I need to action it"

### 🟡 FYI — awareness only, not actionable

Default for everything that isn't URGENT and isn't NOISE. Includes:

- News/industry updates from outside PK's normal feed labels
- Confirmation messages where no action is required
- Calendar invites already accepted
- Cross-promotion / community messages from contacts
- Anything from a real person that doesn't fit URGENT triggers

### ⚪ NOISE — suppress from summary, count only

- Sender or labels match: `newsletter/ndis`, `newsletter/property` (these are existing ICE feed-source labels — they belong to the content engine, not PK personally)
- Sender domain is a known marketing/promotional source (heuristic: `noreply@`, `marketing@`, `news@`, `updates@`, etc. AND no money/deadline/security trigger fires)
- Calendar notifications for already-accepted events
- Social media platform notifications (Facebook/Instagram/LinkedIn/X "X liked your post" type messages)

A noise message is **counted** in the summary header but not listed individually.

### Tie-breaking

If a message matches BOTH URGENT and NOISE triggers (e.g. an auto-renewal notice from a marketing-pattern sender), URGENT wins. Money-out is the highest-priority signal — never demote it.

## Output format

Write a single markdown file at `docs/audit/inbox/{YYYY-MM-DD}.md`. Use the AEST date at run time.

```markdown
# PK Inbox Sweep — {YYYY-MM-DD}

> Generated by `morning-inbox-sweep-v1` (v1.0 brief).
> Run timestamp (UTC): {ISO-8601}
> Window: 24h trailing from run time.
> Account(s) swept: {list}

## 1. Headline

- Total messages in window: {n}
- 🔴 Urgent: {n}
- 🟡 FYI: {n}
- ⚪ Noise (suppressed): {n}
- Top urgent category: {money-out | deadline | security | platform | high-trust | reply-needed}

## 2. 🔴 Urgent — needs your attention

{For each urgent message, in priority order (money-out first, then security, then deadlines, then platform, then high-trust, then reply-needed):}

### {N}. {Subject}

- **From:** {sender}
- **Received:** {time, AEST}
- **Trigger:** {which classifier rule fired}
- **Snippet:** {first ~200 chars}
- **Why flagged:** {one-line plain-English explanation, e.g. "Auto-renewal charge from a vendor — verify period and amount before this auto-renews again"}

{If 0 urgent: "No urgent items in this window."}

## 3. 🟡 FYI — awareness only

{Single table, one row per FYI message:}

| Time | From | Subject |
|---|---|---|
| {AEST} | {sender} | {subject (truncate at 80 chars)} |

{If 0 FYI: "No FYI items in this window."}

## 4. ⚪ Noise (suppressed)

- Total: {n}
- By category: newsletters {n}, marketing {n}, social-platform {n}, accepted-calendar {n}, other {n}

{Do not list individual messages.}

## 5. Notable signals

List anything that doesn't fit the buckets but matters:

- New sender appearing for the first time
- Unusual volume from a single sender (>5 in 24h)
- A trigger fired but PK should review whether the rule is calibrated correctly
- Senders that appeared in URGENT yesterday and again today (recurring pattern)

If nothing notable: "No anomalies above default thresholds."

## 6. Footer

- Brief: `morning-inbox-sweep-v1` (v1.0)
- Run state file: `docs/runtime/runs/morning-inbox-sweep-v1-{YYYY-MM-DDTHHMMSSZ}.md`
- Idempotency check: `inbox_file_absent` → passed at start of run
- Calibration anchor: 2026-05-08 Crazy Domains $251/yr auto-renewal discovery
- Next: PK reviews; if Section 2 has items, action; brief shape to be reviewed at sunset 2026-06-08 (4 weeks)
```

## Email ping

After writing the markdown file, send ONE email to PK's primary inbox confirming the file is ready.

**This is the ONLY write action this brief is permitted to perform.** It must be a SELF-ADDRESSED message: PK's primary Gmail address as both sender and recipient. No external recipients under any circumstance.

**Ping format:**

- **Subject:** `Inbox sweep ready — {YYYY-MM-DD} — {n} urgent`
- **Body:** plain text, ~5 lines:
  ```
  Morning inbox sweep complete.

  Urgent: {n}
  FYI: {n}
  Noise (suppressed): {n}

  Full file: github.com/Invegent/Invegent-content-engine/blob/main/docs/audit/inbox/{YYYY-MM-DD}.md

  Top urgent: {one-line summary of the top urgent item, or "none"}
  ```

**Stop condition for ping:** if there are 0 urgent and 0 FYI items (i.e. the entire window was noise), still send the ping with `Top urgent: none — clean inbox`. Consistency over cleverness — PK should always know the sweep ran.

## Likely questions and defaults (answer-key)

1. **Q: Multiple Gmail accounts — how do I know which to sweep?**
   **Default:** Use whichever account the Gmail MCP is connected to. If a second account exists (case (a) in pre-flight), this brief is single-account; second-account sweep requires duplicating the brief with the other account configured.

2. **Q: A message has no clear sender domain (e.g. forwarded from another person, or `noreply` with no surrounding context).**
   **Default:** Classify by content rules only (money-out, deadlines, security). If no content rule fires, default to FYI. Never default to NOISE for ambiguous senders — false negatives are worse than false positives.

3. **Q: A money-out trigger fires but the dollar amount is < $5.**
   **Default:** Still flag as URGENT. The Crazy Domains case proved small recurring charges are exactly what hides. PK can manually de-prioritise after review.

4. **Q: A message has 5+ classification triggers — which gets shown as the "primary" trigger in Section 2?**
   **Default:** Priority order: money-out > security > deadline > platform > high-trust > reply-needed. Show the highest-priority trigger only.

5. **Q: A reply-needed-to-own-thread heuristic requires checking the thread history. What if the thread is large?**
   **Default:** Look only at the message immediately before the new reply. If that prior message was authored by PK's own address (any of PK's addresses if multiple), trigger fires. Don't walk further up the thread.

6. **Q: Calendar invites — accepted vs unaccepted?**
   **Default:** Unaccepted invites = FYI (PK needs to decide). Accepted invites = NOISE. Declined invites = NOISE.

7. **Q: A sender was URGENT yesterday AND today (recurring pattern).**
   **Default:** Flag in Section 5 "Notable signals" but don't change today's classification. The recurrence itself is the signal.

8. **Q: An email looks like a phishing attempt (suspicious link, urgent-money-out language but bad spelling).**
   **Default:** Still classify as URGENT (money-out trigger fires). Add a note in the "Why flagged" line: `MAY BE PHISHING — verify sender domain before any action`. Do NOT auto-archive or delete; the brief has no write actions on Gmail.

9. **Q: Output file already exists when I run — append, overwrite, or skip?**
   **Default:** Per idempotency_check: skip. Write `already_applied` to state file and stop. No email ping.

10. **Q: Cowork / Gmail MCP returns an error mid-sweep.**
    **Default:** Write what's been gathered so far + an error block in the file. Send the email ping with subject `Inbox sweep PARTIAL — {YYYY-MM-DD} — error`. Continue rather than abort.

11. **Q: A sender domain isn't in any rule and the message is from a real person — automatic FYI?**
    **Default:** Yes. Real-person messages without explicit URGENT triggers are FYI by design. PK's recurring contacts (clients, accountant, family) should be added to the high-trust allowlist over time as patterns emerge.

If a decision arises NOT covered above and NOT obviously safe to default, write the question to `docs/runtime/claude_questions.md` per D182 default-and-continue, then proceed with your best-judgement default and note the divergence in the state file.

## Stop conditions

- Gmail MCP connection error → write `MCP_ERROR` to state file, send partial-summary ping, halt.
- Output file at `docs/audit/inbox/{YYYY-MM-DD}.md` already exists → idempotency hit, write `already_applied` to state file, stop. No email ping (file already presumed reviewed).
- Sweep window returns 0 messages → still write file with empty sections, send ping with `0 urgent, 0 FYI, 0 noise`, stop.
- Any attempt to send email to a non-self address → halt immediately. This is a forbidden action.
- Any allowed_paths violation attempt → halt immediately.

## Calibration mechanism

This brief exists primarily to surface signal. The classifier will mis-fire — flag noise as urgent, miss real urgent items. Over the first 2-4 weeks PK should mentally track:

- **False positives** — items shown as URGENT that PK would have ignored. Tighten the rule that fired.
- **False negatives** — items in FYI or NOISE that PK actually needed to action. Add a new rule or expand an existing one.
- **Recurring noise** — same sender appearing as URGENT day after day for the same non-action. Add to a NOISE allowlist.

Calibration changes are version bumps to this brief: v1.0 → v1.1 → v1.2. Major rule overhauls bump the major version.

**Sunset review at 2026-06-08** (4 weeks after first run): are urgent items genuinely actioned? Is the false-positive rate acceptable? Is the email ping useful or noise? Decide: continue, retire, or rebuild as v2.

## Run lifecycle

Same as nightly-health-check-v1: Cowork picks up brief, runs at scheduled time, writes state file + output file + commits + sends self-addressed email ping. PK reviews the markdown file (and/or the email ping body) — no paste required.

## Allowed-list of senders to expand over time

PK should append to this section as patterns emerge. Initial entries below are placeholders.

**High-trust (always URGENT regardless of content):**

- {accountant email} — TBD
- {bank — primary} — TBD
- {bank — business} — TBD
- {lawyer email if applicable} — TBD
- {NDIS plan management contacts} — TBD

**Always-NOISE (never URGENT):**

- {known marketing list 1} — TBD
- {known marketing list 2} — TBD

**Vendor-with-known-recurring-charges (always URGENT until cancelled):**

- crazydomains.com.au — until both Domain Guard add-ons + Premium DNS are confirmed cancelled and migration to Cloudflare Registrar / VentraIP complete
- {add others as discovered}

## Notes

- This is the FIRST recurring read-only sweep that operates on PK's personal data, not the ICE pipeline. The risk model is different: noise erodes trust in the brief, but a missed urgent item costs money or a relationship.
- The single-write-allowed pattern (self-addressed email ping) is intentional. It's a notification, not a side-effect. If PK turns email notifications off, the markdown file is the source of truth.
- Lesson #61 (pre-flight discipline) applies. Pre-flight verifies Gmail MCP connection + which account is being swept BEFORE first run. Authoring this brief without pre-flight verification is acceptable for v1.0 but the FIRST scheduled run must verify.
- The Crazy Domains $251/yr discovery is the calibration anchor. If this brief had been live in November 2025, the first Website Builder auto-renewal in February 2026 would have been flagged URGENT and the bleed stopped after one cycle, saving ~$190.

## Success criteria for v1.0 first scheduled run

| Metric | Good | Re-evaluate |
|---|---|---|
| Sweep completes without error | yes | no |
| Output file produced | yes | no |
| Email ping sent to PK self-address | yes (and no other recipient) | external recipient detected |
| Production writes (Supabase, Gmail send/archive/label) | 0 (mandatory) | any > 0 |
| PK morning review time | ≤ 5 min | > 15 min |
| Urgent items: at least one is genuinely actioned | yes | all dismissed (over-flagging) |
| Urgent items: no genuinely-urgent item missed | yes | a real urgent landed in FYI |
| False-positive rate (rolling 7d) | ≤ 30% | > 50% |
| Calibration questions raised in `claude_questions.md` | 0–3 (healthy) | > 5 (rules underspecified) |

If 7-of-9 hit on the first scheduled run: brief shape is locked at v1.0. Tweaks to allowed-list go through normal version-bump process.

## Pre-amendment checklist (PK — before flipping status to review_required)

Things to potentially amend before scheduling:

- [ ] Triggers / classification rules — add or remove URGENT triggers? Adjust priority order?
- [ ] Money-out dollar threshold — keep "flag every match" or add a floor (e.g. ignore < $0.50)?
- [ ] High-trust allowlist — populate the placeholder TBD entries (accountant, bank, etc.) up-front rather than over time?
- [ ] Output buckets — three buckets (URGENT/FYI/NOISE) or different shape?
- [ ] Output location — `docs/audit/inbox/{date}.md` or different path?
- [ ] Email ping — keep, drop, or restructure (e.g. ping only on URGENT > 0)?
- [ ] Schedule — 06:00 AEST or different time (some prefer night-before sweep)?
- [ ] Window — 24h or shorter (e.g. 12h AM-only focus)?
- [ ] Account configuration — confirm whether `pk@invegent.com` is separate Workspace account or alias
- [ ] Scope — keep summarise-only or add limited write actions (e.g. auto-archive accepted calendar invites)?

When amendments are decided, ping chat in a future session and chat will fold them into v1.1 + flip status=review_required.
