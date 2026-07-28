export type OutputGuardrailCategory = 'toxicity' | 'hate' | 'sexual' | 'violence' | 'policy_violation';

export interface OutputGuardrailResult {
  passed: boolean;
  categories: OutputGuardrailCategory[];
  fallbackUsed: boolean;
}

export interface OutputClassifierProvider {
  readonly name: string;
  classify(response: string, threshold: string, signal: AbortSignal): Promise<{ flagged: boolean; categories: OutputGuardrailCategory[] }>;
}
