#!/usr/bin/env python
"""ICE R0 read-path ADOPTION MONITOR (read-only, no DB, no network).

Answers one question over the next few sessions: are reads actually being routed
through `db-read.py` (the no-prompt R0 path), or still flowing through gated
`execute_sql`? It reads two local, already-present signals:

  1. The wrapper's own audit log `~/.ice_readonly_audit.log` (every db-read.py call).
  2. (with --scan) recent Claude Code transcripts — counts `execute_sql` calls whose
     query is a pure read (SELECT/WITH) vs `db-read.py` Bash calls, to show the
     ROUTED RATIO = db-read.py / (db-read.py + execute_sql-reads).

Modes:
  (default)  full audit-log report (per-day OK/ERR/REJECTED for the last 7 days)
  --pulse    ONE compact line (used by the SessionStart hook — must stay fast/cheap)
  --scan     also scan transcripts for the routed-ratio (heavier; run manually/weekly)

Mutates nothing. Prints to stdout. Never contains a DSN (the audit log never records one).
"""
import glob
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone

AUDIT_LOG = os.environ.get("ICE_READONLY_AUDIT_LOG") or os.path.expanduser(
    "~/.ice_readonly_audit.log")


def read_audit():
    """Return list of (datetime, status, sql) from the audit log, oldest first."""
    rows = []
    if not os.path.isfile(AUDIT_LOG):
        return rows
    with open(AUDIT_LOG, encoding="utf-8") as fh:
        for line in fh:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 2:
                continue
            ts_s, status = parts[0], parts[1]
            sql = parts[4] if len(parts) >= 5 else ""
            try:
                ts = datetime.fromisoformat(ts_s)
            except ValueError:
                continue
            rows.append((ts, status, sql))
    return rows


def audit_report(pulse: bool) -> str:
    rows = read_audit()
    now = datetime.now(timezone.utc)
    if not rows:
        return "R0 db-read.py adoption - audit log empty (no reads routed yet)."

    last24 = [r for r in rows if r[0] >= now - timedelta(hours=24)]
    ok24 = sum(1 for r in last24 if r[1] == "OK")
    last_ts = rows[-1][0].astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")

    # per-UTC-day counts for the last 7 days
    per_day = Counter()
    per_day_ok = Counter()
    for ts, status, _ in rows:
        d = ts.astimezone(timezone.utc).date().isoformat()
        per_day[d] += 1
        if status == "OK":
            per_day_ok[d] += 1
    days = [(now.date() - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    trend = ",".join(str(per_day.get(d, 0)) for d in days)

    pulse_line = (f"R0 db-read.py adoption - last 24h: {len(last24)} reads "
                  f"({ok24} OK); total {len(rows)}; last {last_ts}; "
                  f"7d/day: {trend}")
    if pulse:
        return pulse_line

    lines = [pulse_line, "", "Per-day (UTC, last 7 days):"]
    for d in days:
        n = per_day.get(d, 0)
        if n:
            lines.append(f"  {d}: {n:3d}  ({per_day_ok.get(d, 0)} OK / "
                         f"{n - per_day_ok.get(d, 0)} not-OK)")
        else:
            lines.append(f"  {d}:   0")
    statuses = Counter(r[1] for r in rows)
    lines.append("")
    lines.append("Status totals: " + ", ".join(f"{k}={v}" for k, v in
                                                statuses.most_common()))
    return "\n".join(lines)


READ_RE = re.compile(r"^\s*(?:--.*\n|/\*.*?\*/\s*)*\s*(SELECT|WITH)\b",
                     re.IGNORECASE | re.DOTALL)
WRITE_RE = re.compile(r"\b(INSERT|UPDATE|DELETE|MERGE|ALTER|CREATE|DROP|GRANT|"
                      r"REVOKE|TRUNCATE|COMMENT|REINDEX|VACUUM)\b", re.IGNORECASE)


def scan_transcripts(max_files: int = 40) -> str:
    """Count execute_sql pure-reads vs db-read.py Bash calls across recent transcripts."""
    base = os.path.expanduser("~/.claude/projects")
    files = []
    for d in glob.glob(os.path.join(base, "*")):
        files.extend(glob.glob(os.path.join(d, "*.jsonl")))
    files.sort(key=lambda p: os.path.getmtime(p), reverse=True)
    files = files[:max_files]

    esql_reads = esql_writes = dbread_calls = 0
    for fp in files:
        try:
            with open(fp, encoding="utf-8") as fh:
                for line in fh:
                    try:
                        o = json.loads(line)
                    except ValueError:
                        continue
                    msg = o.get("message") or {}
                    content = msg.get("content")
                    if not isinstance(content, list):
                        continue
                    for c in content:
                        if not isinstance(c, dict) or c.get("type") != "tool_use":
                            continue
                        name = c.get("name", "")
                        inp = c.get("input", {}) or {}
                        if name.endswith("__execute_sql"):
                            q = inp.get("query", "") or ""
                            if WRITE_RE.search(q):
                                esql_writes += 1
                            elif READ_RE.match(q):
                                esql_reads += 1
                        elif name == "Bash":
                            if "db-read.py" in (inp.get("command", "") or ""):
                                dbread_calls += 1
        except OSError:
            continue

    total_reads = dbread_calls + esql_reads
    ratio = (dbread_calls / total_reads * 100) if total_reads else 0.0
    return (f"Routed ratio (last {len(files)} transcripts): "
            f"db-read.py={dbread_calls}  execute_sql-reads={esql_reads}  "
            f"execute_sql-writes={esql_writes}  ->  "
            f"{ratio:.0f}% of reads routed through the R0 path")


def main() -> int:
    args = sys.argv[1:]
    if "--pulse" in args:
        print(audit_report(pulse=True))
        return 0
    print(audit_report(pulse=False))
    if "--scan" in args:
        print("")
        print(scan_transcripts())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
