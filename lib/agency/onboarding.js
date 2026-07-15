const { getDb } = require("./db");
const { v4: uuid } = require("uuid");

const DEFAULT_TASKS = [
  { task: "Collect client contact info and website", category: "setup" },
  { task: "Schedule kickoff call", category: "setup" },
  { task: "Set up tenant subdomain and branding", category: "branding" },
  { task: "Configure chatbot greeting and title", category: "branding" },
  { task: "Run website scanner to discover services", category: "content" },
  { task: "Review and approve scanned services", category: "content" },
  { task: "Add clinic FAQs", category: "content" },
  { task: "Add team member profiles", category: "content" },
  { task: "Deploy chatbot to staging", category: "deployment" },
  { task: "Test chatbot conversations", category: "deployment" },
  { task: "Client review and approval", category: "deployment" },
  { task: "Deploy chatbot to production", category: "deployment" },
];

function initTasks(clientId) {
  const db = getDb();
  const existing = db.prepare("SELECT COUNT(*) as count FROM onboarding_tasks WHERE client_id=?").get(clientId).count;
  if (existing > 0) return list(clientId);
  const insert = db.prepare("INSERT INTO onboarding_tasks (id, client_id, task, category, created_at) VALUES (?,?,?,?,datetime('now'))");
  for (const t of DEFAULT_TASKS) {
    insert.run(uuid(), clientId, t.task, t.category);
  }
  return list(clientId);
}

function list(clientId) {
  const db = getDb();
  const tasks = db.prepare("SELECT * FROM onboarding_tasks WHERE client_id=? ORDER BY id").all(clientId);
  const stats = db.prepare("SELECT category, COUNT(*) as total, SUM(CASE WHEN is_completed=1 THEN 1 ELSE 0 END) as done FROM onboarding_tasks WHERE client_id=? GROUP BY category").all(clientId);
  const progress = stats.reduce((a, s) => { a[s.category] = { total: s.total, done: s.done }; return a; }, {});
  return { tasks, progress };
}

function toggleTask(taskId) {
  const db = getDb();
  const task = db.prepare("SELECT * FROM onboarding_tasks WHERE id=?").get(taskId);
  if (!task) return null;
  const now = task.is_completed ? null : new Date().toISOString();
  db.prepare("UPDATE onboarding_tasks SET is_completed = CASE WHEN is_completed=1 THEN 0 ELSE 1 END, completed_at=? WHERE id=?").run(now, taskId);
  return db.prepare("SELECT * FROM onboarding_tasks WHERE id=?").get(taskId);
}

module.exports = { initTasks, list, toggleTask, DEFAULT_TASKS };
