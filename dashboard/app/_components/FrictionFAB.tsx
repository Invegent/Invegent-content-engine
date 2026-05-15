"use client";

import { useState, type CSSProperties } from "react";
import { FrictionForm } from "./FrictionForm";

// cc-0014 Stage D — Floating action button reachable from every dashboard route.
// Rendered only when DASHBOARD_FRICTION_FAB_ENABLED=true (passed in from
// the server-rendered root layout). Click opens the FrictionForm modal which
// submits via the emitFriction Server Action.

export interface FrictionFABProps {
  enabled: boolean;
}

const FAB_BUTTON: CSSProperties = {
  position: "fixed",
  bottom: "1.5rem",
  right: "1.5rem",
  width: "3.25rem",
  height: "3.25rem",
  borderRadius: "50%",
  border: "none",
  background: "#0a4c7a",
  color: "#fff",
  fontSize: "1.6rem",
  lineHeight: 1,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
  zIndex: 50,
};

export function FrictionFAB({ enabled }: FrictionFABProps) {
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Capture friction observation"
        title="Capture friction observation (cc-0014)"
        onClick={() => setOpen(true)}
        style={FAB_BUTTON}
      >
        +
      </button>
      {open && <FrictionForm onClose={() => setOpen(false)} />}
    </>
  );
}
