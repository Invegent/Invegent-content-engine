import type { ReactNode } from "react";
import Link from "next/link";
import { FrictionFAB } from "./_components/FrictionFAB";

// cc-0013 Stage C — root layout with navigation shell.
// Server Component (no "use client"). No client-side state, no providers,
// no analytics, no theming at v1.
//
// cc-0014 Stage D — friction capture FAB mounted at layout level so it is
// reachable from every route. Gated by DASHBOARD_FRICTION_FAB_ENABLED env
// var; renders nothing when unset, so deployments without the gate set
// see no UI surface. Env is read inside RootLayout (request-time, server
// component) so a missed dev-server restart shows up as a request-time
// re-evaluation rather than a stale module-load constant.

export const metadata = {
  title: "Invegent — Reconciliation Dashboard",
  description:
    "Operator-internal reconciliation v1 + PRV v1 health dashboard (cc-0013 Stage C).",
};

const NAV_LINK_STYLE: React.CSSProperties = {
  textDecoration: "none",
  color: "#0a4c7a",
  padding: "0.25rem 0.5rem",
  borderRadius: "3px",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const frictionFabEnabled =
    process.env.DASHBOARD_FRICTION_FAB_ENABLED === "true";

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          padding: "1.5rem",
          maxWidth: "1100px",
          marginLeft: "auto",
          marginRight: "auto",
          color: "#111",
          lineHeight: 1.5,
        }}
      >
        <nav
          aria-label="Primary"
          style={{
            display: "flex",
            gap: "0.75rem",
            paddingBottom: "1rem",
            marginBottom: "1.25rem",
            borderBottom: "1px solid #ddd",
            flexWrap: "wrap",
            fontSize: "0.95rem",
          }}
        >
          <Link href="/" style={NAV_LINK_STYLE}>
            Summary
          </Link>
          <Link href="/clients" style={NAV_LINK_STYLE}>
            Clients
          </Link>
          <Link href="/platforms" style={NAV_LINK_STYLE}>
            Platforms
          </Link>
          <Link href="/drift" style={NAV_LINK_STYLE}>
            Drift
          </Link>
          <Link href="/freshness" style={NAV_LINK_STYLE}>
            Freshness
          </Link>
        </nav>
        {children}
        <FrictionFAB enabled={frictionFabEnabled} />
      </body>
    </html>
  );
}
