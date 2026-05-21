# Claude Answers — Async Outbox

**Purpose:** Async answer channel for the non-blocking execution model (D182).

**Writer:** OpenAI API (overnight, when Phase 4c lands) or PK (morning).

**Reader:** Claude Cowork or chat session checking for corrections.

**Discipline:** Append-only. Never edit existing entries. One answer per question (referenced by Question ID).

---

## Answer format

```
## A-{brief-slug}-{nnn}

Question ID: Q-{brief-slug}-{nnn}

Decision:
<A / B / C / custom>

Default matched:
<yes | no>

Reason:
<short explanation>

Confidence:
<High / Medium / Low>

Correction needed:
<None / small revision / stop and ask PK>
```

The Question ID line is mandatory — it is what Cowork's correction pass uses to find the matching question. Mismatch = correction skipped + state file flag.

---

## Answers

## A-nightly-health-check-v1-004

Question ID: Q-nightly-health-check-v1-004

Decision:
A

Default matched:
yes

Reason:
PK ratifies Cowork's reading: Cat A is the **platform-lock artefact** (`profile_enabled=false`), regardless of platform. The `instagram + scheduled_for >= 25 Apr 2026` clause was a leaky heuristic from when the instagram disable was fresh; with `cpp.publish_enabled` as the canonical signal and the live `cpp.profile_enabled` check available, the heuristic is superseded and should be removed from the brief. The two instagram clusters from the 2026-05-17 run (instagram × care-for-welfare-pty-ltd, instagram × invegent — both `publish_enabled=true`, scheduled 2026-05-15) are correctly classified as Cat C true-stuck (matched by Q-true-stuck SQL), and the 5 P1 emissions to `friction.event` for that run stand as correct — no friction.event cleanup required, no finding_id changes. The underlying root cause for the two instagram clusters (`instagram-publisher-every-15m` jobid 53 being `is_active=false`) is a separate observation, not a categorisation correction; it belongs in friction triage at `/operations`, not in Cat A.

Confidence:
High

Correction needed:
Small revision — patch brief Cat A wording in `docs/briefs/nightly-health-check-v1.md` Section 6a to "platform-lock artefact: `profile_enabled=false` (regardless of platform)". Drop the `instagram + scheduled>=25 Apr` clause. No cleanup of prior emissions. Resolved by PK 2026-05-20 Sydney.

## A-nightly-health-check-v1-005

Question ID: Q-nightly-health-check-v1-005

Decision:
A

Default matched:
yes

Reason:
The function contract already supports an explicit per-finding `condition_key`; brief v3.0 Section 12.2 simply omitted that field, so the function fell back to its `problem_key`→`condition_key` auto-deriver, which only recognises the `true-stuck-{platform}-{client_slug}` shape. On the 2026-05-20 run the 5 P1 true-stuck findings resolved cleanly; the 2 P2 findings (`zero-counts-pub-published-30m`, `s17-escalation-rate`) had no derivable condition_key and were correctly routed to `friction.emit_error` (error_code `CONDITION-KEY-UNRESOLVED`). Option A keeps the brief author in control of the mapping and needs **no Supabase migration** — the function consumes the explicit field verbatim. Cowork's run-time default (keep Section 10 unchanged per §12.4, reconcile the footer with `success_count=5 failure_count=0 skipped_count=2`, log Q-005, no retry, no re-emit) is **consistent with Option A**: Option A requires no re-emission of the 2026-05-20 findings, so nothing Cowork did needs reversing. The only forward action is the brief v3.0 → v3.1 patch (add `condition_key` to §12.2, define the full P1/P2 mapping, document `skipped_count` in §12.3, tighten the §12.4 reconciliation rule, document per-finding unresolved-condition_key skip semantics in §12.5).

Confidence:
High

Correction needed:
Small revision — patch `docs/briefs/nightly-health-check-v1.md` to v3.1 per the five-point plan above. No Supabase mutation. No re-emission of the 2026-05-20 P2 findings (they remain in `friction.emit_error`; the v3.1 fix is forward-only — the next scheduled fire emits all P1+P2 findings with explicit condition_key). **Q-005 stays OPEN** until the v3.1 brief patch is committed AND the next scheduled fire is verified to emit all P1+P2 findings with `skipped_count=0`. Ratified by PK (CCH directive) 2026-05-21 Sydney.
