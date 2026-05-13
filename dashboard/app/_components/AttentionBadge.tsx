import type { CSSProperties, ReactElement } from "react";

// cc-0013 Stage D — shared ATTENTION / OK badge + banner.
//
// Var-A3 strict-equality rule (Phase 0 §8):
//   - attention_needed === true → Attention state
//   - false OR null            → OK / no-attention state (visually identical)
//
// The strict-equality check happens INSIDE this component so every call site
// gets the rule for free. Callers MUST pass the raw column value (`boolean | null`)
// without pre-coercing it to a boolean — coercion like `!!value` would treat
// null as falsy (correct outcome) but defeats the directive's "strict equality"
// gate in V7 grep. Passing the column directly preserves grep traceability.

interface Props {
  attentionNeeded: boolean | null;
}

const ATTENTION_BADGE: CSSProperties = {
  background: "#fff4e5",
  border: "1px solid #ffb74d",
  padding: "2px 8px",
  borderRadius: "3px",
  color: "#7a3e00",
  fontWeight: 600,
  fontSize: "0.8rem",
  textTransform: "uppercase",
  letterSpacing: "0.025em",
  display: "inline-block",
};

const OK_BADGE: CSSProperties = {
  background: "#e8f5e9",
  border: "1px solid #81c784",
  padding: "2px 8px",
  borderRadius: "3px",
  color: "#1b5e20",
  fontSize: "0.8rem",
  textTransform: "uppercase",
  letterSpacing: "0.025em",
  display: "inline-block",
};

const ATTENTION_BANNER: CSSProperties = {
  background: "#fff4e5",
  border: "1px solid #ffb74d",
  padding: "0.75rem 1rem",
  borderRadius: "4px",
  color: "#7a3e00",
  fontWeight: 600,
  margin: "1rem 0",
};

const OK_BANNER: CSSProperties = {
  background: "#e8f5e9",
  border: "1px solid #81c784",
  padding: "0.75rem 1rem",
  borderRadius: "4px",
  color: "#1b5e20",
  margin: "1rem 0",
};

/** Compact badge form — for table cells. */
export function AttentionBadge({ attentionNeeded }: Props): ReactElement {
  // Strict equality — Var-A3 rule.
  const isAttention = attentionNeeded === true;
  return isAttention ? (
    <span style={ATTENTION_BADGE}>Attention</span>
  ) : (
    <span style={OK_BADGE}>OK</span>
  );
}

/** Banner form — for the home page hero panel. */
export function AttentionBanner({ attentionNeeded }: Props): ReactElement {
  // Strict equality — Var-A3 rule.
  const isAttention = attentionNeeded === true;
  if (isAttention) {
    return (
      <p role="alert" style={ATTENTION_BANNER}>
        Attention needed — review drift findings + client / platform rollups.
      </p>
    );
  }
  return (
    <p style={OK_BANNER}>OK — no attention required at this time.</p>
  );
}
