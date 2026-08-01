import { DiscernedTopic } from './conversation-memory';

export interface KnowledgeEntry {
  answer: string;
  sources?: string[];
}

export interface KnowledgeBaseProvider {
  getTopicResponse(topic: DiscernedTopic, tenantId: string, depth: number): KnowledgeEntry | null;
  getAvailableTopics(tenantId: string): DiscernedTopic[];
  resolveTopic?(rawQuery: string, tenantId: string): DiscernedTopic | null;
}

export function simpleStem(word: string): string {
  const w = word.toLowerCase();
  if (w.length < 4) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ves')) return w.slice(0, -3) + 'f';
  if (/[^aeiou](ss|sh|ch|x|z)es$/.test(w) && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  if (w.endsWith('ing')) {
    const base = w.slice(0, -3);
    if (base.length >= 3) return base;
    return base + 'e';
  }
  if (w.endsWith('ied') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('ed') && !w.endsWith('eed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('tion')) return w.slice(0, -4) + 'te';
  if (w.endsWith('ment')) return w.slice(0, -4);
  if (w.endsWith('ness')) return w.slice(0, -4);
  if (w.endsWith('ly')) return w.slice(0, -2);
  if (w.endsWith('er') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('or') && w.length > 4) return w.slice(0, -2);
  return w;
}

const TOPIC_KEYWORDS: Record<DiscernedTopic, string[]> = {
  features: ['feature', 'capabilit', 'product', 'platform', 'what do you do', 'functionality'],
  pricing: ['price', 'pricing', 'cost', 'plan', 'tier', 'how much', 'subscription', 'overage'],
  integrations: ['integrat', 'zendesk', 'intercom', 'slack', 'widget', 'embed', 'plugin'],
  security: ['security', 'compliance', 'soc2', 'gdpr', 'hipaa', 'encrypt', 'privacy', 'data'],
  api: ['api', 'sdk', 'developer', 'code', 'webhook', 'rest', 'endpoint'],
  trial: ['trial', 'free', 'sandbox', 'get started'],
  comparison: ['compare', 'versus', 'competitor', 'alternative', 'difference'],
  walkthrough: ['walkthrough', 'how it work', 'pipeline', 'architecture', 'technical overview'],
  roi: ['roi', 'revenue', 'save money', 'payback', 'deflection'],
  soc2: ['soc', 'soc2', 'audit'],
  sso: ['sso', 'saml', 'okta', 'active directory', 'azure ad', 'sign on', 'single sign'],
  onboarding: ['setup', 'onboard', 'deploy', 'install', 'getting started', '10 minute'],
  developer: ['developer', 'dev', 'engineering', 'code', 'build'],
  demo: ['demo', 'schedule', 'see it'],
};

const DEFAULT_TEMPLATES: Record<DiscernedTopic, string[]> = {
  features: [
    'The core of it is workflow automation — routing tickets, triggering actions, and keeping everything in one place. Most teams get their first automation running in about 10 minutes.',
    'The automation engine lets you build conditional workflows — if-then logic, SLA escalations, skill-based assignments. Think of it as a traffic controller for every ticket.',
    'On the analytics side, dashboards show response times, resolution rates, and CSAT trends in real time. Data refreshes instantly with custom filters and date ranges.',
    'For power users, the API and webhooks let you extend everything — trigger workflows from external systems, sync data bidirectionally, or build custom widgets on the dashboard.',
    'Enterprise features add RBAC with granular permissions, audit trails for every action, and a sandbox environment for testing workflows before production deployment.',
  ],
  pricing: [
    'Three tiers: Starter at $49/month for up to 3 agents, Professional at $99/month for growing teams, and Enterprise with custom pricing for larger organizations.',
    'Starter covers core automation and standard integrations. Professional adds advanced analytics, custom roles, and priority support. Enterprise gets SSO, dedicated support, and custom contracts.',
    'Billing is per agent per month, annual or monthly. All integrations, API access, and standard features are included in every tier — no hidden add-ons.',
    'For high-volume teams, Enterprise includes volume discounts and a dedicated account manager. There is also an AI add-on at $20 per agent per month for AI-powered responses.',
    'You can try any plan free for 14 days, no credit card needed. Most teams are up and running within the first week.',
  ],
  security: [
    'AES-256 encryption at rest, TLS 1.3 in transit — all data encrypted by default with no configuration needed.',
    'Beyond encryption, we maintain SOC 2 Type II certification audited annually, covering security, availability, and confidentiality. Infrastructure runs on AWS with ISO 27001 certified data centers.',
    'Access controls include role-based permissions (admin, agent, read-only), SAML 2.0 / OIDC SSO, and SCIM provisioning for automated user management.',
    'Enterprise security includes dedicated VPC deployment, data residency across US, EU, and APAC regions, and a 99.99% uptime SLA.',
    'Quarterly penetration tests by independent firms, a responsible disclosure program, and a detailed security white paper available under NDA.',
  ],
  integrations: [
    'Native integrations with Slack, Microsoft Teams, Salesforce, HubSpot, Zendesk, Intercom, and Jira — conversations and data sync in real time.',
    'The integration ecosystem covers CRM sync (contacts, deals, history), ticketing (bi-directional updates), communication tools, and analytics platforms.',
    'Our marketplace has 50+ pre-built connectors, each supporting custom field mapping, data transformation, and scheduled or event-driven sync.',
    'For custom integrations, we offer webhooks (inbound and outbound), REST API, and GraphQL. Webhooks support retries, batching, and event filtering.',
    'Enterprise customers get a dedicated integration engineer for migration and setup, plus custom connector development if needed.',
  ],
  api: [
    'REST API gives full programmatic access to tickets, contacts, workflows, analytics, and settings. SDKs available for JavaScript, Python, Go, and Ruby.',
    'The API supports CRUD on all resources, batch processing for bulk imports, and real-time event streaming via Server-Sent Events.',
    'Authentication via API keys or OAuth 2.0. Rate limits: 1000 req/min on Professional, 5000 on Enterprise, with webhook delivery guarantees.',
    'GraphQL API lets you query exactly what you need in a single request — ideal for custom dashboards, reports, or embedding features in your product.',
    'Developer docs include interactive playgrounds, SDK examples in 4 languages, a changelog with migration guides, and a community forum.',
  ],
  roi: [
    'Customers typically see ticket volume drop by 40% and response times improve by 60% within the first quarter.',
    'Average ROI is 3x within 90 days. Support teams save about 12 hours per week on repetitive tickets alone.',
    'We have an ROI calculator that factors in your current volume, agent count, and handle time to project savings specific to your team.',
    'One case study: a 50-agent team cut costs by $180k annually after automating 35% of Tier-1 tickets.',
    'Beyond direct savings, customers report CSAT scores improving by about 22%, lower agent turnover, and faster onboarding for new hires.',
  ],
  soc2: [
    'SOC 2 Type II certified with annual audits covering security, availability, processing integrity, confidentiality, and privacy.',
    'The audit is performed by an independent CPA firm and validates controls around access management, data encryption, incident response, and vendor management.',
    'The full SOC 2 report includes the control description, testing results, and auditor opinion — available to enterprise customers under NDA.',
    'We also maintain ISO 27001 certification, HIPAA BAAs for healthcare, and GDPR Data Processing Agreements for EU operations.',
    'Our compliance team handles customer security reviews, vendor risk assessments, and provides completed SIG questionnaires on request.',
  ],
  sso: [
    'SAML 2.0 and OpenID Connect supported. Compatible with Okta, Azure AD, Google Workspace, OneLogin, and Ping Identity.',
    'Setup takes about 15 minutes — generate a metadata file from your IdP, upload it, map attributes. Supports IdP-initiated and SP-initiated SSO.',
    'SCIM provisioning included — user accounts created, updated, and deprovisioned automatically when changes happen in your directory.',
    'Advanced features: just-in-time provisioning, role mapping from directory groups, session timeout policies, and IP-based access restrictions.',
    'Multiple IdP configurations per account supported — useful for mergers, acquisitions, or teams using different identity providers.',
  ],
  walkthrough: [
    'The core flow: a customer sends a message → it gets classified → routed to the right agent or AI → resolution is tracked. Every step is configurable.',
    'Behind the scenes, each message goes through intent classification, sentiment analysis, priority scoring, and skill-based routing before reaching an agent.',
    'The pipeline supports conditional branching — rules like "if urgent AND after hours → page on-call" or "if billing → route to billing team".',
    'For AI responses, the system retrieves relevant knowledge base articles, generates a suggested reply, and an agent reviews before sending — or auto-sends for low-risk queries.',
    'Every step logs latency, decisions, and outcomes. You can monitor throughput, spot bottlenecks, and tune rules in real time.',
  ],
  comparison: [
    'Compared to traditional helpdesk solutions, our platform focuses on proactive engagement and automated deflection rather than just ticket management.',
    'Where most tools require manual rule setup, our AI learns from your conversations and suggests automations based on actual patterns.',
    'Our pricing is transparent and usage-based — you only pay for what you use, with no long-term contracts or hidden setup fees.',
    'We offer native integrations with the tools you already use, so you can keep your existing workflow while adding AI-powered support.',
    'Enterprise customers tell us our onboarding time (typically 2 weeks) is significantly faster than traditional helpdesk platforms (2-3 months).',
  ],
  demo: [
    'We offer a personalized demo tailored to your use case. Our team will walk through the features most relevant to your business.',
    'Demos typically run 20-30 minutes and cover the core workflow, integration setup, and AI configuration specific to your needs.',
    'You can schedule a demo directly from your dashboard — pick a time that works for you and we will handle the rest.',
  ],
  trial: [
    'Start a free 14-day trial with full access to all Professional features. No credit card required, no commitment.',
    'During your trial, you will have access to onboarding resources, sample data, and our support team to help you get set up.',
    'At the end of the trial, choose the plan that fits your needs — or continue with a limited free tier.',
  ],
  onboarding: [
    'Getting started takes about 10 minutes. Create your account, customize your widget, and add your first knowledge source.',
    'Our step-by-step onboarding wizard guides you through configuration, from branding to team setup to integration connections.',
    'The onboarding checklist covers: account setup, widget customization, knowledge base creation, team invites, and first test conversation.',
    'Enterprise customers get a dedicated onboarding specialist who handles migration, custom configuration, and team training.',
    'Most teams are fully operational within 2 weeks, with ongoing support from our customer success team.',
  ],
  developer: [
    'Full REST and GraphQL APIs with SDKs in JavaScript, Python, Go, and Ruby. Comprehensive docs with interactive playgrounds.',
    'Webhooks for real-time event notifications — configure endpoints for conversation events, escalations, and feedback.',
    'Custom widget development supported via our open-source Widget SDK, allowing deep integration into your existing application.',
    'Our developer portal includes API reference, changelog, migration guides, and a community forum for troubleshooting.',
  ],
};

export function fuzzyResolveTopic(rawQuery: string, availableTopics: DiscernedTopic[]): DiscernedTopic | null {
  const lower = rawQuery.toLowerCase();
  const queryTokens = lower.split(/\s+/).filter(t => t.length > 0);
  const stemmedTokens = queryTokens.map(simpleStem);

  let bestTopic: DiscernedTopic | null = null;
  let bestScore = 0;

  for (const topic of availableTopics) {
    const keywords = TOPIC_KEYWORDS[topic];
    if (!keywords) continue;
      const score = keywords.filter(kw => {
        if (kw.includes(' ')) return lower.includes(kw);
        const stemKw = simpleStem(kw);
        return stemmedTokens.some(st =>
          st.length >= 3 && stemKw.length >= 3
            ? st.includes(stemKw) || stemKw.includes(st)
            : st === stemKw
        );
      }).length;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestScore > 0 ? bestTopic : null;
}

export class DefaultKnowledgeBaseProvider implements KnowledgeBaseProvider {
  getTopicResponse(topic: DiscernedTopic, _tenantId: string, depth: number): KnowledgeEntry | null {
    const templates = DEFAULT_TEMPLATES[topic];
    if (!templates || depth >= templates.length) return null;
    return { answer: templates[depth] };
  }

  getAvailableTopics(_tenantId: string): DiscernedTopic[] {
    return Object.keys(DEFAULT_TEMPLATES) as DiscernedTopic[];
  }

  resolveTopic(rawQuery: string, _tenantId: string): DiscernedTopic | null {
    return fuzzyResolveTopic(rawQuery, this.getAvailableTopics(_tenantId));
  }
}
