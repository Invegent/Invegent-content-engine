# Claude Answers — Async Outbox

**Purpose:** Async answer channel for the non-blocking execution model (D182).

**Writer:** OpenAI API (overnight) or PK (morning).

**Reader:** Claude Cowork or chat session checking for corrections.

**Discipline:** Append-only. Never edit existing entries. One answer per question.

---

## Answer format

```
## A-{brief-slug}-{nnn}

Decision:
<A / B / C / custom>

Reason:
<short explanation>

Confidence:
<High / Medium / Low>

Correction needed:
<None / small revision / stop and ask PK>
```

---

## Answers

*(none yet)*
