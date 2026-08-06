const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.resolve(__dirname, 'data', 'saas.db');
console.log('DB', dbPath);
const db = new Database(dbPath, { readonly: true });
const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='widget_config'").get();
console.log('widget_config table exists:', !!tableInfo);
if (tableInfo) {
  console.log('schema:');
  console.dir(db.prepare("PRAGMA table_info(widget_config)").all(), { depth: null });
  console.log('sample rows:');
  console.dir(db.prepare('SELECT * FROM widget_config LIMIT 5').all(), { depth: null });
}
db.close();
