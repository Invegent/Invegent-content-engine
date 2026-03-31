# Pipeline Diagram — Build Spec
**Date:** 29 March 2026 (brief), saved 31 March 2026  
**Scope:** Two surfaces — dashboard Monitor tab (operational) + invegent.com (client-facing)  
**Effort:** ~1 day dashboard + ~0.5 days website  
**Library:** ReactFlow (no new connectors or APIs needed)

---

## Why This Exists

Two distinct use cases:

**Use case 1 — Operational understanding (internal)**
ICE has 23 edge functions, 22 cron jobs, 6 schemas, and signals flowing through 7 pipeline stages. The mental model gets harder to hold as the system grows. A live visual gives a single place to see the whole system — queue depths, function statuses, what's running right now — without reconstructing it from memory or running SQL queries.

**Use case 2 — Client explanation (commercial)**
When selling a managed content service, "we ingest signals, score them, generate content, publish it" is abstract. A visual flow makes it tangible and defensible. Shows the sophistication of the system without requiring the prospect to be technical. A trust-building asset for client conversations.

These two use cases want different things — the operational view needs live data, the client view needs to be clean and branded.

---

## Surface 1 — Dashboard Monitor Tab (Operational)

**Where:** `invegent-dashboard` repo → `app/(dashboard)/monitor/` — new tab added to Monitor section  
**Route:** `/monitor/pipeline` or integrated into existing Pipeline tab

### Layout — Three-Layer Node Graph

```
┌─────────────────────────────────────────────────────────┐
│  SIGNAL LAYER                                           │
│  [RSS Feeds] → [Ingest Worker] → [Canonicalise] → [Score] │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  PIPELINE LAYER                                         │
│  [Digest Run] → [AI Worker] → [Auto-Approver] → [Queue] │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  OUTPUT LAYER                                           │
│  [Publisher] → [Published Posts] → [Insights] ↑feedback │
└─────────────────────────────────────────────────────────┘
```

### Node Data (live from Supabase)

Each node is a React component running a lightweight DB query:

| Node | Live stat shown | Source query |
|---|---|---|
| RSS Feeds | `N active sources` | `count(*) FROM f.feed_source WHERE status='active'` |
| Ingest Worker | `N runs / 24h` | `count(*) FROM f.ingest_run WHERE created_at > now()-'24h'` |
| Canonicalise | `N canonical items` | `count(*) FROM f.canonical_content_item` |
| Score | `N scored today` | `count(*) FROM m.digest_item WHERE created_at > now()-'24h'` |
| Digest Run | `Last run N min ago` | `max(created_at) FROM m.digest_run` |
| AI Worker | `N jobs queued` | `count(*) FROM m.ai_job WHERE status='queued'` |
| Auto-Approver | `N needs review` | `count(*) FROM m.post_draft WHERE approval_status='needs_review'` |
| Queue | `N queued / N today` | `count FROM m.post_publish_queue` |
| Publisher | `Last published N min ago` | `max(published_at) FROM m.post_publish` |
| Published Posts | `N total / N this week` | `count FROM m.post_publish` |
| Insights | `N posts with data` | `count FROM m.post_performance` |

### Health Colouring (per node)

- 🟢 Green — last run within expected window, no errors
- 🟡 Amber — queue building, last run > 2× expected interval
- 🔴 Red — last run > 3× expected interval OR recent failures in dead letter

### Interactions

- Clicking a node navigates to the relevant Monitor sub-tab
  - Ingest → Feeds tab
  - AI Worker / Queue → Pipeline tab
  - Publisher → Pipeline tab (publish queue section)
  - Visuals → Visuals tab

### Technical approach

- Library: **ReactFlow** (`@xyflow/react`) — free tier covers all ICE needs
- Node types: custom React components (`CustomPipelineNode`) with live data inside
- Data fetching: lightweight `useQuery` hooks per node, 30-second refresh interval
- Layout: fixed positions (not auto-layout) — pipeline is linear, manual layout is cleaner
- Edges: animated (`animated: true` on ReactFlow edges) to show direction of data flow
- No new API routes needed — same Supabase client already used in dashboard

### Build steps

1. Install `@xyflow/react` in invegent-dashboard
2. Create `components/PipelineFlowDiagram.tsx` — the ReactFlow canvas
3. Create `components/nodes/PipelineNode.tsx` — custom node with live count display
4. Create `hooks/usePipelineStats.ts` — batched Supabase queries for all node stats
5. Add health colour logic (green/amber/red) based on last-run timestamps
6. Add to Monitor tab navigation — new "Flow" tab or integrate into Pipeline tab
7. Wire click handlers to navigate to relevant sub-tabs

---

## Surface 2 — invegent.com (Client-Facing)

**Where:** `invegent-web` repo → new section on the homepage OR a separate `/how-it-works` page  
**Purpose:** Explain ICE to prospective clients — no live data, purely explanatory

### Visual Concept

A horizontal flow diagram, left to right:

```
[🔍 Signals In]  →  [🧠 Intelligence Layer]  →  [✍️ Content Engine]  →  [📣 Platform Publishing]  →  [📊 Performance Loop]
```

Each stage has:
- A simple icon (no photography)
- A one-line label
- A 2-sentence plain English description underneath

The arrows between stages animate on scroll (fade in left-to-right as the user scrolls down).

### Stage descriptions

| Stage | Label | Description |
|---|---|---|
| 1 | Signals In | We monitor 26+ sector sources daily — NDIS policy updates, RBA decisions, industry publications. Every post starts from a real signal, not thin air. |
| 2 | Intelligence Layer | ICE scores each signal against your sector and audience. Only the most relevant content advances — low-relevance signals are discarded automatically. |
| 3 | Content Engine | Claude generates branded, platform-optimised posts in your voice. NDIS content is checked against 20 compliance rules before it ever reaches your page. |
| 4 | Platform Publishing | Approved posts publish automatically on schedule to Facebook and LinkedIn. No login required, no copying and pasting. |
| 5 | Performance Loop | Engagement data feeds back into the scoring system. ICE learns what resonates with your audience and improves content selection over time. |

### Design approach

- ICE brand colours: `#0A1628` background, `#22D3EE` (cyan) accents
- Inline SVG arrows with CSS animation (`@keyframes slideIn`) triggered by Intersection Observer
- Stage cards: dark card with cyan top border, matching the landing page aesthetic already live
- Mobile: vertical stacked layout (each stage stacked, arrows pointing down)
- Desktop: horizontal flow layout

### Technical approach

Two options:
- **Option A (simpler):** Static React component with CSS animation — no ReactFlow dependency needed for the website version. Just styled `div` cards with animated SVG arrows between them. Half a day.
- **Option B (richer):** ReactFlow with `fitView`, no pan/zoom, branded node styling. More consistent with the dashboard version. Full day.

**Recommendation: Option A for the website** — static is fine for a marketing page and keeps it fast-loading. ReactFlow is overkill for something that doesn't need interactivity.

### Where it goes on invegent.com

Replace or extend the existing "How it works" section (currently 3 static steps: Signal ingestion → AI generation → Publish & measure). The 5-stage diagram is more specific and more defensible as a sales asset.

---

## Build Order

1. **Dashboard version first** (~1 day in Claude Code)
   - More immediate value — you use the dashboard every session
   - Living with it for a few weeks reveals what actually matters operationally
   - That insight informs which parts to simplify for the client version

2. **Website version second** (~0.5 days in Claude Code)
   - Build after the dashboard version exists and you've seen what resonates
   - Can be designed in Canva first to get visual concept right before coding

---

## No New Infrastructure Needed

Both versions are self-contained:
- Dashboard: ReactFlow + existing Supabase connection + existing DB queries
- Website: Static React + CSS animation
- No new APIs, no new MCP connectors, no new credentials
- No new Edge Functions or DB schema changes

---

## Notes for Claude Code

**Dashboard version:**
- Read `docs/skills/dashboard-page.md` before starting
- The Monitor section already has 4 tabs (Pipeline / Visuals / Compliance / AI Costs)
- Add "Flow" as a 5th tab, or integrate into Pipeline tab as a toggle view
- Node stats queries should be batched — one `Promise.all()` call, not N sequential fetches
- Use 30s refresh interval (`setInterval` + `useEffect`) — not real-time subscription (overkill)

**Website version:**
- Read `docs/skills/dashboard-page.md` for Next.js patterns (applies to web repo too)
- The landing page is in `app/page.tsx` — the "How it works" section starts around line 165
- Replace the 3-step static section with the 5-stage animated diagram component
- Keep the page fast: no heavy JS, CSS animation only, lazy-load if needed
