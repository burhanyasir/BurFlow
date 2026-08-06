const Database = require('better-sqlite3');
const path = require('path');

// Test the actual DB path the saas-api uses
const dbPath = path.join(__dirname, 'packages', 'saas-api', 'data', 'saas.db');
console.log('Testing:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });
  const result = db.pragma('integrity_check');
  console.log('Integrity:', JSON.stringify(result));
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(t=>t.name).join(', '));
  db.close();
} catch(e) {
  console.log('ERROR:', e.message);
  // Try with mode flag
  try {
    const db = new Database(dbPath);
    const result = db.pragma('integrity_check');
    console.log('R/W Integrity:', JSON.stringify(result));
    db.close();
  } catch(e2) {
    console.log('R/W ERROR:', e2.message);
  }
}
