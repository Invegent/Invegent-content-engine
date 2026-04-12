# Brief 021 Result — Monitor Tab Redesign

**Executed:** 12 April 2026
**Executor:** Claude Code (Opus 4.6)
**Repo:** invegent-dashboard

---

## Task Results

| Task | Description | Status |
|------|-------------|--------|
| 1 | Expand PipelineStats + SQL query (14 new fields) | COMPLETED |
| 2 | Create NodeDetailPanel.tsx (16 node configs) | COMPLETED |
| 3 | Update PipelineNode cursor-default to cursor-pointer | COMPLETED |
| 4 | Update PipelineFlowDiagram (16 nodes, new edges, panel) | COMPLETED |
| 5 | Update monitor page (CFW tab, subtitle, max-w-7xl) | COMPLETED |
| 6 | npm run build | PASS — 0 errors |
| 7 | Commit and push | COMPLETED — 1e8ed49 |
| 8 | Write result file | COMPLETED |

---

## New Nodes Added (5 new, 11 existing repositioned)

| Node | Row | New? |
|------|-----|------|
| Feeds (renamed from RSS Feeds) | Signal | Updated |
| Ingest | Signal | Existing |
| Content Fetch | Signal | NEW |
| Canonicalise | Signal | Existing |
| Digest | Signal | Existing |
| AI Worker | Generation | Existing |
| Image Worker | Generation | NEW |
| Video Worker | Generation | NEW |
| HeyGen | Generation | NEW |
| Compliance | Quality | NEW |
| Auto-Approver | Quality | Existing |
| Dead Letter | Quality | NEW |
| Queue | Output | Existing |
| Publisher | Output | Existing |
| Published | Output | Existing |
| Insights | Output | Existing |

## New Edges Added

- content-fetch chain (ingest → fetch → canonical)
- Visual worker branches (ai → image, ai → video, ai → heygen)
- Compliance → auto-approver (dashed amber)
- Auto-approver → dead-letter (dashed red)
- All generation → auto-approver convergence
- Insights → digest feedback loop (dashed cyan)

## Layout

- 4 rows: Signal, Generation, Quality, Output
- X gap: 240px, Y gap: 180px
- Canvas height: 720px (up from 600px)
- panOnDrag enabled for wide layouts
- elementsSelectable: true (was false)

## Icon Notes

- Used `ImageIcon` and `VideoIcon` from lucide-react (avoids conflict with HTML element names)
- `FileSearch` for Content Fetch, `ShieldCheck` for Compliance, `AlertCircle` for Dead Letter, `Users` for HeyGen

---

## Files Changed

| File | Action |
|------|--------|
| actions/pipeline-stats.ts | MODIFIED — 14 new stat fields + expanded SQL |
| components/pipeline-flow/NodeDetailPanel.tsx | CREATED — 16-node detail panel |
| components/pipeline-flow/PipelineNode.tsx | MODIFIED — cursor-pointer |
| components/pipeline-flow/PipelineFlowDiagram.tsx | REWRITTEN — 16 nodes, new edges, panel integration |
| app/(dashboard)/monitor/page.tsx | MODIFIED — CFW tab, subtitle, max-w-7xl |

## Build

- 0 errors, 43 routes compiled
- /monitor page: 61.4KB (up from 57.9KB)
- Commit: 1e8ed49 (5 files, +656 -113)
