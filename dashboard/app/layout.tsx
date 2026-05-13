import type { ReactNode } from "react";

// cc-0013 Stage B — root layout. Server Component (no "use client" directive).
// No client-side state, no providers, no analytics, no theming at v1.

export const metadata = {
  title: "Invegent — Reconciliation Dashboard",
  description:
    "Operator-internal reconciliation v1 + PRV v1 health dashboard (cc-0013 Stage B scaffold).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          padding: "1.5rem",
          maxWidth: "960px",
          marginLeft: "auto",
          marginRight: "auto",
          color: "#111",
          lineHeight: 1.5,
        }}
      >
        {children}
      </body>
    </html>
  );
}
