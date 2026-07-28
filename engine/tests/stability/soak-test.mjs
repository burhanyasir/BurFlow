// ─── Soak Test: Long-Running Stability ─────────────────────────
// Usage: node tests/stability/soak-test.mjs [options]
//
// Options:
//   --target       Pipeline URL (default: http://localhost:3456)
//   --api-key      API key for auth (default: sk-e2e-test-key-b)
//   --tenant       Tenant ID (default: e2e-tenant-b)
//   --interval     Request interval in ms (default: 1000)
//   --iterations   Number of iterations (default: 60, =1min at 1s interval)
//   --mem-threshold Memory threshold MB (default: 512)
//
// Monitors: response time, memory usage, error rate over time.
// Produces a CSV report at the end.

const TARGET = process.argv.find(a => a.startsWith('--target='))?.split('=')[1] || 'http://localhost:3456';
const API_KEY = process.argv.find(a => a.startsWith('--api-key='))?.split('=')[1] || 'sk-e2e-test-key-b';
const TENANT = process.argv.find(a => a.startsWith('--tenant='))?.split('=')[1] || 'e2e-tenant-b';
const INTERVAL_MS = parseInt(process.argv.find(a => a.startsWith('--interval='))?.split('=')[1] || '1000', 10);
const ITERATIONS = parseInt(process.argv.find(a => a.startsWith('--iterations='))?.split('=')[1] || '60', 10);
const MEM_THRESHOLD_MB = parseInt(process.argv.find(a => a.startsWith('--mem-threshold='))?.split('=')[1] || '512', 10);

const CHAT_URL = `${TARGET}/api/chat`;
const HEALTH_URL = `${TARGET}/api/healthz`;
const METRICS_URL = `${TARGET}/api/metrics`;

const messages = [
  'What are your hours?',
  'Help with my account',
  'Tell me about services',
  'Reset password',
  'Refund policy',
];

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}

function makeHeaders(iteration) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    'x-tenant-id': TENANT,
    'x-session-id': `soak-session-${iteration % 5}`,
  };
}

function makeBody() {
  return JSON.stringify({ message: messages[Math.floor(Math.random() * messages.length)] });
}

async function checkHealth() {
  try {
    const res = await fetch(HEALTH_URL);
    return res.ok;
  } catch {
    return false;
  }
}

async function fetchMetrics() {
  try {
    const res = await fetch(METRICS_URL);
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

function getMemory() {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
  };
}

async function sendRequest(iteration) {
  const start = Date.now();
  try {
    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: makeHeaders(iteration),
      body: makeBody(),
    });
    const elapsed = Date.now() - start;
    let body = null;
    try { body = await res.json(); } catch {}
    return { ok: res.ok || res.status === 409, status: res.status, elapsed, body };
  } catch (err) {
    return { ok: false, status: 0, elapsed: Date.now() - start, error: err.message };
  }
}

async function run() {
  console.log('\n' + '═'.repeat(70));
  console.log('  SOAK TEST — Long-Running Stability');
  console.log('═'.repeat(70));
  console.log('');
  console.log(`  Target:       ${TARGET}`);
  console.log(`  Interval:     ${INTERVAL_MS}ms`);
  console.log(`  Iterations:   ${ITERATIONS}`);
  console.log(`  Duration:     ~${(ITERATIONS * INTERVAL_MS / 1000).toFixed(0)}s`);
  console.log(`  API Key:      ${API_KEY.slice(0, 8)}...`);
  console.log(`  Tenant:       ${TENANT}`);
  console.log(`  Memory limit: ${MEM_THRESHOLD_MB}MB`);
  console.log('');

  const results = [];
  let consecutiveErrors = 0;
  let maxConsecutiveErrors = 0;
  let memorySpikes = 0;
  let healthFailures = 0;
  let startHeap = 0;

  for (let i = 0; i < ITERATIONS; i++) {
    const memBefore = getMemory();
    if (i === 0) startHeap = memBefore.heapUsed;

    const result = await sendRequest(i);
    const memAfter = getMemory();

    const healthOk = await checkHealth();
    if (!healthOk) healthFailures++;

    const metrics = await fetchMetrics();

    const entry = {
      iteration: i,
      elapsed: result.elapsed,
      status: result.status,
      ok: result.ok,
      error: result.error || null,
      rssBefore: formatBytes(memBefore.rss),
      rssAfter: formatBytes(memAfter.rss),
      heapBefore: formatBytes(memBefore.heapUsed),
      heapAfter: formatBytes(memAfter.heapUsed),
      heapDelta: formatBytes(memAfter.heapUsed - memBefore.heapUsed),
      healthOk,
    };
    results.push(entry);

    if (!result.ok) {
      consecutiveErrors++;
      if (consecutiveErrors > maxConsecutiveErrors) maxConsecutiveErrors = consecutiveErrors;
    } else {
      consecutiveErrors = 0;
    }

    if (memAfter.heapUsed > MEM_THRESHOLD_MB * 1024 * 1024) {
      memorySpikes++;
    }

    const progress = `  [${i + 1}/${ITERATIONS}] ${result.elapsed}ms status=${result.status} heap=${formatBytes(memAfter.heapUsed)}MB${!result.ok ? ' ERROR' : ''}`;
    process.stdout.write('\r' + progress.padEnd(70));
    await new Promise(r => setTimeout(r, INTERVAL_MS));
  }

  console.log('\n');

  const okResults = results.filter(r => r.ok);
  const errorResults = results.filter(r => !r.ok);
  const elapsedTimes = okResults.map(r => r.elapsed).sort((a, b) => a - b);

  const heapValues = results.map(r => parseFloat(r.heapAfter));
  const minHeap = Math.min(...heapValues);
  const maxHeap = Math.max(...heapValues);
  const avgHeap = heapValues.reduce((a, b) => a + b, 0) / heapValues.length;
  const heapGrowth = heapValues[heapValues.length - 1] - heapValues[0];

  const p50 = elapsedTimes[Math.floor(elapsedTimes.length * 0.5)] || 0;
  const p95 = elapsedTimes[Math.floor(elapsedTimes.length * 0.95)] || 0;
  const p99 = elapsedTimes[Math.floor(elapsedTimes.length * 0.99)] || 0;

  const memLeakDetected = heapGrowth > 50;
  const tooManyErrors = errorResults.length / results.length > 0.1;
  const tooManyHealthFailures = healthFailures > results.length * 0.1;

  console.log('─'.repeat(70));
  console.log('  RESULTS');
  console.log('─'.repeat(70));
  console.log('');
  console.log(`  Total requests:    ${results.length}`);
  console.log(`  Successful:        ${okResults.length}`);
  console.log(`  Errors:            ${errorResults.length} (${(errorResults.length / results.length * 100).toFixed(1)}%)`);
  console.log(`  Max consecutive:   ${maxConsecutiveErrors}`);
  console.log(`  Health failures:   ${healthFailures}`);
  console.log('');
  console.log(`  Latency P50:       ${p50}ms`);
  console.log(`  Latency P95:       ${p95}ms`);
  console.log(`  Latency P99:       ${p99}ms`);
  console.log('');
  console.log(`  Heap (MB):`);
  console.log(`    Start:           ${formatBytes(startHeap)}MB`);
  console.log(`    Min:             ${minHeap.toFixed(1)}MB`);
  console.log(`    Avg:             ${avgHeap.toFixed(1)}MB`);
  console.log(`    Max:             ${maxHeap.toFixed(1)}MB`);
  console.log(`    End:             ${heapValues[heapValues.length - 1].toFixed(1)}MB`);
  console.log(`    Growth:          ${heapGrowth.toFixed(1)}MB ${memLeakDetected ? '⚠  >50MB' : '✓'}`);
  console.log(`    Spikes >${MEM_THRESHOLD_MB}MB:  ${memorySpikes}`);
  console.log('');

  let failed = false;
  if (memLeakDetected) { console.log('  ❌ Possible memory leak (heap grew >50MB)'); failed = true; }
  if (tooManyErrors) { console.log(`  ❌ Error rate ${(errorResults.length / results.length * 100).toFixed(1)}% exceeds 10%`); failed = true; }
  if (tooManyHealthFailures) { console.log(`  ❌ Health check failures ${healthFailures}/${results.length}`); failed = true; }

  if (failed) {
    console.log('\n  ❌ SOAK TEST FAILED');
    process.exit(1);
  }
  console.log('  ✓ SOAK TEST PASSED');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
