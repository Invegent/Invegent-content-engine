# ICE — Weekly Manager Report Specification
## Layer 4 QA — Human Sign-Off on System Health

Delivered every Sunday night to pk@invegent.com via Resend.
Also accessible in the dashboard at /diagnostics.

Purpose: You read this on Monday morning. If everything is green,
you start the week with confidence. If something is amber or red,
you know what to fix before doing anything else.

---

## REPORT STRUCTURE

### Section 1 — Overall Status (one line)
```
✅ SYSTEM HEALTHY — All 23 checks passed. No action required.
```
or
```
⚠️ ATTENTION REQUIRED — 2 warnings detected. Review Section 4.
```
or
```
🔴 ACTION REQUIRED — 1 critical failure. Do not onboard clients until resolved.
```

---

### Section 2 — Publishing Summary (this week)
```
NDIS Yarns:      7 posts published  |  Avg engagement: 4.2%  |  Status: ✅
Property Pulse:  5 posts published  |  Avg engagement: 2.8%  |  Status: ✅

Top performing post this week:
  Client: NDIS Yarns
  Topic: [topic name]
  Engagement: 6.1% (above baseline)
  Format: signal_reactive
  Boost candidate: YES — above threshold
```

---

### Section 3 — Pipeline Health Summary
```
Ingest worker:         ✅ Running normally (avg 87 items/run)
Content fetch:         ✅ Success rate 41% (above 30% threshold)
Bundler:               ✅ Both clients receiving digest items
AI worker:             ✅ Draft rate 94% (above 80% threshold)
Auto-approver:         ✅ Auto-approval rate 78%
Publisher:             ✅ 0 failures this week
Compliance monitor:    ✅ Last run 3 days ago. 0 pending reviews.
```

---

### Section 4 — Audit Results
```
Structural checks:      8/8 pass
Operational checks:     6/7 pass
  ⚠️ WARN: NDIS Yarns Facebook token expires in 12 days. Refresh required.
Data integrity checks:  5/5 pass
Compliance checks:      4/4 pass

Total: 23/24 pass | 1 warning | 0 failures
```

---

### Section 5 — Actions Required
```
PRIORITY 1 (This week):
  • Refresh NDIS Yarns Facebook token (expires in 12 days)
    → Dashboard → Clients → NDIS Yarns → Refresh Token

PRIORITY 2 (This week if time):
  • Review 3 flagged drafts in manual review queue
    → Dashboard → Draft Inbox → Flagged

No action required for anything else.
```

---

### Section 6 — Audience Building Progress (once D3 is built)
```
NDIS Yarns:
  Meta engagement pool:    1,847 people  (+312 this week)
  Video viewer audience:     203 people  (+41 this week)
  Website visitor pool:       89 people  (+12 this week)
  Email list:                142 contacts (+8 this week)
  Lookalike ready:           NO (need 500 in engagement pool)

Property Pulse:
  Meta engagement pool:     924 people  (+187 this week)
  Lookalike ready:           NO
```

---

### Section 7 — Upcoming (next 7 days)
```
• Meta App Review — business verification due for check (10 Apr)
• NDIS Yarns YouTube Brand Account conversion — pending
• Property Pulse token expires in 28 days — schedule refresh
```

---

## DELIVERY SPEC

```
Schedule:    Sunday 10 PM AEST (pg_cron: 12:00 UTC Sunday)
From:        reports@invegent.com (Resend)
To:          pk@invegent.com
Subject:     ICE Weekly Report — [date] — [✅ Healthy / ⚠️ Attention / 🔴 Action]
Format:      HTML email (clean, scannable, mobile-friendly)
Dashboard:   Also written to database and surfaced at /diagnostics
```

## APPROVAL PROTOCOL

After reading the report:
```
All green  → No action. Note it mentally. Start the week.
Any amber  → Action within 48 hours. Do not onboard new clients.
Any red    → Action before anything else. Do not deploy new code.

Before any significant deploy:
  □ Read most recent manager report
  □ Confirm no unresolved reds
  □ Run manual audit: SELECT * FROM m.run_system_audit() WHERE status = 'fail';
  □ If clean → proceed
  □ If failures → resolve first
```

---

*Document owner: PK*
*Review cycle: Update report structure as new pipeline stages are added*
*Last updated: April 2026*
