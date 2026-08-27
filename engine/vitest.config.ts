import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Map every @conversation-engine/* import to its TypeScript source so tests
// always run against the latest code without a prior `tsc` build step.
// Packages whose package.json already points "main" at src/index.ts are
// included for consistency; the alias is harmless for those.
const workspacePackages = [
  'admin-portal',
  'config-store',
  'conversation-evaluator',
  'conversation-orchestrator',
  'core-types',
  'dedup-store',
  'grounding-verifier',
  'input-guardrail',
  'knowledge-pipeline',
  'logger',
  'output-guardrail',
  'pii-detector',
  'response-generator',
  'saas-api',
  'saas-core',
  'secrets-vault',
  'session-store',
  'stage-1-ingestion',
  'stage-2-tenant-context',
  'stage-4-context',
  'stage-5-response-generation',
  'stage-6a-safety',
  'stage-7-persistence',
  'stage-8-dispatch',
  'tenant-onboarding',
  'tenant-registry',
  'trip-wire',
  'widget',
];

const sourceAliases: [string, string][] = workspacePackages.map((pkg) => [
  `@conversation-engine/${pkg}`,
  resolve(__dirname, `packages/${pkg}/src/index.ts`),
]);

// Also handle the one @platform/* package used in tests
sourceAliases.push([
  '@platform/admin-dashboard',
  resolve(__dirname, 'packages/admin-dashboard/src/index.ts'),
]);

export default defineConfig({
  resolve: {
    alias: sourceAliases,
  },
  test: {
    globals: true,
    environment: 'node',
    sequence: {
      concurrent: false,
    },
    include: ['packages/*/src/**/__tests__/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/**/__tests__/**'],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85,
      },
    },
  },
});
