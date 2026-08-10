#!/usr/bin/env node
/**
 * Seed the three multi-tenant demos with industry-specific knowledge bases and
 * widget configs:
 *
 *   burflow-saas   — BurFlow AI (SaaS platform: AI widget, scanner, observer,
 *                    pricing, demo booking). Renames the legacy demo tenant
 *                    (tenant-1786006493162 / demo-tenant) so the landing page
 *                    can use the readable `burflow-saas` slug.
 *   demo-ecommerce — Tech & Apparel Store (headphones, sneakers, jackets,
 *                    shipping, returns, checkout CTA).
 *   demo-dental    — Maple Grove Dental Clinic (services + prices, hours,
 *                    insurance, appointment booking CTA).
 *
 * Fixes the "single shared tenant id" demo problem: each demo page now gets its
 * own tenant so the chatbot answers with that store's facts instead of generic
 * BurFlow SaaS content.
 *
 * Idempotent: safe to re-run. Usage (from engine/packages/saas-api):
 *   node scripts/seed-demo-kb.cjs
 * Honors DB_PATH / DATABASE_PATH env vars, defaulting to ./data/saas.db.
 */
'use strict';

const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || path.join(__dirname, '..', 'data', 'saas.db');

// Owner of the demo tenants (the legacy demo user created by onboarding).
const DEMO_OWNER_ID = 'user-1786006493160';
const now = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Demo definitions: slug, tenant id, branding, and knowledge facts
// ---------------------------------------------------------------------------
const DEMOS = [
  {
    slug: 'burflow-saas',
    id: 'tenant-1786006493162', // legacy demo tenant — renamed in place
    name: 'BurFlow AI',
    widget: {
      theme: 'light',
      position: 'bottom-right',
      primary_color: '#016248',
      company_name: 'BurFlow',
      greeting: "Hey there! I'm BurFlow — your guide to BurFlow's products and pricing. Ask me anything!",
      launcher_text: 'Chat with BurFlow',
      starter_options: ['Show me pricing', 'What can BurFlow do?', 'Book a demo'],
    },
    topics: [
      {
        section: 'Overview',
        content: [
          'BurFlow is an AI sales chat platform for modern websites. It scans your website automatically, learns your products, pricing, services, and FAQs, then engages every visitor with a conversational widget that recommends the right offer, answers common objections, and qualifies leads before they leave.',
          'The core flow is: Scan — BurFlow reads your live website and identifies products, pricing, and buyer paths. Understand — it builds a knowledge base from that content. Engage — the widget greets visitors and answers questions with real business facts. Qualify — it captures contact details and buying signals, then hands off to your team or a booked demo.',
        ],
      },
      {
        section: 'Products',
        content: [
          'BurFlow ships as a single embeddable widget (a script tag with data-tenant-id) plus a SaaS dashboard. Core products: the AI Sales Chat Widget, the Website Knowledge Scanner, the Knowledge Base with gap detection, the Live Chat Observer with human takeover, and an Analytics dashboard.',
          'The widget is a lightweight JavaScript bundle that renders a branded launcher bubble and chat panel on any website. It supports custom colors, greeting, launcher text, and starter suggestion chips, and it loads through a tokenless public-token bootstrap so it works without hardcoded credentials.',
        ],
      },
      {
        section: 'How it works',
        content: [
          'Getting started takes about 10 minutes: create an account, add your website URL, and BurFlow scans it to build a knowledge base. You can also upload FAQs, documents, or pages directly. Then embed the one-line widget script on your site and it starts engaging visitors immediately.',
          'Every visitor message is answered from the business knowledge, not generic filler. When the AI is not confident or the visitor asks for a person, the conversation is flagged in the Live Observer dashboard so a human operator can take over in real time, reply directly in the visitor chat, and hand control back to the AI.',
        ],
      },
      {
        section: 'Features',
        content: [
          'AI conversations with real product and pricing context, lead capture (email, phone, name, company), quick-reply suggestion chips, and helpful next-step prompts for pricing, demos, and support.',
          'Knowledge Base gap detection: unanswered or low-confidence visitor questions are recorded automatically, and you can convert them into FAQs with one click from the dashboard.',
          'Live Chat Observer with human handoff: monitor active sessions in real time, see low-confidence or help-requested conversations highlighted, take over the chat, send manual replies that appear in the visitor widget instantly, and return control to the AI.',
          'Enterprise features: SSO/SAML, dedicated onboarding, and custom SLAs. Integrations cover CRMs and ticketing, with API and webhooks for custom workflows.',
        ],
      },
      {
        section: 'Pricing',
        content: [
          'Free: $0/month — 100 messages per month, 1 site scan, community support.',
          'Starter: $29/month — 1,000 messages per month, 3 site scans, email support.',
          'Professional: $99/month — 10,000 messages per month, unlimited scans, priority support. This is the most popular plan.',
          'Enterprise: custom pricing — unlimited usage, SSO and SLA, dedicated onboarding. Contact the sales team.',
          'You can start any paid plan with a free 14-day trial, no credit card required. All plans include the AI widget, knowledge base, and live observer.',
        ],
      },
      {
        section: 'Sales contact',
        content: [
          'To book a demo or talk to sales, use the "Talk to Sales" option in the dashboard. The sales team will walk through the features most relevant to your business; demos typically run 20–30 minutes and cover the core workflow, integration setup, and AI configuration.',
          'Enterprise prospects can reach the sales team directly from the pricing page to discuss SSO, dedicated onboarding, custom contracts, and volume discounts.',
        ],
      },
    ],
  },
  {
    slug: 'demo-ecommerce',
    id: 'tenant-demo-ecommerce',
    name: 'MTH Medical Store',
    widget: {
      theme: 'light',
      position: 'right',
      primary_color: '#A8244B',
      company_name: 'MTH Medical Store',
      greeting: "Welcome to MTH Medical Store! I'm your assistant for medical supplies, lab tests, and doctor consultations. Ask me about products, delivery, returns, or booking.",
      launcher_text: 'Chat with us',
      starter_options: ['🛒 Show top selling health products', '🚚 How does same-day delivery work?', '🔄 What is your return policy?'],
      business_profile: {
        primary_goal: 'direct_checkout',
        business_type: 'ecommerce',
        cta: { type: 'product_recommendation', label: 'Shop the catalog', link: '#products' },
        button_catalog: [
          { id: 'btn_top_sellers', label: 'Show top selling health products', payload: 'Show top selling health products', action: 'send_text', variant: 'primary', category: 'products', defaultScore: 60, icon: 'shopping-cart', tags: ['products', 'best sellers'] },
          { id: 'btn_delivery', label: 'How does same-day delivery work?', payload: 'How does same-day delivery work?', action: 'send_text', variant: 'secondary', category: 'delivery', defaultScore: 55, icon: 'truck', tags: ['delivery', 'shipping'] },
          { id: 'btn_returns', label: 'What is your return policy?', payload: 'What is your return policy?', action: 'send_text', variant: 'secondary', category: 'returns', defaultScore: 52, icon: 'refresh', tags: ['returns', 'refund'] },
          { id: 'btn_view_catalog', label: 'View all products', payload: '#products', action: 'navigate', variant: 'primary', category: 'products', defaultScore: 50, icon: 'shopping-bag', tags: ['catalog', 'products'] },
          { id: 'btn_consult', label: 'Book a consultation', payload: 'Book a doctor consultation', action: 'send_text', variant: 'secondary', category: 'appointment', defaultScore: 45, icon: 'calendar', tags: ['consultation', 'appointment'] },
        ],
      },
    },
    topics: [
      {
        section: 'Overview',
        content: [
          'MTH Medical Store is Madinah Teaching Hospital\'s online healthcare marketplace — trusted medical supplies, wellness products, and health consultations, all in one place. Every product is vetted by MTH\'s team of specialist doctors and pharmacists.',
          'We are located in Madina Town, Faisalabad, Pakistan. Contact us at +92 41 123 4567 or info@mthstore.pk. Your health data is encrypted and never shared with third parties.',
        ],
      },
      {
        section: 'Products',
        content: [
          'Digital Blood Pressure Monitor — Rs 4,500 (was Rs 6,200). Our best seller: clinically validated automatic blood pressure monitor with irregular heartbeat detection.',
          'Daily Multivitamin Pack — Rs 1,200: a 30-day supply of essential vitamins and minerals for overall health and immunity.',
          'Pulse Oximeter — Rs 2,800 (was Rs 3,500): fingertip SpO2 and pulse rate monitor with OLED display. FDA approved.',
          'Complete First Aid Kit — Rs 3,200: 120-piece emergency kit with bandages, antiseptics, scissors, and more.',
          'Complete Blood Count (CBC) — Rs 800: comprehensive blood screening with same-day results from our certified lab.',
          'Online Doctor Consultation — Rs 1,500: a 30-minute video consultation with a specialist doctor, available 24/7.',
          'Infrared Thermometer — Rs 1,800 (was Rs 2,400): non-contact forehead thermometer with fever alarm, reads in 1 second.',
          'Hand Sanitizer Bundle (6-pack) — Rs 950: 70% alcohol-based, hospital grade, dermatologically tested.',
        ],
      },
      {
        section: 'Delivery',
        content: [
          'We deliver across Faisalabad city same-day — order before 2 PM and receive your products the same day within Faisalabad.',
          'Across Pakistan, delivery takes 3–5 business days via TCS/Leopard courier. Delivery is available citywide with fast, tracked shipping.',
        ],
      },
      {
        section: 'Returns & insurance',
        content: [
          'Return policy: unopened products can be returned within 7 days of delivery. Lab tests and consultations are non-refundable.',
          'We accept all major insurance providers for lab tests and consultations. Contact our support for details on coverage.',
        ],
      },
      {
        section: 'Consultations & support',
        content: [
          'Booking a doctor consultation is easy: book directly from the website or ask the AI assistant. We have specialists available 24/7 via video call.',
          'Our AI health assistant gives product recommendations and health advice instantly. For help with an order, contact support at info@mthstore.pk or call +92 41 123 4567.',
        ],
      },
    ],
  },
  {
    slug: 'demo-dental',
    id: 'tenant-demo-dental',
    name: 'Maple Grove Dental Clinic',
    widget: {
      theme: 'light',
      position: 'right',
      primary_color: '#2563EB',
      company_name: 'Maple Grove Dental',
      greeting: 'Welcome to Maple Grove Dental! Ask me about our services, pricing, office hours, or how to book an appointment.',
      launcher_text: 'Chat with us',
      starter_options: ['Book an appointment', 'What services do you offer?', 'Office hours & insurance'],
      business_profile: {
        primary_goal: 'appointment_booking',
        business_type: 'clinic',
        cta: { type: 'appointment_booking', label: 'Book an appointment', link: '#book' },
        button_catalog: [
          { id: 'btn_book_appt', label: 'Book an appointment', payload: 'Book an appointment', action: 'send_text', variant: 'primary', category: 'appointment', defaultScore: 60, icon: 'calendar', tags: ['appointment', 'book'] },
          { id: 'btn_services', label: 'What services do you offer?', payload: 'What services do you offer?', action: 'send_text', variant: 'secondary', category: 'services', defaultScore: 55, icon: 'tooth', tags: ['services', 'treatment'] },
          { id: 'btn_hours', label: 'Office hours', payload: 'What are your office hours?', action: 'send_text', variant: 'secondary', category: 'hours', defaultScore: 50, icon: 'clock', tags: ['hours', 'open'] },
          { id: 'btn_insurance', label: 'Insurance & payment', payload: 'Do you accept my insurance?', action: 'send_text', variant: 'secondary', category: 'insurance', defaultScore: 48, icon: 'shield', tags: ['insurance', 'payment'] },
          { id: 'btn_emergency', label: 'Emergency care', payload: 'Do you handle dental emergencies?', action: 'send_text', variant: 'secondary', category: 'emergency', defaultScore: 45, icon: 'alert', tags: ['emergency'] },
        ],
      },
    },
    topics: [
      {
        section: 'Overview',
        content: [
          'Maple Grove Dental is a family-friendly dental clinic offering general, cosmetic, orthodontic, and emergency dentistry with advanced technology and board-certified doctors. We accept most major insurance plans and offer online booking 24/7.',
          'We are located at 123 Maple Grove Medical Plaza, Suite 200. Walk-ins are welcome, and same-day appointments are often available for urgent cases.',
        ],
      },
      {
        section: 'Services & pricing',
        content: [
          'General Checkup & Cleaning — starting at $120: professional cleaning and a comprehensive oral exam.',
          'Teeth Whitening — starting at $350: professional in-office whitening, results in one visit.',
          'Dental Fillings — starting at $150: tooth-colored composite restorations for cavities.',
          'Root Canal Treatment — starting at $800: gentle endodontic care to save your natural tooth.',
          'Invisalign Braces — starting at $3,500: clear, removable aligners for a straighter smile.',
          'Pediatric Dentistry — starting at $90: friendly care for children of all ages.',
          'Emergency Dental Care — same-day appointments; call for pricing.',
          'Dental Implants — starting at $2,000: permanent, natural-looking tooth replacement.',
        ],
      },
      {
        section: 'Office hours',
        content: [
          'Office hours: Monday 8:00 AM – 6:00 PM, Tuesday 8:00 AM – 6:00 PM, Wednesday 8:00 AM – 6:00 PM, Thursday 8:00 AM – 7:00 PM, Friday 8:00 AM – 5:00 PM, Saturday 9:00 AM – 2:00 PM, Sunday closed.',
          'We reserve same-day slots for emergency cases. Call (555) 123-4567 for urgent dental needs — our emergency line is (555) 911-DENT.',
        ],
      },
      {
        section: 'Insurance & booking',
        content: [
          'We accept most major insurance plans, including Delta Dental, Aetna, Cigna, MetLife, Blue Cross, and United Healthcare. CareCredit financing is also available.',
          'Booking an appointment is easy: book online 24/7 from our website, call the office, or ask us in chat and we will help you schedule a visit.',
        ],
      },
    ],
  },
];

function buildChunks(demo) {
  const chunks = [];
  let position = 0;
  for (const section of demo.topics) {
    section.content.forEach(text => {
      chunks.push({
        chunkId: crypto.randomBytes(12).toString('hex'),
        tenantId: demo.id,
        documentId: `${demo.id}_demo-knowledge`,
        documentVersion: 1,
        parentChunkId: null,
        sectionPath: section.section,
        content: text,
        tokenCount: Math.ceil(text.split(/\s+/).length),
        checksum: crypto.createHash('sha256').update(text).digest('hex').slice(0, 16),
        position: position++,
        metadata: { source: 'demo-seed', title: section.section },
      });
    });
  }
  return chunks;
}

// ---------------------------------------------------------------------------
function main() {
  const db = new Database(DB_PATH);
  const dryRun = process.argv.includes('--dry-run');

  // Guard: the legacy demo tenant is the base for burflow-saas.
  const legacy = db.prepare("SELECT id FROM tenants WHERE id = 'tenant-1786006493162'").get();
  if (!legacy) {
    console.error('Legacy demo tenant (tenant-1786006493162) not found — cannot rename to burflow-saas. Aborting.');
    process.exit(1);
  }
  if (!db.prepare('SELECT id FROM users WHERE id = ?').get(DEMO_OWNER_ID)) {
    console.error(`Demo owner user (${DEMO_OWNER_ID}) not found — aborting.`);
    process.exit(1);
  }

  const upsertTenant = db.prepare(
    `INSERT INTO tenants (id, name, slug, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, slug = excluded.slug, updated_at = excluded.updated_at`
  );
  const setTenant = db.prepare('UPDATE tenants SET name = ?, slug = ?, updated_at = ? WHERE id = ?');

  const tx = db.transaction(() => {
    for (const demo of DEMOS) {
      // 1. Ensure the tenant exists with the right slug/name.
      const existing = db.prepare('SELECT id, slug, name FROM tenants WHERE id = ?').get(demo.id);
      if (existing && existing.slug !== demo.slug) {
        // Rename in place (legacy demo-tenant -> burflow-saas), or fix a stale slug.
        const clash = db.prepare('SELECT id FROM tenants WHERE slug = ? AND id != ?').get(demo.slug, demo.id);
        if (clash) {
          console.error(`Slug ${demo.slug} already owned by ${clash.id} — aborting for ${demo.id}.`);
          process.exit(1);
        }
        setTenant.run(demo.name, demo.slug, now(), demo.id);
      } else if (!existing) {
        upsertTenant.run(demo.id, demo.name, demo.slug, DEMO_OWNER_ID, now(), now());
      }

      // 2. Purge this tenant's prior knowledge (idempotent re-run).
      const tenantDocs = [
        ...db.prepare("SELECT document_id FROM kb_chunks WHERE tenant_id = ?").all(demo.id).map(r => r.document_id),
        ...db.prepare('SELECT document_id FROM knowledge_queue WHERE tenant_id = ?').all(demo.id).map(r => r.document_id),
      ];
      const docs = [...new Set(tenantDocs)];
      if (docs.length) {
        const ph = docs.map(() => '?').join(',');
        const del = sql => { try { db.prepare(sql).run(...docs); } catch { /* table may not exist */ } };
        del(`DELETE FROM knowledge_chunks WHERE document_id IN (${ph})`);
        del(`DELETE FROM knowledge_vectors WHERE document_id IN (${ph})`);
        del(`DELETE FROM knowledge_content WHERE document_id IN (${ph})`);
        del(`DELETE FROM kb_chunks WHERE document_id IN (${ph})`);
        del(`DELETE FROM knowledge_queue WHERE document_id IN (${ph})`);
        del(`DELETE FROM kb_documents WHERE id IN (${ph})`);
      }
      const snapDel = db.prepare('DELETE FROM knowledge_snapshots WHERE tenant_id = ?').run(demo.id);

      // 3. Publish the industry knowledge snapshot (pipeline format).
      const chunks = buildChunks(demo);
      db.prepare(
        `INSERT INTO knowledge_snapshots (knowledge_version, tenant_id, embedding_version, embedding_model, chunking_version, published_at, chunk_data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(1, demo.id, '1.0.0', 'demo-seed', '1.0.0', now(), JSON.stringify(chunks));

      // 4. Upsert the branded widget config.
      const wcCols = db.prepare('PRAGMA table_info(widget_configs)').all().map(c => c.name);
      const row = {
        tenant_id: demo.id,
        theme: demo.widget.theme,
        position: demo.widget.position,
        primary_color: demo.widget.primary_color,
        company_name: demo.widget.company_name,
        greeting: demo.widget.greeting,
        launcher_text: demo.widget.launcher_text,
        starter_options: JSON.stringify(demo.widget.starter_options),
        business_profile: demo.widget.business_profile ? JSON.stringify(demo.widget.business_profile) : undefined,
        notify_threshold: 'all',
        auto_open: 0,
        created_at: now(),
        updated_at: now(),
      };
      const cols = wcCols.filter(c => c !== 'id' && c in row && row[c] !== undefined);
      db.prepare('DELETE FROM widget_configs WHERE tenant_id = ?').run(demo.id);
      db.prepare(
        `INSERT INTO widget_configs (${cols.join(', ')})
         VALUES (${cols.map(c => '?').join(', ')})`
      ).run(...cols.map(c => row[c]));

      console.log(`✔ ${demo.slug} (${demo.id}): tenant ready, ${snapDel.changes} old snapshot(s) purged, ${chunks.length} chunks published, widget config upserted.`);
    }
  });

  if (dryRun) {
    console.log('Dry run — no changes written. Run without --dry-run to apply.');
    return;
  }
  tx();
  console.log('Done. Demo tenants: burflow-saas (SaaS), demo-ecommerce (store), demo-dental (clinic).');
  db.close();
}

main();
