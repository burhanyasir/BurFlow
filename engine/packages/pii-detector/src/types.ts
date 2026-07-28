export type PiiCategory = 'email' | 'phone' | 'national_id' | 'passport' | 'credit_card' | 'bank_account' | 'ip_address' | 'api_key';

export type PiiRedactionMode = 'allow' | 'notify' | 'mask' | 'block';

export interface PiiDetectionResult {
  found: boolean;
  categories: PiiCategory[];
  redactedMessage: string;
  redactedFields: PiiCategory[];
  redactionMode: PiiRedactionMode;
  blocked: boolean;
}

export interface PiiPattern {
  category: PiiCategory;
  regex: RegExp;
  placeholder: string;
}
