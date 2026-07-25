# R3a — shadow-boundary evidence (harness check-2)

**Purpose:** positively evidence the single load-bearing R3a property — `recommended_format` and
`recommended_reason` keep their EXACT current values AND writers (the shadow-not-flip boundary) — so a
reviewer verifies it from artifacts, not narration.

## 1 · The `recommended_format` / `recommended_reason` assignments are byte-unchanged

Extracted from CE base `64523be` vs the R3a worktree (`r3a-resolver-shadow`, ai-worker v2.21.0):

| Path | Base `64523be` | Worktree v2.21.0 | Identical? |
|---|---|---|---|
| evergreen | `recommended_format: job.input_payload?.format ?? 'text',` (:872) | same text (:925) | ✅ byte-identical |
| main success | `recommended_format: decidedFormat,` (:1138) | same text (:1207) | ✅ byte-identical |
| main success | `recommended_reason: advisorReason,` (:1139) | same text (:1208) | ✅ byte-identical |

Mechanical proof (line numbers shift only because shadow lines were added above; the assignment strings
are identical):

```
$ diff <(git show 64523be:…/ai-worker/index.ts | grep -oE "recommended_(format|reason): [^,]*") \
       <(grep -hoE "recommended_(format|reason): [^,]*" <worktree>/…/ai-worker/index.ts)
→ (no output) IDENTICAL — recommended_format/reason assignments byte-unchanged
```

## 2 · They appear IN-HUNK in the frozen v2 diff, as UNCHANGED context

The v2 diff (`r3a-ai-worker-shadow-v2.diff`) is regenerated with `-U15`, so on BOTH `post_draft`
UPDATE bodies the `recommended_format`/`recommended_reason` lines render as **context lines (leading
space, not `+`/`-`)** immediately adjacent to the `+`-added shadow keys. A reviewer sees the new
`advisor_format`/`shadow_resolved_format`/… keys added *around* an untouched `recommended_format`,
which is exactly the shadow (not flip) boundary. The resolver's `effective_format` is written to
`shadow_resolved_format`, never to `recommended_format`.

## 3 · The resolver never writes recommended_format

Artifact 1 (`m.resolve_final_format`) RETURNS a jsonb decision; it performs no UPDATE at all. The only
writer of `recommended_format` remains ai-worker, and its value is unchanged (§1). The R3c flip — where
`recommended_format := resolver.effective_format` — is a SEPARATE future gate and is **not** in either
R3a artifact.
