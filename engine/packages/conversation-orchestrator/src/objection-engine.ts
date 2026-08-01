import { ObjectionCategory, ObjectionResult } from './types';

export function handleObjection(message: string): ObjectionResult {
  const text = message.toLowerCase();

  // 1. Price Objection
  if (/expensive|why pay|too high|cost too much|why $99|cheaper alternative/i.test(text)) {
    return {
      isObjection: true,
      category: 'price',
      groundedAnswer:
        "Our pricing reflects continuous vector search hosting, zero-hallucination verification, and instant doc re-indexing. Our Professional plan ($99/mo) includes 10,000 messages and 10 Knowledge Bases, typically saving 120+ hours of support agent bandwidth each month. All paid plans include a 14-day free trial with no credit card required.",
      sources: ['Pricing Overview', 'Value Proposition'],
      proof: 'Pricing vs value summary with estimated ROI calculations',
      documentation: '/docs/pricing-comparison',
      caseStudy: '/case-studies/customer-xyz-pricing-savings',
      faq: '/faq#pricing',
      comparison: '/compare',
      recommendedCTA: 'start_free_trial',
    };
  }

  // 2. Hallucination / Grounding Objection
  if (/hallucinate|make up|wrong answers|false info|guessing|hallucination/i.test(text)) {
    return {
      isObjection: true,
      category: 'security',
      groundedAnswer:
        "Conversation Engine uses a 4-stage grounding verification pipeline: 1) Document indexing, 2) Hybrid semantic vector search, 3) Cross-encoder re-ranking, and 4) Output grounding verifications. If an answer cannot be sourced strictly from your docs, the bot provides an honest fallback instead of guessing.",
      sources: ['How It Works', 'Grounding Architecture'],
      proof: 'Grounding pipeline and verification summary',
      documentation: '/docs/grounding-and-verification',
      caseStudy: '/case-studies/security-compliance',
      faq: '/faq#data-privacy',
      comparison: '/docs/grounding-vs-generic',
      recommendedCTA: 'book_demo',
    };
  }

  // 3. Security & Data Privacy Objection
  if (/security|privacy|train on data|used to train|public models|data leak|safe/i.test(text)) {
    return {
      isObjection: true,
      category: 'security',
      groundedAnswer:
        "Your customer data and documentation are strictly isolated in multi-tenant or single-tenant storage and processed via zero-retention API pipelines. Your data is NEVER used to train public foundation models. We support enterprise SSO/SAML, SOC 2 audit readiness, and GDPR compliance.",
      sources: ['Trust & Security', 'Enterprise Features'],
      proof: 'Security controls and compliance certifications summary',
      documentation: '/docs/security',
      caseStudy: '/case-studies/security-implementation',
      faq: '/faq#security',
      comparison: '/docs/security-comparison',
      recommendedCTA: 'talk_enterprise_sales',
    };
  }

  // 4. Setup Complexity Objection
  if (/hard to setup|difficult|need developer|complex engineering|coding skills/i.test(text)) {
    return {
      isObjection: true,
      category: 'setup',
      groundedAnswer:
        "Deployment takes under 10 minutes with zero complex engineering! Simply upload your existing PDF, Markdown, or HTML docs into your dashboard, copy one HTML `<script>` tag into your site's `<head>`, and your widget is live.",
      sources: ['Integration Guide — Quick Start'],
      proof: 'Quick start integration checklist',
      documentation: '/docs/integration-quick-start',
      caseStudy: '/case-studies/fast-deploy',
      faq: '/faq#integration',
      comparison: '/docs/integration-compare',
      recommendedCTA: 'developer_docs',
    };
  }

  // 5. Competition Objection (ChatGPT / Intercom / Zendesk)
  if (/chatgpt|intercom|zendesk|ada|gorgias|custom wrapper|build in house/i.test(text)) {
    return {
      isObjection: true,
      category: 'competition',
      groundedAnswer:
        "Unlike raw ChatGPT wrappers which hallucinate facts, Conversation Engine strictly grounds every answer in your official docs with exact source citations. And unlike legacy platforms that charge steep per-resolution fees, we offer predictable flat monthly plans ($29–$99/mo) with 10-minute setup.",
      sources: ['Competitive Positioning', 'Pricing Overview'],
      proof: 'Comparison summary and differentiation highlights',
      documentation: '/docs/compare',
      caseStudy: '/case-studies/switch-from-competitor',
      faq: '/faq#compare',
      comparison: '/compare',
      recommendedCTA: 'book_demo',
    };
  }

  // 6. Enterprise Procurement Objection
  if (/procurement|net-30|purchase order|msa|security questionnaire|custom contract/i.test(text)) {
    return {
      isObjection: true,
      category: 'enterprise_procurement',
      groundedAnswer:
        "Enterprise annual agreements support Purchase Orders, Net-30 invoicing terms, custom MSAs, dedicated Technical Account Managers (TAM), and 99.9% uptime SLA guarantees. We can also provide our Security Questionnaire Dossier upon request.",
      sources: ['Enterprise Features — Procurement']
    };
  }

  return {
    isObjection: false,
    category: 'none',
    groundedAnswer: '',
    sources: [],
    proof: undefined,
    documentation: undefined,
    caseStudy: undefined,
    faq: undefined,
    comparison: undefined,
    recommendedCTA: 'none',
  };
}
