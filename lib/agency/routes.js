const express = require("express");
const router = express.Router();
const agency = require("./index");

// Dashboard
router.get("/dashboard", (req, res) => res.json(agency.getDashboard()));

// Clients
router.get("/clients", (req, res) => res.json(agency.clients.list(req.query)));
router.get("/clients/:id", (req, res) => { const c = agency.clients.get(req.params.id); c ? res.json(c) : res.status(404).json({ error: "Client not found" }); });
router.post("/clients", (req, res) => { const c = agency.clients.create(req.body); res.status(201).json(c); });
router.put("/clients/:id", (req, res) => { const c = agency.clients.update(req.params.id, req.body); c ? res.json(c) : res.status(404).json({ error: "Client not found" }); });
router.delete("/clients/:id", (req, res) => { agency.clients.remove(req.params.id); res.json({ ok: true }); });

// Tenants
router.get("/tenants", (req, res) => res.json(agency.tenants.listAll()));
router.get("/clients/:clientId/tenant", (req, res) => { const t = agency.tenants.findByClient(req.params.clientId); t ? res.json(t) : res.status(404).json({ error: "No tenant" }); });
router.put("/clients/:clientId/tenant", (req, res) => res.json(agency.tenants.upsert(req.params.clientId, req.body)));

// Website Scanner
router.post("/clients/:clientId/scanner", async (req, res) => {
  try {
    const siteUrl = req.body.url || agency.clients.get(req.params.clientId)?.website;
    if (!siteUrl) return res.status(400).json({ error: "No URL provided" });
    const result = await agency.scanner.scan(req.params.clientId, siteUrl);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.get("/clients/:clientId/scanner", (req, res) => res.json(agency.scanner.getResults(req.params.clientId)));
router.post("/clients/:clientId/scanner/:resultId/apply", (req, res) => {
  const updated = agency.scanner.applyToConfig(req.params.clientId, req.params.resultId);
  updated ? res.json(updated) : res.status(400).json({ error: "Cannot apply - scan incomplete or config missing" });
});

// Onboarding
router.post("/clients/:clientId/onboarding/init", (req, res) => res.json(agency.onboarding.initTasks(req.params.clientId)));
router.get("/clients/:clientId/onboarding", (req, res) => res.json(agency.onboarding.list(req.params.clientId)));
router.post("/onboarding/:taskId/toggle", (req, res) => {
  const t = agency.onboarding.toggleTask(req.params.taskId);
  t ? res.json(t) : res.status(404).json({ error: "Task not found" });
});

// Proposals
router.post("/clients/:clientId/proposals", (req, res) => {
  const p = agency.proposals.generate(req.params.clientId, req.body.tier || "growth");
  p ? res.status(201).json(p) : res.status(404).json({ error: "Client not found" });
});
router.get("/clients/:clientId/proposals", (req, res) => res.json(agency.proposals.list(req.params.clientId)));
router.get("/proposals/:id", (req, res) => { const p = agency.proposals.get(req.params.id); p ? res.json(p) : res.status(404).json({ error: "Not found" }); });
router.put("/proposals/:id/status", (req, res) => res.json(agency.proposals.updateStatus(req.params.id, req.body.status)));

// Invoices
router.post("/clients/:clientId/invoices", (req, res) => res.status(201).json(agency.invoices.create(req.params.clientId, req.body)));
router.get("/clients/:clientId/invoices", (req, res) => res.json(agency.invoices.list(req.params.clientId)));
router.get("/invoices", (req, res) => res.json(agency.invoices.listAll()));
router.put("/invoices/:id/status", (req, res) => res.json(agency.invoices.updateStatus(req.params.id, req.body.status)));

// Deployment
router.get("/clients/:clientId/deployment", (req, res) => res.json(agency.deployment.getDeploymentStatus(req.params.clientId)));
router.post("/clients/:clientId/deployment/config", (req, res) => {
  const cfg = agency.deployment.createConfig(req.params.clientId, req.body);
  cfg ? res.json(cfg) : res.status(400).json({ error: "No tenant found - create tenant first" });
});
router.get("/clients/:clientId/deployment/config", (req, res) => {
  const cfg = agency.deployment.getConfig(req.params.clientId);
  cfg ? res.json(cfg) : res.status(404).json({ error: "No config" });
});

module.exports = router;
