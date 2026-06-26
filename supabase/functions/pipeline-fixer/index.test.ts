// pipeline-fixer index.test.ts
// H3.2 — render retry cap in fixFailedImages.
// Tests the REAL fixFailedImages against a minimal in-memory fake of the supabase-js
// chained query builder. The fake faithfully applies .eq/.lt/.is/.in filters over seeded
// in-memory arrays and records .update(...).in(...) mutations so final row state is assertable.

import { assertEquals } from "jsr:@std/assert@1";
import {
  CAPPED_FORMATS,
  DEAD_REASON_RENDER_EXHAUSTED,
  fixFailedImages,
  RENDER_ATTEMPT_CAP,
} from "./index.ts";

// ─── In-memory fake supabase-js client ───────────────────────────────────────
// Supports: .schema(s).from(t).select(cols) then chained .eq/.lt/.is/.in resolving
// (thenable) to { data } after applying ALL filters; and .update(obj).in(col, arr)
// mutating the seeded array and resolving to { data: null, error: null }.

type Row = Record<string, any>;
type Tables = Record<string, Row[]>; // key = "schema.table"

class QueryBuilder {
  private rows: Row[];
  private filters: Array<(r: Row) => boolean> = [];
  private mode: "select" | "update" = "select";
  private updateObj: Row | null = null;

  constructor(private tableRows: Row[]) {
    this.rows = tableRows;
  }

  select(_cols: string) {
    this.mode = "select";
    return this;
  }

  update(obj: Row) {
    this.mode = "update";
    this.updateObj = obj;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push((r) => r[col] === val);
    return this;
  }

  lt(col: string, val: any) {
    // string/ISO comparison is fine for updated_at timestamps; numeric works too.
    this.filters.push((r) => r[col] < val);
    return this;
  }

  is(col: string, val: any) {
    // mirrors PostgREST .is(col, null) semantics
    this.filters.push((r) => (r[col] ?? null) === val);
    return this;
  }

  in(col: string, arr: any[]) {
    const set = new Set(arr);
    this.filters.push((r) => set.has(r[col]));
    return this;
  }

  private matched(): Row[] {
    return this.tableRows.filter((r) => this.filters.every((f) => f(r)));
  }

  // Thenable: awaiting the builder resolves the query.
  then(
    resolve: (v: { data: Row[] | null; error: null }) => void,
    _reject?: (e: unknown) => void,
  ) {
    if (this.mode === "update") {
      const hits = this.matched();
      for (const r of hits) Object.assign(r, this.updateObj);
      resolve({ data: null, error: null });
    } else {
      resolve({ data: this.matched(), error: null });
    }
  }
}

function makeFakeClient(tables: Tables) {
  return {
    schema(s: string) {
      return {
        from(t: string) {
          const key = `${s}.${t}`;
          const rows = tables[key] ?? (tables[key] = []);
          return new QueryBuilder(rows);
        },
      };
    },
  };
}

// ─── seed helpers ─────────────────────────────────────────────────────────────
const PAST = new Date(Date.now() - 24 * 60 * 60_000).toISOString(); // 1 day ago (qualifies < ago(120))

function draft(over: Partial<Row>): Row {
  return {
    post_draft_id: cryptoId(),
    recommended_format: "image_quote",
    image_status: "failed",
    approval_status: "approved",
    updated_at: PAST,
    dead_reason: null,
    ...over,
  };
}

let _seq = 0;
function cryptoId() {
  return `pd_${(++_seq).toString().padStart(4, "0")}`;
}

function renderRows(postDraftId: string, statuses: string[]): Row[] {
  return statuses.map((status) => ({ post_draft_id: postDraftId, status }));
}

function getDraft(tables: Tables, id: string): Row {
  return (tables["m.post_draft"] ?? []).find((r) => r.post_draft_id === id)!;
}

// ─── Test 1: image_quote, 4 failed renders → reset to pending, dead_reason null ──
Deno.test("1. image_quote with 4 failed renders → reset to pending, dead_reason stays null", async () => {
  const d = draft({ post_draft_id: "T1", recommended_format: "image_quote" });
  const tables: Tables = {
    "m.post_draft": [d],
    "m.post_render_log": renderRows("T1", ["failed", "failed", "failed", "failed"]),
  };
  const sb = makeFakeClient(tables);
  const res = await fixFailedImages(sb as any);

  const row = getDraft(tables, "T1");
  assertEquals(row.image_status, "pending");
  assertEquals(row.dead_reason, null);
  assertEquals(res.count, 1);
  assertEquals(res.ids, ["T1"]);
  assertEquals(res.dead_lettered, undefined);
});

// ─── Test 2: image_quote, 5 failed renders → dead-lettered ──────────────────────
Deno.test("2. image_quote with 5 failed renders → stays failed, dead_reason set, approval unchanged", async () => {
  const d = draft({ post_draft_id: "T2", recommended_format: "image_quote" });
  const tables: Tables = {
    "m.post_draft": [d],
    "m.post_render_log": renderRows("T2", ["failed", "failed", "failed", "failed", "failed"]),
  };
  const sb = makeFakeClient(tables);
  const res = await fixFailedImages(sb as any);

  const row = getDraft(tables, "T2");
  assertEquals(row.image_status, "failed");
  assertEquals(row.dead_reason, DEAD_REASON_RENDER_EXHAUSTED);
  assertEquals(row.approval_status, "approved");
  assertEquals(res.count, 0);
  assertEquals(res.dead_lettered, 1);
  assertEquals(res.dead_ids, ["T2"]);
});

// ─── Test 3: animated_text_reveal, 4 fails → reset to pending ───────────────────
Deno.test("3. animated_text_reveal with 4 failed renders → reset to pending", async () => {
  const d = draft({ post_draft_id: "T3", recommended_format: "animated_text_reveal" });
  const tables: Tables = {
    "m.post_draft": [d],
    "m.post_render_log": renderRows("T3", ["failed", "failed", "failed", "failed"]),
  };
  const sb = makeFakeClient(tables);
  const res = await fixFailedImages(sb as any);

  const row = getDraft(tables, "T3");
  assertEquals(row.image_status, "pending");
  assertEquals(row.dead_reason, null);
  assertEquals(res.ids, ["T3"]);
});

// ─── Test 4: animated_data, 4 fails → reset to pending ──────────────────────────
Deno.test("4. animated_data with 4 failed renders → reset to pending", async () => {
  const d = draft({ post_draft_id: "T4", recommended_format: "animated_data" });
  const tables: Tables = {
    "m.post_draft": [d],
    "m.post_render_log": renderRows("T4", ["failed", "failed", "failed", "failed"]),
  };
  const sb = makeFakeClient(tables);
  const res = await fixFailedImages(sb as any);

  const row = getDraft(tables, "T4");
  assertEquals(row.image_status, "pending");
  assertEquals(row.dead_reason, null);
  assertEquals(res.ids, ["T4"]);
});

// ─── Test 5: carousel with ≥5 fails → uncapped, reset to pending ────────────────
Deno.test("5. carousel with 6 failed renders → IGNORED by cap, reset to pending, dead_reason null", async () => {
  const d = draft({ post_draft_id: "T5", recommended_format: "carousel" });
  const tables: Tables = {
    "m.post_draft": [d],
    "m.post_render_log": renderRows("T5", ["failed", "failed", "failed", "failed", "failed", "failed"]),
  };
  const sb = makeFakeClient(tables);
  const res = await fixFailedImages(sb as any);

  const row = getDraft(tables, "T5");
  assertEquals(row.image_status, "pending");
  assertEquals(row.dead_reason, null);
  assertEquals(res.ids, ["T5"]);
  assertEquals(res.dead_lettered, undefined);
});

// ─── Test 6: generated + published drafts never selected ────────────────────────
Deno.test("6. generated (approved) and published drafts → never selected/updated", async () => {
  const gen = draft({ post_draft_id: "T6a", image_status: "generated" });
  const pub = draft({ post_draft_id: "T6b", image_status: "failed", approval_status: "published" });
  const tables: Tables = {
    "m.post_draft": [gen, pub],
    "m.post_render_log": [
      ...renderRows("T6a", ["failed", "failed", "failed", "failed", "failed"]),
      ...renderRows("T6b", ["failed", "failed", "failed", "failed", "failed"]),
    ],
  };
  const sb = makeFakeClient(tables);
  const res = await fixFailedImages(sb as any);

  const genRow = getDraft(tables, "T6a");
  const pubRow = getDraft(tables, "T6b");
  assertEquals(genRow.image_status, "generated");
  assertEquals(genRow.dead_reason, null);
  assertEquals(pubRow.image_status, "failed");
  assertEquals(pubRow.dead_reason, null);
  assertEquals(pubRow.approval_status, "published");
  assertEquals(res.count, 0);
  assertEquals(res.ids, []);
});

// ─── Test 7: out-of-list formats untouched ──────────────────────────────────────
Deno.test("7. video_short and text formats (failed/approved) → not in format list → untouched", async () => {
  const vid = draft({ post_draft_id: "T7a", recommended_format: "video_short" });
  const txt = draft({ post_draft_id: "T7b", recommended_format: "text" });
  const tables: Tables = {
    "m.post_draft": [vid, txt],
    "m.post_render_log": [
      ...renderRows("T7a", ["failed", "failed", "failed", "failed", "failed"]),
      ...renderRows("T7b", ["failed", "failed", "failed", "failed", "failed"]),
    ],
  };
  const sb = makeFakeClient(tables);
  const res = await fixFailedImages(sb as any);

  assertEquals(getDraft(tables, "T7a").image_status, "failed");
  assertEquals(getDraft(tables, "T7a").dead_reason, null);
  assertEquals(getDraft(tables, "T7b").image_status, "failed");
  assertEquals(getDraft(tables, "T7b").dead_reason, null);
  assertEquals(res.count, 0);
});

// ─── Test 8: existing dead_reason → excluded, untouched ─────────────────────────
Deno.test("8. image_quote with existing dead_reason set → excluded (dead_reason IS NULL), unchanged", async () => {
  const d = draft({
    post_draft_id: "T8",
    recommended_format: "image_quote",
    dead_reason: "some_prior_reason",
  });
  const tables: Tables = {
    "m.post_draft": [d],
    "m.post_render_log": renderRows("T8", ["failed", "failed", "failed", "failed", "failed"]),
  };
  const sb = makeFakeClient(tables);
  const res = await fixFailedImages(sb as any);

  const row = getDraft(tables, "T8");
  assertEquals(row.image_status, "failed");
  assertEquals(row.dead_reason, "some_prior_reason");
  assertEquals(res.count, 0);
  assertEquals(res.dead_lettered, undefined);
});

// ─── Test 9: approval_status never changed on any path ──────────────────────────
Deno.test("9. approval_status is never mutated on reset or dead-letter paths", async () => {
  const reset = draft({ post_draft_id: "T9a", recommended_format: "image_quote" }); // 4 fails → reset
  const dead = draft({ post_draft_id: "T9b", recommended_format: "image_quote" }); // 5 fails → dead-letter
  const tables: Tables = {
    "m.post_draft": [reset, dead],
    "m.post_render_log": [
      ...renderRows("T9a", ["failed", "failed", "failed", "failed"]),
      ...renderRows("T9b", ["failed", "failed", "failed", "failed", "failed"]),
    ],
  };
  const sb = makeFakeClient(tables);
  await fixFailedImages(sb as any);

  assertEquals(getDraft(tables, "T9a").approval_status, "approved");
  assertEquals(getDraft(tables, "T9a").image_status, "pending");
  assertEquals(getDraft(tables, "T9b").approval_status, "approved");
  assertEquals(getDraft(tables, "T9b").dead_reason, DEAD_REASON_RENDER_EXHAUSTED);
});

// ─── Test 10: only failed/timeout count toward the cap ──────────────────────────
Deno.test("10. only status IN ('failed','timeout') count → 4 failed + 1 timeout = 5 → dead-lettered (succeeded ignored)", async () => {
  const d = draft({ post_draft_id: "T10", recommended_format: "image_quote" });
  const tables: Tables = {
    "m.post_draft": [d],
    "m.post_render_log": renderRows("T10", [
      "failed",
      "failed",
      "failed",
      "failed",
      "timeout",
      "succeeded",
      "succeeded",
      "succeeded",
    ]),
  };
  const sb = makeFakeClient(tables);
  const res = await fixFailedImages(sb as any);

  const row = getDraft(tables, "T10");
  assertEquals(row.dead_reason, DEAD_REASON_RENDER_EXHAUSTED);
  assertEquals(row.image_status, "failed");
  assertEquals(res.dead_lettered, 1);
  assertEquals(res.dead_ids, ["T10"]);
  // sanity: cap and capped-format wiring exported correctly
  assertEquals(RENDER_ATTEMPT_CAP, 5);
  assertEquals(CAPPED_FORMATS.includes("image_quote"), true);
});
