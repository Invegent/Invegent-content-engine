# CGU Final — Control-Tower Ruling: Phase-1 Watch Operating Order (PK, 2026-08-05)

**Lane classification:** T1 (docs/read-only) · SAFETY_GATE · PK ruling record.
**Recorded by:** the acting CGU Final planning & control-tower session, 2026-08-05 (Sydney).
**Authority:** the ruling text below is PK's own, quoted verbatim. Everything after it is
operationalization only and grants no authority beyond the quoted text.
**Register pointer:** v6.140.

---

## 1. PK ruling (verbatim paste-block)

> Control-tower ruling:
>
> The programme is not currently blocked on PK.
>
> Phase-2 execution is deliberately held until the seven-day Phase-1 watch closes on
> approximately 2026-08-11 20:20 Sydney.
>
> Do not seek production authorization for Phase-2 v3 now.
>
> Treat v3 as review-only evidence because its CFW/Invegent image_quote capacity assumptions
> predate the corrected reliability findings. Do not continue evolving packet versions during
> the watch.
>
> During the watch:
>
> - run read-only schedule monitoring;
> - incorporate the CFW reliability correction;
> - remain conservative on Invegent pending asset evidence;
> - preserve all Layer-2 and YouTube exclusions;
> - prepare one revised Phase-2 matrix;
> - perform no schedule DML or cap increases.
>
> Reduce active sessions and clean completed worktrees. Do not open new heavy CGU Final
> implementation lanes before the Phase-2 ruling.
>
> At watch expiry, return one revised matrix and watch verdict for PK approval. Only after
> that approval should a fresh apply packet be authored.
>
> M18 remains packet-ready and executes after the watch unless a current accessible unmanaged
> credential is discovered.

## 2. Operational effect (control-tower reading — informative, not additional authority)

1. **Phase-2 apply packet lineage is FROZEN AT v3 as review-only evidence.** v3 (and v1/v2,
   already execution-ineligible by supersession) will never be executed. No v4 or any further
   packet version may be authored during the watch, by any session. The revised Phase-2
   matrix (§2 item 5 below) is a *matrix document*, not an apply packet — the fresh apply
   packet is authored only after PK approves the matrix + watch verdict at expiry.
2. **Watch-period task list** (owner: control tower unless PK reassigns):
   - Read-only schedule monitoring via the R0 `ice_ro` views (`slot_status`,
     `publish_status`, `cron_health`, `pipeline_health`) — observation only, no new
     automated monitor built (consistent with the v6.130 closeout's own watch definition).
   - Revised Phase-2 matrix preparation, incorporating: (a) the v6.131 CFW reliability
     correction (cc-0048/cc-0049 root cause, background-scarcity theory rejected);
     (b) conservative posture on Invegent pending asset evidence; (c) all Layer-2 and
     YouTube exclusions preserved unchanged from v11.
   - Zero schedule DML, zero cap changes, zero Phase-2 mutation — unchanged from the
     v6.130 standing constraint, now doubly affirmed.
3. **Session/worktree hygiene is ordered:** completed sessions archived, completed
   worktrees removed (non-forced removal only — a dirty or locked worktree is never
   force-removed; it is surfaced instead).
4. **No new heavy CGU Final implementation lanes before the Phase-2 ruling.** The §0f
   sequencing directive stays in force; M1/M2/M4/M6/M7/M12/M13/M14/M16 remain queued.
   Docs-only follow-ups already in flight (e.g. M11b Gate-1 briefs, M11c decision residue)
   remain at PK's discretion — this ruling does not newly authorize them.
5. **M18:** packet-ready (v6.135), executes after the watch by default. Escalation trigger:
   discovery of a **current, accessible, unmanaged** credential copy → surface to PK
   immediately for an ahead-of-watch execution decision (the historical `P1_FINDINGS.md`
   copy already classified AMBER does not itself trip this — it is historical, not current,
   per the M18 packet).
6. **Watch-expiry deliverable (one package, PK gate):** the watch verdict (pass / findings)
   + exactly one revised Phase-2 matrix. Nothing else rides on that gate.

## 3. Evidence preservation note

The Phase-2 packet lineage v1–v3 (previously untracked in the shared checkout) is committed
alongside this record as frozen review-only evidence, per §1's "treat v3 as review-only
evidence". Their supersession hashes are recorded in v3's own header. The independently-
authored second M11c packet (`m11c-pp-carousel-migrate-vs-retire-packet-v1.md`) remains
deliberately uncommitted, pending PK's disposition (v6.137 note) — unchanged by this record.
