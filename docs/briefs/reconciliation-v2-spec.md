# Reconciliation v2 — Spec Capture

> **Status:** SPEC CAPTURE — brief authorship pending tomorrow's session
> **Authored:** 30 Apr Thu evening Sydney, by PK + Claude + ChatGPT collaborative session
> **Hard constraint:** Do NOT implement before Phase B +24h obs checkpoint (Fri 1 May ~5pm AEST)
>
> This file captures the agreed plan so a fresh session tomorrow can turn it into a formal brief without re-deriving the design. Once the brief is authored, this spec capture file can be deleted (it has served its purpose).

## Why this exists

Today's reconciliation took ~2 hours. Breakdown:
- ~50 min of *recurring* reconciliation work (sync_state writing + memory updates)
- ~90 min of *one-off* process work (structured_red_team_review_v1 proposal + 00_action_list.md authorship + ChatGPT-review patches)

The one-off work won't recur. But ~50 min of recurring reconciliation is too much, and it lands at the worst moment (session-end fatigue).

Root causes of the recurring 50 min:
1. sync_state is rewritten in full every session, not appended
2. sync_state duplicates state that's now in the action list (categories, priorities, triggers)
3. sync_state mixes operational state, strategic narrative, and standing rules
4. No reconciliation template — every session is freeform

## Agreed solution: A+B+C+D (defer E)

### A. Append-only sync_state with compact top "Current State Snapshot"

ChatGPT's refinement: don't make sync_state fully append-only — keep a compact machine-parseable top block so a fresh session reads current state in 30 seconds, then dated history below.

Target structure for `docs/00_sync_state.md`:

```
# ICE — Live System State

## Current State Snapshot
(Updated every reconciliation. Compact, table-form where possible.)
- Date / time / Sydney timezone
- Active phase + gate status
- Key version numbers (Edge Functions, ai-worker, image-worker, etc.)
- m schema doc coverage %
- Open alerts count
- Active queue status (idle / item count)
- Last applied migration
- Production posting health (4 clients posting / 1 down / etc.)

## Active Standing Conditions
(Things that affect today's work but are stable, e.g. Phase B in obs window)

## Session Log (append-only)
### 2026-04-30 Thu evening
[narrative entry, 100-300 words max]

### 2026-04-30 Thu morning
[narrative entry]

[older entries below]

## Archive Pointer
Older than 30 days → moved to `docs/archive/sync_state_YYYY-MM.md`
```

The rule: **never edit older session log entries.** New session = new dated section appended.

### B. Reconciliation templates — three tiers

New file: `docs/runtime/reconciliation_templates.md` with three templates.

**Bookmark template (~5 min)** — used when PK pauses mid-stream:
- One-line summary of what shipped this session
- Any immediate follow-up flagged
- No memory update unless strategic shift
- No action list reconciliation — items stay in flight

**Goodnight / Daily reconciliation template (~20-30 min)** — used at end of work day:
- Append session log entry to sync_state
- Update Current State Snapshot if anything changed
- Reconcile action list (move done items, surface new follow-ups)
- Memory update if needed (rare on most days)
- 4-way sync check per memory entry 11

**Full reconciliation template (~45-60 min)** — used only when:
- New process docs / decisions / migrations / strategy shifts
- Weekly checkpoint
- Phase boundary

Includes everything from Goodnight tier plus:
- Update or author decision in `docs/06_decisions.md`
- Update memory entries 1, 11, 14 if standing rules changed
- Cross-reference new docs from sync_state, action list, memory
- invegent-dashboard roadmap sync if visible milestones moved

### C. Tier signal via PK keywords (default = Bookmark)

PK's session-end signal determines tier:
- No signal OR "pause" / "bookmark" → Tier 1 Bookmark (default)
- "goodnight" / "end of day" / "stopping" → Tier 2 Daily
- "full reconciliation" / "ratify" / "ship the plan" → Tier 3 Full

Chat tier-detects from PK's words and applies the right template.

**Critical principle:** Default is Bookmark, not Full. Most session-ends are paused-work, not formal closeouts. Treating every session-end as a formal closeout is what burns time.

### D. Cut duplication — action list owns the task board

Reconfigure responsibilities:
- `docs/00_action_list.md` = active operational board (queued/active/blocked/frozen with priorities and triggers)
- `docs/00_sync_state.md` = current state snapshot + narrative session log

Sync_state stops repeating action list content. References by link. Single source of truth principle: each piece of state has exactly one home.

Specific cuts from sync_state going forward:
- "NEXT SESSION → Required" section → already in action list 🔴 Time-bound + 🟢 Ready
- "NEXT SESSION → Optional" section → already in action list 🟢 Ready
- "Backlog (no specific deadline)" section → already in action list 📌 Backlog
- "DO NOT TOUCH" section → keep, this is sync_state-specific freeze instructions
- "Standing memory rule honoured" table → keep, this is reconciliation evidence

What stays in sync_state:
- Current State Snapshot (new)
- Active Standing Conditions
- Session Log (append-only)
- Cross-references TO action list and other docs

### E. Defer automation script

A reconciliation automation tool (pulls git log, DB diffs, action list diffs, produces draft narrative) was considered. Deferred because:
- ~3 hours one-off build cost
- Premature without first proving the template approach works
- Aligned with D183 build-when-evidence-demands principle

Revisit only if A+B+C+D fails the falsifiable test (see below).

## Falsifiable test

Track over the next 10 sessions:
1. Average reconciliation time
2. PK self-reports session-end pressure (yes/no per session)
3. Content loss reports (did anything important get missed?)

**Pass criteria:**
- Average <20 min/session
- No persistent session-end pressure flagged
- No content loss flagged

**Fail criteria:**
- Average >35 min OR PK flags content loss → revise the design
- If templates produce content gaps, augment the templates
- If staleness becomes a problem, consider automation script (E)

10 sessions ≈ ~5-7 working days of ICE activity at current pace. Decision point reached around mid-May 2026.

## Hard sequencing constraint

**Tomorrow's session priority order is fixed:**

1. Phase B +24h observation checkpoint (T01) — the 4 obs queries from Phase B run state file
2. Gate B exit decision (T02) — based on T01 result
3. Personal businesses check-in (per standing rule)
4. Reconciliation v2 brief authorship — only AFTER 1, 2, 3 complete

If 1 or 2 produces issues that demand attention, reconciliation v2 brief authorship slips a day. The reconciliation problem isn't urgent; the Phase B problem is.

## Implementation steps (for tomorrow's brief authorship)

The brief should:
1. Reference this spec capture as the source
2. Specify the new sync_state structure as a template
3. Author the three reconciliation templates as a new file `docs/runtime/reconciliation_templates.md`
4. Update `docs/00_action_list.md` to remove duplicated content from sync_state mentions
5. Update memory entry 11 to specify the tier-signal protocol
6. Establish the falsifiable test as a tracked metric (chat updates session count + reconciliation time at every Goodnight reconciliation)
7. Optionally: convert today's existing sync_state into the new structure as a one-off migration step (or apply the new structure starting tomorrow and let today's full sync_state stand as the last v1)

Estimated brief authorship time: 30-45 min. Estimated implementation time once brief is approved: 45-60 min including the sync_state restructure.

## What NOT to do

- Don't author the brief tonight (ChatGPT explicitly: "do not implement tonight")
- Don't change sync_state structure tonight
- Don't update memory entries tonight
- Don't author the templates tonight
- Just capture this spec, queue R09 in action list, sleep on it

## Open question for tomorrow

The Today / Next 5 in the action list will rebuild tomorrow at session start. Reconciliation v2 brief authorship will rank P1 — likely Top 6 not Top 5 given Phase B obs (P0), Gate B exit (P0), Personal businesses (P0), and pre-existing P1s. That's correct. Don't elevate this artificially.
