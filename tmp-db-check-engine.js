const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const dbPath = path.resolve(__dirname, 'engine', 'data', 'saas.db');
console.log('DB', dbPath, 'exists', fs.existsSync(dbPath));
if (!fs.existsSync(dbPath)) process.exit(1);
const db = new Database(dbPath, { readonly: true });
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='widget_configs'").all();
console.log('tables', tables);
if (tables.length) {
  console.log('schema:');
  console.dir(db.prepare('PRAGMA table_info(widget_configs)').all(), { depth: null });
  console.log('rows:');
  console.dir(db.prepare('SELECT tenant_id, position, primary_color, greeting, launcher_text FROM widget_configs LIMIT 5').all(), { depth: null });
}
db.close();
