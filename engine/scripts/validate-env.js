// ─── Production Environment Validation ───────────────────────────
// Usage: node scripts/validate-env.js
// Checks that all required environment variables are set.
// Returns exit code 0 if valid, 1 if invalid.

const REQUIRED = {
  'JWT_SECRET': {
    message: 'Required for SaaS API JWT signing',
    validate: (v) => v && v.length >= 32,
    hint: 'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
  },
  'INTERNAL_SYNC_KEY': {
    message: 'Required for SaaS API ↔ Pipeline sync auth',
    validate: (v) => v && v.length >= 16,
    hint: 'Generate with: node -e "console.log(require(\'crypto\').randomBytes(16).toString(\'hex\'))"',
  },
  'LLM_API_KEY': {
    message: 'Required for LLM provider (e.g. OpenAI)',
    validate: (v) => !v || v.startsWith('sk-') || v.startsWith('pk-'),
    hint: 'Get from your LLM provider dashboard',
    optional: true,
  },
  'CORS_ORIGIN': {
    message: 'CORS allowed origins for SaaS API',
    validate: (v) => !v || v === 'false' || v.startsWith('http'),
    hint: 'Comma-separated list or false',
    optional: true,
  },
};

function check(varName, config) {
  const value = process.env[varName];
  const isSet = value !== undefined && value !== '';

  if (!config.optional && !isSet) {
    console.error(`  ❌ ${varName}: MISSING — ${config.message}`);
    console.error(`     ${config.hint}`);
    return false;
  }

  if (isSet && config.validate && !config.validate(value)) {
    if (config.optional) {
      console.warn(`  ⚠ ${varName}: ${value} — may be invalid (${config.message})`);
      return true;
    }
    console.error(`  ❌ ${varName}: ${value} — invalid (${config.message})`);
    console.error(`     ${config.hint}`);
    return false;
  }

  if (config.optional) {
    if (isSet) {
      console.log(`  ✓ ${varName}: set (${value.slice(0, 8)}...)`);
    } else {
      console.log(`  ~ ${varName}: not set (optional)`);
    }
  } else {
    console.log(`  ✓ ${varName}: set (${value.slice(0, 8)}...)`);
  }
  return true;
}

console.log('');
console.log('═'.repeat(60));
console.log('  Environment Validation');
console.log('═'.repeat(60));
console.log('');

let allValid = true;
for (const [name, config] of Object.entries(REQUIRED)) {
  if (!check(name, config)) allValid = false;
}

console.log('');
if (allValid) {
  console.log('  ✓ All required variables are valid.');
  process.exit(0);
} else {
  console.log('  ❌ Some required variables are missing or invalid.');
  process.exit(1);
}
