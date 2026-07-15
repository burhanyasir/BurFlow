const { getDb } = require("./db");
const { v4: uuid } = require("uuid");

function findByClient(clientId) {
  const db = getDb();
  return db.prepare("SELECT * FROM tenants WHERE client_id = ?").get(clientId) || null;
}

function findBySubdomain(subdomain) {
  const db = getDb();
  return db.prepare("SELECT * FROM tenants WHERE subdomain = ?").get(subdomain) || null;
}

function upsert(clientId, data) {
  const db = getDb();
  const existing = findByClient(clientId);
  const now = new Date().toISOString();
  if (existing) {
    const fields = [];
    const params = [];
    for (const key of ["subdomain", "custom_domain", "brand_name", "brand_logo_url", "brand_primary_color", "brand_secondary_color", "chatbot_title", "chatbot_greeting", "is_active"]) {
      if (data[key] !== undefined) { fields.push(`${key}=?`); params.push(data[key]); }
    }
    if (fields.length > 0) {
      fields.push("updated_at=?");
      params.push(now, clientId);
      db.prepare(`UPDATE tenants SET ${fields.join(",")} WHERE client_id=?`).run(...params);
    }
    return findByClient(clientId);
  }
  const id = uuid();
  db.prepare("INSERT INTO tenants (id, client_id, subdomain, custom_domain, brand_name, brand_logo_url, brand_primary_color, brand_secondary_color, chatbot_title, chatbot_greeting, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, clientId, data.subdomain || `client-${clientId.slice(0, 8)}`, data.custom_domain || "",
    data.brand_name || "", data.brand_logo_url || "", data.brand_primary_color || "#0a66c2",
    data.brand_secondary_color || "#00b894", data.chatbot_title || "AI Assistant",
    data.chatbot_greeting || "Hi! How can I help you today?", data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1, now, now
  );
  return findByClient(clientId);
}

function listAll() {
  const db = getDb();
  return db.prepare("SELECT t.*, c.name as client_name FROM tenants t JOIN clients c ON c.id = t.client_id ORDER BY t.brand_name").all();
}

module.exports = { findByClient, findBySubdomain, upsert, listAll };
