const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const srcDb = path.join(__dirname, '..', 'data', 'saas.db');
const targetDir = path.join(__dirname, 'packages', 'saas-api', 'data');
const targetDb = path.join(targetDir, 'saas.db');

console.log('Source DB:', srcDb);
console.log('Target DB:', targetDb);
console.log('Source size:', fs.statSync(srcDb).size);

try {
  const db = new Database(srcDb, { readonly: true });
  const count = db.prepare("SELECT COUNT(*) as c FROM sqlite_master").get();
  console.log('Master entries:', count.c);
  db.close();
  console.log('Source DB is readable');
} catch(e) {
  console.log('Source DB error:', e.message);
}

// Try integrity check
try {
  const db = new Database(srcDb, { readonly: true });
  const result = db.pragma('integrity_check');
  console.log('Integrity check:', JSON.stringify(result));
  db.close();
} catch(e) {
  console.log('Integrity check error:', e.message);
}
