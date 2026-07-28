export type GroundingFailureType = 'entity_mismatch' | 'pii_leakage' | 'action_reference_mismatch' | 'config_hallucination';

export interface GroundingResult {
  passed: boolean;
  failures: GroundingFailureType[];
  fallbackUsed: boolean;
}
