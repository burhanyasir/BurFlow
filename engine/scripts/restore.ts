import { join } from 'path';
import { existsSync, copyFileSync, statSync, readdirSync } from 'fs';
import Database from 'better-sqlite3';

const DB_PATH = process.env.DB_PATH || join(__dirname, '..', 'data', 'saas.db');
const BACKUP_DIR = process.env.DB_BACKUP_DIR || join(__dirname, '..', 'backups');
const FORCE = process.argv.includes('--force');

function log(msg: string) {
  console.log(`[restore] ${new Date().toISOString()} ${msg}`);
}

function logError(msg: string) {
  console.error(`[restore] ${new Date().toISOString()} ERROR: ${msg}`);
}

async function main() {
  const backupArg = process.argv[2];

  if (!backupArg || backupArg === '--force') {
    if (!existsSync(BACKUP_DIR)) {
      logError(`No backups directory found at ${BACKUP_DIR}`);
      process.exit(1);
    }
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('saas-') && f.endsWith('.db'))
      .sort();
    
    if (files.length === 0) {
      logError('No backups found');
      process.exit(1);
    }

    console.log('\nAvailable backups:');
    console.log('────────────────────────────────────────────────');
    for (const file of files) {
      const filePath = join(BACKUP_DIR, file);
      const stat = statSync(filePath);
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
      const date = stat.mtime.toISOString().replace('T', ' ').slice(0, 19);
      console.log(`  ${file.padEnd(35)} ${sizeMB.padStart(8)} MB  ${date}`);
    }
    console.log('\nUsage: npx tsx scripts/restore.ts <backup-filename> [--force]');
    process.exit(0);
  }

  const backupPath = join(BACKUP_DIR, backupArg);
  if (!existsSync(backupPath)) {
    logError(`Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  if (!FORCE) {
    console.log(`\n⚠  WARNING: This will OVERWRITE the current database at:`);
    console.log(`   ${DB_PATH}`);
    console.log(`\n   A pre-restore backup will be created automatically.`);
    console.log(`\n   To proceed without confirmation, use --force flag.\n`);
    process.exit(0);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const preRestorePath = join(BACKUP_DIR, `pre-restore-${timestamp}.db`);
  try {
    copyFileSync(DB_PATH, preRestorePath);
    log(`Pre-restore backup created: ${preRestorePath}`);
  } catch (err: any) {
    logError(`Failed to create pre-restore backup: ${err.message}`);
    process.exit(1);
  }

  try {
    copyFileSync(backupPath, DB_PATH);
    log(`Restored from: ${backupPath}`);
  } catch (err: any) {
    logError(`Restore failed: ${err.message}`);
    process.exit(1);
  }

  try {
    const db = new Database(DB_PATH);
    const result = db.prepare('PRAGMA integrity_check').get() as { 'integrity_check': string };
    db.close();
    if (result && result['integrity_check'] === 'ok') {
      log('Restore integrity check: PASSED');
    } else {
      logError(`Restore integrity check: FAILED — ${JSON.stringify(result)}`);
      process.exit(1);
    }
  } catch (err: any) {
    logError(`Restore verification failed: ${err.message}`);
    process.exit(1);
  }

  log('Restore completed successfully');
  process.exit(0);
}

main().catch((err) => {
  logError(`Unhandled error: ${err.message}`);
  process.exit(1);
});
