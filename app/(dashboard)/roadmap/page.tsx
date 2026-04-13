export const dynamic = "force-static";

type Status = "done" | "active" | "waiting" | "deferred" | "planned";

type Deliverable = {
  label: string;
  status: Status;
  note?: string;
};

type Phase = {
  id: string;
  title: string;
  subtitle: string;
  status: Status;
  deliverables: Deliverable[];
};

type Layer = {
  id: string;
  title: string;
  pct: number;
  status: Status;
  what_works: string;
  what_missing: string;
};

const LAYERS: Layer[] = [
  {
    id: "pipeline",
    title: "Pipeline engine",
    pct: 90,
    status: "active",
    what_works: "Full ingest to publish loop running reliably 6+ weeks. Dead letter queue, auto-approver v1.4.1, 28 posts/7d. Sentinel catches failures proactively every 15min. Healer auto-fixes stuck jobs. Performance feedback loop seeding topic weights.",
    what_missing: "Bundler not reading topic weights yet. Reddit/Perplexity signal sources. Email newsletter subscriptions pending.",
  },
  {
    id: "content-intelligence",
    title: "Content intelligence",
    pct: 78,
    status: "active",
    what_works: "AI generation live. 23 NDIS compliance rules, profession-scoped. Format advisor. Audit trail complete. Topic score weights calculating daily from engagement data.",
    what_missing: "Bundler not yet reading topic weights for scoring. Self-improving prompts. NDIS Yarns image generation stopped ~20 March — needs investigation.",
  },
  {
    id: "visual",
    title: "Visual pipeline",
    pct: 72,
    status: "active",
    what_works: "Text, video_short_kinetic, video_short_stat all publishing (Property Pulse). HeyGen avatar cast assigned. YouTube uploading.",
    what_missing: "NDIS Yarns image_quote/carousel stopped ~20 March. 3 PP video drafts approved but not queued. HeyGen avatar builds pending. Instagram not built.",
  },
  {
    id: "monitoring",
    title: "Monitoring & self-healing",
    pct: 95,
    status: "active",
    what_works: "Sentinel (5-check proactive, every 15min) + Diagnostician (Claude RCA) + Healer (auto-fix). Pipeline doctor, AI diagnostic, dead letter queue. B5 weekly report with incident summary. Telegram alerts on CRITICAL.",
    what_missing: "Automated test runner (B3) not built.",
  },
  {
    id: "dashboard",
    title: "Operations dashboard",
    pct: 92,
    status: "active",
    what_works: "6-zone nav with StatusStrip (green/amber/red). Operator briefing on Overview: status bar, drafts + incidents 2-col, today's schedule. Monitor: 16-node full system view. Diagnostics: Run Diagnosis button. All configuration tabs.",
    what_missing: "No live proof dashboard for external sales pitch.",
  },
  {
    id: "portal",
    title: "Client portal",
    pct: 92,
    status: "active",
    what_works: "Portal Home: week stats, platform status, recent posts, coming up (7 days). Inbox: draft approval workflow. Performance: engagement data + top posts. Brand colours + logo per client. Connect page.",
    what_missing: "Platform OAuth not live (pending Meta + LinkedIn approvals). Performance tab needs insights data to populate.",
  },
  {
    id: "distribution",
    title: "Distribution & amplification",
    pct: 22,
    status: "waiting",
    what_works: "Facebook publishing working (own pages). YouTube uploading. OAuth routes built (gated by env vars). Manual token workaround viable for first 1-3 external clients.",
    what_missing: "Meta Standard Access pending (no boost agent, no third-party OAuth). LinkedIn API pending. Instagram not built.",
  },
  {
    id: "client-readiness",
    title: "External client readiness",
    pct: 80,
    status: "active",
    what_works: "Full self-serve onboarding. Brand scanner + AI profile bootstrap. Portal personalised on login. Client weekly email. invegent.com live with pricing and live proof. Manual token workaround for first clients.",
    what_missing: "Legal review (L001). Meta Standard Access. LinkedIn API. CFW acceptance test not run yet. Prospect demo generator (F1).",
  },
];

const PHASES: Phase[] = [
  {
    id: "Phase 1",
    title: "Stabilise",
    subtitle: "Reliable pipeline for two clients — COMPLETE 7 Apr 2026",
    status: "done",
    deliverables: [
      { label: "Feed quality — 26 active sources", status: "done" },
      { label: "Auto-approver v1.4 — 9-gate logic", status: "done" },
      { label: "Next.js dashboard — all tabs", status: "done" },
      { label: "Both clients publishing 5+ posts/week for 6+ weeks", status: "done" },
      { label: "Supabase Pro + daily backups", status: "done" },
      { label: "Dead letter queue", status: "done" },
      { label: "Meta App Review submitted", status: "done", note: "Business verification In Review. Permissions submission pending after verification clears." },
    ],
  },
  {
    id: "Phase 2",
    title: "Automate",
    subtitle: "Autonomous operation + feedback loop",
    status: "active",
    deliverables: [
      { label: "Feed Intelligence agent", status: "done" },
      { label: "Email newsletter ingest", status: "done" },
      { label: "Next.js dashboard — all tabs live", status: "done" },
      { label: "Client portal (portal.invegent.com)", status: "done" },
      { label: "Signal clustering — two-layer dedup, bundler v4", status: "done" },
      { label: "Content series — series-writer + Content Studio", status: "done" },
      { label: "Pipeline Doctor + AI Diagnostic Tier 1 & 2", status: "done" },
      { label: "Visual pipeline — image formats live", status: "done", note: "image-worker v3.9.2. Creatomate Essential." },
      { label: "Compliance framework — NDIS rules injected", status: "done", note: "23 active rules. Monthly hash check." },
      { label: "Facebook Insights back-feed", status: "done", note: "insights-worker v14. Performance dashboard live." },
      { label: "Performance → scoring feedback loop", status: "done", note: "topic_score_weight table. Daily recalculation. Bundler wiring pending." },
      { label: "LinkedIn publisher", status: "waiting", note: "Code done. Waiting on Community Management API approval." },
    ],
  },
  {
    id: "Phase 3",
    title: "Expand + Personal Brand",
    subtitle: "Engine proven on personal businesses. First external client ready.",
    status: "active",
    deliverables: [
      { label: "Compliance-aware system prompts (NDIS + Property)", status: "done" },
      { label: "YouTube pipeline — kinetic + stat + voice", status: "done", note: "PP: 4 videos live. video-worker v2.1.0." },
      { label: "Video visibility tracker + Video analyser", status: "done" },
      { label: "HeyGen — API key + consent + avatar cast UI", status: "done", note: "Both clients: 7 roles × 2 styles = 14 slots each." },
      { label: "OpenClaw — Telegram remote control", status: "done" },
      { label: "Resend SMTP — reliable magic link delivery", status: "done" },
      { label: "Portal sidebar redesign + mobile bottom bar", status: "done", note: "Left collapsible sidebar, client footer, inbox badge." },
      { label: "Platform OAuth connect page (/connect)", status: "done", note: "Facebook + LinkedIn routes built. Gated by env vars." },
      { label: "Full onboarding pipeline", status: "done", note: "Form + brand-scanner + ai-profile-bootstrap + portal CSS. All live." },
      { label: "Audit trail — compliance_flags + auto_approval_scores", status: "done", note: "ai-worker v2.7.1 + auto-approver v1.4.0." },
      { label: "B5 weekly manager report email", status: "done", note: "Monday 7am AEST. Includes incident summary (v1.1.0)." },
      { label: "Client weekly summary email", status: "done", note: "Monday 7:30am AEST. Per-client proof-of-value email." },
      { label: "Monitor tab — full ICE system view", status: "done", note: "16 clickable nodes, detail panels." },
      { label: "Sentinel + Diagnostician + Healer agents", status: "done", note: "Proactive health + Claude RCA + auto-remediation. Live 13 Apr." },
      { label: "Dashboard operator briefing", status: "done", note: "Status bar + today's drafts + incidents + schedule. Live 13 Apr." },
      { label: "Dashboard 6-zone nav + StatusStrip", status: "done", note: "Today/Monitor/Content/Config/System. Live 13 Apr." },
      { label: "Portal Home — week stats, recent posts, queue view", status: "done", note: "5 sections. Live 13 Apr." },
      { label: "Portal Inbox — draft approval workflow", status: "done", note: "Approve/reject with reason. Inbox badge. Live 13 Apr." },
      { label: "Portal Performance tab", status: "done", note: "Engagement data, top posts, reach. Live 13 Apr." },
      { label: "invegent.com full rebuild", status: "done", note: "NDIS-focused, live proof stats, pricing, founder section. Live 13 Apr." },
      { label: "heygen-worker avatar video build", status: "active", note: "Schema + worker live. PK to select stock avatars and trigger builds." },
      { label: "CFW wipe and restart — acceptance test", status: "planned", note: "Full onboarding flow end-to-end. Next dedicated session." },
      { label: "NDIS Yarns image generation fix", status: "planned", note: "Image formats stopped ~20 March. ai-worker investigation needed." },
      { label: "Property Pulse video re-queue (3 drafts)", status: "planned", note: "3 approved drafts with no queue item. Manual re-queue needed." },
      { label: "Prospect demo generator (F1)", status: "planned", note: "Hold until NDIS Yarns has 60+ days data (~mid-June 2026)." },
      { label: "LinkedIn publisher live", status: "waiting", note: "0.5 days when API approves. Evaluate Late.dev middleware if still pending 13 May." },
      { label: "First external client", status: "planned", note: "Gate open. Legal review (L001) before signing. Manual token workaround viable for Facebook + LinkedIn now." },
    ],
  },
  {
    id: "Phase 4",
    title: "Scale + Intelligence",
    subtitle: "AI runs the system. 5-10 clients.",
    status: "planned",
    deliverables: [
      { label: "Bundler wiring for topic score weights", status: "planned", note: "Weights calculated, bundler not reading them yet." },
      { label: "Performance to auto-approver self-improvement", status: "planned" },
      { label: "Cowork daily inbox task", status: "planned", note: "Gmail MCP, archive noise, surface actions." },
      { label: "pgvector — natural language queries on content", status: "planned" },
      { label: "Nightly parallel intelligence council", status: "planned" },
      { label: "n8n client success workflow", status: "planned" },
      { label: "IAE Phase A — Facebook Ads boost", status: "planned" },
      { label: "YouTube Stage C — long-form avatar episodes", status: "planned" },
      { label: "Reddit + YouTube + Perplexity signal sources", status: "planned" },
      { label: "Client websites — ICE to web auto-publish", status: "planned" },
      { label: "Aged care / mental health vertical", status: "planned" },
      { label: "SaaS evaluation at 10 clients", status: "planned" },
    ],
  },
];

const STATUS_CONFIG: Record<Status, { dot: string; badge: string; label: string }> = {
  done:     { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800", label: "Done" },
  active:   { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800", label: "In progress" },
  waiting:  { dot: "bg-blue-400",    badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800", label: "Waiting" },
  deferred: { dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", label: "Deferred" },
  planned:  { dot: "bg-slate-300 dark:bg-slate-600", badge: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", label: "Planned" },
};

const PHASE_BORDER: Record<Status, string> = {
  done:     "border-l-4 border-l-emerald-500",
  active:   "border-l-4 border-l-amber-400",
  waiting:  "border-l-4 border-l-blue-400",
  deferred: "border-l-4 border-l-slate-300",
  planned:  "border-l-4 border-l-slate-200 dark:border-l-slate-700",
};

function StatusDot({ status }: { status: Status }) {
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 mt-1.5 ${STATUS_CONFIG[status].dot}`} />;
}

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}>
      {cfg.label}
    </span>
  );
}

function ProgressBar({ pct, status }: { pct: number; status: Status }) {
  const colour = status === "done" ? "bg-emerald-500" : status === "active" ? "bg-amber-400" : status === "waiting" ? "bg-blue-400" : "bg-slate-300";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${colour}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function RoadmapPage() {
  const lastUpdated = "2026-04-13";

  return (
    <div className="p-6 max-w-4xl space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">ICE Roadmap</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Full project status — phases and system layers
          </p>
        </div>
        <span className="text-xs text-slate-400 dark:text-slate-500">Updated {lastUpdated}</span>
      </div>

      <div className="flex flex-wrap gap-4 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {(Object.entries(STATUS_CONFIG) as [Status, typeof STATUS_CONFIG[Status]][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            <span className="text-xs text-slate-500 dark:text-slate-400">{cfg.label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">By layer</h2>
        <div className="space-y-3">
          {LAYERS.map((layer) => (
            <div key={layer.id} className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 ${PHASE_BORDER[layer.status]}`}>
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{layer.title}</h3>
                  <StatusBadge status={layer.status} />
                </div>
              </div>
              <ProgressBar pct={layer.pct} status={layer.status} />
              <div className="mt-3 grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">What works</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{layer.what_works}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">{"What's missing"}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{layer.what_missing}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">By phase</h2>
        <div className="space-y-5">
          {PHASES.map((phase) => {
            const doneCount = phase.deliverables.filter((d) => d.status === "done").length;
            const totalCount = phase.deliverables.length;
            return (
              <div key={phase.id} className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden ${PHASE_BORDER[phase.status]}`}>
                <div className="px-5 py-4 flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 shrink-0">{phase.id}</span>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{phase.title}</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{phase.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{doneCount}/{totalCount}</span>
                    <StatusBadge status={phase.status} />
                  </div>
                </div>
                <div className="h-1 bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round((doneCount / totalCount) * 100)}%` }} />
                </div>
                <div className="px-5 py-4">
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
                    {phase.deliverables.map((d, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <StatusDot status={d.status} />
                        <div className="min-w-0">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{d.label}</p>
                          {d.note && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 leading-snug">{d.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">External blockers — not in our control</h3>
        <div className="space-y-2.5">
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1.5" />
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">LinkedIn Community Management API</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">No progress 13 Apr. Evaluate Late.dev middleware if still pending 13 May 2026.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1.5" />
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">Meta App Review — permissions review</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Business verification In Review. Do NOT edit Business Manager. Contact developer support if stuck after 27 Apr.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1.5" />
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">Legal review (L001)</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Hard gate before first external client signs. Manual token workaround viable for first 1–3 clients in interim.</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1.5" />
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">Facebook tokens expiring</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">NDIS Yarns: 31 May (~48d). Property Pulse: 5 Jun (~53d). Refresh early June.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Strategic principle</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          ICE is an AI-operated business system, not a content tool. Build priority: (1) PK personal businesses. (2) Personal brand. (3) External clients — bonus, not driver.
        </p>
      </div>
    </div>
  );
}
