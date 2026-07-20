#!/usr/bin/env python
"""
db-read.py (v3) — the ONLY safely-allowlistable read path to the ICE database.

Connects as the USAGE-confined `ice_readonly` role (migration
20260719150000_ice_ro_r0_views_and_confined_role.sql) and runs a SINGLE SELECT,
capped, inside a doubly-forced READ ONLY transaction, with an audit log.

Uses the pure-Python `pg8000` driver (no external psql binary). v2 shelled out to
psql; v3 removes that dependency so the tool is portable and fast per call. The
statement gate, row cap, read-only enforcement and audit behaviour are unchanged.

Primary guarantee is the DB itself, not this script:
  * `ice_readonly` has USAGE on schema `ice_ro` ONLY (no m/c) -> it can read only the
    10 curated R0 views and cannot reach ANY writer function even with the raw
    credential in a read-write transaction. This script is defence-in-depth.
This wrapper additionally:
  * Reads the DSN from env ICE_READONLY_DSN ONLY - never argv, never printed.
  * Rejects anything that is not a single SELECT/WITH...SELECT (statement gate).
  * Forces read-only twice: session default + explicit READ ONLY transaction; ROLLBACK.
  * Caps output rows (ICE_READONLY_ROW_CAP, default 5000) by wrapping the query.
  * Appends an audit line per invocation (ICE_READONLY_AUDIT_LOG).
  * Fail-closed: any ambiguity / missing env / driver error => non-zero exit.

Usage:  python scripts/db-read.py "SELECT status, count(*) FROM ice_ro.slot_status GROUP BY 1"
        echo "SELECT ..." | python scripts/db-read.py -
Credential (never argv, never printed) is loaded from the FIRST of:
        ICE_READONLY_DSN           (env, if set)
        ICE_READONLY_DSN_FILE      (env path to a file whose only content is the DSN)
        ~/.ice_readonly_dsn        (default file)
        ~/ice_readonly_dsn.txt     (default file)
Env:    ICE_READONLY_ROW_CAP       (optional int, default 5000)
        ICE_READONLY_AUDIT_LOG     (optional path, default ~/.ice_readonly_audit.log)
        ICE_READONLY_SSL_CA        (optional path to a CA cert to pin for strict verify;
                                    if unset, the first present of ~/.ice_readonly_pooler_ca.pem
                                    or scripts/supabase-pooler-ca.pem (repo, Supabase Root 2021 CA)
                                    is used → zero-warning strict verify with no env setup)
        ICE_READONLY_SSL_INSECURE  (optional "1" => encrypt without CA/hostname verify,
                                    i.e. psql sslmode=require. Default: verify, and
                                    auto-fall-back to require ONLY on a cert-verify error
                                    — the Supabase pooler serves a Supabase-internal CA.)
Requires:  pip install pg8000
"""
import hashlib
import os
import re
import ssl
import sys
from datetime import datetime, timezone

MAX_SQL_CHARS = 100_000
CONNECT_TIMEOUT_SECONDS = 20
DEFAULT_ROW_CAP = 5000

FORBIDDEN = [
    "insert", "update", "delete", "truncate", "merge", "upsert",
    "drop", "alter", "create", "grant", "revoke", "comment", "reindex",
    "call", "do", "copy", "set", "reset", "begin", "start", "commit",
    "rollback", "savepoint", "release", "vacuum", "analyze", "cluster",
    "lock", "listen", "notify", "unlisten", "prepare", "execute", "deallocate",
    "declare", "fetch", "move", "close", "refresh", "import", "load",
    "security", "into",
]


def strip_sql_comments(sql: str) -> str:
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.S)
    sql = re.sub(r"--[^\n]*", " ", sql)
    return sql


def reject(msg: str) -> None:
    audit("REJECTED", note=msg)
    sys.stderr.write(f"db-read: REJECTED - {msg}\n")
    sys.exit(2)


def audit(status: str, sql: str = "", note: str = "") -> None:
    """Best-effort append-only audit line. Never contains the DSN."""
    path = os.environ.get("ICE_READONLY_AUDIT_LOG") or os.path.join(
        os.path.expanduser("~"), ".ice_readonly_audit.log")
    try:
        ts = datetime.now(timezone.utc).isoformat()
        sig = hashlib.sha256(sql.encode("utf-8")).hexdigest()[:16] if sql else "-"
        oneline = " ".join(sql.split())[:400]
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(f"{ts}\t{status}\tsha={sig}\t{note}\t{oneline}\n")
    except OSError as e:
        sys.stderr.write(f"db-read: WARN audit log write failed: {e}\n")


def normalise_single(sql_raw: str) -> str:
    """Validate + return the single-statement body (trailing ';' stripped)."""
    if not sql_raw or not sql_raw.strip():
        reject("empty query")
    if len(sql_raw) > MAX_SQL_CHARS:
        reject(f"query exceeds {MAX_SQL_CHARS} chars")
    analysis = strip_sql_comments(sql_raw).strip()
    if not analysis:
        reject("query is only comments")
    body = analysis.rstrip()
    if body.endswith(";"):
        body = body[:-1].rstrip()
    if ";" in body:
        reject("multiple statements are not allowed (single SELECT only)")
    if not re.match(r"(?is)^\s*(select|with)\b", body):
        reject("only SELECT or WITH...SELECT queries are permitted")
    lowered = body.lower()
    for kw in FORBIDDEN:
        if re.search(r"\b" + re.escape(kw) + r"\b", lowered):
            reject(f"forbidden keyword '{kw}' present - use the gated execute_sql for writes")
    return body


def load_dsn() -> str:
    """Load the DSN from env or a credential file. Never printed; never from argv."""
    dsn = os.environ.get("ICE_READONLY_DSN")
    if dsn and dsn.strip():
        return dsn.strip()
    candidates = [
        os.environ.get("ICE_READONLY_DSN_FILE"),
        os.path.expanduser("~/.ice_readonly_dsn"),
        os.path.expanduser("~/ice_readonly_dsn.txt"),
    ]
    for p in candidates:
        if p and os.path.isfile(p):
            try:
                content = open(p, encoding="utf-8-sig").read().strip()
            except OSError as e:
                reject(f"credential file unreadable: {e}")
            if content:
                return content
    reject("no credential: set ICE_READONLY_DSN / ICE_READONLY_DSN_FILE, or create ~/.ice_readonly_dsn")


def connect(pg, conn_kwargs: dict):
    """Connect verifying TLS; fall back to encrypt-without-verify ONLY on a cert-verify
    error (Supabase pooler serves a Supabase-internal CA). ICE_READONLY_SSL_INSECURE=1
    forces require-mode from the start; ICE_READONLY_SSL_CA pins a CA for strict verify."""
    timeout = CONNECT_TIMEOUT_SECONDS
    if os.environ.get("ICE_READONLY_SSL_INSECURE") != "1":
        ca = os.environ.get("ICE_READONLY_SSL_CA")
        if not ca:
            for cand in (
                os.path.expanduser("~/.ice_readonly_pooler_ca.pem"),
                os.path.join(os.path.dirname(os.path.abspath(__file__)),
                             "supabase-pooler-ca.pem"),
            ):
                if os.path.isfile(cand):
                    ca = cand
                    break
        ctx = ssl.create_default_context(cafile=ca) if ca else ssl.create_default_context()
        try:
            return pg.connect(ssl_context=ctx, timeout=timeout, **conn_kwargs)
        except Exception as e:  # noqa: BLE001
            if "CERTIFICATE_VERIFY" not in str(e).upper():
                raise
            sys.stderr.write("db-read: WARN TLS cert not verifiable (Supabase pooler CA); "
                             "retrying encrypted-without-verify (sslmode=require). "
                             "Set ICE_READONLY_SSL_CA to pin the CA for strict verify.\n")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pg.connect(ssl_context=ctx, timeout=timeout, **conn_kwargs)


def parse_dsn(dsn: str) -> dict:
    """Parse a postgresql://user:password@host:port/db DSN into pg8000 kwargs.

    Parsed manually (not urllib) so the password is taken LITERALLY and may contain
    any character — [, ], :, @, / etc. — with NO percent-encoding required. (urllib's
    urlsplit raises on '[' in the userinfo, mistaking it for an IPv6 host.) The user
    field is split on the FIRST ':' and userinfo from host on the LAST '@', so ':' and
    '@' inside the password are unambiguous.
    """
    if "://" not in dsn:
        reject("ICE_READONLY_DSN must be a postgresql://... DSN")
    scheme, rest = dsn.split("://", 1)
    if scheme not in ("postgresql", "postgres"):
        reject("ICE_READONLY_DSN must start with postgresql://")
    if "@" not in rest:
        reject("ICE_READONLY_DSN missing '@' (user:password@host)")
    userinfo, hostpart = rest.rsplit("@", 1)
    user, sep, password = userinfo.partition(":")
    if not user:
        reject("ICE_READONLY_DSN missing user")
    hostport, _, database = hostpart.partition("/")
    host, _, port_s = hostport.partition(":")
    if not host:
        reject("ICE_READONLY_DSN missing host")
    try:
        port = int(port_s) if port_s else 5432
    except ValueError:
        reject("ICE_READONLY_DSN port is not an integer")
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password if sep else None,
        "database": database or "postgres",
    }


def main() -> int:
    args = sys.argv[1:]
    if not args:
        sys.stderr.write(__doc__ or "")
        return 2
    sql_raw = sys.stdin.read() if args[0] == "-" else args[0]

    body = normalise_single(sql_raw)

    dsn = load_dsn()

    try:
        row_cap = int(os.environ.get("ICE_READONLY_ROW_CAP", DEFAULT_ROW_CAP))
        if row_cap <= 0:
            raise ValueError
    except ValueError:
        reject("ICE_READONLY_ROW_CAP must be a positive integer")

    try:
        import pg8000.dbapi as pg
    except ImportError:
        reject("pg8000 not installed - run: pip install pg8000")

    conn_kwargs = parse_dsn(dsn)

    # Row cap by wrapping the validated single statement (valid for SELECT and WITH...SELECT).
    capped = f"SELECT * FROM (\n{body}\n) AS _ice_cap LIMIT {row_cap}"

    conn = None
    try:
        conn = connect(pg, conn_kwargs)
        conn.autocommit = False
        cur = conn.cursor()
        # Belt-and-suspenders read-only: session default + explicit txn read-only.
        cur.execute("SET default_transaction_read_only = on")
        cur.execute("SET TRANSACTION READ ONLY")
        cur.execute(capped)
        cols = [d[0] for d in cur.description] if cur.description else []
        rows = cur.fetchall()
        conn.rollback()  # never commit; the txn only read
    except Exception as e:  # noqa: BLE001 - fail-closed on any driver/query error
        # Scrub any occurrence of the raw DSN or password from the surfaced error.
        msg = str(e).replace(dsn, "<ICE_READONLY_DSN>")
        if conn_kwargs.get("password"):
            msg = msg.replace(conn_kwargs["password"], "<pw>")
        sys.stderr.write(f"db-read: query failed: {msg}\n")
        audit("ERR", sql=body, note="query_failed")
        return 1
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:  # noqa: BLE001
                pass

    # Tab-separated output: header, rows, trailing count. Greppable, machine-friendly.
    def fmt(v):
        return "" if v is None else str(v)
    if cols:
        sys.stdout.write("\t".join(cols) + "\n")
    for r in rows:
        sys.stdout.write("\t".join(fmt(v) for v in r) + "\n")
    sys.stdout.write(f"({len(rows)} row{'s' if len(rows) != 1 else ''})\n")
    audit("OK", sql=body)
    return 0


if __name__ == "__main__":
    sys.exit(main())
