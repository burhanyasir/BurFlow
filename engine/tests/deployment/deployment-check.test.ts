import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');

describe('deployment readiness', () => {

  // ── Docker ──────────────────────────────────────────────────
  it('Dockerfile exists for pipeline-orchestrator', () => {
    expect(existsSync(join(ROOT, 'Dockerfile'))).toBe(true);
  });

  it('Dockerfile.saas-api exists', () => {
    expect(existsSync(join(ROOT, 'Dockerfile.saas-api'))).toBe(true);
  });

  it('docker-compose.yml exists', () => {
    expect(existsSync(join(ROOT, 'docker-compose.yml'))).toBe(true);
  });

  it('docker-compose.yml has healthchecks', () => {
    const content = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf-8');
    expect(content).toContain('healthcheck:');
    expect(content).toContain('/api/healthz');
  });

  // ── PM2 ─────────────────────────────────────────────────────
  it('PM2 ecosystem.config.js exists', () => {
    expect(existsSync(join(ROOT, 'ecosystem.config.js'))).toBe(true);
  });

  it('PM2 config has both services', () => {
    const config = require(join(ROOT, 'ecosystem.config.js'));
    const names = config.apps.map(a => a.name);
    expect(names).toContain('ce-pipeline');
    expect(names).toContain('ce-saas-api');
  });

  // ── Environment ─────────────────────────────────────────────
  it('.env.example exists and lists required vars', () => {
    expect(existsSync(join(ROOT, '.env.example'))).toBe(true);
    const content = readFileSync(join(ROOT, '.env.example'), 'utf-8');
    expect(content).toContain('INTERNAL_SYNC_KEY');
    expect(content).toContain('JWT_SECRET');
  });

  it('validate-env.js exists and checks required vars', () => {
    expect(existsSync(join(ROOT, 'scripts', 'validate-env.js'))).toBe(true);
    const content = readFileSync(join(ROOT, 'scripts', 'validate-env.js'), 'utf-8');
    expect(content).toContain('JWT_SECRET');
    expect(content).toContain('INTERNAL_SYNC_KEY');
  });

  // ── Build output ────────────────────────────────────────────
  it('pipeline-orchestrator dist output exists (compiled server)', () => {
    expect(existsSync(join(ROOT, 'packages', 'pipeline-orchestrator', 'dist', 'server.js'))).toBe(true);
  });

  it('saas-api has build script for dist output', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'packages', 'saas-api', 'package.json'), 'utf-8'));
    expect(pkg.scripts.build).toBe('tsc');
    expect(pkg.scripts.start).toBe('node dist/index.js');
  });

  // ── Production scripts ──────────────────────────────────────
  it('start-production.ps1 exists', () => {
    expect(existsSync(join(ROOT, 'scripts', 'start-production.ps1'))).toBe(true);
  });

  it('root package.json has correct start script', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.scripts.start).toBe('node packages/pipeline-orchestrator/dist/server.js');
  });
});
