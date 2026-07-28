export type SafetyCategory =
  | 'self_harm'
  | 'suicide'
  | 'mental_health_crisis'
  | 'medical_emergency'
  | 'violence_emergency'
  | 'emergency_override';

export interface TripWirePattern {
  category: SafetyCategory;
  patterns: string[];
}

export interface PatternSet {
  version: number;
  patterns: TripWirePattern[];
}

export interface TripWireResult {
  matched: boolean;
  category?: SafetyCategory;
  matchedPattern?: string;
  version: number;
}

export const CRISIS_RESPONSE = "If this is a life-threatening emergency, please call 911 or your local emergency number immediately. If you're thinking about harming yourself, please call or text 988 (Suicide & Crisis Lifeline).";
