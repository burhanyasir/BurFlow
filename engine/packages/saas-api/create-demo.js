const Database = require('better-sqlite3');
const crypto = require('crypto');
const db = new Database('./data/saas.db');

// Create user
const userId = 'user-' + Date.now();
const passwordHash = crypto.createHash('sha256').update('testpassword').digest('hex');
db.prepare(`INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`).run(userId, 'demo@example.com', passwordHash, 'Demo User', new Date().toISOString(), new Date().toISOString());
console.log('Created user:', userId);

// Create tenant
const tenantId = 'tenant-' + Date.now();
db.prepare(`INSERT INTO tenants (id, name, slug, owner_id, plan, subscription_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(tenantId, 'Demo Tenant', 'demo-tenant', userId, 'free', 'active', new Date().toISOString(), new Date().toISOString());
console.log('Created tenant:', tenantId);
