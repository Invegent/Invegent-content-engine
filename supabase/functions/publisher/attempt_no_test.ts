// Unit tests for nextAttemptNoFrom (cc-0089 / task_05bf8b3d attempt_no audit-gap fix).
// Mirrors supabase/functions/linkedin-zapier-publisher/media_action_test.ts:110-136.
// Run: deno test supabase/functions/publisher/attempt_no_test.ts
import { assertEquals } from "jsr:@std/assert@1";
import { nextAttemptNoFrom } from "./attempt_no.ts";

Deno.test("nextAttemptNoFrom: no prior rows -> 1", () => {
  assertEquals(nextAttemptNoFrom([]), 1);
});

Deno.test("nextAttemptNoFrom: prior top attempt_no=1 -> 2", () => {
  assertEquals(nextAttemptNoFrom([{ attempt_no: 1 }]), 2);
});

Deno.test("nextAttemptNoFrom: prior top attempt_no=3 -> 4", () => {
  assertEquals(nextAttemptNoFrom([{ attempt_no: 3 }]), 4);
});

Deno.test("nextAttemptNoFrom: null -> 1", () => {
  assertEquals(nextAttemptNoFrom(null), 1);
});

Deno.test("nextAttemptNoFrom: undefined -> 1", () => {
  assertEquals(nextAttemptNoFrom(undefined), 1);
});

Deno.test('nextAttemptNoFrom: numeric-string attempt_no="2" -> 3 (PostgREST may return strings)', () => {
  assertEquals(nextAttemptNoFrom([{ attempt_no: "2" }]), 3);
});

Deno.test("nextAttemptNoFrom: row with null attempt_no -> 1 (fail-safe to first)", () => {
  assertEquals(nextAttemptNoFrom([{ attempt_no: null }]), 1);
});
