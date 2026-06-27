// contract_stamp.ts — ACI Foundation v0 / Slice B1 (ai-worker).
//
// Pure helper that projects a resolved CreativeContract into the additive metadata stamp
// written under m.post_draft.draft_format.contract. PURE: nowIso is injected, no I/O, no
// network/DB/storage. Exported for hermetic test. The CreativeContract type comes from the
// vendored ai-worker projection (./creative_contract.ts) — NOT a cross-function import.

import type { CreativeContract } from './creative_contract.ts';

export interface ContractStamp {
  variant_key: string;
  contract_ref: string;
  contract_version: string;
  selector_reason: string;
  registry_version: string;
  source_commit: string;
  resolved_at: string;
}

/**
 * Build the additive contract stamp from a resolved contract.
 * Pure: `nowIso` is injected (no Date.now / no I/O inside).
 */
export function buildContractStamp(
  contract: CreativeContract,
  nowIso: () => string,
): ContractStamp {
  return {
    variant_key: contract.contract_key,
    contract_ref: contract.contract_ref,
    contract_version: contract.contract_version,
    selector_reason: contract.selector_reason_default,
    registry_version: contract.source.registry_version,
    source_commit: contract.source.source_commit,
    resolved_at: nowIso(),
  };
}
