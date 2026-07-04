// contract_validation.ts — ACI Foundation v0 / Slice C (image-worker).
//
// Pure, side-effect-free, WARN-ONLY validation for the governed Property Pulse image_quote
// render path. NEVER throws. Returns an additive render_spec.contract_validation block that
// records whether the B1 contract identity, headline, subtitle, and governed assets look right.
// This is EVIDENCE/observability only — it does NOT gate the render, alter image_status, or
// change queue/publish behaviour. Validation/limits come from the B1 fallback constants in v0
// (the contract carries no field limits yet). nowIso is injected for purity (no Date inside).

export const EXPECTED_VARIANT_KEY = 'property_pulse.image_quote.news_card.v1';
export const EXPECTED_CONTRACT_REF = 'property_pulse.image_quote.news_card';
// v2 (2026-07-04, B1-v3): contract CONTENT revision — background pool 3→5, resolver-rank
// alignment (PK "Option A-now-D-later"). Identity keys above are UNCHANGED. In-flight drafts
// stamped 'v1' before the ai-worker v2.17.0 deploy will transiently warn here (warn-only,
// evidence-only — correct: they carry the old-contract stamp).
export const EXPECTED_CONTRACT_VERSION = 'v2';

export interface ContractValidationCheck {
  name: 'contract_identity' | 'headline' | 'subtitle' | 'assets';
  ok: boolean;
  detail: string;
}

export interface ContractValidation {
  status: 'pass' | 'warn';
  contract_present: boolean;
  limit_source: 'contract' | 'fallback_constant';
  checks: ContractValidationCheck[];
  warnings: string[];
  evaluated_at: string;
}

export interface ValidateContractInput {
  draftFormat: unknown;            // draft.draft_format (jsonb) — may be null/garbage
  headline: string | null | undefined;
  subtitle: string;                // derived governed subtitle ('' allowed)
  logoUrl: string | null | undefined;
  backgroundUrl: string | null | undefined;
  headlineLimit: number;
  subtitleLimit: number;
}

// WARN-ONLY: never throws. Any structural surprise becomes a warning, not an exception.
export function validateContract(input: ValidateContractInput, nowIso: () => string): ContractValidation {
  const warnings: string[] = [];
  const checks: ContractValidationCheck[] = [];

  const contract = (input.draftFormat as any)?.contract;
  const contractPresent = contract !== null && typeof contract === 'object';

  // v0 contracts carry no field limits → limits come from the B1 fallback constants.
  const limit_source: 'contract' | 'fallback_constant' =
    contractPresent && (contract as any).limits !== null && typeof (contract as any).limits === 'object'
      ? 'contract'
      : 'fallback_constant';

  // 1. contract_identity
  {
    const variant_key = contractPresent ? (contract as any).variant_key : undefined;
    const contract_ref = contractPresent ? (contract as any).contract_ref : undefined;
    const contract_version = contractPresent ? (contract as any).contract_version : undefined;
    const ok = contractPresent
      && variant_key === EXPECTED_VARIANT_KEY
      && contract_ref === EXPECTED_CONTRACT_REF
      && contract_version === EXPECTED_CONTRACT_VERSION;
    const detail = !contractPresent
      ? 'contract absent or not an object'
      : ok
        ? 'contract identity matches'
        : `contract identity mismatch (variant_key=${String(variant_key)}, contract_ref=${String(contract_ref)}, contract_version=${String(contract_version)})`;
    checks.push({ name: 'contract_identity', ok, detail });
    if (!ok) warnings.push(`contract_identity: ${detail}`);
  }

  // 2. headline — present + within the governed limit already used by the path
  {
    const trimmed = (input.headline ?? '').trim();
    const present = trimmed.length > 0;
    const within = trimmed.length <= input.headlineLimit;
    const ok = present && within;
    const detail = !present
      ? 'headline missing'
      : !within
        ? `headline length ${trimmed.length} exceeds limit ${input.headlineLimit}`
        : `headline ok (${trimmed.length}/${input.headlineLimit})`;
    checks.push({ name: 'headline', ok, detail });
    if (!ok) warnings.push(`headline: ${detail}`);
  }

  // 3. subtitle — within limit; EMPTY subtitle is allowed (the path permits it) → ok
  {
    const len = (input.subtitle ?? '').length;
    const within = len <= input.subtitleLimit;
    const ok = within;
    const detail = len === 0
      ? 'subtitle empty (allowed)'
      : within
        ? `subtitle ok (${len}/${input.subtitleLimit})`
        : `subtitle length ${len} exceeds limit ${input.subtitleLimit}`;
    checks.push({ name: 'subtitle', ok, detail });
    if (!ok) warnings.push(`subtitle: ${detail}`);
  }

  // 4. assets — required governed assets resolved (logo + background URL present).
  // Reflects availability ALREADY known at this point in the render path. NO new network check
  // (H2's assertGovernedAssetReachable already runs separately in the worker).
  {
    const logoOk = typeof input.logoUrl === 'string' && input.logoUrl.length > 0;
    const bgOk = typeof input.backgroundUrl === 'string' && input.backgroundUrl.length > 0;
    const ok = logoOk && bgOk;
    const detail = ok ? 'logo + background resolved' : `unresolved governed assets (logo=${logoOk}, background=${bgOk})`;
    checks.push({ name: 'assets', ok, detail });
    if (!ok) warnings.push(`assets: ${detail}`);
  }

  return {
    status: warnings.length > 0 ? 'warn' : 'pass',
    contract_present: contractPresent,
    limit_source,
    checks,
    warnings,
    evaluated_at: nowIso(),
  };
}
