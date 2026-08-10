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
    name: 'Tech & Apparel Store',
    widget: {
      theme: 'light',
      position: 'right',
      primary_color: '#A8244B',
      company_name: 'Tech & Apparel Store',
      greeting: "Hi there! I'm your shopping assistant at Tech & Apparel. Ask me about our products, shipping, or returns — or start shopping right away.",
      launcher_text: 'Chat with us',
      starter_options: ['What products do you have?', 'Shipping & returns', 'Start shopping'],
    },
    topics: [
      {
        section: 'Overview',
        content: [
          'Tech & Apparel Store is an online shop for tech accessories and everyday apparel. Browse our catalog, add items to your cart, and check out securely — we ship across the country with fast, tracked delivery.',
          'We carry wireless headphones and earbuds, running and lifestyle sneakers, denim and bomber jackets, smartwatches, phone accessories, and seasonal apparel. New arrivals drop every week.',
        ],
      },
      {
        section: 'Products',
        content: [
          'Wireless Noise-Cancelling Headphones — $89.99: over-ear, 30-hour battery life, Bluetooth 5.3, built-in mic for calls. Our best seller.',
          'Running Sneakers — $119.99: lightweight breathable mesh, cushioned sole, available in men\'s and women\'s sizes 6–13.',
          'Classic Denim Jacket — $79.99: medium-wash, unisex fit S–XXL, machine washable.',
          'Bomber Jacket — $94.99: quilted lining, zip front, navy and black.',
          'Wireless Earbuds — $49.99: compact case, 24-hour total battery, touch controls.',
          'Smartwatch — $129.99: fitness tracking, heart-rate monitor, 7-day battery, iOS and Android compatible.',
        ],
      },
      {
        section: 'Shipping',
        content: [
          'Standard shipping takes 3–5 business days on all orders. Shipping is free on orders over $50; otherwise a flat $4.99 applies.',
          'Express shipping (1–2 business days) is available at checkout for $12.99. All orders ship with tracking, and you will receive an email the moment your order leaves the warehouse.',
        ],
      },
      {
        section: 'Returns',
        content: [
          'We offer a 30-day return policy. Items must be unused, in their original packaging, and returned within 30 days of delivery for a full refund to your original payment method.',
          'To start a return, go to your order confirmation email and use the return link, or contact support with your order number. Refunds are processed within 3–5 business days after the item reaches our warehouse.',
        ],
      },
      {
        section: 'Checkout & support',
        content: [
          'Checkout is quick and secure: add items to your cart, enter your shipping details, and pay by card or PayPal. You can track your order from your account page at any time.',
          'Need help? Our support team answers within a few hours at support@techapparel.example. If you cannot find what you are looking for, we will help you place the order over chat.',
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
        notify_threshold: 'all',
        auto_open: 0,
        created_at: now(),
        updated_at: now(),
      };
      const cols = wcCols.filter(c => c !== 'id' && c in row);
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
