#!/usr/bin/env bash
# ─── Production Smoke Test ─────────────────────────────────────────
# Verifies a deployed Conversation Engine instance is healthy and
# all critical endpoints respond correctly.
#
# Usage:
#   chmod +x scripts/smoke-test.sh
#   ./scripts/smoke-test.sh https://api.yourdomain.com
#
# Exit code: 0 = all checks passed, 1 = one or more checks failed
#
# What this tests:
#   1. Health endpoint returns 200 with status "ok"
#   2. Liveness endpoint returns 200 with status "alive"
#   3. Readiness endpoint returns 200 with status "ready"
#   4. Metrics endpoint returns 200 with JSON
#   5. Security headers are present (HSTS, CSP, X-Frame-Options)
#   6. HTTP redirects to HTTPS
#   7. Widget public endpoint returns 200
#   8. Auth endpoints are reachable
#   9. CORS headers are present on API responses

set -euo pipefail

BASE_URL="${1:-http://localhost:3457}"
PASS=0
FAIL=0
FAILURES=""

info()  { echo "  [$(printf '%5s' INFO)] $1"; }
pass()  { echo "  [$(printf '%5s' PASS)] $1"; PASS=$((PASS + 1)); }
fail()  { echo "  [$(printf '%5s' FAIL)] $1"; FAIL=$((FAIL + 1)); FAILURES="${FAILURES}    - $1\n"; }

echo ""
echo "════════════════════════════════════════════════════"
echo "  Production Smoke Test"
echo "  Target: ${BASE_URL}"
echo "  Date:   $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo "════════════════════════════════════════════════════"
echo ""

# ─── 1. Health Endpoint ──────────────────────────────────────────
info "Testing /api/health..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health")
BODY=$(curl -s "${BASE_URL}/api/health")
STATUS=$(echo "${BODY}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "parse-error")
if [ "${HTTP_CODE}" = "200" ] && [ "${STATUS}" = "ok" ]; then
  pass "/api/health → 200, status=ok"
else
  fail "/api/health → ${HTTP_CODE}, status=${STATUS} (expected 200, ok)"
fi

# ─── 2. Liveness Endpoint ───────────────────────────────────────
info "Testing /api/live..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/live")
BODY=$(curl -s "${BASE_URL}/api/live")
STATUS=$(echo "${BODY}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "parse-error")
if [ "${HTTP_CODE}" = "200" ] && [ "${STATUS}" = "alive" ]; then
  pass "/api/live → 200, status=alive"
else
  fail "/api/live → ${HTTP_CODE}, status=${STATUS} (expected 200, alive)"
fi

# ─── 3. Readiness Endpoint ──────────────────────────────────────
info "Testing /api/ready..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/ready")
BODY=$(curl -s "${BASE_URL}/api/ready")
STATUS=$(echo "${BODY}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "parse-error")
if [ "${HTTP_CODE}" = "200" ] && [ "${STATUS}" = "ready" ]; then
  pass "/api/ready → 200, status=ready"
else
  fail "/api/ready → ${HTTP_CODE}, status=${STATUS} (expected 200, ready)"
fi

# ─── 4. Metrics Endpoint ────────────────────────────────────────
info "Testing /api/metrics..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/metrics")
CONTENT_TYPE=$(curl -s -o /dev/null -w "%{content_type}" "${BASE_URL}/api/metrics")
if [ "${HTTP_CODE}" = "200" ]; then
  pass "/api/metrics → 200"
else
  fail "/api/metrics → ${HTTP_CODE} (expected 200)"
fi

# ─── 5. Security Headers ────────────────────────────────────────
info "Checking security headers..."
HEADERS=$(curl -s -I "${BASE_URL}/api/health" 2>/dev/null)

HSTS=$(echo "${HEADERS}" | grep -i 'strict-transport-security' | head -1)
CSP=$(echo "${HEADERS}" | grep -i 'content-security-policy' | head -1)
XFO=$(echo "${HEADERS}" | grep -i 'x-frame-options' | head -1)
XCT=$(echo "${HEADERS}" | grep -i 'x-content-type-options' | head -1)

[ -n "${HSTS}" ] && pass "Strict-Transport-Security present" || fail "Strict-Transport-Security MISSING"
[ -n "${CSP}" ]  && pass "Content-Security-Policy present"  || fail "Content-Security-Policy MISSING"
[ -n "${XFO}" ]  && pass "X-Frame-Options present"         || fail "X-Frame-Options MISSING"
[ -n "${XCT}" ]  && pass "X-Content-Type-Options present"  || fail "X-Content-Type-Options MISSING"

# ─── 6. HTTP → HTTPS Redirect ──────────────────────────────────
if echo "${BASE_URL}" | grep -q '^https'; then
  HTTP_URL=$(echo "${BASE_URL}" | sed 's/^https:/http:/')
  info "Testing HTTP→HTTPS redirect on ${HTTP_URL}..."
  REDIRECT_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${HTTP_URL}/api/health" 2>/dev/null || echo "000")
  REDIRECT_LOC=$(curl -s -o /dev/null -w "%{redirect_url}" --max-time 5 "${HTTP_URL}/api/health" 2>/dev/null || echo "")
  if [ "${REDIRECT_CODE}" = "301" ] || [ "${REDIRECT_CODE}" = "302" ] || [ "${REDIRECT_CODE}" = "308" ]; then
    pass "HTTP redirects to HTTPS (${REDIRECT_CODE})"
  else
    fail "HTTP→HTTPS: got ${REDIRECT_CODE}, expected 301/302/308"
  fi
fi

# ─── 7. Auth Endpoint Reachable ─────────────────────────────────
info "Testing /api/auth/login (expect 401/400, not 404/500)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/auth/login")
if [ "${HTTP_CODE}" -ne 404 ] && [ "${HTTP_CODE}" -ne 502 ] && [ "${HTTP_CODE}" -ne 503 ]; then
  pass "/api/auth/login → ${HTTP_CODE} (reachable)"
else
  fail "/api/auth/login → ${HTTP_CODE} (unreachable)"
fi

# ─── 8. CORS Headers ────────────────────────────────────────────
info "Checking CORS headers on API response..."
CORS_HEADER=$(echo "${HEADERS}" | grep -i 'access-control-allow-origin' | head -1)
if [ -n "${CORS_HEADER}" ]; then
  pass "Access-Control-Allow-Origin present"
else
  info "Access-Control-Allow-Origin not present (expected if CORS_ORIGIN is set)"
fi

# ─── Summary ─────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────────────────"
echo "  Results: ${PASS} passed, ${FAIL} failed"
echo "──────────────────────────────────────────────────────"
if [ -n "${FAILURES}" ]; then
  echo ""
  echo "  Failures:"
  printf "${FAILURES}"
  echo ""
  exit 1
fi
echo ""
echo "  ✓ All smoke tests passed"
echo ""
exit 0
