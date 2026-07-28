// ─── Load Test: Pipeline Orchestrator ───────────────────────────
// Usage: node tests/load/load-test.mjs [options]
//
// Options:
//   --target     Pipeline URL (default: http://localhost:3456)
//   --concurrent Concurrency level (default: 10)
//   --duration   Test duration in seconds (default: 30)
//   --api-key    API key for auth (default: sk-e2e-test-key-b)
//   --tenant     Tenant ID (default: e2e-tenant-b)
//   --sessions   Number of sessions to use (default: concurrent)
//
// Returns exit code 0 if all checks pass, 1 if any threshold exceeded.

const TARGET = process.argv.find(a => a.startsWith('--target='))?.split('=')[1] || 'http://localhost:3456';
const CONCURRENT = parseInt(process.argv.find(a => a.startsWith('--concurrent='))?.split('=')[1] || '10', 10);
const DURATION = parseInt(process.argv.find(a => a.startsWith('--duration='))?.split('=')[1] || '30', 10);
const API_KEY = process.argv.find(a => a.startsWith('--api-key='))?.split('=')[1] || 'sk-e2e-test-key-b';
const TENANT = process.argv.find(a => a.startsWith('--tenant='))?.split('=')[1] || 'e2e-tenant-b';
const SESSION_COUNT = parseInt(process.argv.find(a => a.startsWith('--sessions='))?.split('=')[1] || String(CONCURRENT), 10);

const TARGETS = {
  p50Ms: 1000,
  p95Ms: 3000,
  p99Ms: 5000,
  errorRatePct: 5,
  minThroughputRps: 1,
};

const CHAT_URL = `${TARGET}/api/chat`;

function makeHeaders(sessionIdx) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    'x-tenant-id': TENANT,
    'x-session-id': `load-test-session-${sessionIdx}`,
  };
}

function makeBody() {
  const messages = [
    'What are your hours of operation?',
    'I need help with my account',
    'Tell me about your services',
    'How do I reset my password?',
    'Can I speak to a representative?',
    'What is the refund policy?',
    'How long does shipping take?',
    'Do you have a mobile app?',
  ];
  return JSON.stringify({ message: messages[Math.floor(Math.random() * messages.length)] });
}

async function sendRequest(sessionIdx) {
  const start = Date.now();
  try {
    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: makeHeaders(sessionIdx),
      body: makeBody(),
    });
    const elapsed = Date.now() - start;
    const ok = res.ok || res.status === 409;
    let body = null;
    try { body = await res.json(); } catch {}
    return { ok, status: res.status, elapsed, body };
  } catch (err) {
    return { ok: false, status: 0, elapsed: Date.now() - start, error: err.message };
  }
}

function printProgress(stats) {
  const pct = ((stats.completed / stats.total) * 100).toFixed(0);
  const errRate = stats.completed > 0 ? ((stats.errors / stats.completed) * 100).toFixed(1) : '0.0';
  const rps = stats.elapsed > 0 ? (stats.completed / (stats.elapsed / 1000)).toFixed(1) : '0.0';
  process.stdout.write(`\r  [${pct}%] ${stats.completed}/${stats.total} requests, ${stats.errors} errors, ${errRate}% err, ${rps} rps`);
}

async function run() {
  console.log('');
  console.log('═'.repeat(60));
  console.log('  LOAD TEST');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`  Target:     ${TARGET}/api/chat`);
  console.log(`  Concurrency: ${CONCURRENT}`);
  console.log(`  Duration:    ${DURATION}s`);
  console.log(`  Sessions:    ${SESSION_COUNT}`);
  console.log(`  API Key:     ${API_KEY.slice(0, 8)}...`);
  console.log(`  Tenant:      ${TENANT}`);
  console.log('');
  console.log('  Latency Targets (per request):');
  console.log(`    P50  < ${TARGETS.p50Ms}ms`);
  console.log(`    P95  < ${TARGETS.p95Ms}ms`);
  console.log(`    P99  < ${TARGETS.p99Ms}ms`);
  console.log(`    Error rate < ${TARGETS.errorRatePct}%`);
  console.log(`    Throughput > ${TARGETS.minThroughputRps} rps`);
  console.log('');

  const latencies = [];
  const errors = [];
  let completed = 0;
  const total = CONCURRENT * DURATION;
  const startTime = Date.now();

  const results = await Promise.allSettled(
    Array.from({ length: CONCURRENT }, (_, i) => i).map(async (workerIdx) => {
      const sessionIdx = workerIdx % SESSION_COUNT;
      while (Date.now() - startTime < DURATION * 1000) {
        const result = await sendRequest(sessionIdx);
        completed++;
        if (result.ok) {
          latencies.push(result.elapsed);
        } else {
          errors.push(result);
        }
        if (completed % Math.max(1, Math.floor(total / 100)) === 0) {
          printProgress({ completed, total, errors: errors.length, elapsed: Date.now() - startTime });
        }
      }
    })
  );

  const elapsed = Date.now() - startTime;
  console.log('');
  console.log('');

  if (latencies.length === 0) {
    console.log('  ❌ ALL REQUESTS FAILED — no successful responses');
    process.exit(1);
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const errorRate = (errors.length / (latencies.length + errors.length)) * 100;
  const rps = (latencies.length + errors.length) / (elapsed / 1000);

  console.log('─'.repeat(60));
  console.log('  RESULTS');
  console.log('─'.repeat(60));
  console.log('');
  console.log(`  Duration:        ${(elapsed / 1000).toFixed(1)}s`);
  console.log(`  Successful:      ${latencies.length}`);
  console.log(`  Errors:          ${errors.length}`);
  console.log(`  Error Rate:      ${errorRate.toFixed(1)}%`);
  console.log(`  Throughput:      ${rps.toFixed(1)} rps`);
  console.log('');
  console.log('  Latency:');
  console.log(`    P50            ${p50}ms ${p50 <= TARGETS.p50Ms ? '✓' : '✗'} (target < ${TARGETS.p50Ms}ms)`);
  console.log(`    P95            ${p95}ms ${p95 <= TARGETS.p95Ms ? '✓' : '✗'} (target < ${TARGETS.p95Ms}ms)`);
  console.log(`    P99            ${p99}ms ${p99 <= TARGETS.p99Ms ? '✓' : '✗'} (target < ${TARGETS.p99Ms}ms)`);
  console.log(`    Min            ${latencies[0]}ms`);
  console.log(`    Max            ${latencies[latencies.length - 1]}ms`);
  console.log('');

  if (errors.length > 0) {
    console.log('  Error details (up to 10):');
    errors.slice(0, 10).forEach((e, i) => {
      console.log(`    ${i + 1}. status=${e.status} elapsed=${e.elapsed}ms ${e.error || e.body?.error || ''}`);
    });
    console.log('');
  }

  let failed = false;
  if (p50 > TARGETS.p50Ms) { console.log(`  ❌ P50 ${p50}ms exceeds target ${TARGETS.p50Ms}ms`); failed = true; }
  if (p95 > TARGETS.p95Ms) { console.log(`  ❌ P95 ${p95}ms exceeds target ${TARGETS.p95Ms}ms`); failed = true; }
  if (p99 > TARGETS.p99Ms) { console.log(`  ❌ P99 ${p99}ms exceeds target ${TARGETS.p99Ms}ms`); failed = true; }
  if (errorRate > TARGETS.errorRatePct) { console.log(`  ❌ Error rate ${errorRate.toFixed(1)}% exceeds target ${TARGETS.errorRatePct}%`); failed = true; }
  if (rps < TARGETS.minThroughputRps) { console.log(`  ❌ Throughput ${rps.toFixed(1)} rps below target ${TARGETS.minThroughputRps} rps`); failed = true; }

  if (failed) {
    console.log('\n  ❌ LOAD TEST FAILED');
    process.exit(1);
  }
  console.log('  ✓ LOAD TEST PASSED');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
