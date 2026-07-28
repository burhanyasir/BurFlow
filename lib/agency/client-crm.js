const { getDb } = require("./db");
const { v4: uuid } = require("uuid");

const PIPELINE_STAGES = ["discovery", "proposal", "negotiation", "closed_won", "closed_lost"];
const STATUSES = ["lead", "prospect", "onboarding", "active", "suspended", "churned"];

function list({ status, pipeline, search, page = 1, limit = 50 } = {}) {
  const db = getDb();
  let where = ["1=1"];
  let params = [];
  if (status) { where.push("c.status = ?"); params.push(status); }
  if (pipeline) { where.push("c.pipeline_stage = ?"); params.push(pipeline); }
  if (search) { where.push("(c.name LIKE ? OR c.email LIKE ? OR c.website LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const offset = (page - 1) * limit;
  const rows = db.prepare(`SELECT c.*, t.subdomain, t.brand_name FROM clients c LEFT JOIN tenants t ON t.client_id = c.id WHERE ${where.join(" AND ")} ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  const total = db.prepare(`SELECT COUNT(*) as count FROM clients c WHERE ${where.join(" AND ")}`).get(...params).count;
  return { data: rows, total, page, limit, pages: Math.ceil(total / limit) };
}

function get(id) {
  const db = getDb();
  const client = db.prepare("SELECT c.*, t.subdomain, t.brand_name, t.chatbot_title, t.is_active as tenant_active FROM clients c LEFT JOIN tenants t ON t.client_id = c.id WHERE c.id = ?").get(id);
  if (!client) return null;
  client.onboarding = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN is_completed=1 THEN 1 ELSE 0 END) as done FROM onboarding_tasks WHERE client_id = ?").get(id);
  return client;
}

function create(data) {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO clients (id, name, email, phone, website, industry, status, pipeline_stage, source, monthly_budget, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, data.name, data.email || "", data.phone || "", data.website || "", data.industry || "dental",
    data.status || "lead", data.pipeline_stage || "discovery", data.source || "inbound",
    data.monthly_budget || 0, data.notes || "", now, now
  );
  return get(id);
}

function update(id, data) {
  const db = getDb();
  const now = new Date().toISOString();
  const fields = [];
  const params = [];
  for (const key of ["name", "email", "phone", "website", "industry", "status", "pipeline_stage", "source", "monthly_budget", "notes"]) {
    if (data[key] !== undefined) { fields.push(`${key}=?`); params.push(data[key]); }
  }
  if (fields.length === 0) return get(id);
  fields.push("updated_at=?");
  params.push(now, id);
  db.prepare(`UPDATE clients SET ${fields.join(",")} WHERE id=?`).run(...params);
  return get(id);
}

function remove(id) {
  const db = getDb();
  db.prepare("DELETE FROM clients WHERE id=?").run(id);
  return { deleted: true };
}

module.exports = { list, get, create, update, remove, PIPELINE_STAGES, STATUSES };
