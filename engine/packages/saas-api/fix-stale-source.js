const Database = require('better-sqlite3');
const db = new Database('./data/saas.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

// Find the table that has the queued source
for (const table of tables) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table.name})`).all();
    const colNames = cols.map(c => c.name);
    if (colNames.includes('document_id') || colNames.includes('documentId')) {
      const idCol = colNames.includes('document_id') ? 'document_id' : 'documentId';
      const rows = db.prepare(`SELECT ${idCol}, status FROM ${table.name} WHERE status = 'queued'`).all();
      if (rows.length > 0) {
        console.log(`\nFound ${rows.length} queued source(s) in ${table.name}:`);
        rows.forEach(r => console.log(`  ${JSON.stringify(r)}`));
        const del = db.prepare(`DELETE FROM ${table.name} WHERE status = 'queued'`).run();
        console.log(`  Deleted ${del.changes} row(s)`);
      }
    }
  } catch (e) {
    // skip
  }
}
db.close();
