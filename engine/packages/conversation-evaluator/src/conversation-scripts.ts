import { PersonaType, ScenarioType } from './types';

export interface ConversationScript {
  id: string;
  persona: PersonaType;
  scenario: ScenarioType;
  label: string;
  conversationGoal: string;
  userMessages: string[];
  baseResponses: string[];
}

export const ALL_CONVERSATIONS: ConversationScript[] = [
  // ========================================================================
  // PERSONA: shopify_merchant (1–5)
  // ========================================================================

  {
    id: 'shopify_merchant_curious',
    persona: 'shopify_merchant',
    scenario: 'curious',
    label: 'Shopify Merchant — Curious',
    conversationGoal: 'Explore how the AI handles customer support for a growing Shopify store',
    userMessages: [
      'Hey there! I run a Shopify store selling handmade candles — about 200 orders a month. I\'ve been getting way too many support emails and I\'m drowning. What exactly does your platform do?',
      'That sounds promising. How does it integrate with Shopify? Like, does it pull in order data so customers can ask "where\'s my package?" without me doing anything?',
      'Nice. What about answering product questions — like wax melt points or scent longevity? My customers ask that stuff all the time.',
      'Can I control the tone? I want it to sound friendly and a bit quirky, like my brand voice, not like a corporate robot.',
      'Alright, this is looking good. What\'s the next step if I want to try it out?',
    ],
    baseResponses: [
      'Our platform automates customer support for ecommerce stores. It handles common questions, order lookups, and issue triage so you can focus on making candles instead of answering the same email ten times.',
      'Yes, it integrates directly with Shopify — it connects to your order API, so customers can ask about order status, tracking, returns, and product availability in real time.',
      'Absolutely. You can upload your product catalog and knowledge base, and the AI learns the specifics — wax types, dimensions, scent profiles, whatever your customers typically ask about.',
      'You have full control over the tone and voice. You set the style guidelines and the AI adapts — quirky, professional, warm, whatever fits your brand.',
      'You can start a free 14-day trial with no credit card required. We\'ll help you import your Shopify data and get the bot trained on your products within a day.',
    ],
  },

  {
    id: 'shopify_merchant_skeptical',
    persona: 'shopify_merchant',
    scenario: 'skeptical',
    label: 'Shopify Merchant — Skeptical',
    conversationGoal: 'Address concerns about automation quality and loss of personal touch',
    userMessages: [
      'I keep seeing these "AI support" tools pop up everywhere. Most of them are garbage — they give wrong answers and customers get frustrated. Why would yours be any different?',
      'Alright, but my customers expect a personal touch. I reply to every message myself, and people appreciate that. Won\'t an AI bot make things feel... robotic?',
      'What happens when the AI doesn\'t know the answer? Does it just make something up? I can\'t have my store giving out wrong information about shipping times or product details.',
      'I\'ve heard horror stories about setup taking weeks. I don\'t have time for that. How long until this thing is actually useful?',
      'And what about cost? I\'m already paying for a dozen apps on Shopify. I don\'t want another monthly fee that doesn\'t pay for itself.',
    ],
    baseResponses: [
      'I hear the skepticism. We\'ve designed the system to only answer questions it\'s confident about — everything else gets escalated to you. The accuracy improves as it learns from your product data and past conversations.',
      'You can customize the tone to match your voice exactly, and every bot response includes a clear path to talk to you if the customer prefers. It\'s not replacing your personal touch — it\'s handling the repetitive stuff so you have more time for the conversations that matter.',
      'The AI is trained on your specific data — products, policies, shipping info. If it doesn\'t know something with confidence, it says so and offers to connect the customer to you. No hallucinated answers.',
      'Basic setup with Shopify takes about an hour. Full customization with your brand voice and product knowledge usually takes a day or two. Our team handles the heavy lifting.',
      'We have a Starter plan at $49/month designed for stores your size. Most merchants see a reduction in support tickets within the first month, so it typically pays for itself in time saved.',
    ],
  },

  {
    id: 'shopify_merchant_price_sensitive',
    persona: 'shopify_merchant',
    scenario: 'price_sensitive',
    label: 'Shopify Merchant — Price Sensitive',
    conversationGoal: 'Find an affordable plan that fits a small store budget',
    userMessages: [
      'What are your prices? I\'m a small operation — I can\'t drop hundreds a month on another tool.',
      'I saw your Starter plan at $49/month, but honestly that still feels steep. We\'re doing maybe 150 orders a month. How many tickets would that actually cover?',
      'Are there any hidden fees? I hate when I sign up for something and there\'s extra charges for setup, training, or "premium" features that should be standard.',
      'What if I only want it on certain products? Like, I don\'t need AI answering questions about my limited editions — those are too nuanced.',
      'Do you have a month-to-month option? I\'m not locking into a year contract. If this doesn\'t work out in the first few months, I want to walk away.',
    ],
    baseResponses: [
      'Our Starter plan is $49/month and covers up to 500 conversations monthly. For your volume, that would likely be more than enough. There\'s also a free 14-day trial so you can see the value before committing.',
      'At 150 orders, you\'d probably be well under the 500-conversation limit. Most stores at your volume see about 50–80 support conversations per month, so you\'d have plenty of headroom.',
      'No hidden fees at all. The $49 is the full price — includes setup assistance, Shopify integration, and all features. No extra charges for setup, training, or standard features.',
      'You have full control over which products the AI handles. You can set rules per product, category, or collection. Complex items can be excluded and routed directly to you.',
      'Month-to-month, cancel anytime. No contracts, no commitments. If it doesn\'t work out in the first month, you\'re free to leave with no penalties.',
    ],
  },

  {
    id: 'shopify_merchant_technical',
    persona: 'shopify_merchant',
    scenario: 'technical',
    label: 'Shopify Merchant — Technical',
    conversationGoal: 'Understand Shopify integration depth, API access, and customization',
    userMessages: [
      'I\'m a developer who also runs the store. How deep does your Shopify integration go? Does it read order notes and customer tags?',
      'Can I customize the response templates with Liquid variables? I want order data injected dynamically into the replies.',
      'What about webhooks? I want the bot to fire a webhook when a conversation escalates so I get notified in Slack.',
      'Do you have a public API? I\'d like to build a custom dashboard that shows conversation analytics alongside my other metrics.',
      'How does the AI handle multi-currency? We sell in USD, CAD, and EUR, and pricing questions need to reference the right currency.',
    ],
    baseResponses: [
      'The integration is quite deep. It pulls orders, products, collections, customer notes, tags, and more via the Shopify Admin API. You can configure exactly which data fields it has access to.',
      'Yes, responses support dynamic variables including Liquid syntax for Shopify data. You can template in order status, tracking numbers, product details, and customer info.',
      'Webhooks are supported for escalation events, new conversations, and customer satisfaction ratings. You can route them to Slack, email, or any HTTP endpoint you configure.',
      'We have a REST and GraphQL API that exposes conversation logs, metrics, and configuration. You can build custom dashboards or integrate with your existing BI tools.',
      'Multi-currency is handled automatically — the bot detects the order currency and adjusts pricing and shipping responses accordingly. You configure the supported currencies in settings.',
    ],
  },

  {
    id: 'shopify_merchant_ready_for_trial',
    persona: 'shopify_merchant',
    scenario: 'ready_for_trial',
    label: 'Shopify Merchant — Ready for Trial',
    conversationGoal: 'Start a trial quickly and get the Shopify integration running',
    userMessages: [
      'Alright, I\'m sold. I want to start the trial today. What do I need to do?',
      'I already installed the app. Now what? How do I connect my Shopify store?',
      'Okay, it\'s connected. I can see my products loading. How do I teach it about my return policy and shipping info?',
      'Can I test it before it goes live? I want to send some test messages and see how it responds.',
      'Looks good so far. When I\'m ready, how do I turn it on for real customers?',
    ],
    baseResponses: [
      'Great choice! Go ahead and install our Shopify app from the App Store. It will guide you through connecting your store. The trial is 14 days, fully featured, no credit card needed.',
      'Once the app is installed, you\'ll be walked through the connection wizard. It authorizes with your Shopify Admin API and starts importing your products, orders, and customer data automatically.',
      'You can add your policies in the Knowledge Base section. There\'s a template for returns, shipping, and FAQs. You can also upload existing documents or paste the content directly.',
      'Yes, there\'s a testing sandbox mode. You can simulate conversations and see how the bot responds before it goes live. It won\'t interact with real customers until you flip the switch.',
      'When you\'re ready, just toggle "Live Mode" in the dashboard. We recommend starting with 50% of traffic to make sure everything runs smoothly, then scaling up from there.',
    ],
  },

  // ========================================================================
  // PERSONA: saas_founder (6–10)
  // ========================================================================

  {
    id: 'saas_founder_curious',
    persona: 'saas_founder',
    scenario: 'curious',
    label: 'SaaS Founder — Curious',
    conversationGoal: 'Learn how the platform can handle B2B SaaS support at scale',
    userMessages: [
      'We\'re a B2B SaaS company — about 5000 users. Our support team is overwhelmed and we\'re looking into automation. Can you handle technical product questions?',
      'Our product has a lot of depth — different permission levels, integrations, API keys. Can the AI understand context like which plan a user is on?',
      'What about onboarding? We have a 30-day onboarding flow and customers ask tons of questions during that period. Could the bot handle that?',
      'How does it handle billing questions? Our pricing is usage-based and it gets complicated. I don\'t want it quoting wrong numbers.',
      'Can the bot proactively offer help based on what the user is doing in the app, or does it only react to messages?',
    ],
    baseResponses: [
      'Yes, we specialize in SaaS support automation. The AI ingests your documentation, help center articles, and product specs to answer technical questions accurately.',
      'Absolutely — it pulls user context from your app via API integration, including plan tier, permissions, feature access, and account history. Responses are personalized to each user\'s context.',
      'Onboarding is one of our most common use cases. The bot can guide users through setup steps, answer FAQs about the onboarding flow, and escalate blockers to your success team.',
      'Billing integration pulls real-time usage data and plan details. The AI quotes current charges and plan limits, and flags anything uncertain for human review before quoting.',
      'We support proactive messaging based on in-app events. If a user hits an error or lingers on a setup page, the bot can offer help without them having to type a message first.',
    ],
  },

  {
    id: 'saas_founder_skeptical',
    persona: 'saas_founder',
    scenario: 'skeptical',
    label: 'SaaS Founder — Skeptical',
    conversationGoal: 'Challenge the AI\'s ability to handle nuanced support scenarios',
    userMessages: [
      'I\'ve implemented chatbots before and they were a disaster. Customers hated them. Why is this one different?',
      'Our customers ask very specific technical questions — things that require understanding their entire setup. Can your AI really handle complexity like that?',
      'What about my support team? Won\'t they feel like you\'re replacing them? I\'ve got a great team and I don\'t want to lose morale.',
      'I\'m worried about data privacy. Our customers trust us with their business data. Where is this information stored? Are you reading our conversations to train your models?',
      'Everyone promises "easy setup" but it always takes weeks. What\'s the real timeline to go from zero to fully operational?',
    ],
    baseResponses: [
      'Most chatbots fail because they\'re rule-based and can\'t handle nuance. Our AI is context-aware — it understands the product, the user, and the conversation history. It doesn\'t just match keywords.',
      'The AI can access the user\'s configuration, plan, and history through your API. When a user asks something that depends on their specific setup, the bot pulls the relevant context before responding.',
      'Your team becomes more valuable — they handle the complex edge cases while the bot manages the repetitive questions. Every team we\'ve worked with has seen higher job satisfaction because they\'re doing more meaningful work.',
      'Your data stays yours. We\'re SOC 2 compliant and offer data residency options. We do not train on your customer conversations unless you explicitly opt in, and we encrypt everything at rest and in transit.',
      'For a standard SaaS setup: one day for integration, two days for knowledge import and training, one day for testing. Most teams are live within a week. We have dedicated engineers helping with setup.',
    ],
  },

  {
    id: 'saas_founder_price_sensitive',
    persona: 'saas_founder',
    scenario: 'price_sensitive',
    label: 'SaaS Founder — Price Sensitive',
    conversationGoal: 'Find cost-effective pricing for an early-stage SaaS startup',
    userMessages: [
      'We\'re an early-stage startup — seed funded, 10 employees. We need to keep costs low. What\'s the minimum viable plan?',
      'Is there a free tier? We\'d want to prove it works before we invest real budget.',
      'What\'s the pricing based on? Number of conversations? Seats? I need to model what this looks like as we grow.',
      'Can we start with a small scope — just onboarding support — and add features later? I don\'t want to pay for a full suite we\'re not using.',
      'If we grow from 5000 to 50000 users, how much would our bill go up? I need to make sure we don\'t paint ourselves into a corner.',
    ],
    baseResponses: [
      'We have a Startup plan at $99/month that includes 1000 conversations and all core features. For your team size, that would be the right starting point, and it scales as you grow.',
      'We offer a 14-day free trial with full features, no credit card. If you\'re a Y Combinator or Techstars company, we also have a startup discount program with 6 months at 50% off.',
      'Pricing is primarily based on conversation volume — number of conversations the bot handles per month. There\'s no per-seat charge, so your entire customer base is covered under one plan.',
      'Absolutely. You can enable specific modules based on your needs. Start with onboarding-only, then add general support, billing, and proactive messaging as you go. You only pay for what you use.',
      'Pricing scales with volume. When you grow, you move up tiers, but the per-conversation cost actually decreases. Our Professional plan covers up to 10,000 conversations at $299/month, and Enterprise is custom priced.',
    ],
  },

  {
    id: 'saas_founder_technical',
    persona: 'saas_founder',
    scenario: 'technical',
    label: 'SaaS Founder — Technical',
    conversationGoal: 'Evaluate API depth, integration capabilities, and customization',
    userMessages: [
      'I\'m technical — I built the product. Walk me through the integration architecture. How does the bot communicate with my SaaS backend?',
      'Can the bot authenticate API calls on behalf of the user? We have granular permission scopes and I need the bot to respect those.',
      'What about embedding the widget inside our app vs on a website? We want it in-product, not on a marketing site.',
      'Our product uses GraphQL. Can the AI generate queries on the fly based on user intent?',
      'How customizable is the NLP model? We have domain-specific terminology that generic models get wrong.',
    ],
    baseResponses: [
      'You integrate via our REST API or WebSocket for real-time communication. The bot connects to your backend to pull user context, product data, and perform actions on behalf of users. We provide SDKs for Node.js, Python, and Ruby.',
      'Yes, you pass an auth token with the user\'s session, and the bot operates within those permission boundaries. It can only access data and perform actions the user is authorized to do.',
      'We support in-app embedding via a JavaScript widget that mounts in your application DOM. It inherits your app\'s authentication and UI theme. No redirects or iframes.',
      'Yes, the AI can construct and execute GraphQL queries against your API. You define the schema and allowed operations, and the bot generates queries based on the user\'s natural language request.',
      'You can fine-tune the NLP model on your domain — upload glossaries, train on past conversations, and define custom intents. The more you train it, the better it handles your specific terminology.',
    ],
  },

  {
    id: 'saas_founder_ready_for_trial',
    persona: 'saas_founder',
    scenario: 'ready_for_trial',
    label: 'SaaS Founder — Ready for Trial',
    conversationGoal: 'Get started immediately with a trial focused on onboarding automation',
    userMessages: [
      'I want to start the trial right now. Can I get it set up this afternoon?',
      'My developer is standing by. What do they need to do for the integration?',
      'We\'re importing our help center articles now. How long until the AI is trained on them?',
      'I want the bot to handle only onboarding questions at first. Can I scope that down?',
      'When can my support team start monitoring the conversations? I want them to shadow before the bot goes live.',
    ],
    baseResponses: [
      'Absolutely! I\'ll get your trial account set up right now. You\'ll receive an invite link. We can have your first integration connected within the hour.',
      'Your developer needs to install our SDK and set up the API integration for user context. We\'ll provide documentation and a quick onboarding call to walk through the configuration.',
      'The AI processes your articles immediately once they\'re uploaded. Initial training takes about 15–30 minutes, then it improves over time as it encounters real questions.',
      'Definitely. You can enable just the Onboarding module and disable everything else. We\'ll configure it to only answer questions related to setup, configuration, and first-time use.',
      'We have a "shadow mode" where the bot can suggest responses but only your team replies. This lets your team review the bot\'s answers and build confidence before going live.',
    ],
  },

  // ========================================================================
  // PERSONA: enterprise_it_manager (11–15)
  // ========================================================================

  {
    id: 'enterprise_it_manager_curious',
    persona: 'enterprise_it_manager',
    scenario: 'curious',
    label: 'Enterprise IT Manager — Curious',
    conversationGoal: 'Explore enterprise-grade features, compliance, and scalability',
    userMessages: [
      'I manage IT for a 2000-person company. We\'re looking at AI support solutions. What enterprise capabilities do you have?',
      'SSO and SAML are non-negotiable for us. Do you support Okta and Azure AD?',
      'What about SLA guarantees? If the bot goes down, we need to know our support isn\'t dead in the water.',
      'We\'re in a regulated industry. Do you have audit logs of every conversation? Our compliance team will want that.',
      'How does the bot handle multiple departments? We have IT, HR, and Finance all wanting different bots or at least different knowledge bases.',
    ],
    baseResponses: [
      'Our enterprise plan includes SSO, role-based access control, audit logging, data residency options, 99.9% uptime SLA, and dedicated infrastructure if needed. We serve several Fortune 500 companies.',
      'Yes, we support SAML 2.0, Okta, Azure AD, and OneLogin. You can provision users automatically via SCIM and enforce your existing authentication policies.',
      'We offer 99.9% uptime SLA on enterprise plans with guaranteed response times. If the primary instance goes down, traffic automatically fails over to a redundant region within 30 seconds.',
      'Every conversation is logged with full transcript, timestamps, user identity, and system actions. Logs are immutable and retained per your policy. We integrate with Splunk and Datadog for SIEM.',
      'You can create multiple bot instances or use "knowledge groups" within a single bot, each with its own knowledge base, tone rules, and escalation paths. Access can be scoped per department.',
    ],
  },

  {
    id: 'enterprise_it_manager_skeptical',
    persona: 'enterprise_it_manager',
    scenario: 'skeptical',
    label: 'Enterprise IT Manager — Skeptical',
    conversationGoal: 'Address skepticism about reliability, security, and vendor lock-in',
    userMessages: [
      'We\'ve been burned by vendors who promised "enterprise grade" and delivered a toy. What makes you different?',
      'I need hard security documentation — SOC 2 Type II report, penetration test results, data processing agreement. Can you provide those before we even talk pricing?',
      'What\'s the data retention policy? If we leave, do you delete our data immediately or hold it hostage?',
      'How do you handle PII and sensitive data in conversations? Our employees might share personal info with the bot.',
      'What happens during a security incident? What\'s your disclosure timeline?',
    ],
    baseResponses: [
      'I understand the skepticism. We publish our SOC 2 Type II report publicly, welcome third-party penetration testing, and provide a detailed architecture document. Our enterprise customers have vetted us thoroughly.',
      'Absolutely — I can share our SOC 2 report, pentest summary, DPA, and T&C\'s today. We also support custom security reviews with your team. Security is not gated behind a sales process.',
      'You control data retention policies per conversation type. If you cancel, we delete all your data within 30 days and provide a final export. No lock-in, no data hostage scenarios.',
      'The bot is trained to detect PII and can mask, redact, or avoid storing sensitive information. You configure the sensitivity rules. We also support on-premise deployment for the strictest requirements.',
      'We have a 24-hour disclosure policy for critical incidents. Our security team publishes a post-mortem within 72 hours. You can subscribe to our security advisory feed for real-time updates.',
    ],
  },

  {
    id: 'enterprise_it_manager_price_sensitive',
    persona: 'enterprise_it_manager',
    scenario: 'price_sensitive',
    label: 'Enterprise IT Manager — Price Sensitive',
    conversationGoal: 'Justify the investment to leadership with clear ROI',
    userMessages: [
      'Enterprise pricing is always "custom." Give me a realistic range so I know if this is even in the ballpark.',
      'Our support team handles about 15,000 tickets a month. What would that cost? I need to build a business case.',
      'What\'s the ROI model? If I go to my CFO, I need to show that this saves money, not just that it\'s "better."',
      'Are implementation and training extra? Enterprise vendors love to nickel-and-dime with "professional services" fees.',
      'Can we start with a department-level pilot before rolling out company-wide? I need to prove value with a smaller commitment first.',
    ],
    baseResponses: [
      'Enterprise plans typically range from $1,500 to $5,000 per month depending on volume and deployment complexity. For a company your size with full compliance requirements, expect around $2,500–$3,500/month.',
      'At 15,000 tickets, you\'re looking at roughly $2,500–$3,000/month on our Enterprise plan. Most companies at your volume automate 40–60% of tickets, which translates to significant cost savings.',
      'We provide an ROI calculator. Typical enterprise customers see 3–5x ROI within 6 months. The savings come from ticket deflection, faster resolution times, and reduced need to hire additional support staff.',
      'Implementation and training are included in the enterprise plan. Our customer success team handles the setup and provides training for your team at no additional cost. No hidden professional services fees.',
      'Absolutely. We can start with a single department pilot — typically IT or HR — with a 30-day commitment. Once the value is proven, we plan the company-wide rollout together.',
    ],
  },

  {
    id: 'enterprise_it_manager_technical',
    persona: 'enterprise_it_manager',
    scenario: 'technical',
    label: 'Enterprise IT Manager — Technical',
    conversationGoal: 'Evaluate technical architecture, deployment options, and infrastructure',
    userMessages: [
      'Walk me through the architecture. Where is the bot hosted? On-prem possible? We have strict data residency requirements.',
      'What directory services can you integrate with beyond Okta? We\'re on Azure AD and want to sync org charts and manager relationships.',
      'Can the bot trigger workflows in our ITSM tool? Like, if a certain issue is detected, can it automatically create a ticket in ServiceNow?',
      'What\'s the latency profile? If a user asks a question, how fast does the bot respond at the 95th percentile?',
      'How does the bot handle high availability? If one region goes down, what happens?',
    ],
    baseResponses: [
      'We support cloud (AWS/GCP/Azure), dedicated single-tenant, and on-premise deployment. For on-prem, we provide a Docker-based deployment that runs in your Kubernetes cluster with your infrastructure.',
      'Azure AD is fully supported — we sync users, groups, org hierarchy, and manager relationships. The bot uses this context to understand who reports to whom within the company.',
      'Yes, we have native ServiceNow integration and can trigger ticket creation, updates, and closure from conversations. We also support Jira, Zendesk, and generic webhook-based workflows.',
      'P95 response time is under 1.5 seconds for most queries. Complex queries that require multiple API calls average under 3 seconds. We cache frequently asked questions for near-instant responses.',
      'We run in multiple availability zones within each region. Regional failover happens within 30 seconds with no data loss. Enterprise customers get geo-redundant deployment with active-active configuration.',
    ],
  },

  {
    id: 'enterprise_it_manager_ready_for_trial',
    persona: 'enterprise_it_manager',
    scenario: 'ready_for_trial',
    label: 'Enterprise IT Manager — Ready for Trial',
    conversationGoal: 'Set up an enterprise trial with specific security and compliance requirements',
    userMessages: [
      'We\'re ready to run a trial. Our legal team needs a DPA signed first. Can you expedite that?',
      'Good, DPA is signed. I want the trial deployed in our Azure tenant. Is that possible?',
      'We\'re going to start with IT support only — password resets, software access requests, that kind of thing. Can the bot handle those?',
      'My security team wants to do a penetration test during the trial period. Is that allowed?',
      'Let\'s set a kickoff call for next week. Can we aim for Tuesday? I want my integration lead and security contact on the call.',
    ],
    baseResponses: [
      'Yes, I\'ll send our standard DPA to your legal team today. We also support custom DPAs for enterprise customers and can typically get them signed within 2 business days.',
      'Yes, we can deploy the trial instance in your Azure subscription using our Azure Marketplace offering. You control the VNet, encryption keys, and network policies.',
      'Password resets and software access requests are standard use cases for us. The bot can verify identity, trigger automated password resets, and route software requests to your approval workflow.',
      'No problem at all. We welcome penetration testing. Just give us a heads-up on the scope and timing so our operations team is aware. We\'ll provide a test environment isolated from production.',
      'Tuesday works. I\'ll send a calendar invite. We\'ll have our solutions engineer, your integration lead, and security contact on the call to map out the technical setup.',
    ],
  },

  // ========================================================================
  // PERSONA: healthcare_clinic (16–20)
  // ========================================================================

  {
    id: 'healthcare_clinic_curious',
    persona: 'healthcare_clinic',
    scenario: 'curious',
    label: 'Healthcare Clinic — Curious',
    conversationGoal: 'Explore HIPAA-compliant patient support automation',
    userMessages: [
      'I run a small family clinic with about 50 patients a day. We\'re interested in automating appointment scheduling and patient FAQs. Is your platform HIPAA compliant?',
      'How does the bot handle appointment booking? Can it check our calendar and book slots without human intervention?',
      'What about insurance questions? Patients always ask if we accept their insurance, and the answer varies by policy type.',
      'Can the bot send appointment reminders? We have a lot of no-shows and that kills our revenue.',
      'We have a bilingual patient population — English and Spanish. Does the bot handle both?',
    ],
    baseResponses: [
      'Yes, we are fully HIPAA compliant. We sign BAAs with all healthcare customers, encrypt all PHI at rest and in transit, and our infrastructure is audited annually by a third party.',
      'Yes, the bot integrates with your scheduling system — we support Epic, Athenahealth, and most major EHRs. Patients can book, reschedule, or cancel appointments through natural conversation.',
      'The bot can check a patient\'s insurance against your accepted plans list. For complex cases, it collects the details and passes them to your billing team with full context.',
      'Yes, automated reminders via SMS, email, or both. You configure the timing — 48 hours, 24 hours, and 1 hour before the appointment. We\'ve seen no-show rates drop by 40% on average.',
      'Yes, the bot supports English and Spanish natively, and can switch between them mid-conversation if the patient switches. More languages can be added based on your patient demographics.',
    ],
  },

  {
    id: 'healthcare_clinic_skeptical',
    persona: 'healthcare_clinic',
    scenario: 'skeptical',
    label: 'Healthcare Clinic — Skeptical',
    conversationGoal: 'Address concerns about medical liability and patient safety',
    userMessages: [
      'I\'m wary of AI in healthcare. If the bot gives wrong medical advice, that\'s a liability nightmare. How do you prevent that?',
      'What if a patient describes symptoms? Is the bot going to play doctor? That\'s dangerous.',
      'My older patients aren\'t tech-savvy. They struggle with simple websites. A chatbot would confuse them even more.',
      'Our staff has been doing this for years. They know our patients personally. A bot can\'t replicate that relationship.',
      'If the system goes down, we need a backup. We can\'t have patients unable to book appointments.',
    ],
    baseResponses: [
      'The bot is explicitly designed NOT to give medical advice. It handles administrative tasks only — scheduling, billing questions, directions, insurance. Any health-related question is immediately escalated to your staff with a disclaimer.',
      'If a patient describes symptoms, the bot responds with a gentle redirect: "I\'m not able to provide medical advice. Would you like me to schedule an appointment with a doctor?" It never diagnoses or triages.',
      'The bot has a simple, accessible interface with large buttons and clear text. It also works over SMS, which most older adults are comfortable with. Voice support is available for those who prefer speaking.',
      'The bot doesn\'t replace your staff\'s personal touch. It handles the administrative burden — the 50 "what are your hours?" calls a day — so your team has more time for meaningful patient interactions.',
      'We have built-in redundancy. If the bot can\'t reach our servers, it gracefully falls back to a static message with your phone number and hours. You can also configure a local backup script.',
    ],
  },

  {
    id: 'healthcare_clinic_price_sensitive',
    persona: 'healthcare_clinic',
    scenario: 'price_sensitive',
    label: 'Healthcare Clinic — Price Sensitive',
    conversationGoal: 'Find affordable HIPAA-compliant support for a small clinic',
    userMessages: [
      'We\'re a small clinic — not a hospital network. Our budget is tight. How much does the HIPAA-compliant plan cost?',
      'We see about 50 patients a day. Most of the questions are basic — hours, directions, appointment availability. Do I really need all the features?',
      'Is the BAA included or is that extra? I\'ve had vendors charge me extra just for signing a compliance document.',
      'What\'s the cheapest way to try this out? I want to see if it actually reduces our front desk calls before I commit real money.',
      'Can I start with just appointment reminders and add the chatbot later? That\'s our biggest pain point right now.',
    ],
    baseResponses: [
      'Our HIPAA-compliant plan starts at $149/month for clinics. This includes the BAA, encrypted data storage, and all compliance features. For a clinic your size, that\'s the standard plan.',
      'For your volume, the Essentials plan at $149/month covers appointment scheduling, FAQs, and reminders. That\'s likely all you need. You can add features later as you grow.',
      'The BAA is included at no extra cost. We sign it as part of onboarding — no upcharge for compliance. It\'s standard for all our healthcare customers.',
      'We offer a 14-day free trial that\'s fully HIPAA compliant. You can connect your calendar, set up reminders, and see the impact on your front desk workload before spending a dime.',
      'Absolutely — you can activate just the Appointment Reminders module first. That\'s a standalone feature at $49/month. When you\'re ready for the full chatbot, you upgrade seamlessly.',
    ],
  },

  {
    id: 'healthcare_clinic_technical',
    persona: 'healthcare_clinic',
    scenario: 'technical',
    label: 'Healthcare Clinic — Technical',
    conversationGoal: 'Evaluate EHR integration, data security, and compliance architecture',
    userMessages: [
      'We use Athenahealth for our EHR. How does the integration work? Does it require an on-premise bridge?',
      'How are patient messages stored? Do you maintain an audit trail of every interaction?',
      'We need role-based access — front desk can see scheduling, but not clinical data. Can you enforce that?',
      'What happens to the data if we terminate the contract? We need a clear data destruction policy for PHI.',
      'Does the bot support HL7 FHIR? We\'re migrating to a FHIR-based system next year and need forward compatibility.',
    ],
    baseResponses: [
      'We connect to Athenahealth via their API — no on-premise software needed. The integration is cloud-to-cloud and handled through their secure OAuth flow. Setup takes about a day.',
      'Patient messages are encrypted and stored in our HIPAA-compliant data store with full audit logging. Every interaction is timestamped with the patient ID, staff member involved, and the content of the exchange.',
      'Yes, RBAC is fully configurable. You define roles like Front Desk, Nurse, Billing, and Admin, each with granular permissions on what patient data they can access through the bot interface.',
      'Upon termination, all PHI is deleted within 30 days with a certificate of destruction provided. You can request a one-time export of all conversation logs in a structured format before deletion.',
      'We support FHIR R4 for patient data exchange. If your EHR supports FHIR, we can integrate that way for forward compatibility with your migration plans.',
    ],
  },

  {
    id: 'healthcare_clinic_ready_for_trial',
    persona: 'healthcare_clinic',
    scenario: 'ready_for_trial',
    label: 'Healthcare Clinic — Ready for Trial',
    conversationGoal: 'Quickly launch a HIPAA-compliant trial focused on appointment reminders',
    userMessages: [
      'Let\'s do the trial. What do I need to get started today?',
      'How do I connect my calendar so the bot can check appointment availability?',
      'I want to start with appointment reminders via SMS. Our no-show rate is killing us. How fast can that go live?',
      'Do you have templates for reminder messages? I\'m not great at writing copy.',
      'Can my front desk staff monitor the reminders and see who confirmed?',
    ],
    baseResponses: [
      'I\'ll create your trial account now. You\'ll need your clinic name, address, and a basic idea of which features you want to start with. The BAA will be ready for signature within the hour.',
      'You connect your calendar through the Integration settings. We support Google Calendar, Outlook, and most EHR systems. Just authorize via OAuth and the bot will read appointment slots automatically.',
      'SMS reminders can go live today. Once your calendar is connected, you configure the reminder timing and message templates, and we enable it. Some clinics go from signup to live reminders in under 2 hours.',
      'We have pre-built templates for reminder messages — appointment confirmations, 24-hour reminders, and follow-ups. You can customize them or use our default versions that are optimized for response rates.',
      'Yes, the dashboard shows real-time status of all reminders — sent, delivered, confirmed, declined. Your front desk staff gets a simple view of who\'s coming and who needs a follow-up call.',
    ],
  },

  // ========================================================================
  // PERSONA: law_firm (21–25)
  // ========================================================================

  {
    id: 'law_firm_curious',
    persona: 'law_firm',
    scenario: 'curious',
    label: 'Law Firm — Curious',
    conversationGoal: 'Explore how AI can handle client intake and FAQ for a legal practice',
    userMessages: [
      'I\'m a partner at a mid-size law firm — about 30 attorneys. We\'re looking into client intake automation. Can your platform handle legal intake?',
      'Our clients ask a lot of preliminary questions about practice areas, fees, and case timelines. Could the bot answer those without sounding like a paralegal?',
      'We have multiple practice areas — family, criminal, corporate, real estate. Can the bot route clients to the right department?',
      'What about confidentiality? If a potential client shares case details with the bot, is that protected?',
      'Can the bot schedule consultations? Our intake team spends hours on the phone just finding mutual availability.',
    ],
    baseResponses: [
      'Yes, we have legal-specific intake capabilities. The bot can collect client information, assess practice area fit, and gather preliminary case details before a human attorney gets involved.',
      'The bot can answer general questions about your practice areas, fee structures, and typical case timelines. For anything requiring legal advice, it clearly disclaims and escalates to an attorney.',
      'Yes, the bot asks qualifying questions to determine the prospective client\'s needs and routes them to the appropriate practice area or specific attorney based on your rules.',
      'All client communications are encrypted and privileged. We sign confidentiality agreements with our law firm clients. The bot is designed to avoid collecting unnecessary sensitive details until a formal intake begins.',
      'Yes, it integrates with your calendar and finds mutually available slots. Clients can book directly through the conversation, reducing the back-and-forth your intake team handles daily.',
    ],
  },

  {
    id: 'law_firm_skeptical',
    persona: 'law_firm',
    scenario: 'skeptical',
    label: 'Law Firm — Skeptical',
    conversationGoal: 'Address concerns about AI accuracy in legal contexts and ethical obligations',
    userMessages: [
      'I have serious concerns about AI in legal services. If the bot gives incorrect legal information, the firm is liable. How do you handle that?',
      'State bar associations have strict rules about solicitation and client communication. How do you ensure compliance across jurisdictions?',
      'I\'ve seen legal chatbots that sound great but completely miss nuanced questions. Our clients don\'t know legal terminology — they ask things vaguely.',
      'We charge by the hour. If the bot handles initial consultations, aren\'t we giving away billable work?',
      'What if a client lies to the bot? People exaggerate in intake forms all the time. How does the system catch that?',
    ],
    baseResponses: [
      'The bot is designed to provide information, not legal advice. Every response includes appropriate disclaimers. It defers to attorneys for any question that touches on legal judgment. You can also review and approve all responses before they go live.',
      'We work with your compliance team to configure jurisdiction-specific rules. The bot can adapt its disclaimers, intake questions, and routing rules based on the client\'s location and your bar requirements.',
      'The AI is trained to handle ambiguity. When a client is unclear, the bot asks clarifying questions rather than guessing. If it\'s still unsure after two rounds, it escalates to a human.',
      'The bot handles the administrative layer — "what are your office hours?", "do you handle divorce cases?", etc. It generates qualified leads and booked consultations, not free legal work. Your billable hours start when the consultation begins.',
      'The bot is trained to detect inconsistencies — conflicting dates, improbable details, vague descriptions that contradict known facts. It flags these for human review rather than accepting them at face value.',
    ],
  },

  {
    id: 'law_firm_price_sensitive',
    persona: 'law_firm',
    scenario: 'price_sensitive',
    label: 'Law Firm — Price Sensitive',
    conversationGoal: 'Find cost-effective client intake automation for a small firm',
    userMessages: [
      'We\'re a small firm — 5 attorneys, 3 paralegals. Budgets are tight. What\'s this going to cost us?',
      'We get maybe 50–100 intake inquiries a month. Is there a plan that matches that volume without paying for unlimited?',
      'Are there setup fees? I don\'t want to pay $2,000 for "onboarding" just to get a simple chatbot working.',
      'Can we start with just family law intake? That\'s our busiest practice area. If it works, we\'ll expand.',
      'What\'s the ROI if we only automate intake scheduling? How much time would that actually save?',
    ],
    baseResponses: [
      'For a firm your size, our Legal Essentials plan is $199/month. It covers up to 200 intake conversations and includes practice area routing, calendar integration, and client intake forms.',
      'At 50–100 inquiries a month, the $199 plan covers you comfortably. If you exceed it, overage rates are very reasonable — $0.50 per additional conversation.',
      'No setup fees, no implementation charges. The $199 is your full monthly cost. We help you configure the bot as part of the standard onboarding included in your plan.',
      'Absolutely. You can activate just the Family Law intake module to start. We\'ll configure the questions, routing, and disclaimers for that practice area only.',
      'Our law firm customers report saving 15–20 hours per week on intake calls. At a paralegal\'s hourly rate, that\'s roughly $1,500–$2,000 in monthly savings — a 10x return on the $199 plan.',
    ],
  },

  {
    id: 'law_firm_technical',
    persona: 'law_firm',
    scenario: 'technical',
    label: 'Law Firm — Technical',
    conversationGoal: 'Evaluate document management integration, data security, and storage',
    userMessages: [
      'We use Clio for practice management and NetDocuments for document storage. Any integrations there?',
      'How do you handle document collection? Can the bot request and securely receive documents from clients?',
      'We need to retain all client communication for 7 years per our jurisdiction\'s requirements. Can you support that?',
      'What encryption standards do you use? We handle sensitive client data and need FIPS 140-2 compliance.',
      'Can the bot be configured to ask clients for identification verification before sharing case information?',
    ],
    baseResponses: [
      'Yes, we integrate with Clio for contact management, matter tracking, and billing. For NetDocuments, we support document retrieval and storage through their API. Both are commonly used by our law firm clients.',
      'Yes, clients can upload documents through a secure portal linked from the chat. Files are encrypted and stored with chain-of-custody logging. You control retention and access policies.',
      'We support customizable retention policies. You can set a 7-year retention period with automated deletion after expiry. All logs are immutable and timestamped for audit compliance.',
      'We use AES-256 encryption at rest and TLS 1.3 in transit. Our infrastructure is FIPS 140-2 compliant. We also support client-side encryption keys if your firm requires it.',
      'Yes, identity verification can be configured — knowledge-based questions, two-factor authentication via SMS, or document verification. You set the threshold based on the sensitivity of the case information.',
    ],
  },

  {
    id: 'law_firm_ready_for_trial',
    persona: 'law_firm',
    scenario: 'ready_for_trial',
    label: 'Law Firm — Ready for Trial',
    conversationGoal: 'Quickly set up a trial for family law intake automation',
    userMessages: [
      'I want to try this out for our family law practice. How fast can we get a trial running?',
      'Can you use our existing website content to train the bot? We have detailed pages about divorce, custody, and adoption.',
      'I want the bot to ask five intake questions before scheduling a consultation. Can I customize those?',
      'Who\'s going to help me set this up? I\'m an attorney, not a tech person.',
      'After the trial, what does the transition look like if we want to go live?',
    ],
    baseResponses: [
      'I can get your trial account created in the next 15 minutes. We\'ll set up the family law intake module with standard questions, and you can start customizing right away.',
      'Yes, we can crawl your website to seed the bot\'s knowledge base. It will learn your practice area descriptions, office locations, attorney bios, and fee structures from your existing content.',
      'You have full control over the intake questionnaire. I\'ll share the template — you can add, remove, or reorder questions, and set which answers route to which attorney.',
      'You\'ll be assigned a dedicated onboarding specialist who handles the technical setup. Your job is to review the bot\'s responses and give feedback. We do the heavy lifting.',
      'If you decide to go live, we flip a switch and the bot starts handling intake on your site. All the trial configuration carries over. Your intake team gets a dashboard to review leads and booked consultations.',
    ],
  },

  // ========================================================================
  // PERSONA: restaurant_owner (26–30)
  // ========================================================================

  {
    id: 'restaurant_owner_curious',
    persona: 'restaurant_owner',
    scenario: 'curious',
    label: 'Restaurant Owner — Curious',
    conversationGoal: 'Explore how AI handles reservations, menu questions, and customer communication',
    userMessages: [
      'I own a busy Italian restaurant in Chicago — about 80 seats, always packed on weekends. I\'m curious how AI could help with reservation questions and common customer calls.',
      'My staff spends a ton of time answering the same questions: "What time do you open?", "Do you have gluten-free pasta?", "Is there parking?" Can the bot really handle all that?',
      'We have callers asking about private events too — birthday parties, rehearsal dinners. Could it handle booking those?',
      'What about changing reservations? People always call to move their reservation from 7 to 8, or add two more people.',
      'Does it work with OpenTable? We use that for online bookings and I don\'t want to manage two systems.',
    ],
    baseResponses: [
      'Absolutely — restaurants are one of our most popular use cases. The bot handles reservations, answers menu and hour questions, and manages waitlist updates. It integrates with your existing reservation system.',
      'Yes, the bot can answer all those common questions instantly. You provide the answers once — hours, menu highlights, dietary options, parking info — and it handles unlimited repetitions without getting tired.',
      'The bot can handle initial private event inquiries — capture party size, date range, and requirements — then pass the details to your events coordinator with full context so they don\'t start from scratch.',
      'Reservation modifications are fully supported. Customers can change time, party size, or special requests through the bot, and it updates the reservation in real time without human involvement.',
      'Yes, we integrate with OpenTable, Resy, and Toast. When a customer books or modifies through the bot, it syncs with your existing system. No double-entry needed.',
    ],
  },

  {
    id: 'restaurant_owner_skeptical',
    persona: 'restaurant_owner',
    scenario: 'skeptical',
    label: 'Restaurant Owner — Skeptical',
    conversationGoal: 'Overcome skepticism about AI handling nuanced food and service questions',
    userMessages: [
      'I don\'t know. Restaurants are personal. People want to talk to a human when they\'re planning a dinner. A bot feels cold.',
      'What about special requests? People have allergies, dietary restrictions, seating preferences. Can a bot really capture all that nuance?',
      'I\'ve seen automated phone systems that make customers want to pull their hair out. How is this different?',
      'We have seasonal menu changes every quarter. Is updating the bot a hassle?',
      'What if the bot makes a mistake and double-books a table? That would be a disaster for us.',
    ],
    baseResponses: [
      'I get that. Many guests prefer the speed of a bot for simple things — checking hours, booking a table — but your staff is always available for the personal conversations. The bot handles the 80% that\'s repetitive.',
      'Yes — the bot asks about allergies, dietary restrictions, seating preferences, and special occasions during the booking flow. It captures structured notes that your staff can review before the guest arrives.',
      'Unlike phone trees, our bot understands natural language. A customer can say "I need a table for 4 at 7:30, someone\'s gluten-free" and the bot handles it. No pressing 1 for reservations.',
      'Menu updates take minutes. You edit the menu items, dietary tags, and descriptions in the dashboard, and the bot starts using the new information immediately. No recoding or retraining required.',
      'The bot reads your reservation system\'s real-time availability. It only books tables that are actually open. If a slot is taken between the time the customer starts and confirms, the bot catches it and offers alternatives.',
    ],
  },

  {
    id: 'restaurant_owner_price_sensitive',
    persona: 'restaurant_owner',
    scenario: 'price_sensitive',
    label: 'Restaurant Owner — Price Sensitive',
    conversationGoal: 'Find a low-cost solution for a single-location restaurant',
    userMessages: [
      'We\'re a single location, family-run place. Margins are razor thin. How much would this set me back?',
      'Can I just get the reservation bot without all the other bells and whistles? I don\'t need marketing automation or email campaigns.',
      'What if we only want it on weekends? That\'s when we\'re busiest and when the phone rings off the hook.',
      'Is there a pay-as-you-go option? I don\'t want another fixed monthly bill.',
      'How many reservations would I need to book through the bot before it pays for itself?',
    ],
    baseResponses: [
      'Our Restaurant Starter plan is $79/month for a single location. It includes reservation management, menu FAQs, and basic customer questions. No long-term contract required.',
      'Absolutely — the $79 plan is just reservation and FAQ. No marketing, no email, no upselling. It\'s built for restaurants that want to solve the phone problem without the extras.',
      'You can enable the bot on a schedule — weekends only, lunch hours only, whatever fits your operation. It turns off automatically outside your configured hours.',
      'We don\'t have a per-use plan, but with month-to-month billing at $79, you can cancel any time during slow seasons and reactivate when you get busy again. No penalties.',
      'If each reservation saves your staff 3 minutes on the phone, and you value that time at $15/hour, you\'d need about 6 bot-booked reservations per week to break even. Most restaurants exceed that on the first weekend.',
    ],
  },

  {
    id: 'restaurant_owner_technical',
    persona: 'restaurant_owner',
    scenario: 'technical',
    label: 'Restaurant Owner — Technical',
    conversationGoal: 'Evaluate POS integration, menu management, and third-party platform links',
    userMessages: [
      'We use Toast for our POS and reservations. How deep does the Toast integration go?',
      'We\'re on DoorDash and UberEats. Can the bot check order status from those platforms?',
      'Can I set up custom questions — like asking if it\'s someone\'s birthday or anniversary so we can prepare something?',
      'We have a loyalty program. Can the bot look up points and reward balances?',
      'What analytics do you provide? I want to know how many reservations the bot is actually handling.',
    ],
    baseResponses: [
      'We integrate natively with Toast — it reads your menu, reservation book, and table layout. Changes made in Toast sync instantly. The bot can also process payments through Toast if needed.',
      'The bot can check delivery order status through DoorDash and UberEats APIs if customers ask "where\'s my order?" It pulls tracking info directly from those platforms.',
      'Yes, you can add custom questions to the reservation flow. We\'ll ask about celebrations, seating preferences, or anything else you want to know before guests arrive.',
      'If your loyalty program has an API — and most modern POS systems do — the bot can look up points, rewards, and membership status. You control how much access it has.',
      'You get a dashboard showing reservations booked, FAQs answered, peak inquiry times, and estimated staff time saved. You can see exactly how many calls the bot diverted.',
    ],
  },

  {
    id: 'restaurant_owner_ready_for_trial',
    persona: 'restaurant_owner',
    scenario: 'ready_for_trial',
    label: 'Restaurant Owner — Ready for Trial',
    conversationGoal: 'Start a trial quickly before the busy weekend rush',
    userMessages: [
      'I want to start the trial before this weekend. We\'ve got Valentine\'s Day coming and it\'s our busiest time. Can you get me live by Friday?',
      'Let\'s do it. What do you need from me to start the setup?',
      'Connect the Toast integration first. That\'s the most important thing.',
      'Can I write a custom greeting? I want the bot to sound like my hostess Maria — warm and welcoming.',
      'Is there a way to preview what customers will see before it goes live on my site?',
    ],
    baseResponses: [
      'Yes, we can have you live by Friday. I\'ll prioritize your setup. The Toast integration takes about an hour, and we\'ll configure the reservation flow today.',
      'I need your restaurant name, address, phone, website URL, typical hours, and access to your Toast account for the integration. That\'s it. I can start as soon as I have those.',
      'Great choice. I\'ll initiate the Toast connection. You\'ll get an OAuth prompt to authorize the integration. Once approved, the bot will sync your menu and reservation book immediately.',
      'Absolutely. You can write the greeting in your own voice. I recommend something like: "Ciao! Welcome to [Restaurant Name]. Want to book a table or check something on our menu?"',
      'Yes, we have a preview mode. You\'ll see exactly what customers see — the widget, the conversation flow, the responses. You can test bookings yourself before publishing.',
    ],
  },

  // ========================================================================
  // PERSONA: marketing_agency (31–35)
  // ========================================================================

  {
    id: 'marketing_agency_curious',
    persona: 'marketing_agency',
    scenario: 'curious',
    label: 'Marketing Agency — Curious',
    conversationGoal: 'Explore multi-client management and white-label capabilities',
    userMessages: [
      'We\'re a digital marketing agency managing about 30 client accounts. We\'re looking for an AI support tool we can offer as a white-label service. Can you do that?',
      'Can I have separate bots for each client with their own branding, knowledge base, and tone?',
      'What about reporting? I need to show each client metrics on how their bot is performing.',
      'Do you have a partner/reseller program? We\'d be white-labeling this as our own product.',
      'How hard is it to set up a new client bot? If it takes weeks, that won\'t work for us.',
    ],
    baseResponses: [
      'Yes, white-label is one of our core offerings for agencies. You get a management dashboard where you create and manage bots for each client, all under your own brand.',
      'Each client bot is fully isolated — custom domain, custom branding, separate knowledge base, and independent tone configuration. Clients never see each other\'s data.',
      'We provide white-label reporting dashboards per client. Each client sees their own metrics — conversation volume, resolution rates, popular topics, and satisfaction scores.',
      'Yes, we have a Partner Program with volume pricing, your own portal, co-marketing support, and dedicated partner success management. Margins typically range from 30% to 50%.',
      'New client setup takes about 2 hours. You clone a template, swap the branding, load their knowledge base, and test. Our record for a full setup is 47 minutes.',
    ],
  },

  {
    id: 'marketing_agency_skeptical',
    persona: 'marketing_agency',
    scenario: 'skeptical',
    label: 'Marketing Agency — Skeptical',
    conversationGoal: 'Address skepticism about AI quality and client satisfaction',
    userMessages: [
      'We tried white-labeling a chatbot two years ago and it was a disaster. The AI was dumb, clients complained, we lost money. Why would this be better?',
      'My clients are demanding. If the bot gives a bad answer, they blame me, not the software. How do I prevent that?',
      'What happens when a client asks for a feature that doesn\'t exist? They always do. How flexible is your platform?',
      'I need to offer this at a price that makes sense. If your base cost is too high, I can\'t resell it profitably.',
      'How do you handle support? If I have an issue at 2 AM with a client bot, can I get help?',
    ],
    baseResponses: [
      'The AI landscape has changed dramatically. Our models are context-aware and trained per client. We\'ve had agencies switch from those older platforms and they tell us the difference is night and day.',
      'You can review and approve all responses before they go live. You set the accuracy thresholds — the bot only answers questions it\'s confident about and escalates everything else. Quality is in your control.',
      'We have an API and a plugin system. If a client needs something custom, you can build it or we can build it for you. Most feature requests can be accommodated within a sprint cycle.',
      'Our agency wholesale pricing starts at $39 per client bot per month. You set your own retail price. Most agencies charge $99–$199/month per client, which gives you healthy margins.',
      'We offer 24/7 support for our agency partners. Critical issues get a response within 30 minutes, even at 2 AM. You also get a dedicated Slack channel with our engineering team.',
    ],
  },

  {
    id: 'marketing_agency_price_sensitive',
    persona: 'marketing_agency',
    scenario: 'price_sensitive',
    label: 'Marketing Agency — Price Sensitive',
    conversationGoal: 'Find profitable pricing model for reselling AI support to clients',
    userMessages: [
      'I\'m interested in the white-label option, but I need to understand the pricing model clearly. What\'s the per-client cost?',
      'Can I have a pool of conversations shared across clients? Some of my smaller clients won\'t use much, but I don\'t want to pay a full license for each.',
      'Is there a minimum commitment? I want to start with 5 clients and scale from there.',
      'What\'s included in the $39 wholesale price? Are there any features locked behind higher tiers that I\'ll need to upsell?',
      'Do you charge for training or onboarding per client? That could eat my margin quickly.',
    ],
    baseResponses: [
      'Wholesale is $39 per client bot per month on the annual plan, or $49 month-to-month. This includes full white-labeling, custom domain, and all core features. Volume discounts kick in at 20+ clients.',
      'Yes, we have pooled plans. A pool of 5,000 shared conversations across up to 10 clients is $299/month. You allocate conversations per client as needed.',
      'No minimum. You can start with a single client bot. If you want to test the waters, I recommend starting with 1–2 clients, proving the model, then scaling up.',
      'All features are included in the $39 price — white-label, custom branding, analytics, knowledge base, multi-language. The only upgrade is for enterprise features like SSO and dedicated infrastructure.',
      'Onboarding is included — we help you set up the first couple of client bots and provide templates for the rest. No per-client training fees. You also get access to our agency training program at no extra cost.',
    ],
  },

  {
    id: 'marketing_agency_technical',
    persona: 'marketing_agency',
    scenario: 'technical',
    label: 'Marketing Agency — Technical',
    conversationGoal: 'Evaluate API access, custom integrations, and automation capabilities',
    userMessages: [
      'We have a custom client portal. Can I embed the bot management dashboard inside my existing platform via API?',
      'I want to automate client onboarding — when we sign a new client in our CRM, can it auto-provision a bot for them?',
      'Can we customize the chat widget\'s UI beyond basic branding? Our clients expect a polished, unique experience.',
      'We need webhook support — when a conversation escalates, I want it to create a task in our project management tool.',
      'Does the bot support A/B testing for responses? I want to optimize conversion rates across clients.',
    ],
    baseResponses: [
      'Yes, we have a management API that lets you embed client bot creation, monitoring, and reporting inside your own platform. You can also use it to automate provisioning and deprovisioning.',
      'Absolutely. We have a Zapier integration and a direct API for auto-provisioning. When a new client is added in your CRM, a webhook can trigger bot creation with your template and their branding.',
      'Full CSS/JS customization is supported. You can override the widget\'s look and feel entirely — animation, layout, color scheme, font, everything. We provide a starter template to build from.',
      'Webhook support is built in. You can configure escalation events to create tasks in Asana, Monday.com, ClickUp, Jira, or any HTTP endpoint. The task includes the full conversation transcript.',
      'Yes, you can set up A/B tests on response styles, greeting messages, and conversation flows. Test different approaches across clients or within a single client\'s bot and measure which performs better.',
    ],
  },

  {
    id: 'marketing_agency_ready_for_trial',
    persona: 'marketing_agency',
    scenario: 'ready_for_trial',
    label: 'Marketing Agency — Ready for Trial',
    conversationGoal: 'Set up a white-label trial for an agency test client',
    userMessages: [
      'Let\'s start a trial. I want to set up a bot for one of my clients to show them. What do I do?',
      'I want it white-labeled as "AgencyName AI." Can I set that up in the trial?',
      'My client is a real estate agency. Can I pre-load it with their property listings and FAQs?',
      'I want the bot to ask visitors if they\'re pre-qualified for a mortgage. Can I add that custom question?',
      'After the trial, if my client wants to keep it, can they pay directly or does it have to go through me?',
    ],
    baseResponses: [
      'I\'ll create your partner trial account now. You\'ll get access to the agency dashboard where you can create your first client bot. Let\'s start with a template and customize from there.',
      'Yes, the trial includes full white-labeling. Your client will see your branding, not ours. Set your agency name, logo, and colors in the Partner Settings area.',
      'Yes, you can upload property listings (CSV or API), add common real estate FAQs, and configure the bot to answer questions about square footage, pricing, open houses, and neighborhoods.',
      'Absolutely. You can add that as a qualification question in the lead capture flow. The bot will ask about mortgage pre-qualification and tag those leads for follow-up by your client\'s sales team.',
      'Either works. The bot stays in your agency dashboard regardless of who pays. You can bill the client directly, or we can handle invoicing with a revenue share model. Your choice.',
    ],
  },

  // ========================================================================
  // PERSONA: ecommerce_store (36–40)
  // ========================================================================

  {
    id: 'ecommerce_store_curious',
    persona: 'ecommerce_store',
    scenario: 'curious',
    label: 'Ecommerce Store — Curious',
    conversationGoal: 'Explore AI support for a high-volume online store',
    userMessages: [
      'We run an online fashion store — about 2,000 orders a month. Support is getting out of hand. How can your bot help?',
      'Size questions are the biggest headache. Customers always ask "will this fit?" or "how does this run?" Can the AI handle sizing?',
      'What about returns? Our return policy is straightforward but customers ask the same questions over and over.',
      'We launch new collections every month. Will the bot know about new products immediately, or is there a delay?',
      'Can it handle multiple brands? We sell 50+ brands and each has different sizing, quality, and shipping policies.',
    ],
    baseResponses: [
      'For your volume, our bot can handle order status inquiries, product questions, size recommendations, return processing, and shipping updates. Most ecommerce stores automate 60% of their support within the first week.',
      'Yes, you can upload size charts per brand or product line. The bot uses customer measurements and product dimensions to make personalized size recommendations, reducing return rates.',
      'The bot can explain the return policy, generate return labels, and track the return status. It handles the entire process without your team touching it until a refund needs processing.',
      'When you add products to your catalog, the bot learns about them in real time. You can also schedule knowledge base updates to sync with your product launch calendar.',
      'Yes, the bot can handle multi-brand setups. Each brand can have its own size guide, shipping policy, and return rules. The bot detects which brand the customer is asking about and responds accordingly.',
    ],
  },

  {
    id: 'ecommerce_store_skeptical',
    persona: 'ecommerce_store',
    scenario: 'skeptical',
    label: 'Ecommerce Store — Skeptical',
    conversationGoal: 'Address concerns about bot quality affecting customer experience',
    userMessages: [
      'I\'m worried about the customer experience. If someone asks a detailed question about fabric quality or stitching, can a bot really give a useful answer?',
      'Our customers are loyal because we provide amazing personal service. A bot will cheapen that experience.',
      'What if the bot generates a return label for the wrong item? That creates a logistics nightmare for us.',
      'We\'ve had bad experiences with AI giving wrong information about stock levels. How do you handle inventory accuracy?',
      'If the bot can\'t answer a question, does the customer just hit a dead end?',
    ],
    baseResponses: [
      'The bot is trained on your product descriptions, customer reviews, and manufacturer specs. For questions like "is this fabric breathable?" it references the actual product data and reviews. If it can\'t answer confidently, it connects the customer to your team.',
      'The bot enhances your service by responding instantly 24/7. Customers get immediate answers to simple questions, and your team gets more time for the high-touch service that builds loyalty. Speed doesn\'t mean less personal.',
      'The bot only generates a return label after confirming the order number, item, and reason. It verifies the information against your order system before issuing the label. Incorrect returns are extremely rare.',
      'We sync inventory in real-time through your ecommerce platform. If an item has 0 stock, the bot knows and won\'t promise availability. It can suggest alternatives or notify customers when items are back in stock.',
      'The bot always offers an escape — "Let me connect you with a member of our team." It provides context from the conversation so the customer doesn\'t repeat themselves. There\'s never a dead end.',
    ],
  },

  {
    id: 'ecommerce_store_price_sensitive',
    persona: 'ecommerce_store',
    scenario: 'price_sensitive',
    label: 'Ecommerce Store — Price Sensitive',
    conversationGoal: 'Find affordable support automation for a growing ecommerce business',
    userMessages: [
      'We\'re growing fast but we\'re still bootstrapped. Our support costs are rising and I need to control them. What\'s the right plan for us?',
      'We had 2,000 orders last month but that\'s growing. Will I get hit with huge overage fees if we have a good month?',
      'Do you integrate with Shopify or BigCommerce? We\'re on Shopify and I don\'t want to pay extra for "premium" integration.',
      'What\'s the ROI for a store our size? Give me a concrete example.',
      'Can I add other team members to the dashboard without paying per seat? I have 3 support staff who need access.',
    ],
    baseResponses: [
      'Our Ecommerce Growth plan at $149/month covers up to 1,500 conversations. With 2,000 orders, you\'d likely be in that range. If you go over, extra conversations are $0.10 each, capped at $50 overage per month.',
      'No surprise bills. We send alerts when you hit 80% of your limit. Overage is billed at a low per-conversation rate with a safety cap. Your bill won\'t double just because you had a great sales month.',
      'Shopify integration is included in every plan — no premium tier needed. You connect via the native Shopify app, which takes about 5 minutes to set up.',
      'A store your size typically gets 300–400 support conversations a month. At 5 minutes per conversation, that\'s 25–33 hours of staff time. Even at $15/hour, that\'s $375–$500 in monthly cost. Our $149 plan saves you $200+ per month minimum.',
      'Unlimited team members included. No per-seat pricing. Add your whole support team, your operations manager, and your leadership — everyone gets access at no extra cost.',
    ],
  },

  {
    id: 'ecommerce_store_technical',
    persona: 'ecommerce_store',
    scenario: 'technical',
    label: 'Ecommerce Store — Technical',
    conversationGoal: 'Evaluate technical integration depth and customization options',
    userMessages: [
      'We\'re on a custom-built ecommerce platform, not Shopify or Magento. Can I still integrate?',
      'How does the bot handle back-in-stock notifications? We want customers to ask about out-of-stock items and get notified when they\'re available.',
      'We need real-time shipping rate calculations in the chat. Is that possible?',
      'Can the bot handle product comparison? Like "how does this dress compare to that one?"',
      'We use multi-warehouse fulfillment. Can the bot check inventory across all locations?',
    ],
    baseResponses: [
      'Yes, we have a REST API that connects to any ecommerce platform. You map your product, order, and customer endpoints, and the bot reads/writes through your API. We provide SDKs to make the integration straightforward.',
      'Yes, the bot can capture customer email/phone for out-of-stock items and subscribe them to notifications. When inventory is replenished, it triggers an automated alert. You configure the restock threshold.',
      'Yes, if your shipping provider has an API, the bot can fetch real-time rates based on the customer\'s zip code, cart weight, and selected carrier. Rates are displayed directly in the conversation.',
      'The bot can compare products by attributes — price, material, rating, features. You define which comparison criteria to expose. The response includes a side-by-side summary the customer can act on.',
      'The bot checks inventory across all your warehouses and can tell customers which location has stock and estimated delivery times from each. It optimizes based on the customer\'s shipping address.',
    ],
  },

  {
    id: 'ecommerce_store_ready_for_trial',
    persona: 'ecommerce_store',
    scenario: 'ready_for_trial',
    label: 'Ecommerce Store — Ready for Trial',
    conversationGoal: 'Get a trial up and running before the holiday rush',
    userMessages: [
      'I want to start the trial today. We\'re preparing for Black Friday and I need this in place before the rush.',
      'How fast can I get the bot answering order status questions? That\'s 90% of what we deal with.',
      'I have a size chart PDF. Can I just upload that for the bot to learn?',
      'My support team is skeptical. Can they shadow the bot before it talks to real customers?',
      'If this trial goes well, can I convert to a paid plan instantly without any downtime?',
    ],
    baseResponses: [
      'Perfect timing. I\'ll activate your account now. Connect your Shopify store today, and we can have the bot answering basic questions within a few hours. Black Friday setup — let\'s make it happen.',
      'Order status is the quickest feature to set up. Once your store is connected, the bot immediately starts handling "where\'s my order?" questions. No additional configuration needed — it pulls tracking data automatically.',
      'Yes, upload the PDF in the Knowledge Base section. The AI will parse it and extract the size information. You can review and edit the extracted data before it goes live.',
      'Yes, shadow mode is built in. The bot responds only to your team\'s test messages. You can see its answers, rate them, and fine-tune before flipping the switch to live.',
      'Zero downtime conversion. Your trial account becomes a paid plan with one click. All configuration, training, and conversation history carries over seamlessly. Your customers won\'t notice a thing.',
    ],
  },

  // ========================================================================
  // PERSONA: internal_kb_buyer (41–45)
  // ========================================================================

  {
    id: 'internal_kb_buyer_curious',
    persona: 'internal_kb_buyer',
    scenario: 'curious',
    label: 'Internal KB Buyer — Curious',
    conversationGoal: 'Explore AI-powered internal knowledge base for employee support',
    userMessages: [
      'I run internal knowledge management for a 500-person company. We\'re looking to make our employee resources more accessible. Can your platform help?',
      'Our KB has hundreds of articles across IT, HR, Finance, and Legal. Can the bot search across all of them and find the right answer?',
      'Can employees ask questions in natural language? Like "how do I submit a travel expense?" instead of searching for the right article title?',
      'How do you handle content that needs to be restricted? Some of our documents are confidential and shouldn\'t be accessible to everyone.',
      'We have a lot of stale content. Does the bot flag articles that are out of date?',
    ],
    baseResponses: [
      'Absolutely — internal knowledge management is one of our fastest-growing use cases. The bot becomes an AI-powered assistant for your employees, answering questions across all departments from a single interface.',
      'Yes, the bot indexes all your KB articles and can search across departments. It understands which content is relevant to the employee\'s question and returns a concise answer with source attribution.',
      'Exactly — employees ask in plain English: "How do I submit a travel expense?", "What\'s the parental leave policy?", "How do I reset my VPN password?" The bot understands intent and finds the right answer.',
      'You can set access controls per article or category based on department, role, or individual. The bot respects these permissions and only shows content the employee is authorized to see.',
      'Yes, the bot can detect when articles haven\'t been updated recently and flag them for review. You set the threshold — 6 months, 1 year, etc. It also tracks which questions the bot can\'t answer, highlighting content gaps.',
    ],
  },

  {
    id: 'internal_kb_buyer_skeptical',
    persona: 'internal_kb_buyer',
    scenario: 'skeptical',
    label: 'Internal KB Buyer — Skeptical',
    conversationGoal: 'Address concerns about AI replacing the existing knowledge management system',
    userMessages: [
      'We already have a knowledge base. Employees barely use it. Why would they use a chatbot?',
      'Our HR processes are complex — maternity leave, disability accommodations, international remote work. The answers depend on the employee\'s specific situation.',
      'I\'ve seen these "AI knowledge base" tools. They give generic answers that aren\'t helpful. Employees end up calling HR anyway.',
      'Our legal team will never approve this. They\'re paranoid about AI giving wrong compliance information.',
      'IT has a strict no-SaaS policy for internal tools. Can this be self-hosted?',
    ],
    baseResponses: [
      'The difference is conversational search. Instead of searching keywords and skimming articles, employees ask a question and get a direct answer. We\'ve seen KB usage increase 4x after deploying the bot because it\'s easier than searching.',
      'The bot asks clarifying questions when context matters — "What country are you in?", "What\'s your employment type?" — before giving an answer. It provides personalized responses based on the employee\'s profile and data.',
      'You\'re right that generic answers aren\'t helpful. That\'s why the bot references your actual KB articles and can link back to the source. Employees get the answer plus the context to verify it. If the bot can\'t answer, it escalates to the right team with the full conversation context.',
      'We have legal-appropriate safeguards: the bot cites sources, provides disclaimers for compliance-sensitive topics, and escalates anything that might require legal judgment. Many legal teams have already approved our platform.',
      'Yes, we support on-premise deployment. You can run the bot inside your VPC or even on-premises. No data ever leaves your infrastructure. We also support air-gapped environments for the most sensitive deployments.',
    ],
  },

  {
    id: 'internal_kb_buyer_price_sensitive',
    persona: 'internal_kb_buyer',
    scenario: 'price_sensitive',
    label: 'Internal KB Buyer — Price Sensitive',
    conversationGoal: 'Find an affordable internal knowledge solution with clear cost justification',
    userMessages: [
      'This is an internal tool, not revenue-generating. Budgets are always tight. What can you do for us?',
      '500 employees, but maybe only 100–150 would actively use the bot. Do I pay per user or per company?',
      'Can we start with just IT support? That\'s our most pressing use case. If it works, we\'ll expand to HR and Finance.',
      'One of my vendors wants $2,000/month for something similar. That\'s way out of budget. Where do you land?',
      'How do you measure ROI for internal knowledge tools? I need to sell this to the CFO.',
    ],
    baseResponses: [
      'We have a team plan for internal KB starting at $99/month for up to 200 employees. For your full 500, it\'s $249/month. That\'s a flat rate — no per-user fees or hidden costs.',
      'It\'s per company, not per user. You pay for the employee tier, and everyone in the company can use it. Active users don\'t affect pricing — you pay the same whether 50 or 500 people use it.',
      'Absolutely. You can enable the IT module only. It indexes your IT support articles, knowledge base, and common IT requests. When you\'re ready to add HR, Finance, or others, you turn them on with one click.',
      'We\'re considerably more affordable. $249/month for the full company is about $0.50 per employee per month. We focus on delivering value at a fraction of the cost of enterprise knowledge management platforms.',
      'Track the time employees spend searching for internal information. Most companies find employees waste 15–25 minutes per day searching. At $50/hour blended cost, that\'s $12.50/day per employee. Even modest improvements generate significant savings.',
    ],
  },

  {
    id: 'internal_kb_buyer_technical',
    persona: 'internal_kb_buyer',
    scenario: 'technical',
    label: 'Internal KB Buyer — Technical',
    conversationGoal: 'Evaluate content management, SSO, and CMS integration',
    userMessages: [
      'We use Confluence for our knowledge base. How does the bot integrate with it?',
      'How does the bot handle content hierarchy? We have nested pages with parent-child relationships that are important for context.',
      'We need SCIM provisioning for user management. If someone leaves the company, their bot access should be revoked automatically.',
      'Can the bot trigger actions — like resetting a password or filing an HR ticket — or is it just read-only?',
      'What search engine do you use under the hood? We care about relevance ranking and result quality.',
    ],
    baseResponses: [
      'We have a native Confluence integration. The bot connects via Confluence Cloud API or Server REST API and indexes your spaces, pages, and attachments. Content updates in Confluence are reflected in the bot automatically.',
      'The bot understands content hierarchy and uses parent context to interpret child pages. If an employee asks about "the policy" and the page is nested under "Remote Work Policy," the bot knows which policy they mean.',
      'SCIM 2.0 is supported for user provisioning and deprovisioning. When an employee is deactivated in your identity provider, their bot access is revoked within minutes. We integrate with Okta, Azure AD, and OneLogin.',
      'The bot can be read-only or action-enabled. If you configure it with action capabilities, it can reset passwords, submit tickets, request time off, or trigger any workflow your backend supports.',
      'We use a hybrid search engine combining vector embeddings and keyword search with learning-to-rank optimization. Relevance improves over time based on which answers employees actually find useful.',
    ],
  },

  {
    id: 'internal_kb_buyer_ready_for_trial',
    persona: 'internal_kb_buyer',
    scenario: 'ready_for_trial',
    label: 'Internal KB Buyer — Ready for Trial',
    conversationGoal: 'Deploy a trial for IT support knowledge base within a week',
    userMessages: [
      'I want to trial this with our IT department first. We have about 1,000 IT knowledge articles. How fast can we get this running?',
      'Let\'s connect Confluence first. How do I authorize the integration?',
      'I want the bot to only handle password reset and software access questions during the trial. Can I limit the scope?',
      'My IT team wants to test the bot before anyone else sees it. Can I make it internal-only?',
      'If the IT trial goes well, I want to roll out to HR and Finance after. How much additional setup is needed?',
    ],
    baseResponses: [
      'Great choice. We can have the Confluence integration set up today and the bot answering questions by tomorrow. IT content is usually straightforward to index because your articles are already structured.',
      'You authorize the integration through an OAuth flow from the dashboard. Click "Connect Confluence," log in with your admin account, and select which spaces to index. That\'s it — the bot starts learning immediately.',
      'Absolutely. We\'ll configure the bot to answer only questions related to passwords and software access. Every other question will be politely redirected or escalated to your IT team.',
      'Yes, we can deploy the bot on an internal URL or Slack integration that\'s only accessible to your IT team. It won\'t appear in any public-facing channels.',
      'HR and Finance modules are pre-built — you just connect their knowledge sources and enable them. HR might need additional access controls and sensitive content handling, but the setup process is the same as IT.',
    ],
  },

  // ========================================================================
  // PERSONA: api_developer (46–50)
  // ========================================================================

  {
    id: 'api_developer_curious',
    persona: 'api_developer',
    scenario: 'curious',
    label: 'API Developer — Curious',
    conversationGoal: 'Explore API-first design, SDK availability, and webhooks',
    userMessages: [
      'I\'m building a custom customer support experience for my SaaS. I want an API-first chatbot I can embed deeply. Tell me about your API.',
      'What SDKs do you have? I\'m building in TypeScript on Next.js.',
      'Can the bot send webhook events in real time? I want to stream conversations to my own backend.',
      'How flexible is the NLP pipeline? I want to inject custom entity extraction for our domain-specific terms.',
      'Do you support custom response formatting? I need the bot to return structured JSON in some responses for my frontend to render as components.',
    ],
    baseResponses: [
      'We\'re API-first. Everything you can do in our dashboard, you can do through our REST and GraphQL APIs. You can create conversations, send messages, configure bots, and retrieve analytics programmatically.',
      'We have a TypeScript SDK that works with Next.js, React, and Node.js. It handles authentication, real-time messaging via WebSockets, and provides typed interfaces for all API responses.',
      'Yes, you can configure webhooks for message events, conversation start/end, escalations, and custom events. Events are delivered in real-time with HMAC-signed payloads for security.',
      'Our NLP pipeline supports custom entity extraction. You define entity schemas and training phrases, and the model learns to extract them from conversations. You can also plug in your own NER model via our model hosting API.',
      'Yes, the bot can return structured data in responses. You define response schemas — JSON, markdown, or HTML — and the bot formats its output accordingly. Your frontend renders the response as native components.',
    ],
  },

  {
    id: 'api_developer_skeptical',
    persona: 'api_developer',
    scenario: 'skeptical',
    label: 'API Developer — Skeptical',
    conversationGoal: 'Pressure-test API documentation, reliability, and developer experience',
    userMessages: [
      'I\'ve integrated dozens of APIs. Most have terrible documentation, broken SDKs, and unhelpful error messages. Convince me yours is different.',
      'Your API might work at low volume, but what happens when I send 10,000 requests per minute? Show me the rate limits and throttling behavior.',
      'What\'s your API stability promise? Do you version your APIs properly or do you break things on Fridays?',
      'Your SDK is open source? Can I see the source code and contribute?',
      'What\'s your sandbox environment like? Can I simulate different scenarios without touching real API credentials?',
    ],
    baseResponses: [
      'API quality is our top priority. Every endpoint has detailed documentation with request/response examples, error codes, and troubleshooting guides. Our SDKs are generated from our OpenAPI spec, so they\'re always in sync. We also have a dedicated developer relations team.',
      'Rate limits are clearly documented: 1,000 requests per minute per API key on the standard tier, with burst up to 2,000. You get proper HTTP 429 responses with Retry-After headers. No silent dropping. We also support pooling API keys for higher limits.',
      'We follow semantic versioning strictly. v1 endpoints are stable and won\'t break. Deprecations are announced 6 months in advance with migration guides. We\'ve never made a breaking change without a deprecation window.',
      'Yes, our TypeScript SDK is open source on GitHub. We accept PRs and have a contributing guide. The SDK is MIT licensed. You can also fork it and customize it for your needs.',
      'Our sandbox environment is a full replica of production. You get test API keys that work against mock data. You can simulate conversations, webhook deliveries, and error scenarios without touching real data or using quota.',
    ],
  },

  {
    id: 'api_developer_price_sensitive',
    persona: 'api_developer',
    scenario: 'price_sensitive',
    label: 'API Developer — Price Sensitive',
    conversationGoal: 'Find a cost-effective plan for a personal project or startup',
    userMessages: [
      'I\'m building a side project right now — not sure if it\'ll take off. Do you have a free tier or a cheap developer plan?',
      'I don\'t need a dashboard or UI. Just API access. Is there a cheaper "API only" plan?',
      'What\'s the pricing for API calls specifically? Is it per message or per conversation?',
      'If my side project goes viral, will my API bill explode overnight? Is there a cap?',
      'Can I use the free tier for commercial use if I\'m just starting out?',
    ],
    baseResponses: [
      'Yes! We have a free Developer plan — 500 API calls per month, full API access, no credit card. Perfect for side projects, prototypes, and hacking. If you outgrow it, you upgrade seamlessly.',
      'Our Developer plan at $29/month is API-only with 5,000 calls. No dashboard features you won\'t use. Just endpoints and documentation. If you need the dashboard later, you can upgrade.',
      'Pricing is per API call — each message sent or received counts as one call. The Developer plan at $29/month gives you 5,000 calls. Additional calls are $0.005 each, which is $5 per 1,000 extra calls.',
      'We have usage caps you set yourself. You configure a monthly spending limit in the dashboard — if you hit it, API calls are rejected with a clear error. No surprise bills. You can also set up alert thresholds at 50%, 75%, and 90%.',
      'Yes, the free Developer plan can be used for commercial projects. There\'s no non-commercial restriction. If your project grows beyond 500 calls/month, you\'ll need to upgrade, but you can do that at any time.',
    ],
  },

  {
    id: 'api_developer_technical',
    persona: 'api_developer',
    scenario: 'technical',
    label: 'API Developer — Technical',
    conversationGoal: 'Deep-dive into API architecture, latency, streaming, and extensibility',
    userMessages: [
      'Does the API support streaming responses? I want to show the bot\'s reply token-by-token as it generates, like a typing indicator.',
      'What authentication method do you recommend? JWT, API keys, OAuth? I need to handle both server-to-server and user-level auth.',
      'Can I run your models locally or do I have to use your cloud? I have some latency-sensitive use cases.',
      'What\'s the max payload size for a message? I need to send rich context with each request.',
      'Do you support branching conversations? Like, if the user wants to go back and change their answer to a previous question.',
    ],
    baseResponses: [
      'Yes, we support server-sent events (SSE) for streaming responses. You open a connection, send the message, and receive tokens as they\'re generated. We also support WebSocket-based streaming for bidirectional communication.',
      'We recommend API keys for server-to-server and JWTs for user-level auth. API keys are simple and scoped to specific permissions. JWTs allow you to authenticate individual end users with custom claims and session management.',
      'We offer local model deployment via our Edge Runtime — a lightweight container you can run on your own infrastructure. It handles standard conversation flows locally and syncs with our cloud for complex queries. P95 response time under 50ms locally.',
      'Max payload is 100KB per message, which gives you plenty of room for conversation history, user context, and metadata. If you need more, you can attach references to larger objects stored in your own infrastructure.',
      'Yes, the API supports conversation branching. You can fork a conversation at any turn, modify the context, and continue down a different path. This is useful for "what if" scenarios or correcting the conversation direction.',
    ],
  },

  {
    id: 'api_developer_ready_for_trial',
    persona: 'api_developer',
    scenario: 'ready_for_trial',
    label: 'API Developer — Ready for Trial',
    conversationGoal: 'Get API keys and start building integration immediately',
    userMessages: [
      'Great, I\'m in. Give me API keys and let me start building. I don\'t need a sales call or onboarding demo.',
      'What\'s the first endpoint I should hit to see something working?',
      'I want to test webhooks. Do you have a webhook inspector or do I need to set up my own endpoint?',
      'I\'m sending my first API call... got a 200 back with a conversation ID. Now what? How do I send a follow-up message in that conversation?',
      'This is looking great. How do I configure the bot\'s personality through the API instead of the dashboard?',
    ],
    baseResponses: [
      'Self-serve mode — I love it. Your account is active. You\'ll find your API keys in the Developer Settings area. We also have a quickstart guide that gets you from zero to first API call in under 5 minutes.',
      'Try the GET /v1/me endpoint first — it returns your account info and confirms your API key works. Then POST /v1/conversations to create your first conversation. It returns a conversation ID you\'ll use for all subsequent messages.',
      'We provide a webhook inspector in the dashboard — you can see all webhook events in real time, inspect payloads, and replay events. No need to set up your own endpoint for testing.',
      'Use POST /v1/conversations/:id/messages with your conversation ID and the user\'s message. The response includes the bot\'s reply. Keep sending messages using the same conversation ID to maintain context.',
      'You configure bot settings through our Configuration API — POST /v1/bots/:id/config with your personality settings, response guidelines, and knowledge sources. Everything available in the dashboard is available through the API.',
    ],
  },
];
