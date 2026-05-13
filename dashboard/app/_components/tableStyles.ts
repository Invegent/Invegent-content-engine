import type { CSSProperties } from "react";

// cc-0013 Stage D — shared table style constants.
// Pure style objects; no logic; no Supabase access; safe in Server Components.

export const TABLE: CSSProperties = {
  borderCollapse: "collapse",
  width: "100%",
  fontSize: "0.9rem",
};

export const TH: CSSProperties = {
  textAlign: "left",
  padding: "0.45rem 0.55rem",
  borderBottom: "2px solid #ddd",
  fontWeight: 600,
  fontSize: "0.875rem",
  whiteSpace: "nowrap",
  background: "#fafafa",
};

export const TD: CSSProperties = {
  padding: "0.4rem 0.55rem",
  borderBottom: "1px solid #f0f0f0",
  fontSize: "0.9rem",
  verticalAlign: "top",
};

// Horizontal-scroll wrapper for tables wider than the body container.
export const TABLE_WRAPPER: CSSProperties = {
  overflowX: "auto",
  width: "100%",
  marginTop: "0.5rem",
};
