"use client";

import {
  useEffect,
  useState,
  useTransition,
  type CSSProperties,
  type FormEvent,
} from "react";
import { usePathname } from "next/navigation";
import {
  emitFriction,
  type EmitFrictionResult,
  type FrictionSeverity,
} from "@/app/_actions/emitFriction";

// cc-0014 Stage D — Modal capture form. Calls the emitFriction Server Action.
// Required: observation_text (>=5 chars), severity, category.
// Optional: notes. current_route is auto-filled from usePathname().
// localStorage remembers last severity + category for next open.

interface FrictionFormProps {
  onClose: () => void;
}

interface CategoryOption {
  code: string;
  label: string;
}

// Seeded active categories (friction.category WHERE is_active=true AND
// category_code <> 'unclassified'). Stable per cc-0014 brief seed list.
const CATEGORIES: ReadonlyArray<CategoryOption> = [
  { code: "operator_friction", label: "Operator friction" },
  { code: "pipeline_integrity", label: "Pipeline integrity" },
  { code: "client_commitment", label: "Client commitment" },
  { code: "content_quality", label: "Content quality" },
  { code: "external_dependency", label: "External dependency" },
];

const SEVERITIES: ReadonlyArray<{ value: FrictionSeverity; label: string }> = [
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "critical", label: "Critical" },
];

const LS_SEVERITY = "cc0014:lastSeverity";
const LS_CATEGORY = "cc0014:lastCategory";

const BACKDROP: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};

const MODAL: CSSProperties = {
  background: "#fff",
  width: "min(28rem, calc(100vw - 2rem))",
  maxHeight: "calc(100vh - 2rem)",
  overflowY: "auto",
  borderRadius: "6px",
  padding: "1.25rem 1.5rem",
  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
  fontFamily: "system-ui, -apple-system, sans-serif",
  color: "#111",
};

const FIELD: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  marginBottom: "0.85rem",
  gap: "0.3rem",
};

const LABEL: CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 600,
  color: "#333",
};

const INPUT: CSSProperties = {
  fontFamily: "inherit",
  fontSize: "0.95rem",
  padding: "0.4rem 0.5rem",
  border: "1px solid #ccc",
  borderRadius: "3px",
  width: "100%",
  boxSizing: "border-box",
};

const RADIO_ROW: CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  flexWrap: "wrap",
};

const BUTTON_ROW: CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  justifyContent: "flex-end",
  marginTop: "0.5rem",
};

const PRIMARY_BUTTON: CSSProperties = {
  background: "#0a4c7a",
  color: "#fff",
  border: "none",
  padding: "0.5rem 1rem",
  borderRadius: "3px",
  cursor: "pointer",
  fontSize: "0.95rem",
};

const SECONDARY_BUTTON: CSSProperties = {
  background: "#fff",
  color: "#333",
  border: "1px solid #ccc",
  padding: "0.5rem 1rem",
  borderRadius: "3px",
  cursor: "pointer",
  fontSize: "0.95rem",
};

const SUCCESS_MSG: CSSProperties = {
  padding: "0.6rem 0.75rem",
  background: "#e6f4ea",
  border: "1px solid #34a853",
  borderRadius: "3px",
  color: "#1e7e34",
  marginBottom: "0.85rem",
  fontSize: "0.9rem",
};

const ERROR_MSG: CSSProperties = {
  padding: "0.6rem 0.75rem",
  background: "#fde7e9",
  border: "1px solid #ef5350",
  borderRadius: "3px",
  color: "#b71c1c",
  marginBottom: "0.85rem",
  fontSize: "0.9rem",
};

export function FrictionForm({ onClose }: FrictionFormProps) {
  const pathname = usePathname();
  const [observationText, setObservationText] = useState("");
  const [severity, setSeverity] = useState<FrictionSeverity>("info");
  const [category, setCategory] = useState<string>(CATEGORIES[0].code);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<EmitFrictionResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const lastSeverity = window.localStorage.getItem(LS_SEVERITY);
      if (
        lastSeverity === "info" ||
        lastSeverity === "warn" ||
        lastSeverity === "critical"
      ) {
        setSeverity(lastSeverity);
      }
      const lastCategory = window.localStorage.getItem(LS_CATEGORY);
      if (
        lastCategory &&
        CATEGORIES.some((c) => c.code === lastCategory)
      ) {
        setCategory(lastCategory);
      }
    } catch {
      // localStorage may be unavailable (private mode, etc.) — ignore.
    }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await emitFriction({
        observation_text: observationText,
        severity,
        category,
        current_route: pathname ?? null,
        notes: notes.length > 0 ? notes : null,
      });
      setResult(res);
      if (res.ok) {
        try {
          window.localStorage.setItem(LS_SEVERITY, severity);
          window.localStorage.setItem(LS_CATEGORY, category);
        } catch {
          // ignore
        }
        setObservationText("");
        setNotes("");
      }
    });
  }

  return (
    <div
      style={BACKDROP}
      role="dialog"
      aria-modal="true"
      aria-label="Capture friction observation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div style={MODAL}>
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem" }}>
          Capture friction observation
        </h2>

        {result && result.ok && (
          <p style={SUCCESS_MSG}>
            Submitted. event_id: <code>{result.event_id}</code>
          </p>
        )}
        {result && !result.ok && (
          <p style={ERROR_MSG} role="alert">
            <strong>Error:</strong> {result.error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div style={FIELD}>
            <label htmlFor="cc0014-observation" style={LABEL}>
              What did you observe? (≥5 characters)
            </label>
            <textarea
              id="cc0014-observation"
              required
              minLength={5}
              rows={3}
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
              style={INPUT}
              disabled={pending}
            />
          </div>

          <div style={FIELD}>
            <span style={LABEL}>Severity</span>
            <div style={RADIO_ROW} role="radiogroup" aria-label="Severity">
              {SEVERITIES.map((s) => (
                <label
                  key={s.value}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="severity"
                    value={s.value}
                    checked={severity === s.value}
                    onChange={() => setSeverity(s.value)}
                    disabled={pending}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div style={FIELD}>
            <label htmlFor="cc0014-category" style={LABEL}>
              Category
            </label>
            <select
              id="cc0014-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={INPUT}
              disabled={pending}
            >
              {CATEGORIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div style={FIELD}>
            <label htmlFor="cc0014-notes" style={LABEL}>
              Notes (optional)
            </label>
            <textarea
              id="cc0014-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={INPUT}
              disabled={pending}
            />
          </div>

          <div style={{ ...FIELD, color: "#777", fontSize: "0.8rem" }}>
            Route: <code>{pathname ?? "(unknown)"}</code>
          </div>

          <div style={BUTTON_ROW}>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              style={SECONDARY_BUTTON}
            >
              Close
            </button>
            <button type="submit" disabled={pending} style={PRIMARY_BUTTON}>
              {pending ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
