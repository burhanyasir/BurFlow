const { getDb } = require("./db");
const { v4: uuid } = require("uuid");

function nextNumber() {
  const db = getDb();
  const last = db.prepare("SELECT invoice_number FROM invoices ORDER BY created_at DESC LIMIT 1").get();
  const num = last ? parseInt(last.invoice_number.replace("INV-", ""), 10) + 1 : 1001;
  return `INV-${num}`;
}

function create(clientId, data) {
  const db = getDb();
  const id = uuid();
  const invoiceNumber = data.invoice_number || nextNumber();
  const dueDate = data.due_date || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  db.prepare("INSERT INTO invoices (id, client_id, invoice_number, amount_cents, status, due_date, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,datetime('now'),datetime('now'))").run(
    id, clientId, invoiceNumber, data.amount_cents || 0, "pending", dueDate, data.notes || ""
  );
  return db.prepare("SELECT * FROM invoices WHERE id=?").get(id);
}

function list(clientId) {
  const db = getDb();
  return db.prepare("SELECT * FROM invoices WHERE client_id=? ORDER BY created_at DESC").all(clientId);
}

function listAll() {
  const db = getDb();
  return db.prepare("SELECT i.*, c.name as client_name FROM invoices i JOIN clients c ON c.id = i.client_id ORDER BY i.created_at DESC").all();
}

function get(id) {
  const db = getDb();
  return db.prepare("SELECT * FROM invoices WHERE id=?").get(id);
}

function updateStatus(id, status) {
  const db = getDb();
  const paidAt = status === "paid" ? new Date().toISOString() : null;
  db.prepare("UPDATE invoices SET status=?, paid_at=CASE WHEN ? IS NOT NULL THEN ? ELSE paid_at END, updated_at=datetime('now') WHERE id=?").run(status, paidAt, paidAt, id);
  return get(id);
}

module.exports = { create, list, listAll, get, updateStatus };
