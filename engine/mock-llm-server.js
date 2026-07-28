const http = require('http');

// ─── Session State ─────────────────────────────────────────
const sessions = new Map();

function getSession(id) {
  if (!sessions.has(id)) sessions.set(id, createState(id));
  return sessions.get(id);
}

function createState(id) {
  return {
    sessionId: id, conversationCount: 0, funnelStage: 'awareness',
    persona: 'unknown', buyingIntent: false, buyingConfidence: 0,
    qualification: { progress: 0, completed: false, answers: {}, qIndex: 0 },
    objections: [], topicsDiscussed: [], momentumStage: 'features',
    smallTalkThisTurn: false, lastIntent: 'none',
  };
}

// ─── Intent Detection ──────────────────────────────────────
const INTENTS = [
  { name: 'farewell', match: /^(bye|goodbye|see you|talk later|catch you|have a good|take care)\b|(thanks|thank).*(bye|goodbye|see you)/i, priority: 10 },
  { name: 'greeting', match: /^(hi|hello|hey|howdy|greetings|good morning|good afternoon|good evening|yo|sup|heya)\b/i, priority: 10 },
  { name: 'gratitude', match: /^(thanks|thank you|appreciate|thankyou|ty)\b/i, priority: 9 },
  { name: 'agreement', match: /^(ok|okay|sure|got it|i see|makes sense|cool|nice|great|alright|perfect|awesome|understood|right|fair enough)\b/i, priority: 8 },
  { name: 'small_talk', match: /how (are you|is it going|have you been|goes it)|what'?s up|howdy|how do you do|who (made|created|built) you|good morning|good night|good evening/i, priority: 6 },
  { name: 'objection_price', match: /expensive|too much|overpriced|pricey|budget|can'?t afford|cost concern|higher than|cheaper|cost effective|roi|worth|value for|price objection/i, priority: 7 },
  { name: 'objection_competitor', match: /(using|sticking with|already use|evaluating|considering|looking at)\s+(zendesk|intercom|freshdesk|zoho|helpscout|crisp|tidio|drift)|competitor|alternative|switching|migrate from|different tool|vendor lock/i, priority: 7 },
  { name: 'objection_implementation', match: /setup|deploy|migrate|implementation|install|configure|roll out|downtime|complex|difficult|hard to|learning curve|time consuming|integration effort/i, priority: 7 },
  { name: 'objection_security', match: /security concern|data privacy|data breach|compliance|regulation|audit|third.party|data residency|data storage|encryption standard|pen test/i, priority: 7 },
  { name: 'pricing', match: /price|pricing|cost|plan|tier|how much|subscription|paid|billing|monthly|annually|quote/i, priority: 6 },
  { name: 'features', match: /features|capabilities|what (do|can|does).*(do|offer)|product|platform|functionality/i, priority: 6 },
  { name: 'integrations', match: /integrate|integration|connect|zendesk|intercom|slack|embed|widget|install|plugin|extension|marketplace|helpdesk/i, priority: 6 },
  { name: 'developer', match: /api|sdk|developer|dev|code|webhook|rest|graphql|cli|npm|github|open.source/i, priority: 5 },
  { name: 'enterprise', match: /enterprise|sso|saml|okta|azure ad|ldap|rbac|audit log|sla|dedicated|on.prem|vpc|private cloud/i, priority: 6 },
  { name: 'security', match: /security|soc2|soc 2|gdpr|hipaa|encrypt|data privacy|audit|penetration|iso|compliance|certification/i, priority: 6 },
  { name: 'trial', match: /trial|free|demo|try|get started|start free|test out|evaluate|preview|sample/i, priority: 6 },
  { name: 'signup', match: /sign.?up|create account|register|join|create.*acc|start now/i, priority: 6 },
  { name: 'contact', match: /email|contact|reach you|talk to (human|person|sales|support|representative|team)|speak with|call you|phone/i, priority: 6 },
  { name: 'walkthrough', match: /how (does|does it|do you|exactly) .*(work|function|operate)|explain.*(pipeline|architecture|process|flow|engine)|technical (overview|deep dive)|under the hood/i, priority: 8 },
  { name: 'comparison', match: /compare|vs |versus|alternative|competitor|difference|better than|how.*different|what sets|why.*you|differentiate/i, priority: 7 },
];

function detectIntent(message) {
  const lower = message.trim().toLowerCase();
  if (!lower) return 'empty';
  const sorted = [...INTENTS].sort((a, b) => b.priority - a.priority);
  for (const p of sorted) {
    if (p.match.test(lower)) return p.name;
  }
  const words = lower.split(/\s+/);
  if (words.length <= 3 && /what|how|why|when|where|who|can|could|would|will|do|does|is|are/i.test(lower)) return 'question';
  return 'unknown';
}

// ─── Persona Detection ─────────────────────────────────────
function detectPersona(systemMsg) {
  if (!systemMsg) return 'unknown';
  const text = systemMsg.content || '';
  const pm = text.match(/Current persona:\s*(\w+)/);
  if (pm) return pm[1];
  if (/developer|engineer|dev|sdk|api/i.test(text)) return 'developer';
  if (/support manager|support team|customer support|agent/i.test(text)) return 'support_manager';
  if (/founder|ceo|cto|startup|owner/i.test(text)) return 'founder';
  if (/enterprise|it director|ciso|security|compliance/i.test(text)) return 'enterprise';
  return 'unknown';
}

// ─── Qualification Questions (spread) ──────────────────────
const QUAL_QUESTIONS = [
  { key: 'companySize', q: 'What size company are you with? Helps me tailor the right plan.', tag: 'size' },
  { key: 'industry', q: 'What industry are you in?', tag: 'industry' },
  { key: 'monthlyVolume', q: 'About how many support conversations do you handle each month?', tag: 'volume' },
  { key: 'currentHelpdesk', q: 'Which helpdesk are you currently using?', tag: 'helpdesk' },
  { key: 'useCase', q: 'What would be your primary use case — customer-facing support, internal knowledge base, or something else?', tag: 'use_case' },
  { key: 'teamSize', q: 'How many people would be managing the AI assistant?', tag: 'team' },
];

function nextQualQuestion(session) {
  if (session.qualification.completed) return null;
  for (let i = session.qualification.qIndex; i < QUAL_QUESTIONS.length; i++) {
    const q = QUAL_QUESTIONS[i];
    if (!session.qualification.answers[q.key]) return q;
  }
  session.qualification.completed = true;
  session.qualification.progress = 1;
  return null;
}

// ─── Follow-up Generators ──────────────────────────────────
const FOLLOW_UPS = {
  features: [
    'Which of those capabilities would make the biggest difference for your team?',
    'What problem are you trying to solve — ticket deflection, self-service, or agent assist?',
    'Are you looking for something customer-facing or internal?',
  ],
  pricing: [
    'Are you evaluating for yourself or your whole team?',
    'What kind of volume are you expecting — hundreds or thousands of conversations?',
    'Would you like me to recommend a plan based on your needs?',
  ],
  integrations: [
    'Which tools are you already using?',
    'What does your current tech stack look like?',
    'Are you looking to replace something or add AI on top?',
  ],
  security: [
    'Do you have any specific compliance requirements like SOC 2 or HIPAA?',
    'What security certifications do you need?',
    'Would you like to review our security documentation?',
  ],
  comparison: [
    'Which solution are you currently evaluating us against?',
    'What matters most to you — accuracy, setup speed, or pricing?',
  ],
  trial: [
    'Would you like me to show which plan fits your company?',
    'What documentation would you want to start with — a website, PDFs, or your helpdesk?',
  ],
};

function getFollowUp(intent, session) {
  const questions = FOLLOW_UPS[intent];
  if (!questions) return null;
  const idx = session.conversationCount % questions.length;
  return questions[idx];
}

// ─── Persona Selling Points ────────────────────────────────
const PERSONA_PITCH = {
  developer: {
    hook: 'API-first architecture, SDKs in JS/Python/React, and an interactive API playground.',
    features: 'REST API, webhooks, client SDKs, and full widget customization.',
    ctaLabel: 'Explore API Docs',
    ctaLink: '/docs',
  },
  support_manager: {
    hook: 'Deflects common tickets automatically, surfaces knowledge gaps, and cuts response time by 40% on average.',
    features: 'Ticket deflection, confidence tracking, knowledge gap reports, and agent assist.',
    ctaLabel: 'See How It Reduces Tickets',
    ctaLink: '/demo',
  },
  founder: {
    hook: 'Goes live in under 10 minutes, scales from 100 to 10,000 conversations without hiring, and pays for itself within weeks.',
    features: 'Zero-setup deployment, pay-as-you-grow pricing, and full analytics.',
    ctaLabel: 'Calculate Your ROI',
    ctaLink: '/demo',
  },
  enterprise: {
    hook: 'SOC 2 certified, SSO/SAML, 99.99% SLA, dedicated support, and on-premise deployment.',
    features: 'SSO/SAML, audit logging, data residency, custom SLA, and dedicated account management.',
    ctaLabel: 'Talk to Enterprise Sales',
    ctaLink: '/contact',
  },
  unknown: {
    hook: 'Turns your documentation into an AI assistant that cites every answer. Goes live in under 10 minutes.',
    features: 'Grounded AI, multi-source ingestion, smart widget, and analytics.',
    ctaLabel: 'See How It Works',
    ctaLink: '/demo',
  },
};

function getPersonaPitch(session) {
  return PERSONA_PITCH[session.persona] || PERSONA_PITCH.unknown;
}

// ─── Response Builder ──────────────────────────────────────
function build(userMsg, messages, sessionId) {
  const session = getSession(sessionId);
  const systemMsg = messages.find(m => m.role === 'system');
  const detectedPersona = detectPersona(systemMsg);
  if (detectedPersona !== 'unknown') session.persona = detectedPersona;

  session.conversationCount++;
  const intent = detectIntent(userMsg);
  session.lastIntent = intent;
  const pitch = getPersonaPitch(session);

  // Small talk — handle without resetting
  if (intent === 'small_talk') {
    session.smallTalkThisTurn = true;
    return respond(`I'm doing well, thanks for asking! ${pitch.hook}

Are there specific ${session.persona !== 'unknown' ? 'features or integrations' : 'capabilities'} you're curious about?`, [], 'none');
  }

  // Farewell
  if (intent === 'farewell') {
    const topics = session.topicsDiscussed;
    const summary = topics.length > 0
      ? `We covered ${topics.slice(0, 3).join(', ')}${topics.length > 3 ? ' and more' : ''}.`
      : 'Happy to help anytime.';
    const oneCTA = session.buyingIntent
      ? { label: 'Start Free Trial', link: '/signup', cta: 'signup' }
      : { label: 'Learn More', link: '/features', cta: 'learn_more' };
    return respond(
      `${summary} ${oneCTA.cta === 'signup' ? 'Your free 14-day trial is ready whenever you are — no credit card needed.' : 'Feel free to come back anytime.'}
Take care!`,
      [], oneCTA.cta, oneCTA.label, oneCTA.link);
  }

  // Gratitude
  if (intent === 'gratitude') {
    const followUp = getFollowUp(session.lastIntent !== 'none' && session.lastIntent !== 'gratitude' ? session.lastIntent : 'features', session);
    if (followUp) return respond(`Happy to help! ${followUp}`, [], 'none');
    return respond(`You're welcome! Based on what you've shared, would you like to see which plan would work best for your team?`, [], 'signup', 'Find My Plan', '/signup');
  }

  // Agreement
  if (intent === 'agreement') {
    session.momentumStage = advanceMomentum(session.momentumStage);
    return handleMomentum(session, pitch);
  }

  // Objection handling — no generic follow-up
  if (intent.startsWith('objection_')) {
    session.objections.push(intent.replace('objection_', ''));
    return handleObjection(intent, userMsg, session, pitch);
  }

  // Track topics
  if (!['greeting', 'small_talk', 'farewell', 'gratitude', 'agreement'].includes(intent)) {
    if (intent === 'features' && !session.topicsDiscussed.includes('features')) session.topicsDiscussed.push('features');
    if (intent === 'pricing' && !session.topicsDiscussed.includes('pricing')) session.topicsDiscussed.push('pricing');
    if (intent === 'integrations' && !session.topicsDiscussed.includes('integrations')) session.topicsDiscussed.push('integrations');
    if (intent === 'security' && !session.topicsDiscussed.includes('security')) session.topicsDiscussed.push('security');
    if (intent === 'comparison' && !session.topicsDiscussed.includes('comparison')) session.topicsDiscussed.push('comparison');
    if (intent === 'trial' || intent === 'signup') {
      session.topicsDiscussed.push('trial');
      session.buyingIntent = true;
      session.buyingConfidence = Math.min(1, session.buyingConfidence + 0.3);
    }
    if (intent === 'walkthrough') session.topicsDiscussed.push('walkthrough');
    if (intent === 'developer') session.topicsDiscussed.push('developer');
    if (intent === 'enterprise') session.topicsDiscussed.push('enterprise');
  }

  // Advance momentum based on intent
  if (intent === 'features') session.momentumStage = 'features';
  else if (intent === 'pricing') session.momentumStage = 'pricing';
  else if (intent === 'integrations') session.momentumStage = 'integrations';
  else if (intent === 'security' || intent === 'comparison' || intent === 'enterprise') session.momentumStage = 'roi';
  else if (intent === 'trial' || intent === 'signup' || intent === 'developer') session.momentumStage = 'trial';
  else if (intent === 'walkthrough') session.momentumStage = 'features';

  // Update buying intent
  if (['pricing', 'trial', 'signup', 'comparison', 'enterprise', 'developer'].includes(intent)) {
    session.buyingIntent = true;
    session.buyingConfidence = Math.min(1, session.buyingConfidence + 0.2);
  }

  // Topic-specific responses with sales direction
  if (intent === 'greeting') return handleGreeting(session, pitch);
  if (intent === 'features') return handleFeatures(session, pitch);
  if (intent === 'pricing') return handlePricing(session, pitch);
  if (intent === 'integrations') return handleIntegrations(session, pitch);
  if (intent === 'security') return handleSecurity(session, pitch);
  if (intent === 'comparison') return handleComparison(session, pitch);
  if (intent === 'walkthrough') return handleWalkthrough(session, pitch);
  if (intent === 'developer') return handleDeveloper(session, pitch);
  if (intent === 'enterprise') return handleEnterprise(session, pitch);
  if (intent === 'trial') return handleTrial(session, pitch);
  if (intent === 'signup') return handleSignup(session);
  if (intent === 'contact') return handleContact(session);

  // Fallback — drive toward qualification or momentum
  return handleMomentum(session, pitch);
}

// ─── Response Handlers ─────────────────────────────────────
function handleGreeting(session, pitch) {
  session.funnelStage = 'awareness';
  return respond(
    `Hi there! I'm the Conversation Engine assistant. ${pitch.hook}

What's the main challenge you're hoping to solve?`,
    [
      { id: 'g1', label: 'Reduce Support Tickets', action: 'send_text', payload: 'I want to reduce support tickets', variant: 'secondary' },
      { id: 'g2', label: 'Improve Self-Service', action: 'send_text', payload: 'I want better self-service for customers', variant: 'secondary' },
      { id: 'g3', label: 'Internal Knowledge Base', action: 'send_text', payload: 'I need an internal knowledge base tool', variant: 'secondary' },
      { id: 'g4', label: 'Just Exploring', action: 'send_text', payload: 'Just exploring for now', variant: 'outline' },
    ],
    'none');
}

function handleFeatures(session, pitch) {
  session.funnelStage = 'consideration';
  const discussed = session.topicsDiscussed;
  const alreadySawFeatures = discussed.filter(t => ['features', 'grounded_ai', 'analytics'].includes(t)).length > 1;

  if (alreadySawFeatures) {
    return respond(
      `As I mentioned, ${pitch.features}

Based on what you've seen so far, would you like to walk through how this would work with your actual documentation? I can show you the exact setup flow.`,
      [], 'demo', 'Walk Through Setup', '/demo');
  }

  return respond(
    `Here's a quick overview of what Conversation Engine does:

\u2022 **Grounded AI** — Every answer cites the source document. No hallucinations, full traceability.
\u2022 **Multi-source ingestion** — PDFs, markdown, HTML, website scraping, help desk imports.
\u2022 **Smart Widget** — Fully customizable, one-line embed, matches your brand.
\u2022 **Analytics** — Track volume, confidence trends, and knowledge gaps.

${getFollowUp('features', session)}`,
    [
      { id: 'f1', label: 'Tell Me About Pricing', action: 'send_text', payload: 'What are your pricing tiers?', variant: 'secondary' },
      { id: 'f2', label: 'How Is This Different?', action: 'send_text', payload: 'How is this different from other AI chatbots?', variant: 'secondary' },
      { id: 'f3', label: 'See Integrations', action: 'send_text', payload: 'What do you integrate with?', variant: 'secondary' },
    ],
    'pricing', 'See Pricing', '/pricing');
}

function handlePricing(session, pitch) {
  session.funnelStage = 'consideration';
  session.buyingIntent = true;
  session.buyingConfidence = Math.max(session.buyingConfidence, 0.4);

  // Check if we should qualify first
  if (session.conversationCount > 2 && !session.qualification.completed) {
    const q = nextQualQuestion(session);
    if (q) {
      session.qualification.qIndex = QUAL_QUESTIONS.indexOf(q);
      return respond(
        `Here's the high-level pricing:

\u2022 **Free** — $0/mo, 100 messages, 1 source.
\u2022 **Starter** — $29/mo, 1,000 messages, 3 sources.
\u2022 **Professional** — $99/mo, 10,000 messages, 10 sources, full analytics.
\u2022 **Enterprise** — Custom pricing, unlimited, SLA, SSO, dedicated support.

Before I recommend a plan — ${q.q}`,
        [], 'none');
    }
  }

  return respond(
    `Here's a quick breakdown:

\u2022 **Free** — $0/mo, 100 messages. Great for testing the waters.
\u2022 **Starter** — $29/mo, 1,000 messages, 3 knowledge bases.
\u2022 **Professional** — $99/mo, 10,000 messages, full analytics, custom branding.
\u2022 **Enterprise** — Custom. Unlimited everything, SLA, SSO, dedicated support.

${getFollowUp('pricing', session)}`,
    [
      { id: 'p1', label: 'Compare Plans Side by Side', action: 'send_text', payload: 'Can you compare the plans?', variant: 'secondary' },
      { id: 'p2', label: 'Start 14-Day Free Trial', action: 'navigate', payload: '/signup', variant: 'primary' },
    ],
    'signup', 'Start Free Trial', '/signup');
}

function handleIntegrations(session, pitch) {
  session.funnelStage = 'consideration';
  return respond(
    `We connect with the tools you already use:

\u2022 **Zendesk** — Surface answers directly in the agent workspace.
\u2022 **Intercom** — AI-assisted replies inside conversations.
\u2022 **Slack** — Query your knowledge base from Slack.
\u2022 **Web SDK** — One-line JavaScript embed.
\u2022 **API** — Full REST API for anything custom.

${getFollowUp('integrations', session)}`,
    [
      { id: 'i1', label: 'Pricing', action: 'send_text', payload: 'What are your pricing tiers?', variant: 'secondary' },
      { id: 'i2', label: 'API Docs', action: 'navigate', payload: '/docs', variant: 'secondary' },
      { id: 'i3', label: 'Start Free Trial', action: 'navigate', payload: '/signup', variant: 'primary' },
    ],
    'none');
}

function handleSecurity(session, pitch) {
  session.funnelStage = 'consideration';
  return respond(
    `Security is built into our foundation:

\u2022 **Encryption** — AES-256 at rest, TLS 1.3 in transit.
\u2022 **SOC 2 Type II** — Independently audited annually.
\u2022 **GDPR** — DPA available, EU data residency option.
\u2022 **HIPAA** — Available on Enterprise plans with BAA.
\u2022 **Access Controls** — RBAC, SSO/SAML, full audit logs.

${getFollowUp('security', session)}`,
    [
      { id: 's1', label: 'Enterprise Plan', action: 'send_text', payload: 'Tell me about the enterprise plan', variant: 'secondary' },
      { id: 's2', label: 'Talk to Security Team', action: 'send_text', payload: 'Connect me with your security team', variant: 'secondary' },
    ],
    'none');
}

function handleComparison(session, pitch) {
  session.funnelStage = 'consideration';
  session.buyingIntent = true;
  session.buyingConfidence = Math.max(session.buyingConfidence, 0.3);
  return respond(
    `The key difference is **grounded AI** — every answer cites its source. No black box, no hallucinations.

Other differentiators:
\u2022 **Goes live in under 10 minutes** — not weeks of training.
\u2022 **No per-agent fees** — transparent pricing.
\u2022 **Enterprise ready** — SSO, SOC 2, audit logs from day one.

${getFollowUp('comparison', session)}`,
    [
      { id: 'c1', label: 'Show Me Pricing', action: 'send_text', payload: 'What are your pricing tiers?', variant: 'secondary' },
      { id: 'c2', label: 'Start Free Trial', action: 'navigate', payload: '/signup', variant: 'primary' },
    ],
    'demo', 'See Comparison', '/demo');
}

function handleWalkthrough(session, pitch) {
  session.funnelStage = 'interest';
  return respond(
    `Here's the exact pipeline:

**1. Ingest** — Upload docs (PDF, markdown, HTML, or website). We chunk and index automatically.

**2. Retrieve** — When a user asks a question, we search with semantic + keyword matching.

**3. Rerank** — Results are scored. Low-confidence matches are filtered out before they reach the AI.

**4. Ground** — The AI generates an answer using ONLY your docs. Every claim cites its source.

**5. Verify** — Output is checked for hallucinations, PII leaks, and tone before sending.

**6. Learn** — Analytics show which answers helped and where your docs have gaps.

The whole pipeline runs in under 500ms. Which stage would you like me to elaborate on?`,
    [
      { id: 'w1', label: 'How Is Grounding Different?', action: 'send_text', payload: 'How is grounded AI different from regular chatbots?', variant: 'secondary' },
      { id: 'w2', label: 'How Fast Can I Set This Up?', action: 'send_text', payload: 'How fast can I set this up?', variant: 'secondary' },
      { id: 'w3', label: 'See Pricing', action: 'send_text', payload: 'What are your pricing tiers?', variant: 'secondary' },
    ],
    'demo', 'Watch Live Demo', '/demo');
}

function handleDeveloper(session, pitch) {
  session.buyingIntent = true;
  session.buyingConfidence = Math.max(session.buyingConfidence, 0.3);
  return respond(
    `You'll feel right at home:

\u2022 **REST API** — Full CRUD for knowledge bases, conversations, and analytics.
\u2022 **Webhooks** — Real-time events when conversations happen or escalate.
\u2022 **SDKs** — JavaScript/TypeScript, Python, and React.
\u2022 **Widget API** — Programmatic control of every aspect.
\u2022 **API Playground** — Interactive docs with live examples.

Want me to walk through a quick integration example?`,
    [
      { id: 'd1', label: 'API Docs', action: 'navigate', payload: '/docs', variant: 'primary' },
      { id: 'd2', label: 'Start Building', action: 'navigate', payload: '/signup', variant: 'secondary' },
    ],
    'none');
}

function handleEnterprise(session, pitch) {
  session.buyingIntent = true;
  session.buyingConfidence = Math.max(session.buyingConfidence, 0.5);
  return respond(
    `The Enterprise plan includes:

\u2022 **Unlimited** — messages, knowledge bases, team seats.
\u2022 **SSO/SAML** — Okta, Azure AD, OneLogin, PingIdentity.
\u2022 **Custom SLA** — 99.99% uptime guarantee.
\u2022 **Dedicated Support** — Named account manager.
\u2022 **On-Premise** — Deploy within your VPC.
\u2022 **Custom Contracting** — Volume discounts, multi-year terms.

Every Enterprise engagement starts with a personalized demo using your own data. Would you like to set that up?`,
    [
      { id: 'e1', label: 'Book Enterprise Demo', action: 'navigate', payload: '/contact', variant: 'primary' },
      { id: 'e2', label: 'Security Docs', action: 'navigate', payload: '/security', variant: 'secondary' },
    ],
    'contact', 'Talk to Enterprise Sales', '/contact');
}

function handleTrial(session, pitch) {
  session.funnelStage = 'evaluation';
  session.buyingIntent = true;
  session.buyingConfidence = Math.max(session.buyingConfidence, 0.6);

  if (session.qualification.completed || session.conversationCount > 5) {
    return respond(
      `You can start with zero risk:

\u2022 14 full days on the Professional plan.
\u2022 No credit card required.
\u2022 Cancel anytime, keep your data.
\u2022 All features unlocked — widgets, analytics, API, integrations.

Most customers go from signup to live widget in under 10 minutes. Ready to give it a shot?`,
      [], 'signup', 'Start Free Trial', '/signup');
  }

  return respond(
    `Starting is simple:

1. Click "Start Free Trial" — no credit card needed.
2. Upload your docs or connect a knowledge source.
3. Customize the widget colors and welcome message.
4. Copy the one-line embed snippet to your site.

You get full Professional plan access for 14 days. ${getFollowUp('trial', session)}`,
    [
      { id: 't1', label: 'Yes, Start My Trial', action: 'navigate', payload: '/signup', variant: 'primary' },
      { id: 't2', label: 'I Have Questions First', action: 'send_text', payload: 'I have a few questions before starting', variant: 'secondary' },
    ],
    'signup', 'Start Free Trial', '/signup');
}

function handleSignup(session) {
  session.funnelStage = 'purchase_intent';
  session.buyingIntent = true;
  session.buyingConfidence = Math.max(session.buyingConfidence, 0.8);
  return respond(
    `Excellent! Ready when you are. Here's your fast path:

1. **Sign up** — takes 30 seconds, no credit card.
2. **Upload your docs** — PDF, markdown, or website URL.
3. **Get your embed snippet** — paste it on your site.
4. **Go live** — your AI assistant is ready.

Your 14-day Professional trial starts immediately. Click below to begin.`,
    [], 'signup', 'Create Free Account', '/signup');
}

function handleContact(session) {
  return respond(
    `You can reach us at **hello@conversation-engine.com** — we typically respond within 2 hours during business hours.

If you're evaluating, the fastest way to see it in action is starting a free trial — most teams are live in under 10 minutes.`,
    [
      { id: 'ct1', label: 'Start Free Trial', action: 'navigate', payload: '/signup', variant: 'primary' },
      { id: 'ct2', label: 'Schedule Sales Call', action: 'send_text', payload: 'Schedule a sales call with the team', variant: 'secondary' },
    ],
    'signup', 'Start Free Trial', '/signup');
}

// ─── Objection Handlers ────────────────────────────────────
function handleObjection(intent, userMsg, session, pitch) {
  const handlers = {
    objection_price: () => ({
      text: `I hear that. Here's how teams think about the ROI:

\u2022 Most customers see 30-50% ticket deflection within the first month.
\u2022 At $29/mo for Starter, that's less than $1/day.
\u2022 The Professional plan ($99/mo) pays for itself if it saves 2 hours of support time per week.

Would a quick ROI calculation help you evaluate?`,
      qrs: [
        { id: 'op1', label: 'Show Me the ROI', action: 'send_text', payload: 'Show me the ROI calculation', variant: 'primary' },
        { id: 'op2', label: 'Start With Free Plan', action: 'navigate', payload: '/signup', variant: 'secondary' },
      ],
      cta: 'none',
    }),
    objection_competitor: () => ({
      text: `That makes sense. A few things our customers found when they compared:

\u2022 **Our grounding** means zero hallucination — every answer cites its source.
\u2022 **Setup takes 10 minutes**, not weeks of training.
\u2022 **Pricing is transparent** — no per-agent or per-query fees.

Would a side-by-side comparison with your current solution help?`,
      qrs: [
        { id: 'oc1', label: 'Compare Side by Side', action: 'send_text', payload: 'Show me a comparison with my solution', variant: 'primary' },
        { id: 'oc2', label: 'Try for Free', action: 'navigate', payload: '/signup', variant: 'secondary' },
      ],
      cta: 'none',
    }),
    objection_implementation: () => ({
      text: `One of our strengths, actually:

\u2022 Setup takes **under 10 minutes** for the core integration.
\u2022 **No code required** — the embed is a one-line snippet.
\u2022 **Zero downtime** — the widget runs alongside your existing setup.
\u2022 **Import from your helpdesk** — connect Zendesk or Intercom directly.

I can walk you through the exact steps if that helps.`,
      qrs: [
        { id: 'oi1', label: 'Walk Me Through Setup', action: 'send_text', payload: 'Walk me through the setup process step by step', variant: 'primary' },
        { id: 'oi2', label: 'See Setup Guide', action: 'navigate', payload: '/docs/setup', variant: 'secondary' },
      ],
      cta: 'none',
    }),
    objection_security: () => ({
      text: `Completely fair to ask. Here's what we're certified for:

\u2022 **SOC 2 Type II** — independently audited each year.
\u2022 **GDPR** — DPA available, data residency in US, EU, or APAC.
\u2022 **HIPAA** — available on Enterprise with BAA.
\u2022 **Encryption** — AES-256 at rest, TLS 1.3 in transit.
\u2022 **Pen testing** — annual third-party tests, reports on request.

Would you like to review the full security documentation?`,
      qrs: [
        { id: 'os1', label: 'View Security Docs', action: 'navigate', payload: '/security', variant: 'primary' },
        { id: 'os2', label: 'Talk to Security Team', action: 'send_text', payload: 'Connect me with your security team', variant: 'secondary' },
      ],
      cta: 'none',
    }),
  };

  const handler = handlers[intent];
  if (!handler) return handleMomentum(session, pitch);

  const result = handler();
  return respond(result.text, result.qrs, result.cta);
}

// ─── Momentum & Qualification ──────────────────────────────
const MOMENTUM_FLOW = ['features', 'pricing', 'roi', 'trial'];

function advanceMomentum(current) {
  const idx = MOMENTUM_FLOW.indexOf(current);
  if (idx < 0 || idx >= MOMENTUM_FLOW.length - 1) return 'trial';
  return MOMENTUM_FLOW[idx + 1];
}

function handleMomentum(session, pitch) {
  // Check if we should ask a qualification question (spread naturally)
  if (session.conversationCount >= 3 && session.conversationCount <= 8 && !session.qualification.completed) {
    const q = nextQualQuestion(session);
    if (q && (session.lastIntent === 'features' || session.lastIntent === 'pricing' || session.lastIntent === 'agreement')) {
      session.qualification.qIndex = QUAL_QUESTIONS.indexOf(q);
      return respond(
        `Got it. ${q.q}`,
        [], 'none');
    }
  }

  // If buying intent is high, offer ONE CTA
  if (session.buyingIntent && session.buyingConfidence > 0.6) {
    return respond(
      `Based on our conversation, it sounds like Conversation Engine could be a good fit. Would you like to start the free trial and see it with your own documentation?`,
      [], 'signup', 'Start Free Trial', '/signup');
  }

  // Advance momentum
  const nextStage = advanceMomentum(session.momentumStage);
  session.momentumStage = nextStage;

  const momentumResponses = {
    features: () => ({
      text: `I'd recommend starting with an overview of what we do. ${pitch.hook}

Would you like a quick walkthrough of the key features?`,
      qrs: [
        { id: 'm1', label: 'Show Me Features', action: 'send_text', payload: 'What features do you offer?', variant: 'primary' },
        { id: 'm2', label: 'Pricing', action: 'send_text', payload: 'What are your pricing tiers?', variant: 'secondary' },
      ],
      cta: 'none',
    }),
    pricing: () => ({
      text: `After features, the next question is usually about pricing. We have plans from free to enterprise.

${getFollowUp('pricing', session)}`,
      qrs: [
        { id: 'm3', label: 'Show Pricing', action: 'send_text', payload: 'What are your pricing tiers?', variant: 'primary' },
        { id: 'm4', label: 'Integrations', action: 'send_text', payload: 'What integrations do you support?', variant: 'secondary' },
      ],
      cta: 'none',
    }),
    roi: () => ({
      text: `Most teams see a strong ROI — 30-50% ticket deflection, faster response times, and knowledge gap insights that improve their docs.

Would you like to see how that would look for your team specifically?`,
      qrs: [
        { id: 'm5', label: 'Calculate My ROI', action: 'send_text', payload: 'Calculate ROI for my team', variant: 'primary' },
        { id: 'm6', label: 'Start Free Trial', action: 'navigate', payload: '/signup', variant: 'secondary' },
      ],
      cta: 'none',
    }),
    trial: () => ({
      text: `Ready to give it a shot? Your 14-day free trial includes full access to the Professional plan — no credit card needed.

Most customers go from signup to live in under 10 minutes.`,
      qrs: [
        { id: 'm7', label: 'Start My Free Trial', action: 'navigate', payload: '/signup', variant: 'primary' },
        { id: 'm8', label: 'I Have Questions', action: 'send_text', payload: 'I have a few more questions', variant: 'secondary' },
      ],
      cta: 'signup',
      ctaLabel: 'Start Free Trial',
      ctaLink: '/signup',
    }),
  };

  const handler = momentumResponses[nextStage] || momentumResponses.features;
  const result = handler();
  return respond(result.text, result.qrs, result.cta, result.ctaLabel, result.ctaLink);
}

// ─── Session ID Extraction ─────────────────────────────────
function extractSessionId(messages) {
  for (const m of messages) {
    if (m.role === 'user') {
      const s = m.content.match(/session[:_]\s*(\S+)/i);
      if (s) return s[1];
    }
  }
  const all = messages.map(m => m.content || '').join('|');
  let h = 0;
  for (let i = 0; i < all.length; i++) { h = ((h << 5) - h) + all.charCodeAt(i); h = h & h; }
  return `s-${Math.abs(h).toString(16)}`;
}

// ─── Response Helper ───────────────────────────────────────
function respond(text, quickReplies, cta, ctaLabel, ctaLink) {
  const result = { response: text, quickReplies: quickReplies || [], cta: { primaryCTA: cta || 'none', label: ctaLabel || '', link: ctaLink || '' } };
  result.confidence = 0.92;
  result.safetyFlags = [];
  result.reasoning = { tone: 'helpful', salesPressure: cta === 'signup' ? 'medium' : 'low', knowledgeReferenced: [], ctaTiming: cta !== 'none' ? 'appropriate' : 'defer', followUpSupported: true };
  return result;
}

// ─── HTTP Server ───────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && (req.url === '/v1/chat/completions' || req.url === '/chat/completions')) {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        const messages = parsed.messages || [];
        const userMsgs = messages.filter(m => m.role === 'user');
        const last = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content : '';
        const sessionId = extractSessionId(messages);
        const result = build(last, messages, sessionId);

        const delay = 50 + Math.random() * 150;
        setTimeout(() => {
          const openai = {
            id: 'cmpl-' + Date.now(), object: 'chat.completion', created: Math.floor(Date.now() / 1000),
            model: parsed.model || 'gpt-4o-mini',
            choices: [{ index: 0, message: { role: 'assistant', content: JSON.stringify(result) }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 },
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(openai));
        }, delay);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: err.message } }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = parseInt(process.env.PORT || '3458', 10);
server.listen(PORT, () => console.log(`Mock LLM server running on :${PORT}`));
