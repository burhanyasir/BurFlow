export type GuardrailCategory = 'hate_speech' | 'toxicity' | 'sexual' | 'violence' | 'policy_violation';

export interface GuardrailResult {
  passed: boolean;
  categories: GuardrailCategory[];
  fallbackUsed: boolean;
}

export interface GuardrailVerdict {
  passed: boolean;
  categories: GuardrailCategory[];
  fallbackUsed: boolean;
}

export interface ClassifierProvider {
  readonly name: string;
  classify(message: string, signal: AbortSignal): Promise<{ flagged: boolean; categories: GuardrailCategory[] }>;
}
