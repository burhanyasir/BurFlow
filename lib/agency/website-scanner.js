const { getDb } = require("./db");
const { v4: uuid } = require("uuid");
const https = require("https");
const http = require("http");
const url = require("url");

const DENTAL_SERVICES = [
  { keywords: ["cleaning", "checkup", "prophylaxis", "scaling", "polish"], name: "General Checkup & Cleaning", price: "$0-$250", duration: "45-60 min" },
  { keywords: ["whitening", "bleaching"], name: "Teeth Whitening", price: "$350-$800", duration: "60-90 min" },
  { keywords: ["filling", "composite", "cavity", "restoration"], name: "Dental Fillings", price: "$200-$400", duration: "45 min" },
  { keywords: ["root canal", "endodontic"], name: "Root Canal Treatment", price: "$800-$1,500", duration: "60-90 min" },
  { keywords: ["crown", "cap"], name: "Dental Crowns", price: "$1,000-$2,500", duration: "2 visits" },
  { keywords: ["extraction", "pull"], name: "Tooth Extraction", price: "$150-$350", duration: "30-45 min" },
  { keywords: ["implant", "implant"], name: "Dental Implants", price: "$3,000-$4,500", duration: "Multiple visits" },
  { keywords: ["invisalign", "aligner", "braces", "orthodontic"], name: "Invisalign Braces", price: "$3,000-$5,000", duration: "Varies" },
  { keywords: ["pediatric", "children", "kids", "child"], name: "Pediatric Dentistry", price: "$100-$300", duration: "30-45 min" },
  { keywords: ["emergency", "urgent", "pain", "abscess", "cracked"], name: "Emergency Dental Care", price: "$200-$500", duration: "Urgent" },
  { keywords: ["periodontal", "gum", "scaling and root planing", "deep clean"], name: "Periodontal Therapy", price: "$300-$1,000", duration: "60 min" },
  { keywords: ["cosmetic", "veneer", "bonding", "smile makeover"], name: "Cosmetic Dentistry", price: "$500-$2,000", duration: "Varies" },
  { keywords: ["sedation", "sleep dentistry", "nitrous", "laughing gas", "iv sedation"], name: "Sedation Dentistry", price: "$200-$500", duration: "Varies" },
  { keywords: ["mouthguard", "night guard", "splint", "bruxism", "grind"], name: "Mouthguards & Night Guards", price: "$150-$300", duration: "30 min" },
  { keywords: ["x-ray", "xray", "radiograph", "cbct", "panoramic"], name: "Digital X-Rays & Imaging", price: "$50-$200", duration: "15 min" },
];

const FAQ_KEYWORDS = [
  { pattern: /hours|open|closed|when|time|weekend|after hours/i, question: "What are your business hours?", answer: "We're open Monday-Friday 8 AM - 5 PM and Saturday 9 AM - 2 PM." },
  { pattern: /location|address|where|directions|office/i, question: "Where are you located?", answer: "Our clinic is located in the Medical Arts Building." },
  { pattern: /insurance|cover|accepted|in.?network/i, question: "What insurance do you accept?", answer: "We accept most major insurance plans including Aetna, Cigna, Delta Dental, MetLife, and Blue Cross." },
  { pattern: /payment|financing|care.?credit|afford|cost|price|fee|charge/i, question: "What payment options are available?", answer: "We accept cash, credit cards, and CareCredit financing." },
  { pattern: /doctor|dentist|team|staff|hygienist|specialist|dr\./i, question: "Who are your doctors?", answer: "Our team includes experienced general dentists and specialists." },
  { pattern: /emergency|urgent|pain|hurt|toothache|abscess|swelling/i, question: "Do you handle emergencies?", answer: "Yes, we offer emergency dental care. Please call us for immediate assistance." },
  { pattern: /new patient|first visit|what to expect|consultation/i, question: "What should I expect on my first visit?", answer: "Your first visit includes a comprehensive exam, digital x-rays, and a consultation with the doctor." },
  { pattern: /cancel|reschedule|change appointment/i, question: "What is your cancellation policy?", answer: "We ask for 24 hours notice for cancellations." },
  { pattern: (s) => s.includes("senior") || s.includes("medicare") || s.includes("medicaid"), question: "Do you offer senior discounts?", answer: "We offer special pricing for seniors and Medicare patients." },
];

const TEAM_PATTERNS = [
  /dr\.\s+[a-z]+/gi, /doctor\s+[a-z]+/gi, /\bdds\b/gi, /\bdmd\b/gi,
  /hygienist/gi, /specialist/gi, /orthodontist/gi, /periodontist/gi,
  /endodontist/gi, /oral surgeon/gi,
];

function fetchUrl(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const mod = parsed.protocol === "https:" ? https : http;
    const opts = { hostname: parsed.hostname, port: parsed.port || (parsed.protocol === "https:" ? 443 : 80), path: parsed.pathname + parsed.search, method: "GET", timeout: 10000, headers: { "User-Agent": "BrightSmileAIScanner/1.0" } };
    const req = mod.request(opts, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk.toString());
      res.on("end", () => resolve(data));
    });
    req.on("error", (e) => reject(new Error(e.code ? `${e.code}: ${e.message || e.code}` : (e.message || "Request failed"))));
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout connecting to " + targetUrl)); });
    req.end();
  });
}

function extractServices(text) {
  const found = [];
  const lower = text.toLowerCase();
  for (const svc of DENTAL_SERVICES) {
    if (svc.keywords.some(kw => lower.includes(kw))) {
      found.push({ name: svc.name, price: svc.price, duration: svc.duration, confidence: "auto" });
    }
  }
  return found;
}

function extractFaqs(text) {
  const found = [];
  const lower = text.toLowerCase();
  for (const faq of FAQ_KEYWORDS) {
    if (typeof faq.pattern === "function" ? faq.pattern(lower) : faq.pattern.test(lower)) {
      found.push({ question: faq.question, answer: faq.answer });
    }
  }
  return found;
}

function extractTeam(text) {
  const names = new Set();
  let match;
  const drRegex = /(?:dr\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
  while ((match = drRegex.exec(text)) !== null) {
    const name = match[1].trim();
    if (name.length > 2 && name.length < 40) names.add(name);
  }
  return Array.from(names).slice(0, 10);
}

async function scan(clientId, siteUrl) {
  const db = getDb();
  const id = uuid();
  const safeUrl = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
  db.prepare("INSERT INTO scanner_results (id, client_id, url, status, created_at) VALUES (?,?,?,'scanning',datetime('now'))").run(id, clientId, safeUrl);
  try {
    const html = await fetchUrl(safeUrl);
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const services = extractServices(text);
    const faqs = extractFaqs(text);
    const team = extractTeam(text);
    db.prepare("UPDATE scanner_results SET status='complete', services_found=?, faqs_found=?, team_found=?, pages_scanned=?, raw_data=? WHERE id=?").run(
      JSON.stringify(services), JSON.stringify(faqs), JSON.stringify(team), 1, JSON.stringify({ textLength: text.length, title: text.slice(0, 200) }), id
    );
    return db.prepare("SELECT * FROM scanner_results WHERE id=?").get(id);
  } catch (err) {
    db.prepare("UPDATE scanner_results SET status='failed', error=? WHERE id=?").run(err.message, id);
    return db.prepare("SELECT * FROM scanner_results WHERE id=?").get(id);
  }
}

function getResults(clientId) {
  const db = getDb();
  return db.prepare("SELECT * FROM scanner_results WHERE client_id=? ORDER BY created_at DESC").all(clientId);
}

function applyToConfig(clientId, resultId) {
  const db = getDb();
  const result = db.prepare("SELECT * FROM scanner_results WHERE id=? AND client_id=?").get(resultId, clientId);
  if (!result || result.status !== "complete") return null;
  const deployment = require("./deployment");
  let config = db.prepare("SELECT * FROM chatbot_configs WHERE client_id=?").get(clientId);
  if (!config) {
    config = deployment.createConfig(clientId, {});
    if (!config) return null;
  }
  db.prepare("UPDATE chatbot_configs SET services=?, faqs=?, team=?, updated_at=datetime('now') WHERE client_id=?").run(
    result.services_found, result.faqs_found, result.team_found, clientId
  );
  return db.prepare("SELECT * FROM chatbot_configs WHERE client_id=?").get(clientId);
}

module.exports = { scan, getResults, applyToConfig, extractServices, extractFaqs };
