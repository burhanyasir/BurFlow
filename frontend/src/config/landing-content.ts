import {
  BookOpen,
  Gauge,
  Brain,
  RefreshCw,
  BarChart3,
  Rocket,
  ShieldCheck,
  Globe,
  Lock,
  Users,
  MessagesSquare,
  FileText,
  Sparkles,
  Check,
} from 'lucide-react';
import type { ReactNode } from 'react';

export interface LandingFeature {
  icon: typeof BookOpen;
  title: string;
  body: string;
}

export interface LandingIndustry {
  key: string;
  label: string;
  question: string;
  answer: string;
  cite: string;
  confidence: number;
}

export interface LandingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
}

export interface LandingFAQ {
  question: string;
  answer: string;
}

export interface LandingFooterColumn {
  title: string;
  links: string[];
}

export const BRAND = {
  name: 'Aureline',
  tagline: 'AI Customer Support That Never Guesses.',
  description: 'Grounded AI answers with source citations, confidence guardrails, and human handoff. Trusted by teams that can\'t afford to guess.',
  logo: 'A',
};

export const NAV_LINKS = [
  { label: 'Product', href: '#product' },
  { label: 'Industries', href: '#industries' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Docs', href: '/docs' },
];

export const CAPABILITIES = [
  'Grounded Answers',
  'Source Citations',
  'Confidence Scoring',
  'Human Handoff',
  'Multi-language',
  'Conversation Memory',
  'Enterprise Security',
];

export const FEATURES: LandingFeature[] = [
  { icon: BookOpen, title: 'Grounded AI', body: 'Every answer cites its source, so your team and your customers can verify — not hope.' },
  { icon: Gauge, title: 'Confidence Guardrails', body: 'Low-confidence answers escalate automatically, before a bad response reaches a customer.' },
  { icon: Brain, title: 'Conversation Memory', body: 'Never asks customers the same question twice. Context follows the entire relationship.' },
  { icon: RefreshCw, title: 'Knowledge Sync', body: 'Update your documentation and the AI updates instantly. No retraining, no fine-tuning.' },
  { icon: BarChart3, title: 'Analytics', body: 'Understand what customers ask most, where you\'re losing trust, and where to invest.' },
  { icon: Rocket, title: 'Easy Deployment', body: 'Go live in minutes with a widget, an API, or a native integration to your stack.' },
];

export const INDUSTRIES: LandingIndustry[] = [
  { key: 'ecommerce', label: 'Ecommerce', question: 'Can I return this after 40 days?', answer: 'Our extended holiday policy allows returns within 60 days of purchase. I can start a return for order #A-3492 right now.', cite: 'Return Policy.pdf', confidence: 96 },
  { key: 'law', label: 'Law Firms', question: 'What documents do I need for my initial consultation?', answer: 'For a family law consultation, please bring photo ID, marriage certificate, and any prior filings. A partner will confirm at intake.', cite: 'Client Onboarding Guide', confidence: 94 },
  { key: 'dental', label: 'Dental Clinics', question: 'Do you accept Delta Dental PPO?', answer: 'Yes — we\'re in-network with Delta Dental PPO. Standard cleanings are fully covered twice per calendar year.', cite: 'Insurance Coverage.pdf', confidence: 99 },
  { key: 'saas', label: 'SaaS', question: 'How do I invite my team on the Business plan?', answer: 'Open Settings → Members and enter emails. Business includes 25 seats; additional seats bill monthly at $12 each.', cite: 'Team & Seats · Docs', confidence: 97 },
  { key: 'prof', label: 'Professional Services', question: 'What is your typical project timeline?', answer: 'Discovery runs 1–2 weeks, followed by a 4–6 week engagement. Every project includes a fixed-scope statement of work.', cite: 'Engagement Handbook', confidence: 95 },
];

export const PLANS: LandingPlan[] = [
  {
    name: 'Starter', price: '$49', period: '/ month',
    description: 'For small teams launching AI-assisted support.',
    features: ['1,000 conversations / mo', '5 knowledge sources', 'Grounded answers + citations', 'Email support'],
    cta: 'Start Free Trial',
  },
  {
    name: 'Business', price: '$249', period: '/ month',
    description: 'For growing companies with real support volume.',
    features: ['10,000 conversations / mo', 'Unlimited knowledge sources', 'Confidence guardrails & handoff', 'Analytics & insights', 'Priority support'],
    cta: 'Start Free Trial',
    featured: true,
  },
  {
    name: 'Enterprise', price: 'Custom', period: '',
    description: 'For regulated industries and enterprise deployments.',
    features: ['Unlimited conversations', 'SSO, SCIM, audit logs', 'Dedicated infrastructure', 'Custom SLAs & DPA', 'Named success manager'],
    cta: 'Talk to Sales',
  },
];

export const FAQS: LandingFAQ[] = [
  { question: 'How does grounded AI actually work?', answer: 'Aureline retrieves the exact passages from your documentation for every question, then generates an answer strictly from those sources. Each answer carries a citation and a confidence score so your team can trust — and verify — every response.' },
  { question: 'What happens when the AI isn\'t confident?', answer: 'Low-confidence answers never reach your customer. Aureline routes the conversation to a human agent with full context, transcript, and suggested reply, so handoffs feel seamless.' },
  { question: 'Which knowledge sources can we connect?', answer: 'PDFs, help centers, Notion, Confluence, Google Drive, SharePoint, Zendesk, and any public URL. Changes sync automatically — no retraining required.' },
  { question: 'Is Aureline secure enough for regulated industries?', answer: 'Yes. Aureline supports SSO, SCIM, audit logs, regional data residency, and signed DPAs. Enterprise deployments include dedicated infrastructure and custom SLAs.' },
  { question: 'How long does it take to go live?', answer: 'Most teams launch a production widget within a single afternoon. Enterprise rollouts typically take 1–2 weeks including SSO, custom domains, and knowledge sync.' },
  { question: 'Can we keep our existing helpdesk?', answer: 'Absolutely. Aureline integrates with Zendesk, Intercom, HubSpot, Freshdesk, and Front — augmenting the tools your team already uses.' },
];

export const FOOTER_COLUMNS: LandingFooterColumn[] = [
  { title: 'Product', links: ['Pricing', 'Documentation', 'Widget', 'Integrations'] },
  { title: 'Company', links: ['Blog', 'Trust Center', 'Contact', 'Careers'] },
  { title: 'Legal', links: ['Security', 'Privacy', 'Terms', 'DPA'] },
  { title: 'Platform', links: ['Status', 'Changelog', 'API', 'Roadmap'] },
];

export const HERO_BADGE_TEXT = 'Grounded AI · Now with confidence scoring';

export const PRODUCT_MOCK_DATA = {
  dashboard: { resolved: '1,284', groundedRate: '97.4%', avgConfidence: '94%', deltaResolved: '+12%', deltaGrounded: '+0.6%', deltaConfidence: '+2%' },
  health: { score: 97.4, label: 'Grounded' },
  kb: { sources: [
    { name: 'Product Docs', count: 42 },
    { name: 'Shipping Policy', count: 8 },
    { name: 'Refunds FAQ', count: 16 },
    { name: 'Legal Handbook', count: 22 },
  ]},
  insights: [
    { label: 'Shipping questions', value: 34 },
    { label: 'Refund requests', value: 22 },
    { label: 'Product specs', value: 18 },
    { label: 'Account help', value: 12 },
  ],
};
