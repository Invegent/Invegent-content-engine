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
