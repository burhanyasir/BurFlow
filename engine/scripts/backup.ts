import { join } from 'path';
import { existsSync, mkdirSync, copyFileSync, unlinkSync, readdirSync } from 'fs';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'data', 'saas.db');
const BACKUP_DIR = process.env.DB_BACKUP_DIR || join(__dirname, '..', 'backups');
const RETENTION_DAYS = parseInt(process.env.DB_BACKUP_RETENTION_DAYS || '30', 10);

function log(msg: string) {
  console.log(`[backup] ${new Date().toISOString()} ${msg}`);
}

function logError(msg: string) {
  console.error(`[backup] ${new Date().toISOString()} ERROR: ${msg}`);
}

async function main() {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
    log(`Created backup directory: ${BACKUP_DIR}`);
  }

  if (!existsSync(DB_PATH)) {
    logError(`Database not found at ${DB_PATH}`);
    process.exit(1);
  }

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  const backupPath = join(BACKUP_DIR, `saas-${timestamp}.db`);

  try {
    const sourceDb = new Database(DB_PATH);
    sourceDb.backup(backupPath);
    sourceDb.close();
    log(`Backup created: ${backupPath}`);
  } catch (err: any) {
    logError(`Backup failed: ${err.message}`);
    process.exit(1);
  }

  try {
    const verifyDb = new Database(backupPath);
    const result = verifyDb.prepare('PRAGMA integrity_check').get() as { 'integrity_check': string };
    verifyDb.close();
    if (result && result['integrity_check'] === 'ok') {
      log('Backup integrity check: PASSED');
    } else {
      logError(`Backup integrity check: FAILED — ${JSON.stringify(result)}`);
      process.exit(1);
    }
  } catch (err: any) {
    logError(`Backup verification failed: ${err.message}`);
    process.exit(1);
  }

  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let cleaned = 0;
  try {
    const files = readdirSync(BACKUP_DIR);
    for (const file of files) {
      if (file.startsWith('saas-') && file.endsWith('.db')) {
        const filePath = join(BACKUP_DIR, file);
        const stat = existsSync(filePath) ? require('fs').statSync(filePath) : null;
        if (stat && stat.mtimeMs < cutoff) {
          unlinkSync(filePath);
          cleaned++;
        }
      }
    }
  } catch (err: any) {
    logError(`Cleanup failed: ${err.message}`);
  }
  if (cleaned > 0) log(`Cleaned up ${cleaned} old backup(s)`);

  log('Backup completed successfully');
  process.exit(0);
}

main().catch((err) => {
  logError(`Unhandled error: ${err.message}`);
  process.exit(1);
});
