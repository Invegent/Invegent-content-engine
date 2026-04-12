# Claude Code Brief 021 — Monitor Tab Redesign

**Date:** 12 April 2026
**Status:** READY TO RUN
**Repo:** `invegent-dashboard`
**Working directory:** `C:\Users\parve\invegent-dashboard`
**Supabase project:** `mbkmaxqhsohbtwsqolns`
**MCPs required:** GitHub MCP, Supabase MCP
**Estimated time:** 4–6 hours

---

## What this builds

The Monitor tab is PK's visual overview of the entire ICE system.
Currently it shows 11 nodes for the text pipeline only, with no
way to drill into what each node is made of.

This brief:
1. Makes every node clickable — clicking slides in a detail panel from the right
2. Renames "RSS Feeds" → "Feeds" (with RSS + Email + YouTube shown in the panel)
3. Adds missing nodes: Content Fetch, Image Worker, Video Worker, HeyGen,
   Compliance, Dead Letter Queue
4. Expands pipeline-stats.ts with new data for new nodes
5. Adds a NodeDetailPanel component showing sub-components per node

---

## Verified data (live DB, 12 Apr 2026)

```
rss_feeds_active: 24
newsletter_feeds_active: 2
youtube_channels_active: 2
fetch_pending: 24
fetch_giveup: 0
dead_drafts_total: 91
compliance_rules_active: 23
avatars_assigned: 28 (all 28 = 2 clients x 14 slots)
heygen_builds_pending: 0
visual_specs_24h: 2
```

---

## Task 1 — Expand PipelineStats type and SQL query

**File:** `actions/pipeline-stats.ts`

Add to the `PipelineStats` type:

```typescript
// Feed breakdown
rssFeedsActive: number;
newsletterFeedsActive: number;
youtubeChannelsActive: number;

// Content fetch
fetchPending: number;
fetchGiveup: number;
fetchDone24h: number;

// Visual pipeline
imageSpecs24h: number;
videoSpecs24h: number;

// HeyGen
avatarsAssigned: number;
heygenPending: number;

// Quality
compliance_rulesActive: number;
deadDraftsTotal: number;
deadDrafts7d: number;
autoApproved24h: number;
```

Expand the SQL query inside `fetchPipelineStats` to add:

```sql
-- Feed breakdown
'rss_feeds_active',         (SELECT count(*) FROM f.feed_source WHERE source_type_code NOT IN ('email_newsletter','youtube_channel') AND status = 'active'),
'newsletter_feeds_active',  (SELECT count(*) FROM f.feed_source WHERE source_type_code = 'email_newsletter' AND status = 'active'),
'youtube_channels_active',  (SELECT count(*) FROM f.feed_source WHERE source_type_code = 'youtube_channel' AND status = 'active'),

-- Content fetch
'fetch_pending',  (SELECT count(*) FROM f.canonical_content_body WHERE fetch_status = 'pending'),
'fetch_giveup',   (SELECT count(*) FROM f.canonical_content_body WHERE fetch_status LIKE 'give_up%'),
'fetch_done_24h', (SELECT count(*) FROM f.canonical_content_body WHERE fetch_status = 'success' AND updated_at > now() - interval '24 hours'),

-- Visual pipeline
'image_specs_24h', (SELECT count(*) FROM m.post_visual_spec WHERE ice_format_key IN ('image_quote','carousel','animated_text_reveal') AND created_at > now() - interval '24 hours'),
'video_specs_24h', (SELECT count(*) FROM m.post_visual_spec WHERE ice_format_key LIKE 'video%' AND created_at > now() - interval '24 hours'),

-- HeyGen
'avatars_assigned', (SELECT count(*) FROM c.brand_avatar WHERE heygen_avatar_id IS NOT NULL AND is_active = true),
'heygen_pending',   (SELECT count(*) FROM c.brand_avatar WHERE avatar_gen_status = 'pending'),

-- Quality
'compliance_rules_active', (SELECT count(*) FROM t."5.7_compliance_rule" WHERE is_active = true),
'dead_drafts_total',       (SELECT count(*) FROM m.post_draft WHERE approval_status = 'dead'),
'dead_drafts_7d',          (SELECT count(*) FROM m.post_draft WHERE approval_status = 'dead' AND updated_at > now() - interval '7 days'),
'auto_approved_24h',       (SELECT count(*) FROM m.post_draft WHERE approved_by = 'auto-agent-v1' AND approved_at > now() - interval '24 hours'),
```

Map the new fields in the return object. Default all to 0 on error.

---

## Task 2 — Create NodeDetailPanel component

**File:** `components/pipeline-flow/NodeDetailPanel.tsx`

This is a slide-in panel that appears when a node is clicked.
It is positioned absolute INSIDE the diagram container (right side).

```tsx
"use client";

import { X } from "lucide-react";
import { type PipelineStats } from "@/actions/pipeline-stats";
import { type HealthStatus } from "./PipelineNode";

const HEALTH_DOT: Record<HealthStatus, string> = {
  green:   "bg-emerald-400",
  amber:   "bg-amber-400",
  red:     "bg-red-400",
  neutral: "bg-slate-500",
};

const HEALTH_LABEL: Record<HealthStatus, string> = {
  green:   "Healthy",
  amber:   "Warning",
  red:     "Critical",
  neutral: "No data",
};

export interface SubComponent {
  label: string;
  detail: string;
  health: HealthStatus;
}

export interface NodeDetail {
  title: string;
  description: string;
  subComponents: SubComponent[];
  metrics: Array<{ label: string; value: string }>;
  schedule?: string;
  docLink?: { href: string; label: string };
}

export function buildNodeDetail(nodeId: string, s: PipelineStats): NodeDetail | null {
  switch (nodeId) {
    case "feeds":
      return {
        title: "Feeds",
        description: "Signal sources ICE monitors. Three source types are ingested and normalised into the same pipeline.",
        subComponents: [
          { label: "RSS / Atom feeds", detail: `${s.rssFeedsActive} active`, health: s.rssFeedsActive > 0 ? "green" : "red" },
          { label: "Email newsletters", detail: `${s.newsletterFeedsActive} subscriptions`, health: s.newsletterFeedsActive > 0 ? "green" : "neutral" },
          { label: "YouTube channels", detail: `${s.youtubeChannelsActive} channels`, health: s.youtubeChannelsActive > 0 ? "green" : "neutral" },
        ],
        metrics: [
          { label: "Total active", value: String(s.activeFeeds) },
          { label: "RSS feeds", value: String(s.rssFeedsActive) },
          { label: "Newsletters", value: String(s.newsletterFeedsActive) },
          { label: "YouTube channels", value: String(s.youtubeChannelsActive) },
        ],
        schedule: "RSS: every 6h · Email: every 2h · YouTube: every 6h",
      };

    case "ingest":
      return {
        title: "Ingest Worker",
        description: "Fetches raw content from all active feeds, normalises structure, deduplicates, and writes to the canonical store.",
        subComponents: [
          { label: "RSS / Atom ingest", detail: "pg_cron every 6h", health: s.ingestRuns24h > 0 ? "green" : "amber" },
          { label: "Email newsletter ingest", detail: "pg_cron every 2h", health: s.newsletterFeedsActive > 0 ? "green" : "neutral" },
          { label: "YouTube channel ingest", detail: "via ingest-worker v95", health: s.youtubeChannelsActive > 0 ? "green" : "neutral" },
        ],
        metrics: [
          { label: "Runs last 24h", value: String(s.ingestRuns24h) },
          { label: "Canonical items total", value: s.canonicalItems.toLocaleString() },
        ],
        schedule: "RSS: every 6h (ingest Edge Function) · Email: every 2h · YouTube: every 6h",
      };

    case "content-fetch":
      return {
        title: "Content Fetch",
        description: "Extracts full text from canonical items. Uses Jina reader API. Detects paywalls and logs give-ups.",
        subComponents: [
          { label: "Jina reader", detail: "Full text extraction", health: s.fetchDone24h > 0 ? "green" : "amber" },
          { label: "Paywall detection", detail: "Hard + soft paywall", health: "green" },
          { label: "Give-up handler", detail: `${s.fetchGiveup} total give-ups`, health: s.fetchGiveup > 500 ? "amber" : "green" },
        ],
        metrics: [
          { label: "Pending fetch", value: String(s.fetchPending) },
          { label: "Fetched last 24h", value: String(s.fetchDone24h) },
          { label: "Total give-ups", value: String(s.fetchGiveup) },
        ],
        schedule: "Every 10 minutes (content_fetch Edge Function)",
      };

    case "canonical":
      return {
        title: "Canonicalise",
        description: "Deduplicates raw items into canonical content. One canonical item may represent multiple raw sources.",
        subComponents: [
          { label: "Deduplication engine", detail: "URL + title hash", health: "green" },
          { label: "Canonical store", detail: `${s.canonicalItems.toLocaleString()} items`, health: "green" },
        ],
        metrics: [
          { label: "Canonical items", value: s.canonicalItems.toLocaleString() },
          { label: "Scored today", value: String(s.scoredToday) },
        ],
        schedule: "Runs inline with ingest worker",
      };

    case "digest":
      return {
        title: "Digest & Score",
        description: "Scores canonical items by relevance to each client's content verticals. Selects top items into digest runs for AI generation.",
        subComponents: [
          { label: "Bundler (relevance scoring)", detail: "NDIS + Property verticals", health: s.scoredToday > 0 ? "green" : "amber" },
          { label: "Digest runner", detail: `Last: ${s.digestLastMin != null ? `${Math.round(s.digestLastMin)}m ago` : 'no data'}`, health: s.digestLastMin != null && s.digestLastMin < 90 ? "green" : "amber" },
        ],
        metrics: [
          { label: "Scored today", value: String(s.scoredToday) },
          { label: "Last digest run", value: s.digestLastMin != null ? `${Math.round(s.digestLastMin)}m ago` : "No data" },
        ],
        schedule: "Bundler: every 2h · Digest: triggered by bundler",
      };

    case "ai-worker":
      return {
        title: "AI Worker",
        description: "Generates post drafts from digest items. Injects compliance rules. Runs format advisor to decide text/image/video. Writes compliance_flags on every draft.",
        subComponents: [
          { label: "Claude (claude-sonnet-4-6)", detail: "Primary model", health: "green" },
          { label: "OpenAI GPT-4o", detail: "Fallback model", health: "green" },
          { label: "Format advisor", detail: "Picks text/image/video", health: "green" },
          { label: "Compliance injection", detail: `${s.compliance_rulesActive} rules loaded per draft`, health: "green" },
        ],
        metrics: [
          { label: "Jobs queued", value: String(s.aiJobsQueued) },
          { label: "Compliance rules active", value: String(s.compliance_rulesActive) },
        ],
        schedule: "Every 5 minutes (ai-worker-every-5m)",
      };

    case "image-worker":
      return {
        title: "Image Worker",
        description: "Generates static images and carousels for image_quote, carousel, and animated_text_reveal format posts via Creatomate.",
        subComponents: [
          { label: "Creatomate API", detail: "Essential plan ($54/mo)", health: "green" },
          { label: "image_quote format", detail: "1080x1080 PNG, brand colours", health: "green" },
          { label: "carousel format", detail: "Multi-slide, Montserrat font", health: "green" },
        ],
        metrics: [
          { label: "Specs last 24h", value: String(s.imageSpecs24h) },
        ],
        schedule: "Every 15 minutes (image-worker-15min)",
      };

    case "video-worker":
      return {
        title: "Video Worker",
        description: "Generates kinetic text videos, stat reveal videos, and voice narrated videos from AI Worker drafts.",
        subComponents: [
          { label: "video_short_kinetic", detail: "3–5 scenes, text motion", health: "green" },
          { label: "video_short_stat", detail: "Stat reveal, 20 seconds", health: "green" },
          { label: "video_short_kinetic_voice", detail: "+ ElevenLabs narration", health: "green" },
        ],
        metrics: [
          { label: "Video specs last 24h", value: String(s.videoSpecs24h) },
        ],
        schedule: "Every 30 minutes (video-worker-every-30min)",
      };

    case "heygen":
      return {
        title: "HeyGen",
        description: "Builds avatar videos using HeyGen API. Avatars assigned per role (7 roles x 2 styles per client). Triggered by video_short_avatar format.",
        subComponents: [
          { label: "Avatar cast", detail: `${s.avatarsAssigned} slots assigned`, health: s.avatarsAssigned === 28 ? "green" : "amber" },
          { label: "heygen-avatar-creator", detail: "Builds avatars from photos", health: "green" },
          { label: "heygen-avatar-poller", detail: "State machine, polls status", health: "green" },
          { label: "heygen-worker", detail: "Routes scripts to avatars", health: "green" },
        ],
        metrics: [
          { label: "Avatars assigned", value: String(s.avatarsAssigned) },
          { label: "Builds pending", value: String(s.heygenPending) },
        ],
        schedule: "Every 30 minutes (heygen-worker-every-30min)",
      };

    case "compliance":
      return {
        title: "Compliance",
        description: "NDIS Code of Conduct rules injected into every draft. Monthly AI review of policy URLs. One HARD_BLOCK rule: dignity/exploitation violations.",
        subComponents: [
          { label: "NDIS rules", detail: `${s.compliance_rulesActive} active rules`, health: "green" },
          { label: "Compliance monitor", detail: "Monthly URL hash check", health: "green" },
          { label: "AI Compliance Reviewer", detail: "Monthly analysis via Claude", health: "green" },
          { label: "Hard block", detail: "Dignity/exploitation only", health: "green" },
        ],
        metrics: [
          { label: "Active rules", value: String(s.compliance_rulesActive) },
          { label: "Soft warn rules", value: String(s.compliance_rulesActive - 1) },
          { label: "Hard block rules", value: "1" },
        ],
        schedule: "Rules: injected on every AI generation · Monitor: 1st of month",
      };

    case "auto-approver":
      return {
        title: "Auto-Approver",
        description: "9-gate logic scores every draft. Auto-approves high-confidence drafts. Flags low-score drafts for human review. Writes approved_by + auto_approval_scores on every decision.",
        subComponents: [
          { label: "auto_approve_enabled gate", detail: "Client opt-in required", health: "green" },
          { label: "source_score gate", detail: "Minimum relevance score", health: "green" },
          { label: "body_length gate", detail: "Min 80 / max 2000 chars", health: "green" },
          { label: "sensitive_keywords gate", detail: "Blocklist per vertical", health: "green" },
        ],
        metrics: [
          { label: "Needs review", value: String(s.needsReview) },
          { label: "Auto-approved 24h", value: String(s.autoApproved24h) },
        ],
        schedule: "Every 10 minutes (auto-approver-sweep)",
      };

    case "dead-letter":
      return {
        title: "Dead Letter Queue",
        description: "Items that have permanently failed are marked dead with a reason code. Never deleted. Daily sweep moves stale stuck items to dead status.",
        subComponents: [
          { label: "Dead draft sweep", detail: "Daily at 2am UTC", health: "green" },
          { label: "Stuck item detection", detail: "Pending > 2h flagged", health: "green" },
          { label: "Dead reason codes", detail: "Compliance block, timeout, failed", health: "green" },
        ],
        metrics: [
          { label: "Dead this week", value: String(s.deadDrafts7d) },
          { label: "Dead all time", value: String(s.deadDraftsTotal) },
        ],
        schedule: "Daily sweep: 2am UTC (dead-letter-sweep-daily)",
      };

    case "queue":
      return {
        title: "Publish Queue",
        description: "Approved drafts waiting to be published. Publisher checks every 5 minutes for items due for release.",
        subComponents: [
          { label: "Queued items", detail: `${s.queueQueued} waiting`, health: s.queueQueued < 20 ? "green" : "amber" },
          { label: "Overdue items", detail: `${s.queueOverdue} past scheduled_for`, health: s.queueOverdue === 0 ? "green" : "red" },
        ],
        metrics: [
          { label: "Queued", value: String(s.queueQueued) },
          { label: "Overdue", value: String(s.queueOverdue) },
          { label: "Published today", value: String(s.queueToday) },
        ],
        schedule: "Publisher checks every 5 minutes",
      };

    case "publisher":
      return {
        title: "Publisher",
        description: "Publishes approved drafts to connected platforms. Each platform is a separate Edge Function behind a platform router.",
        subComponents: [
          { label: "Facebook publisher", detail: "Meta Graph API v19.0", health: s.publishLastMin != null && s.publishLastMin < 120 ? "green" : "amber" },
          { label: "LinkedIn publisher", detail: "Waiting on API approval", health: "neutral" },
          { label: "YouTube publisher", detail: "Data API + video upload", health: "green" },
        ],
        metrics: [
          { label: "Last published", value: s.publishLastMin != null ? `${Math.round(s.publishLastMin)}m ago` : "No data" },
          { label: "Published today", value: String(s.queueToday) },
          { label: "Published this week", value: String(s.publishedWeek) },
          { label: "Published total", value: s.totalPublished.toLocaleString() },
        ],
        schedule: "Every 5 minutes (publisher-every-10m)",
      };

    case "published":
      return {
        title: "Published Posts",
        description: "Permanent record of all published content. Immutable — published posts and publish records cannot be deleted.",
        subComponents: [
          { label: "NDIS-Yarns", detail: "Facebook + YouTube", health: "green" },
          { label: "Property Pulse", detail: "Facebook + YouTube", health: "green" },
          { label: "Care For Welfare", detail: "Active client", health: "green" },
        ],
        metrics: [
          { label: "Published this week", value: String(s.publishedWeek) },
          { label: "Published total", value: s.totalPublished.toLocaleString() },
        ],
        schedule: "Real-time — updated on each publish",
      };

    case "insights":
      return {
        title: "Insights",
        description: "Fetches engagement data from Facebook Graph API daily. Powers the performance dashboard and feeds back into digest scoring weights.",
        subComponents: [
          { label: "insights-worker", detail: "v14.0.0, daily 3am UTC", health: s.postsWithPerf > 0 ? "green" : "neutral" },
          { label: "Facebook Graph API /insights", detail: "Reach, impressions, engagement", health: "green" },
          { label: "Feedback loop", detail: "Top posts boost scoring weights", health: s.postsWithPerf > 0 ? "green" : "neutral" },
        ],
        metrics: [
          { label: "Posts with data", value: String(s.postsWithPerf) },
        ],
        schedule: "Daily at 3am UTC (insights-worker-daily)",
      };

    default:
      return null;
  }
}

export function NodeDetailPanel({
  nodeId,
  stats,
  onClose,
}: {
  nodeId: string | null;
  stats: PipelineStats;
  onClose: () => void;
}) {
  const detail = nodeId ? buildNodeDetail(nodeId, stats) : null;

  // Always render — animate open/close with transform
  const isOpen = nodeId !== null && detail !== null;

  return (
    <div
      className={`absolute top-2 right-2 bottom-2 w-72 z-20 transition-transform duration-200 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-[110%]"
      }`}
    >
      {detail && (
        <div className="h-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-white">{detail.title}</h3>
            </div>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            {/* Description */}
            <p className="text-slate-400 leading-relaxed">{detail.description}</p>

            {/* Sub-components */}
            {detail.subComponents.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Made up of</p>
                <div className="space-y-2">
                  {detail.subComponents.map((sub, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-slate-800 rounded-lg px-3 py-2">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${HEALTH_DOT[sub.health]}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-200 font-medium leading-snug">{sub.label}</p>
                        <p className="text-slate-500 mt-0.5">{sub.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics */}
            {detail.metrics.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Metrics</p>
                <div className="space-y-1.5">
                  {detail.metrics.map((m, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-slate-400">{m.label}</span>
                      <span className="text-white font-semibold">{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedule */}
            {detail.schedule && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Schedule</p>
                <p className="text-slate-400 leading-relaxed">{detail.schedule}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Task 3 — Update PipelineNode to be clickable

**File:** `components/pipeline-flow/PipelineNode.tsx`

Add `onClick` to `PipelineNodeData`:
```typescript
onClick?: (nodeId: string) => void;
```

Change `cursor-default` to `cursor-pointer` in the outer div className.

Add `onClick` handler to the outer div:
```tsx
onClick={() => d.onClick?.(data.id as string)}
```

Note: In ReactFlow, the node ID is available as `id` on the NodeProps. Pass it through.

Actually, the cleaner approach is to use ReactFlow's `onNodeClick` prop on the `<ReactFlow>` component (see Task 4) rather than adding onClick to each node. Remove `onClick` from PipelineNodeData. Just change `cursor-default` to `cursor-pointer`.

---

## Task 4 — Update PipelineFlowDiagram

**File:** `components/pipeline-flow/PipelineFlowDiagram.tsx`

### 4a — Add selectedNodeId state

```typescript
const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
```

### 4b — Add onNodeClick handler

```typescript
const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
  setSelectedNodeId(prev => prev === node.id ? null : node.id);
}, []);
```

### 4c — New node layout

Replace `buildNodes` with the expanded set. Use these positions:

```typescript
const X = 240;
const Y = 180;

// SIGNAL ROW (y=0) — left to right
{ id: "feeds",         position: { x: 0,      y: 0 },     label: "Feeds",         stat: `${s.rssFeedsActive} RSS · ${s.newsletterFeedsActive} email · ${s.youtubeChannelsActive} YT`,  icon: Rss,          health: s.activeFeeds > 0 ? "green" : "red",                       layer: "signal" },
{ id: "ingest",        position: { x: X,      y: 0 },     label: "Ingest",        stat: fmtCount(s.ingestRuns24h, "runs / 24h"),                                               icon: Download,     health: s.ingestRuns24h > 0 ? "green" : "amber",                    layer: "signal" },
{ id: "content-fetch", position: { x: X*2,   y: 0 },     label: "Content Fetch", stat: `${s.fetchPending} pending · ${s.fetchGiveup} give-up`,                              icon: FileSearch,   health: s.fetchPending < 50 ? "green" : "amber",                    layer: "signal" },
{ id: "canonical",     position: { x: X*3,   y: 0 },     label: "Canonicalise",  stat: fmtCount(s.canonicalItems, "items"),                                                   icon: Database,     health: "green",                                                   layer: "signal" },
{ id: "digest",        position: { x: X*4,   y: 0 },     label: "Digest",        stat: fmtMinAgo(s.digestLastMin),                                                            icon: Layers,       health: minutesHealth(s.digestLastMin, 60),                         layer: "signal" },

// GENERATION ROW (y=Y) — AI worker on left, visual workers branch right
{ id: "ai-worker",     position: { x: X,      y: Y },     label: "AI Worker",     stat: fmtCount(s.aiJobsQueued, "queued"),                                                    icon: Bot,          health: queueHealth(s.aiJobsQueued),                                layer: "pipeline" },
{ id: "image-worker",  position: { x: X*2,   y: Y },     label: "Image Worker",  stat: `${s.imageSpecs24h} images / 24h`,                                                    icon: Image,        health: "green",                                                   layer: "pipeline" },
{ id: "video-worker",  position: { x: X*3,   y: Y },     label: "Video Worker",  stat: `${s.videoSpecs24h} videos / 24h`,                                                    icon: Video,        health: "green",                                                   layer: "pipeline" },
{ id: "heygen",        position: { x: X*4,   y: Y },     label: "HeyGen",        stat: `${s.avatarsAssigned} avatars assigned`,                                               icon: Users,        health: s.avatarsAssigned > 0 ? "green" : "amber",                  layer: "pipeline" },

// QUALITY ROW (y=Y*2)
{ id: "compliance",    position: { x: 0,      y: Y*2 },   label: "Compliance",    stat: `${s.compliance_rulesActive} rules active`,                                            icon: ShieldCheck,  health: "green",                                                   layer: "pipeline" },
{ id: "auto-approver", position: { x: X,      y: Y*2 },   label: "Auto-Approver", stat: fmtCount(s.needsReview, "needs review"),                                             icon: CheckCircle2, health: s.needsReview <= 10 ? "green" : "amber",                     layer: "pipeline" },
{ id: "dead-letter",   position: { x: X*2,   y: Y*2 },   label: "Dead Letter",   stat: `${s.deadDrafts7d} this week`,                                                        icon: AlertCircle,  health: s.deadDrafts7d === 0 ? "green" : "amber",                   layer: "pipeline" },

// OUTPUT ROW (y=Y*3)
{ id: "queue",         position: { x: X,      y: Y*3 },   label: "Queue",         stat: `${s.queueQueued} queued · ${s.queueToday} today`,                                    icon: ListOrdered,  health: queueHealth(s.queueOverdue),                                layer: "output" },
{ id: "publisher",     position: { x: X*2,   y: Y*3 },   label: "Publisher",     stat: fmtMinAgo(s.publishLastMin),                                                           icon: Send,         health: publisherHealth(s.queueOverdue, s.publishLastMin),          layer: "output" },
{ id: "published",     position: { x: X*3,   y: Y*3 },   label: "Published",     stat: `${s.publishedWeek} this wk · ${s.totalPublished} total`,                            icon: Newspaper,    health: s.publishedWeek > 0 ? "green" : "amber",                    layer: "output" },
{ id: "insights",      position: { x: X*4,   y: Y*3 },   label: "Insights",      stat: fmtCount(s.postsWithPerf, "with data"),                                                icon: TrendingUp,   health: s.postsWithPerf > 0 ? "green" : "neutral",                  layer: "output" },
```

Add these Lucide icon imports:
```typescript
import { FileSearch, Image, Video, Users, ShieldCheck, AlertCircle } from "lucide-react";
```

### 4d — New edges

```typescript
const EDGES: Edge[] = [
  // Signal row
  { id: "e-feeds-ingest",      source: "feeds",         target: "ingest",        animated: true },
  { id: "e-ingest-fetch",      source: "ingest",        target: "content-fetch", animated: true },
  { id: "e-fetch-canon",       source: "content-fetch", target: "canonical",     animated: true },
  { id: "e-canon-digest",      source: "canonical",     target: "digest",        animated: true },

  // Digest to generation
  { id: "e-digest-ai",         source: "digest",        target: "ai-worker",     animated: true },

  // AI to visual workers
  { id: "e-ai-image",          source: "ai-worker",     target: "image-worker",  animated: true },
  { id: "e-ai-video",          source: "ai-worker",     target: "video-worker",  animated: true },
  { id: "e-ai-heygen",         source: "ai-worker",     target: "heygen",        animated: true },

  // Compliance gates approver
  { id: "e-compliance-approve",source: "compliance",    target: "auto-approver", animated: false, style: { stroke: "#f59e0b", strokeWidth: 1, strokeDasharray: "4 3" } },

  // All generation converges to auto-approver
  { id: "e-ai-approve",        source: "ai-worker",     target: "auto-approver", animated: true },
  { id: "e-image-approve",     source: "image-worker",  target: "auto-approver", animated: true },
  { id: "e-video-approve",     source: "video-worker",  target: "auto-approver", animated: true },
  { id: "e-heygen-approve",    source: "heygen",        target: "auto-approver", animated: true },

  // Quality to output
  { id: "e-approve-dead",      source: "auto-approver", target: "dead-letter",   animated: false, style: { stroke: "#ef4444", strokeWidth: 1, strokeDasharray: "4 3" } },
  { id: "e-approve-queue",     source: "auto-approver", target: "queue",         animated: true },

  // Output
  { id: "e-queue-pub",         source: "queue",         target: "publisher",     animated: true },
  { id: "e-pub-published",     source: "publisher",     target: "published",     animated: true },
  { id: "e-published-insights",source: "published",     target: "insights",      animated: true },

  // Feedback loop
  { id: "e-insights-digest",   source: "insights",      target: "digest",        animated: false,
    style: { stroke: "#22d3ee", strokeWidth: 1, strokeDasharray: "6 3", opacity: 0.4 },
    label: "feedback", labelStyle: { fontSize: 9, fill: "#22d3ee", opacity: 0.6 } },
];
```

### 4e — Add NodeDetailPanel to the render

In the return, inside the outer div (after the `</ReactFlow>` closing tag, before the refresh indicator):

```tsx
<NodeDetailPanel
  nodeId={selectedNodeId}
  stats={stats}
  onClose={() => setSelectedNodeId(null)}
/>
```

Add to ReactFlow props:
```tsx
onNodeClick={handleNodeClick}
```

Also add `elementsSelectable={true}` (change from false).

### 4f — Update layer label positions

Update the absolute layer labels to match new row positions:
```tsx
// Signals (y=0 row in flow, approximately top 80px of canvas)
// Generation (y=180 row)
// Quality (y=360 row)
// Output (y=540 row)
```

Update the y offsets to match. The labels are decorative only — approximate is fine.

### 4g — Increase canvas height

Change `h-[600px]` to `h-[720px]` to accommodate the extra row.

---

## Task 5 — Handle missing icon names

If `Image`, `Video`, or `Users` conflict with existing HTML element names, use:
- `ImageIcon` instead of `Image`
- `VideoIcon` instead of `Video`
- `Users` is fine

Check Lucide v0.383.0 for exact export names if build fails.

---

## Task 6 — Update monitor page layout

**File:** `app/(dashboard)/monitor/page.tsx`

Add Care For Welfare to the CLIENT_TABS array:
```typescript
const CLIENT_TABS = [
  { label: "All clients", slug: null },
  { label: "NDIS-Yarns", slug: "ndis-yarns" },
  { label: "Property Pulse", slug: "property-pulse" },
  { label: "Care For Welfare", slug: "care-for-welfare" },
];
```

Update the subtitle:
```tsx
<p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
  Click any node to see what it’s made of · Auto-refreshes every 30s · All times AEDT
</p>
```

Expand the max-width:
```tsx
<div className="p-6 space-y-6 max-w-7xl">
```

---

## Task 7 — Build, commit, deploy

```bash
cd C:\Users\parve\invegent-dashboard
npm run build
```

Fix any TypeScript or import errors. Then:

```bash
git add -A
git commit -m "feat: monitor tab redesign — clickable nodes with detail panel, visual pipeline nodes, full ICE system view"
git push origin main
```

Vercel auto-deploys. Confirm dashboard.invegent.com/monitor loads with:
- New nodes visible (Feeds, Content Fetch, Image Worker, Video Worker, HeyGen, Compliance, Dead Letter)
- Clicking any node slides in the detail panel from the right
- Detail panel shows sub-components with health dots
- Panel closes on X or clicking another node

---

## Task 8 — Write result file

Write `docs/briefs/brief_021_result.md` in Invegent-content-engine:
- Tasks 1–7: COMPLETED / FAILED
- New nodes added (list)
- Build: PASS / FAIL
- Commit SHA
- Any notes (icon name conflicts, layout adjustments)

---

## Error handling

- If ReactFlow layout is too wide for the canvas: adjust X gap from 240 to 210
  and enable `panOnDrag={true}` so PK can scroll the canvas.
- If Lucide `Image` or `Video` conflict with browser globals: use `ImageIcon`, `VideoIcon`
  from lucide-react (these are valid exports in v0.383.0).
- If `onNodeClick` in ReactFlow has type issues, the signature is:
  `(event: React.MouseEvent, node: Node) => void`
- If the detail panel overlaps the diagram badly on small screens:
  make the panel width `w-64` instead of `w-72`.
- The `compliance_rulesActive` field name has an underscore in the middle —
  be consistent in both PipelineStats type and usage.
- All new PipelineStats fields default to 0 on error — do not leave them undefined.
- Do not change the SectionTabs or any other Monitor sub-pages (Pipeline, Visuals, Compliance, AI Costs, Performance).

---

## What this brief does NOT include

- Per-platform publish stats (Facebook vs YouTube vs LinkedIn counts)
- Client-specific detail in the panel (same panel for all clients)
- Drill-through links to feed detail pages from the panel
- Mobile-optimised layout (ReactFlow canvas is desktop-only)
- Dark mode panel variants (already inherits dark bg from slate-900)
