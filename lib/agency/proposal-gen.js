const { getDb } = require("./db");
const { v4: uuid } = require("uuid");

const TIER_TEMPLATES = {
  starter: { name: "Starter", monthly: 29900, setup: 0, features: ["Basic chatbot", "Up to 1,000 conversations/mo", "Email support", "Single location"] },
  growth: { name: "Growth", monthly: 59900, setup: 49900, features: ["Advanced chatbot", "Up to 5,000 conversations/mo", "Priority support", "Multi-location", "Analytics dashboard", "Custom branding"] },
  enterprise: { name: "Enterprise", monthly: 99900, setup: 99900, features: ["Unlimited conversations", "Dedicated account manager", "24/7 phone support", "Unlimited locations", "Custom integrations", "White-label option", "On-site training"] },
};

function generate(clientId, tier) {
  const db = getDb();
  const client = db.prepare("SELECT * FROM clients WHERE id=?").get(clientId);
  if (!client) return null;
  const tmpl = TIER_TEMPLATES[tier] || TIER_TEMPLATES.growth;
  const pricing = [
    { label: `${tmpl.name} Plan - Setup Fee`, amount: tmpl.setup, type: "one_time" },
    { label: `${tmpl.name} Plan - Monthly Subscription`, amount: tmpl.monthly, type: "monthly" },
  ];
  const flatContent = [
    `# Proposal for ${client.name}`,
    ``,
    `## Overview`,
    `Thank you for considering BrightSmile AI for your dental practice. This proposal outlines how our AI lead generation platform will help you convert more website visitors into booked appointments.`,
    ``,
    `## Recommended Plan: ${tmpl.name}`,
    ``,
    tmpl.features.map(f => `- ${f}`).join("\n"),
    ``,
    `## Pricing`,
    `- Setup Fee: **$${(tmpl.setup / 100).toFixed(2)}**`,
    `- Monthly Subscription: **$${(tmpl.monthly / 100).toFixed(2)}**`,
    `- Total First Month: **$${((tmpl.setup + tmpl.monthly) / 100).toFixed(2)}**`,
    ``,
    `## Next Steps`,
    `1. Review and accept this proposal`,
    `2. We'll set up your tenant environment`,
    `3. Scan your website to auto-configure your chatbot`,
    `4. Review and customize content`,
    `5. Deploy to your website`,
    ``,
    `We're excited to help you grow your practice!`,
  ].join("\n");
  const id = uuid();
  const total = tmpl.setup + tmpl.monthly;
  db.prepare("INSERT INTO proposals (id, client_id, title, content, pricing, total_cents, status, created_at, updated_at) VALUES (?,?,?,?,?,?,'draft',datetime('now'),datetime('now'))").run(
    id, clientId, `${tmpl.name} Plan Proposal`, flatContent, JSON.stringify(pricing), total
  );
  return db.prepare("SELECT * FROM proposals WHERE id=?").get(id);
}

function list(clientId) {
  const db = getDb();
  return db.prepare("SELECT * FROM proposals WHERE client_id=? ORDER BY created_at DESC").all(clientId);
}

function get(id) {
  const db = getDb();
  return db.prepare("SELECT * FROM proposals WHERE id=?").get(id);
}

function updateStatus(id, status) {
  const db = getDb();
  const now = status === "sent" ? new Date().toISOString() : null;
  db.prepare("UPDATE proposals SET status=?, sent_at=CASE WHEN ? IS NOT NULL THEN ? ELSE sent_at END, updated_at=datetime('now') WHERE id=?").run(status, now, now, id);
  return get(id);
}

module.exports = { generate, list, get, updateStatus, TIER_TEMPLATES };
