import { OutputGuardrailEngine } from '@conversation-engine/output-guardrail';
import { GroundingVerifier } from '@conversation-engine/grounding-verifier';
import { PiiDetector } from '@conversation-engine/pii-detector';

export interface Stage6aDeps {
  outputGuardrail?: OutputGuardrailEngine;
  groundingVerifier?: GroundingVerifier;
  piiDetector?: PiiDetector;
}
