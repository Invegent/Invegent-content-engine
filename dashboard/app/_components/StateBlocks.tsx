import type { CSSProperties, ReactElement } from "react";

// cc-0013 Stage D — standardised empty-state, error-state, and page-footer blocks.
//
// No mutation surfaces. No retry buttons. Read-only consistency primitives.

interface MessageProps {
  message: string;
}

const EMPTY_STATE: CSSProperties = {
  padding: "1rem 1.25rem",
  background: "#f7f7f7",
  border: "1px dashed #ccc",
  borderRadius: "4px",
  color: "#555",
  fontStyle: "italic",
  margin: "1rem 0",
};

const ERROR_STATE: CSSProperties = {
  padding: "1rem 1.25rem",
  background: "#fde7e9",
  border: "1px solid #ef5350",
  borderRadius: "4px",
  color: "#b71c1c",
  margin: "1rem 0",
};

const PAGE_FOOTER: CSSProperties = {
  marginTop: "2.5rem",
  paddingTop: "1rem",
  borderTop: "1px solid #eee",
  fontSize: "0.85rem",
  color: "#666",
};

/** Standard empty state — same shape across all 5 routes. */
export function EmptyState({ message }: MessageProps): ReactElement {
  return <p style={EMPTY_STATE}>{message}</p>;
}

/** Standard error state — same shape across all 5 routes. Read-only; no retry. */
export function ErrorState({ message }: MessageProps): ReactElement {
  return (
    <p role="alert" style={ERROR_STATE}>
      <strong>Error loading data:</strong> {message}
    </p>
  );
}

interface PageFooterProps {
  routeNote: string;
}

/** Standard footer — "cc-0013 dashboard · {routeNote} · operator-internal · read-only". */
export function PageFooter({ routeNote }: PageFooterProps): ReactElement {
  return (
    <footer style={PAGE_FOOTER}>
      cc-0013 dashboard · {routeNote} · operator-internal · read-only
    </footer>
  );
}
