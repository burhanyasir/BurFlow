const Database = require('better-sqlite3');
const db = new Database('./data/saas.db');
const r = db.prepare("DELETE FROM knowledge_queue WHERE document_id LIKE 'tenant-1786006493162%' AND status != 'published'").run();
console.log('Deleted:', r.changes, 'row(s)');
const remaining = db.prepare("SELECT document_id, status FROM knowledge_queue WHERE tenant_id = 'tenant-1786006493162'").all();
console.log('Remaining:', JSON.stringify(remaining, null, 2));
db.close();
