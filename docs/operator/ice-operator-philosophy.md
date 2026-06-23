# ICE Operator Philosophy

> A short principles document — **not** a technical spec. It captures how ICE should behave
> toward the operator (the person running content). It guides product and UX decisions; it does
> not mandate implementation. Docs-only.

## Principles

1. **Operators choose outcomes, not provider internals.** An operator asks for "a market-update
   card" or "a short stat video" — never for Creatomate template IDs, render engines, or asset keys.

2. **ICE speaks plain language.** Surfaces use human terms (format, platform, treatment), not
   internal schema names or provider jargon.

3. **The Advisor decides format; operators express preferences.** Format selection is governed and
   evidence-driven. An operator preference is an input the Advisor may honour or override — not a command.

4. **The Creative Library provides governed treatments under format.** Treatment (style guide,
   patterns, template family/variant) is a governed choice *within* a format — it never replaces the
   format contract.

5. **AI recommends; PK / governance approves.** AI proposes formats, treatments, and copy. It never
   self-approves a creative object, a publish, or an irreversible action.

6. **Evidence beats assumptions.** Decisions are grounded in production evidence (render logs,
   publish state, performance), not in what *should* work. A claim without evidence is a question.

7. **The dashboard should explain, not overwhelm.** Show the operator the state and the *why*, not
   every internal field. Read-only clarity over exhaustive dumps.

8. **Operators should see why something is unavailable.** "LinkedIn image is off for this client"
   beats a silently missing option. Unavailability is information, not an error.

9. **Content Studio should reduce uncertainty before submission.** The operator should understand
   what will happen (platforms, formats, treatment, fallbacks) *before* they submit, not discover it after.

10. **Production proof comes before expansion.** Prove the current path in production before building
    the next capability. Visible-and-governed is not the same as proven-in-production.
