import { z } from 'zod';

export const Step1BusinessSchema = z.object({
  companyName: z.string().min(1).max(256),
  website: z.string().url().or(z.literal('')), // allow empty string to represent no website
  industry: z.string().min(1).max(128),
  country: z.string().min(2).max(64),
  language: z.string().min(2).max(8),
  timezone: z.string().min(1).max(64),
});

export const Step2BusinessTypeSchema = z.object({
  type: z.string().min(1).max(64),
});

export const ProductSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(2000).optional(),
  category: z.string().max(128).optional(),
  price: z.number().nonnegative().optional(),
  url: z.string().url().optional(),
  images: z.array(z.string().url()).optional(),
  availability: z.enum(['in_stock','out_of_stock','preorder']).optional(),
  customFields: z.record(z.any()).optional(),
});

export const Step3ProductsSchema = z.object({ products: z.array(ProductSchema).min(0) });

export const KnowledgeDocSchema = z.object({ filename: z.string().min(1), type: z.enum(['pdf','docx','txt','csv','url','faq','manual']), sourceUrl: z.string().url().optional() });
export const Step4KnowledgeSchema = z.object({ docs: z.array(KnowledgeDocSchema).optional(), source: z.string().optional() });

export const WidgetSchema = z.object({
  position: z.enum(['bottom-right','bottom-left','top-right','top-left']).optional(),
  theme: z.enum(['light','dark']).optional(),
  color: z.string().regex(/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/).optional(),
  logo: z.string().url().optional(),
  avatar: z.string().url().optional(),
  welcome: z.string().max(500).optional(),
  suggestedQuestions: z.array(z.string()).optional(),
  language: z.string().min(2).max(8).optional(),
});

export const Step5WidgetSchema = WidgetSchema;

export const Step6AISchema = z.object({
  mode: z.enum(['sales','support','hybrid']),
  tone: z.string().max(64).optional(),
  responseLength: z.enum(['short','medium','long']).optional(),
  emojiUsage: z.boolean().optional(),
  escalation: z.object({ enabled: z.boolean(), threshold: z.number().optional() }).optional(),
  leadCapture: z.boolean().optional(),
  appointmentBooking: z.boolean().optional(),
});

export const Step7InstallSchema = z.object({ domain: z.string().min(1).optional() });

export const StepSchemas: Record<number, any> = {
  1: Step1BusinessSchema,
  2: Step2BusinessTypeSchema,
  3: Step3ProductsSchema,
  4: Step4KnowledgeSchema,
  5: Step5WidgetSchema,
  6: Step6AISchema,
  7: Step7InstallSchema,
};

export function validateStep(stepNumber: number, payload: any) {
  const schema = StepSchemas[stepNumber];
  if (!schema) return { valid: true };
  try {
    schema.parse(payload);
    return { valid: true };
  } catch (err: any) {
    return { valid: false, errors: err.errors || err.message };
  }
}

// Additional higher-level validators
export function isValidDomain(domain: string): boolean {
  if (!domain) return false;
  // very permissive domain validation
  const d = String(domain).trim();
  return /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/.test(d) || /^https?:\/\//.test(d);
}

export function isSupportedLanguage(lang: string): boolean {
  const supported = ['en','es','fr','de','pt','it','nl','zh','ja','ko'];
  return supported.includes(String(lang).toLowerCase());
}

export function isSupportedCategory(cat: string): boolean {
  const supported = ['saas','shopify','dental','healthcare','agency','legal','restaurant','hotel','education','real_estate','manufacturing','consulting','generic'];
  return supported.includes(String(cat).toLowerCase());
}
