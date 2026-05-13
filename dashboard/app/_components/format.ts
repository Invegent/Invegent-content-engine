// cc-0013 Stage D — display formatting helpers.
//
// Pure functions; no DOM access; no Supabase access; safe in Server Components.
// Sydney-local (Australia/Sydney) absolute timestamps; relative freshness for
// minutes-since-last-evidence; NULL-guarded percent + number formatters.
//
// V5: This module MUST NOT import the Supabase helper. It is rendered by route
// pages and the AttentionBadge component; both server-side only.

const SYDNEY_TZ = "Australia/Sydney";

/**
 * Absolute timestamp -> "YYYY-MM-DD HH:MM AEST" / "AEDT" (Sydney-local).
 * Returns "—" on null/empty; falls through to raw value on parse failure.
 */
export function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: SYDNEY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get(
    "minute",
  )} ${get("timeZoneName")}`;
}

/**
 * Date-only -> "YYYY-MM-DD" (Sydney-local).
 * Passes through if input already matches YYYY-MM-DD.
 */
export function formatDate(value: string | null): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SYDNEY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Relative freshness -> "12 min ago" / "3.2 h ago" / "1.5 d ago".
 * Threshold layout: <1 min "just now"; <60 min "N min ago"; <48 h "N.N h ago";
 * otherwise "N.N d ago". Returns "—" on null.
 */
export function formatRelativeMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(1)} h ago`;
  const days = hours / 24;
  return `${days.toFixed(1)} d ago`;
}

/** Percent with NULL guard -> "12.34%" or "—". */
export function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

/** Integer with NULL guard + en-AU thousands separators -> "1,234" or "—". */
export function formatNumber(value: number | null): string {
  if (value == null) return "—";
  return value.toLocaleString("en-AU");
}
