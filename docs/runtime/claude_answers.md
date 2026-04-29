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

*(none yet)*
