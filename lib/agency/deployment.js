const { getDb } = require("./db");
const { v4: uuid } = require("uuid");
const crypto = require("crypto");

function generateWidgetCode(tenant) {
  const embedUrl = tenant.custom_domain
    ? `https://${tenant.custom_domain}/embed.js`
    : tenant.subdomain
      ? `/embed/${tenant.subdomain}.js`
      : "/embed.js";
  return [
    `<!-- BrightSmile AI Chatbot -->`,
    `<script>`,
    `(function(w,d,s,o,f){`,
    `  w.BrightSmileWidget={tenantId:"${tenant.id}",apiUrl:"${embedUrl}"};`,
    `  f=d.getElementsByTagName(s)[0],j=d.createElement(s);`,
    `  j.async=true;j.src="${embedUrl}";`,
    `  f.parentNode.insertBefore(j,f);`,
    `})(window,document,'script');`,
    `</script>`,
    `<!-- End BrightSmile AI Chatbot -->`,
  ].join("\n");
}

function getDeploymentStatus(clientId) {
  const db = getDb();
  const tenant = db.prepare("SELECT * FROM tenants WHERE client_id=?").get(clientId);
  const config = db.prepare("SELECT * FROM chatbot_configs WHERE client_id=?").get(clientId);
  const tasks = db.prepare("SELECT category, COUNT(*) as total, SUM(CASE WHEN is_completed=1 THEN 1 ELSE 0 END) as done FROM onboarding_tasks WHERE client_id=? GROUP BY category").all(clientId);
  const deployTasks = tasks.find(t => t.category === "deployment");
  const readiness = {
    hasTenant: !!tenant,
    hasConfig: !!config,
    servicesPopulated: config ? JSON.parse(config.services || "[]").length > 0 : false,
    deploymentDone: deployTasks ? deployTasks.done === deployTasks.total : false,
  };
  const allReady = Object.values(readiness).every(v => v === true);
  return {
    ready: allReady,
    readiness,
    widgetCode: tenant ? generateWidgetCode(tenant) : null,
    tenant
  };
}

function createConfig(clientId, data = {}) {
  const db = getDb();
  const tenant = db.prepare("SELECT * FROM tenants WHERE client_id=?").get(clientId);
  if (!tenant) return null;
  const id = uuid();
  const existing = db.prepare("SELECT * FROM chatbot_configs WHERE client_id=? AND tenant_id=?").get(clientId, tenant.id);
  if (existing) {
    db.prepare("UPDATE chatbot_configs SET config=?, updated_at=datetime('now') WHERE id=?").run(JSON.stringify(data.config || {}), existing.id);
    return db.prepare("SELECT * FROM chatbot_configs WHERE id=?").get(existing.id);
  }
  db.prepare("INSERT INTO chatbot_configs (id, client_id, tenant_id, config, services, faqs, team, created_at, updated_at) VALUES (?,?,?,?,?,?,?,datetime('now'),datetime('now'))").run(
    id, clientId, tenant.id, JSON.stringify(data.config || {}), JSON.stringify(data.services || []), JSON.stringify(data.faqs || []), JSON.stringify(data.team || [])
  );
  return db.prepare("SELECT * FROM chatbot_configs WHERE id=?").get(id);
}

function applyFromScanner(clientId, scannerId) {
  const scanner = require("./website-scanner");
  return scanner.applyToConfig(clientId, scannerId);
}

function getConfig(clientId) {
  const db = getDb();
  return db.prepare("SELECT * FROM chatbot_configs WHERE client_id=?").get(clientId);
}

function getWidgetBySubdomain(subdomain) {
  const db = getDb();
  const tenant = db.prepare("SELECT * FROM tenants WHERE subdomain=?").get(subdomain);
  if (!tenant) return null;
  return {
    subdomain: tenant.subdomain,
    brandName: tenant.brand_name,
    snippet: generateWidgetCode(tenant),
    tenant
  };
}

module.exports = { generateWidgetCode, getDeploymentStatus, createConfig, applyFromScanner, getConfig, getWidgetBySubdomain };
