-- 009_seed_burflow_saas_knowledge.sql
-- Seed the BurFlow SaaS tenant (burflow-saas) with product knowledge
-- so the landing page chatbot gives accurate product answers.

DO $$
DECLARE
  v_tenant_id TEXT := 'burflow-saas';
  v_kb_id TEXT := 'burflow-kb-001';
  v_doc_id_1 TEXT := 'bf-product-doc';
  v_doc_id_2 TEXT := 'bf-pricing-doc';
  v_doc_id_3 TEXT := 'bf-faq-doc';
  v_doc_id_4 TEXT := 'bf-features-doc';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id) THEN
    RAISE NOTICE 'Tenant % not found — skipping seed', v_tenant_id;
    RETURN;
  END IF;

  INSERT INTO knowledge_bases (id, tenant_id, name, description, status, document_count, total_chunks, created_at, updated_at)
  VALUES (v_kb_id, v_tenant_id, 'BurFlow Product Knowledge', 'Complete product and pricing info for BurFlow AI platform', 'published', 4, 24, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET status = 'published', updated_at = NOW();

  INSERT INTO kb_documents (id, knowledge_base_id, tenant_id, filename, source_type, status, chunk_count, created_at, updated_at)
  VALUES
    (v_doc_id_1, v_kb_id, v_tenant_id, 'About BurFlow', 'text', 'published', 6, NOW(), NOW()),
    (v_doc_id_2, v_kb_id, v_tenant_id, 'Pricing & Plans', 'text', 'published', 6, NOW(), NOW()),
    (v_doc_id_3, v_kb_id, v_tenant_id, 'Frequently Asked Questions', 'faq', 'published', 6, NOW(), NOW()),
    (v_doc_id_4, v_kb_id, v_tenant_id, 'Features & Integrations', 'text', 'published', 6, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  -- About BurFlow
  INSERT INTO kb_chunks (id, document_id, knowledge_base_id, tenant_id, content, metadata, created_at)
  VALUES
    ('chunk-bf-about-1', v_doc_id_1, v_kb_id, v_tenant_id,
     'BurFlow is an AI-powered customer support platform that helps businesses automate conversations, capture leads, and boost conversions. BurFlow deploys an intelligent chatbot on your website that learns from your content, answers customer questions accurately, and escalates to a human agent when needed. Setup takes under 5 minutes — just paste one line of code on your site.',
     '{"title":"What is BurFlow","category":"about"}', NOW()),

    ('chunk-bf-about-2', v_doc_id_1, v_kb_id, v_tenant_id,
     'BurFlow is built for small to mid-size businesses including e-commerce stores, SaaS companies, agencies, dental and medical practices, real estate firms, and professional services. It integrates with your existing tools: Slack, HubSpot, Salesforce, Zapier, Stripe, and 50+ platforms. No developer required.',
     '{"title":"Who BurFlow is for","category":"about"}', NOW()),

    ('chunk-bf-about-3', v_doc_id_1, v_kb_id, v_tenant_id,
     'How BurFlow works: 1) Connect your website URL and BurFlow scans your pages to build a knowledge base automatically. 2) The AI chatbot learns your products, services, pricing, FAQs, and policies. 3) Visitors ask questions and get instant, accurate answers. 4) When a visitor shows buying intent or asks something outside your knowledge, BurFlow captures their contact info and routes the conversation to your team via Slack or email. 5) Your team takes over in the live inbox to close the deal.',
     '{"title":"How BurFlow Works","category":"about"}', NOW()),

    ('chunk-bf-about-4', v_doc_id_1, v_kb_id, v_tenant_id,
     'BurFlow was founded in 2025 and serves businesses across 12 countries. The platform processes over 1 million conversations per month. Our mission is to make enterprise-grade AI customer support accessible to every business, not just Fortune 500 companies.',
     '{"title":"Company Background","category":"about"}', NOW()),

    ('chunk-bf-about-5', v_doc_id_1, v_kb_id, v_tenant_id,
     'Key differentiators: BurFlow uses a multi-LLM architecture — it automatically falls back between OpenAI, Anthropic, Gemini, Groq, and other providers to ensure 99.9% uptime. Unlike basic chatbots, BurFlow has a conversation orchestrator that manages context, detects buying intent, qualifies leads, and suggests follow-up actions. It supports 95+ languages out of the box.',
     '{"title":"Why BurFlow is Different","category":"differentiators"}', NOW()),

    ('chunk-bf-about-6', v_doc_id_1, v_kb_id, v_tenant_id,
     'Security and privacy: BurFlow is SOC 2 compliant, uses AES-256 encryption for all data at rest, TLS 1.3 for data in transit, and is hosted on enterprise-grade infrastructure (AWS). Each tenant gets isolated data storage. We are GDPR compliant and offer data processing agreements for EU customers. No customer data is used to train AI models.',
     '{"title":"Security & Compliance","category":"security"}', NOW()),

    -- Pricing & Plans
    ('chunk-bf-price-1', v_doc_id_2, v_kb_id, v_tenant_id,
     'BurFlow offers 4 pricing tiers: Free ($0/month) — 100 conversations, 5 documents, 1 team member. Starter ($29/month) — 3,000 conversations, 50 documents, 5 team members, custom branding, priority support. Pro ($49/month) — 10,000 conversations, 200 documents, 20 team members, advanced analytics, API access, Slack integration. Advanced ($99/month) — 25,000 conversations, 1,000 documents, 50 team members, dedicated account manager, custom integrations, SLA guarantee.',
     '{"title":"Pricing Plans","category":"pricing"}', NOW()),

    ('chunk-bf-price-2', v_doc_id_2, v_kb_id, v_tenant_id,
     'BurFlow offers a 14-day free trial on all paid plans — no credit card required. You get full access to all features in your chosen tier during the trial. If you upgrade before the trial ends, your trial usage counts toward your first month. Annual billing saves 20%: Starter $23/month, Pro $39/month, Advanced $79/month.',
     '{"title":"Free Trial & Annual Pricing","category":"pricing"}', NOW()),

    ('chunk-bf-price-3', v_doc_id_2, v_kb_id, v_tenant_id,
     'Overage pricing when you exceed your plan limits: $0.01 per additional conversation, $0.10 per additional document. No hard cutoffs — your chatbot keeps working. You only pay overages at the end of your billing cycle. You can also upgrade your plan at any time and get prorated credit for the remainder of your current billing period.',
     '{"title":"Overage & Limits","category":"pricing"}', NOW()),

    ('chunk-bf-price-4', v_doc_id_2, v_kb_id, v_tenant_id,
     'We accept all major credit cards (Visa, Mastercard, Amex) via Stripe, PayPal, and wire transfer for annual Advanced plans. All billing is monthly or annually. There are no setup fees, no hidden charges, and no long-term contracts. Cancel anytime from your dashboard — no questions asked.',
     '{"title":"Payment Methods","category":"pricing"}', NOW()),

    ('chunk-bf-price-5', v_doc_id_2, v_kb_id, v_tenant_id,
     'Most businesses start with the Starter plan ($29/month) and upgrade to Pro ($49/month) within 2-3 months as they see results. On average, BurFlow customers report 40% reduction in support ticket volume and 25% increase in lead capture within the first month.',
     '{"title":"Recommended Plan","category":"pricing"}', NOW()),

    ('chunk-bf-price-6', v_doc_id_2, v_kb_id, v_tenant_id,
     'Enterprise and agency pricing: Need 100,000+ conversations or multi-tenant management? Contact our sales team for custom enterprise pricing with volume discounts, dedicated infrastructure, and white-label options. Email sales@burflow.com or book a call at burflow.com/demo.',
     '{"title":"Enterprise Pricing","category":"pricing"}', NOW()),

    -- FAQ
    ('chunk-bf-faq-1', v_doc_id_3, v_kb_id, v_tenant_id,
     'Q: How long does it take to set up BurFlow? A: Most businesses are live in under 5 minutes. Just paste one line of JavaScript on your website. BurFlow automatically scans your pages to build a knowledge base. You can customize the chatbot appearance, greeting, and behavior from your dashboard. No developer needed.',
     '{"title":"Setup Time","category":"faq"}', NOW()),

    ('chunk-bf-faq-2', v_doc_id_3, v_kb_id, v_tenant_id,
     'Q: Will BurFlow work with my website platform? A: Yes! BurFlow works with any website — WordPress, Shopify, Wix, Squarespace, custom HTML, React, Next.js, and more. It is a single JavaScript tag that loads asynchronously and does not affect your page speed. We also have native plugins for Shopify, WordPress, and Webflow.',
     '{"title":"Website Compatibility","category":"faq"}', NOW()),

    ('chunk-bf-faq-3', v_doc_id_3, v_kb_id, v_tenant_id,
     'Q: Can I train BurFlow on my own content? A: Absolutely. BurFlow scans your website pages automatically, but you can also upload PDFs, paste text, add URLs, or write FAQ entries manually. The AI uses retrieval-augmented generation (RAG) to answer questions using only your provided knowledge. It will never make up information about your business.',
     '{"title":"Training & Knowledge","category":"faq"}', NOW()),

    ('chunk-bf-faq-4', v_doc_id_3, v_kb_id, v_tenant_id,
     'Q: What happens when the chatbot cannot answer a question? A: BurFlow has a smart escalation system. When the AI is uncertain or detects a high-value lead, it captures the visitor contact info and notifies your team instantly via Slack, email, or the live inbox. Your team can jump in and take over the conversation in real time.',
     '{"title":"Escalation & Handoff","category":"faq"}', NOW()),

    ('chunk-bf-faq-5', v_doc_id_3, v_kb_id, v_tenant_id,
     'Q: Is my data safe with BurFlow? A: Yes. We use AES-256 encryption, TLS 1.3, and SOC 2 compliant infrastructure. Your data is isolated per tenant and never used to train AI models. We are GDPR compliant and offer DPAs for EU customers. You can export or delete all your data at any time.',
     '{"title":"Data Safety","category":"faq"}', NOW()),

    ('chunk-bf-faq-6', v_doc_id_3, v_kb_id, v_tenant_id,
     'Q: Can I see how BurFlow performs before buying? A: Yes — start a free trial at burflow.com (no credit card required) with full access to all features for 14 days. You can also book a live demo at burflow.com/demo where our team walks you through the platform and answers your specific questions.',
     '{"title":"Trying BurFlow","category":"faq"}', NOW()),

    -- Features & Integrations
    ('chunk-bf-feat-1', v_doc_id_4, v_kb_id, v_tenant_id,
     'BurFlow core features: AI-powered chatbot that learns from your content, real-time conversation handoff to human agents, lead capture and qualification, conversation analytics dashboard, multi-language support (95+ languages), custom branding and theming, auto-open and proactive messaging, conversation history and search.',
     '{"title":"Core Features","category":"features"}', NOW()),

    ('chunk-bf-feat-2', v_doc_id_4, v_kb_id, v_tenant_id,
     'BurFlow analytics: Track conversations, response accuracy, lead conversion rates, response times, and customer satisfaction scores. See which questions visitors ask most, identify knowledge gaps, and get AI-powered suggestions to improve your chatbot. Export reports to CSV or connect to your BI tools.',
     '{"title":"Analytics & Reporting","category":"features"}', NOW()),

    ('chunk-bf-feat-3', v_doc_id_4, v_kb_id, v_tenant_id,
     'Integrations: Slack (real-time notifications and team inbox), HubSpot and Salesforce (CRM sync), Zapier (connect to 5,000+ apps), Stripe (payment processing), Google Analytics (conversion tracking), WordPress and Shopify (native plugins), Webhooks and REST API for custom integrations.',
     '{"title":"Integrations","category":"integrations"}', NOW()),

    ('chunk-bf-feat-4', v_doc_id_4, v_kb_id, v_tenant_id,
     'Human agent handoff: When a visitor needs human help, BurFlow routes the conversation to available agents. Agents see full conversation context, visitor info, and AI-suggested responses. Handoff rules are configurable: by topic, sentiment, buying intent, or time of day. Support for round-robin and priority-based routing.',
     '{"title":"Human Agent Handoff","category":"features"}', NOW()),

    ('chunk-bf-feat-5', v_doc_id_4, v_kb_id, v_tenant_id,
     'Multi-tenant and agency features: Manage multiple chatbots from one dashboard. Perfect for agencies managing clients. Each tenant gets isolated data, billing, and configuration. White-label options available on Advanced and Enterprise plans.',
     '{"title":"Multi-Tenant & Agency","category":"features"}', NOW()),

    ('chunk-bf-feat-6', v_doc_id_4, v_kb_id, v_tenant_id,
     'Website scanner: BurFlow can scan your entire website to automatically build and update your knowledge base. Set it to run on a schedule (daily, weekly, monthly) to keep your chatbot knowledge fresh. Detects new pages, updated content, and removed content. Supports sitemap.xml and manual URL entry.',
     '{"title":"Website Scanner","category":"features"}', NOW());

  UPDATE kb_documents SET chunk_count = 6 WHERE id IN (v_doc_id_1, v_doc_id_2, v_doc_id_3, v_doc_id_4);

  RAISE NOTICE 'Seeded BurFlow SaaS knowledge: 4 documents, 24 chunks for tenant %', v_tenant_id;
END $$;
