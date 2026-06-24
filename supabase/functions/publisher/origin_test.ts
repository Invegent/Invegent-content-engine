// Hermetic unit tests for the Publishing-Origin pure decision logic (v1.11.0).
// Run: deno test supabase/functions/publisher/origin_test.ts
//
// These cover the pure parts of the studio cadence bypass. The DB-bound gates
// (approval, token, asset-guard, backstop) live in index.ts and are unchanged by
// origin — studio rows still pass through every one of them; that is asserted by
// code review (origin only gates the throttle block + the get_next_publish_slot
// reassignment, never the hard gates).
import { assertEquals } from "jsr:@std/assert@1";
import { decideStudioMinGap, isStudioOrigin, STUDIO_MIN_GAP_MINUTES } from "./origin.ts";

const NOW = Date.UTC(2026, 5, 23, 12, 0, 0);
const MIN = 60_000;

Deno.test("isStudioOrigin: only 'studio' is studio; feed/series/null/undefined are not", () => {
  assertEquals(isStudioOrigin("studio"), true);
  assertEquals(isStudioOrigin("feed"), false);
  assertEquals(isStudioOrigin("series"), false);
  assertEquals(isStudioOrigin(null), false);
  assertEquals(isStudioOrigin(undefined), false);
  assertEquals(isStudioOrigin(""), false);
});

Deno.test("STUDIO_MIN_GAP_MINUTES is the agreed 10-minute floor", () => {
  assertEquals(STUDIO_MIN_GAP_MINUTES, 10);
});

Deno.test("studio: no prior publish → never defers (publishes ASAP)", () => {
  assertEquals(decideStudioMinGap(null, NOW), { defer: false });
});

Deno.test("studio: last publish 11m ago (> floor) → no defer", () => {
  assertEquals(decideStudioMinGap(NOW - 11 * MIN, NOW), { defer: false });
});

Deno.test("studio: last publish exactly 10m ago (== floor) → no defer", () => {
  // boundary: NOW - lastAt === gap → NOT < gap → publish
  assertEquals(decideStudioMinGap(NOW - 10 * MIN, NOW), { defer: false });
});

Deno.test("studio: too-soon post (4m ago) → defer to lastAt + 10m with stable reason", () => {
  const lastAt = NOW - 4 * MIN;
  assertEquals(decideStudioMinGap(lastAt, NOW), {
    defer: true,
    scheduledForMs: lastAt + 10 * MIN,
    reason: "studio_min_gap_floor:10m",
  });
});

Deno.test("studio: defer target is independent of max_per_day (floor only, not daily cap)", () => {
  // A client at/over its feed max_per_day must still publish studio rows: the
  // studio path never consults max_per_day, only the 10m floor. Here a recent
  // publish defers by the floor; an old-enough one publishes regardless of count.
  assertEquals(decideStudioMinGap(NOW - 30 * MIN, NOW).defer, false);
  assertEquals(decideStudioMinGap(NOW - 1 * MIN, NOW).defer, true);
});

Deno.test("studio: custom gap arg honoured (defensive)", () => {
  const lastAt = NOW - 3 * MIN;
  assertEquals(decideStudioMinGap(lastAt, NOW, 5), {
    defer: true, scheduledForMs: lastAt + 5 * MIN, reason: "studio_min_gap_floor:5m",
  });
  assertEquals(decideStudioMinGap(lastAt, NOW, 2).defer, false);
});
