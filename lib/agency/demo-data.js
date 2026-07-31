const { getDb } = require("./db");
const clients = require("./client-crm");
const tenants = require("./tenant-mgr");
const scanner = require("./website-scanner");
const onboarding = require("./onboarding");
const proposals = require("./proposal-gen");
const invoices = require("./invoice-gen");
const deployment = require("./deployment");

const SAMPLE_CLIENTS = [
  {
    name: "BurFlow Dental Care",
    email: "frontdesk@BurFlow.example",
    phone: "(555) 100-2000",
    website: "BurFlow-dental.example",
    industry: "dental",
    status: "active",
    pipeline_stage: "closed_won",
    source: "referral",
    monthly_budget: 59900,
    notes: "Flagship reference client. Full deployment live on their site.",
    tenant: { subdomain: "BurFlow", brand_name: "BurFlow Dental", brand_primary_color: "#0a66c2", brand_secondary_color: "#00b894", chatbot_title: "BurFlow AI", chatbot_greeting: "Hi! I'm BurFlow AI. Want to book a visit or have a question?" },
    scanner: {
      url: "https://BurFlow-dental.example",
      services_found: [{ name: "General Checkup & Cleaning", price: "$0-$250", duration: "45-60 min" }, { name: "Teeth Whitening", price: "$350-$800", duration: "60-90 min" }, { name: "Dental Fillings", price: "$200-$400", duration: "45 min" }, { name: "Root Canal Treatment", price: "$800-$1,500", duration: "60-90 min" }, { name: "Invisalign Braces", price: "$3,000-$5,000", duration: "Varies" }, { name: "Pediatric Dentistry", price: "$100-$300", duration: "30-45 min" }, { name: "Emergency Dental Care", price: "$200-$500", duration: "Urgent" }],
      faqs_found: [{ question: "What are your business hours?", answer: "We're open Monday-Friday 8 AM - 5 PM and Saturday 9 AM - 2 PM." }, { question: "What insurance do you accept?", answer: "We accept most major insurance plans including Aetna, Cigna, Delta Dental, MetLife, and Blue Cross." }, { question: "Do you handle emergencies?", answer: "Yes, we offer emergency dental care. Please call us for immediate assistance." }],
      team_found: ["Dr. Patel", "Dr. Lee", "Dr. Garcia"],
      pages_scanned: 5,
    },
    proposal_tier: "growth",
    invoice: { amount_cents: 59900, status: "paid", notes: "Monthly subscription - Growth plan" },
  },
  {
    name: "Bella Trattoria Italian Restaurant",
    email: "hello@bellatrattoria.example",
    phone: "(555) 200-3000",
    website: "bellatrattoria.example",
    industry: "restaurant",
    status: "onboarding",
    pipeline_stage: "negotiation",
    source: "inbound",
    monthly_budget: 29900,
    notes: "Interested in reservations + menu FAQ bot. Website scan pending.",
    tenant: { subdomain: "bella", brand_name: "Bella Trattoria", brand_primary_color: "#c0392b", brand_secondary_color: "#f39c12", chatbot_title: "Bella Assistant", chatbot_greeting: "Ciao! Ask me about our menu, hours, or make a reservation." },
    scanner: null,
    proposal_tier: "starter",
    invoice: null,
  },
  {
    name: "Hartwell & Associates Law Firm",
    email: "contact@hartwell-law.example",
    phone: "(555) 300-4000",
    website: "hartwell-law.example",
    industry: "law",
    status: "prospect",
    pipeline_stage: "proposal",
    source: "partner",
    monthly_budget: 99900,
    notes: "Enterprise deal. Needs intake qualification + consultation booking.",
    tenant: { subdomain: "hartwell", brand_name: "Hartwell & Associates", brand_primary_color: "#2c3e50", brand_secondary_color: "#8e44ad", chatbot_title: "Hartwell Legal AI", chatbot_greeting: "Welcome to Hartwell & Associates. How can our legal team assist you today?" },
    scanner: {
      url: "https://hartwell-law.example",
      services_found: [{ name: "Personal Injury Consultation", price: "Free", duration: "30 min" }, { name: "Family Law", price: "Consultation $250", duration: "60 min" }, { name: "Estate Planning", price: "$1,500+", duration: "Varies" }, { name: "Business Law", price: "$200/hr", duration: "Varies" }],
      faqs_found: [{ question: "Do you offer free consultations?", answer: "Yes, we offer a free 30-minute personal injury consultation." }, { question: "What areas of law do you practice?", answer: "Personal injury, family law, estate planning, and business law." }],
      team_found: ["Attorney Hartwell", "Attorney Cho"],
      pages_scanned: 4,
    },
    proposal_tier: "enterprise",
    invoice: { amount_cents: 99900, status: "pending", notes: "Enterprise monthly - not yet invoiced" },
  },
  {
    name: "IronForge Gym & Fitness",
    email: "team@ironforge.example",
    phone: "(555) 400-5000",
    website: "ironforge.example",
    industry: "gym",
    status: "active",
    pipeline_stage: "closed_won",
    source: "outreach",
    monthly_budget: 29900,
    notes: "Membership + class booking bot live. Strong engagement.",
    tenant: { subdomain: "ironforge", brand_name: "IronForge Gym", brand_primary_color: "#e74c3c", brand_secondary_color: "#f1c40f", chatbot_title: "IronForge Coach", chatbot_greeting: "Ready to crush your goals? Ask about memberships or class schedules!" },
    scanner: {
      url: "https://ironforge.example",
      services_found: [{ name: "Day Pass", price: "$15", duration: "1 day" }, { name: "Monthly Membership", price: "$39/mo", duration: "Recurring" }, { name: "Personal Training", price: "$60/session", duration: "60 min" }, { name: "Group Classes", price: "$20/class", duration: "45 min" }],
      faqs_found: [{ question: "What are your hours?", answer: "We're open 24/7 for members." }, { question: "Do you offer personal training?", answer: "Yes! Our certified trainers offer 1-on-1 and small group sessions." }],
      team_found: ["Coach Marcus"],
      pages_scanned: 6,
    },
    proposal_tier: "starter",
    invoice: { amount_cents: 29900, status: "paid", notes: "Monthly subscription - Starter plan" },
  },
  {
    name: "Summit Realty Group",
    email: "listings@summitrealty.example",
    phone: "(555) 500-6000",
    website: "summitrealty.example",
    industry: "realestate",
    status: "onboarding",
    pipeline_stage: "discovery",
    source: "inbound",
    monthly_budget: 59900,
    notes: "Property inquiry qualification. Configuring chatbot now.",
    tenant: { subdomain: "summit", brand_name: "Summit Realty", brand_primary_color: "#16a085", brand_secondary_color: "#27ae60", chatbot_title: "Summit Property AI", chatbot_greeting: "Looking for a home? I can help you find listings and book viewings." },
    scanner: {
      url: "https://summitrealty.example",
      services_found: [{ name: "Home Buying Assistance", price: "Free consult", duration: "30 min" }, { name: "Home Selling", price: "1.5% listing", duration: "Varies" }, { name: "Property Management", price: "8%/mo", duration: "Recurring" }],
      faqs_found: [{ question: "How do I schedule a viewing?", answer: "Just tell me which property and I'll book a viewing with an agent." }, { question: "What areas do you serve?", answer: "We serve the greater metro area and surrounding suburbs." }],
      team_found: ["Agent Reyes"],
      pages_scanned: 7,
    },
    proposal_tier: "growth",
    invoice: null,
  },
  {
    name: "Lush Salon & Spa",
    email: "bookings@lushsalon.example",
    phone: "(555) 600-7000",
    website: "lushsalon.example",
    industry: "salon",
    status: "lead",
    pipeline_stage: "discovery",
    source: "referral",
    monthly_budget: 29900,
    notes: "Referred by BurFlow. Exploring appointment booking bot.",
    tenant: { subdomain: "lush", brand_name: "Lush Salon & Spa", brand_primary_color: "#d63384", brand_secondary_color: "#e64980", chatbot_title: "Lush Stylist", chatbot_greeting: "Welcome to Lush! Want to book a cut, color, or spa day?" },
    scanner: null,
    proposal_tier: "starter",
    invoice: null,
  },
];

function seedIfEmpty() {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) as count FROM clients").get().count;
  if (count > 0) return false;
  for (const c of SAMPLE_CLIENTS) {
    const created = clients.create({
      name: c.name, email: c.email, phone: c.phone, website: c.website, industry: c.industry,
      status: c.status, pipeline_stage: c.pipeline_stage, source: c.source, monthly_budget: c.monthly_budget, notes: c.notes,
    });
    if (c.tenant) tenants.upsert(created.id, c.tenant);
    if (c.scanner) {
      const res = db.prepare("INSERT INTO scanner_results (id, client_id, url, status, services_found, faqs_found, team_found, pages_scanned, raw_data, created_at) VALUES (?,?,?,'complete',?,?,?,?,?,datetime('now'))").run(
        require("uuid").v4(), created.id, c.scanner.url, JSON.stringify(c.scanner.services_found), JSON.stringify(c.scanner.faqs_found), JSON.stringify(c.scanner.team_found), c.scanner.pages_scanned, JSON.stringify({ seeded: true })
      );
      const config = deployment.createConfig(created.id, { services: c.scanner.services_found, faqs: c.scanner.faqs_found, team: c.scanner.team_found });
    }
    onboarding.initTasks(created.id);
    if (c.proposal_tier) proposals.generate(created.id, c.proposal_tier);
    if (c.invoice) invoices.create(created.id, c.invoice);
  }
  return true;
}

module.exports = { seedIfEmpty, SAMPLE_CLIENTS };
