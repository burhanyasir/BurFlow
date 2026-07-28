const http = require("http");
const { getDb } = require("./lib/agency/db");
const clients = require("./lib/agency/client-crm");
const tenants = require("./lib/agency/tenant-mgr");
const scanner = require("./lib/agency/website-scanner");
const onboarding = require("./lib/agency/onboarding");
const proposals = require("./lib/agency/proposal-gen");
const invoices = require("./lib/agency/invoice-gen");
const deployment = require("./lib/agency/deployment");

let passed = 0, failed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log(`  [PASS] ${name}`); }
  else { failed++; console.log(`  [FAIL] ${name}`); }
}

// Tiny local site to scan
const SITE_HTML = `<html><body>
  <h1>Test Dental Clinic</h1>
  <p>We offer teeth cleaning and checkups. Our teeth whitening service is popular.</p>
  <p>We provide dental fillings and root canal treatment. Ask about Invisalign braces.</p>
  <p>Open Monday to Friday. We accept Aetna insurance. Emergency dental care available.</p>
  <p>Meet Dr. Smith and Dr. Jones, our experienced team.</p>
</body></html>`;

function startSite() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/html" }); res.end(SITE_HTML); });
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}

(async () => {
  console.log("Running Agency End-to-End Workflow Test\n");
  const site = await startSite();
  const siteUrl = `http://127.0.0.1:${site.address().port}`;

  // 1. Add client
  const uniq = "e2e" + Date.now();
  const client = clients.create({ name: "E2E Test Clinic", email: "test@example.com", website: "e2etest.example", industry: "dental", status: "lead", monthly_budget: 29900 });
  check("Client created with id", !!client.id);
  check("Client starts as lead", client.status === "lead");

  // 2. Configure tenant/branding
  const tenant = tenants.upsert(client.id, { subdomain: uniq, brand_name: "E2E Test Clinic", brand_primary_color: "#123456" });
  check("Tenant created", !!tenant && tenant.subdomain === uniq);

  // 3. Init onboarding
  const ob = onboarding.initTasks(client.id);
  check("Onboarding tasks initialized", ob.tasks.length > 0);

  // 4. Scan website
  const result = await scanner.scan(client.id, siteUrl);
  check("Scanner completed", result.status === "complete");
  const services = JSON.parse(result.services_found || "[]");
  check("Scanner extracted services", services.length > 0);
  check("Scanner found teeth whitening", services.some((s) => s.name.includes("Whitening")));
  check("Scanner found root canal", services.some((s) => s.name.includes("Root Canal")));

  // 5. Apply scan to config
  const cfg = scanner.applyToConfig(client.id, result.id);
  check("Config created from scan", !!cfg);
  check("Config has services", JSON.parse(cfg.services).length > 0);

  // 6. Update client status to onboarding
  clients.update(client.id, { status: "onboarding", pipeline_stage: "proposal" });
  check("Client moved to onboarding", clients.get(client.id).status === "onboarding");

  // 7. Generate proposal
  const prop = proposals.generate(client.id, "growth");
  check("Proposal generated", !!prop && prop.total_cents > 0);
  proposals.updateStatus(prop.id, "sent");
  proposals.updateStatus(prop.id, "accepted");
  check("Proposal accepted", proposals.get(prop.id).status === "accepted");

  // 8. Generate invoice
  const inv = invoices.create(client.id, { amount_cents: 59900, notes: "Growth monthly" });
  check("Invoice created", !!inv && inv.invoice_number.startsWith("INV-"));
  invoices.updateStatus(inv.id, "paid");
  check("Invoice paid", invoices.get(inv.id).status === "paid");

  // 9. Complete onboarding deployment tasks
  const tasks = onboarding.list(client.id).tasks.filter((t) => t.category === "deployment");
  for (const t of tasks) onboarding.toggleTask(t.id);
  const obAfter = onboarding.list(client.id);
  const depDone = obAfter.progress.deployment && obAfter.progress.deployment.done === obAfter.progress.deployment.total;
  check("Deployment tasks completed", depDone);

  // 10. Deployment readiness
  const dep = deployment.getDeploymentStatus(client.id);
  check("Deployment ready", dep.ready === true);
  check("Widget code generated", !!dep.widgetCode && dep.widgetCode.includes("BrightSmileWidget"));
  check("Widget has tenantId", dep.widgetCode.includes(tenant.id));

  // Cleanup
  clients.remove(client.id);
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  E2E RESULT: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(50)}`);
  site.close();
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => { console.error("E2E crashed:", e); process.exit(1); });
