const Database = require('better-sqlite3');
const db = new Database('./data/saas.db');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE name='tenants'").get();
console.log('Schema:', schema ? schema.sql : 'not found');
const cols = db.prepare("PRAGMA table_info(tenants)").all();
console.log('Columns:', cols.map(c => c.name).join(', '));
