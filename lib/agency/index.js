const clients = require("./client-crm");
const tenants = require("./tenant-mgr");
const scanner = require("./website-scanner");
const onboarding = require("./onboarding");
const proposals = require("./proposal-gen");
const invoices = require("./invoice-gen");
const deployment = require("./deployment");

function getDashboard() {
  const db = require("./db").getDb();
  const totalClients = db.prepare("SELECT COUNT(*) as count FROM clients").get().count;
  const activeClients = db.prepare("SELECT COUNT(*) as count FROM clients WHERE status='active'").get().count;
  const pipeline = {
    discovery: db.prepare("SELECT COUNT(*) as count FROM clients WHERE pipeline_stage='discovery'").get().count,
    proposal: db.prepare("SELECT COUNT(*) as count FROM clients WHERE pipeline_stage='proposal'").get().count,
    negotiation: db.prepare("SELECT COUNT(*) as count FROM clients WHERE pipeline_stage='negotiation'").get().count,
    won: db.prepare("SELECT COUNT(*) as count FROM clients WHERE pipeline_stage='closed_won'").get().count,
  };
  const pendingInvoices = db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount_cents),0) as total FROM invoices WHERE status='pending' OR status='overdue'").get();
  const monthlyRevenue = db.prepare("SELECT COALESCE(SUM(amount_cents),0) as total FROM invoices WHERE status='paid' AND paid_at >= datetime('now','-30 days')").get().total;
  const scanner_queue = db.prepare("SELECT COUNT(*) as count FROM scanner_results WHERE status='pending'").get().count;
  return { totalClients, activeClients, pipeline, pendingInvoices: pendingInvoices.count, pendingRevenue: pendingInvoices.total, monthlyRevenue, scanner_queue };
}

module.exports = { clients, tenants, scanner, onboarding, proposals, invoices, deployment, getDashboard };
