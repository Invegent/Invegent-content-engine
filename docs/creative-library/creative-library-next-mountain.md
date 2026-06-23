# Creative Library — Next Mountain (roadmap note)

> Docs-only sequencing note after the A1 closeout. Nothing here is implemented or scheduled with
> dates; it records **recommended order**, not commitments. **Branch B and HeyGen are NOT next**
> unless production evidence demands them. See [creative-library-a1-closeout.md](creative-library-a1-closeout.md).

## Immediate

- **Post-publish verification** for the four queued Property Pulse posts (read-only).
- **Production Evidence Audit** after they publish (same forensic method as the 3-test audit:
  intent → fan-out → Advisor → draft → render → publish, with evidence).
- **Classify outcomes** (expected / UX / missing feature / architecture gap / config gap / bug /
  evidence gap) — no fixes in the audit lane.

## Near-term

- **Production reliability fixes** if the audit surfaces them (each its own gated lane).
- **image-worker QA visibility** (image renders carry no `render_spec.qa`).
- **Content Studio explainability improvements** (surface unavailability + what-will-happen before submit).
- **Episode edit / regenerate / approve controls** (Series UI).
- **LinkedIn image policy decision** (taxonomy `platform_support` vs existing LinkedIn image publishers — product call).

## Mid-term

- **Content Studio creative-treatment preference/display** (treatment *under* format; Advisor stays sovereign).
- **A1.6 Intake Generalisation** (extend intake review-packets/scoring to patterns / style-guides / families).
- **Operator-first format × platform × treatment matrix** (one governed view of what's possible per client).
- **Creative Library treatment proof display in Content Studio** (read-only; show which treatments are proven).

## Later

- **Branch B: production registry consumption** (workers begin reading the governed registry) — gated, evidence-led.
- **Governed asset resolver in the production render path** (replace the legacy brand-profile logo source).
- **HeyGen / avatar / voice governance** (Branch B-adjacent; separately gated).
- **Architecture mapkeeper / Ask-ICE / operator advisor** (navigable architecture + operator Q&A) — future idea.

## Guardrails

- Creative Library is **governed and visible**, **not** the production render source-of-truth yet.
- Content Studio does **not** use the Creative Library today.
- Branch B and HeyGen remain **future, separately gated** work — pulled forward only by evidence, never by default.
- Treatment lives **under** format; the Advisor remains sovereign; AI proposes, PK/governance approves.
