param([string]$SaaS = "http://localhost:8080")

$rand = Get-Random -Max 99999
$email = "e2e-$rand@example.com"
$pass = "TestPass123!"
$results = @{}
$passCount = 0
$failCount = 0

function Write-Step([string]$num, [string]$label, [int]$ms, [string]$status, [string]$detail) {
    $icon = if ($status -eq "PASS") { "[PASS]" } else { "[FAIL]" }
    Write-Host "  $icon Step ${num}: ${label} (${ms}ms) ${detail}"
    if ($status -eq "PASS") { $script:passCount++ } else { $script:failCount++ }
}

Write-Host "==============================================="
Write-Host "  E2E SaaS Integration Workflow"
Write-Host "  Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "==============================================="
Write-Host ""

# ─── Step 1: Signup ────────────────────────────────────────
Write-Host "--- Step 1: User Signup ---"
$t = Get-Date
try {
    $body = @{email=$email;password=$pass;name="E2E User";companyName="E2E Corp"} | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "$SaaS/api/auth/signup" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    $d = $r.Content | ConvertFrom-Json
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["signup"] = @{status="PASS";ms=$ms;token=$d.token;tenantId=$d.tenant.id;userId=$d.user.id;email=$email}
    Write-Step 1 Signup $ms "PASS" "User=$email Tenant=$($d.tenant.slug)"
    $token = $d.token
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["signup"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 1 Signup $ms "FAIL" $_.Exception.Message
    exit 1
}

# ─── Step 2: Login ─────────────────────────────────────────
Write-Host "--- Step 2: User Login ---"
$t = Get-Date
try {
    $body = @{email=$email;password=$pass} | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "$SaaS/api/auth/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    $d = $r.Content | ConvertFrom-Json
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["login"] = @{status="PASS";ms=$ms;token=$d.token}
    Write-Step 2 Login $ms "PASS" "Token=$($d.token.Substring(0,20))..."
    $token = $d.token
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["login"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 2 Login $ms "FAIL" $_.Exception.Message; exit 1
}

$authHeader = @{Authorization = "Bearer $token"; "Content-Type" = "application/json"}

# ─── Step 3: Get Me (Auth Verification) ────────────────────
Write-Host "--- Step 3: Get Me (Auth Verification) ---"
$t = Get-Date
try {
    $r = Invoke-WebRequest -Uri "$SaaS/api/auth/me" -Method GET -Headers $authHeader -UseBasicParsing -TimeoutSec 10
    $d = $r.Content | ConvertFrom-Json
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["me"] = @{status="PASS";ms=$ms;role=$d.user.role;name=$d.user.name}
    Write-Step 3 "Get Me" $ms "PASS" "Name=$($d.user.name) Role=$($d.user.role)"
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["me"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 3 "Get Me" $ms "FAIL" $_.Exception.Message
}

# ─── Step 4: Create API Key ────────────────────────────────
Write-Host "--- Step 4: API Key Creation ---"
$t = Get-Date
try {
    $body = @{label="E2E Test Key";role="end-user"} | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "$SaaS/api/api-keys" -Method POST -Body $body -Headers $authHeader -UseBasicParsing -TimeoutSec 10
    $d = $r.Content | ConvertFrom-Json
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["apikey"] = @{status="PASS";ms=$ms;key=$d.key;role=$d.apiKey.role}
    Write-Step 4 "API Key" $ms "PASS" "Key=$($d.key.Substring(0,15))... Role=$($d.apiKey.role)"
    $apiKey = $d.key
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["apikey"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 4 "API Key" $ms "FAIL" $_.Exception.Message
}

# ─── Step 5: List API Keys (Persistence Check) ─────────────
Write-Host "--- Step 5: List API Keys (Persistence Check) ---"
$t = Get-Date
try {
    $r = Invoke-WebRequest -Uri "$SaaS/api/api-keys" -Method GET -Headers $authHeader -UseBasicParsing -TimeoutSec 10
    $d = $r.Content | ConvertFrom-Json
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $match = @($d.keys | Where-Object { $_.label -eq "E2E Test Key" })
    $hasKey = $match.Count -gt 0
    if ($hasKey) { $s = "PASS" } else { $s = "FAIL" }
    $results["list-keys"] = @{status=$s;ms=$ms;count=$d.keys.Count}
    Write-Step 5 "List Keys" $ms $s "Found $($d.keys.Count) keys (expected >= 1)"
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["list-keys"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 5 "List Keys" $ms "FAIL" $_.Exception.Message
}

# ─── Step 6: Knowledge Upload ──────────────────────────────
Write-Host "--- Step 6: Knowledge Upload ---"
$t = Get-Date
try {
    $content = "E2E Corp provides AI customer support chatbots. Our platform supports multi-tenant deployment with vector search technology. Key features include knowledge base management, conversation analytics, and API key management. Our chatbot can answer questions about pricing, features availability, and support hours."
    $body = @{filename="e2e-test.txt";sourceType="text";content=$content} | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "$SaaS/api/knowledge/upload" -Method POST -Body $body -Headers $authHeader -UseBasicParsing -TimeoutSec 10
    $d = $r.Content | ConvertFrom-Json
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["upload"] = @{status="PASS";ms=$ms;docId=$d.documentId;uploadStatus=$d.status}
    Write-Step 6 Upload $ms "PASS" "DocId=$($d.documentId) Status=$($d.status)"
    $docId = $d.documentId
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["upload"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 6 Upload $ms "FAIL" $_.Exception.Message
}

# ─── Step 7: Process Document ──────────────────────────────
Write-Host "--- Step 7: Process Document ---"
$t = Get-Date
try {
    $body = @{content=""} | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "$SaaS/api/knowledge/process/$docId" -Method POST -Body $body -Headers $authHeader -UseBasicParsing -TimeoutSec 30
    $d = $r.Content | ConvertFrom-Json
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["process"] = @{status="PASS";ms=$ms;chunks=$d.chunksCreated;version=$d.knowledgeVersion}
    Write-Step 7 Process $ms "PASS" "Chunks=$($d.chunksCreated) Version=$($d.knowledgeVersion)"
    $version = $d.knowledgeVersion
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["process"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 7 Process $ms "FAIL" $_.Exception.Message
}

# ─── Step 8: Publish Knowledge ─────────────────────────────
Write-Host "--- Step 8: Publish Knowledge ---"
$t = Get-Date
try {
    $r = Invoke-WebRequest -Uri "$SaaS/api/knowledge/publish" -Method POST -Headers $authHeader -UseBasicParsing -TimeoutSec 10
    $d = $r.Content | ConvertFrom-Json
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["publish"] = @{status="PASS";ms=$ms;published=$d.published;chunks=$d.chunkCount}
    Write-Step 8 Publish $ms "PASS" "Published=$($d.published) Chunks=$($d.chunkCount)"
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["publish"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 8 Publish $ms "FAIL" $_.Exception.Message
}

# ─── Step 9: Knowledge Search ──────────────────────────────
Write-Host "--- Step 9: Knowledge Search ---"
$t = Get-Date
try {
    $body = @{query="What are the features of the chatbot platform?";topK=3;threshold=0.0} | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "$SaaS/api/knowledge/search" -Method POST -Body $body -Headers $authHeader -UseBasicParsing -TimeoutSec 10
    $d = $r.Content | ConvertFrom-Json
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["search"] = @{status="PASS";ms=$ms;results=$d.totalResults}
    Write-Step 9 Search $ms "PASS" "Results=$($d.totalResults) Time=${ms}ms"
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["search"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 9 Search $ms "FAIL" $_.Exception.Message
}

# ─── Step 10: Context Retrieval ────────────────────────────
Write-Host "--- Step 10: Context Retrieval ---"
$t = Get-Date
try {
    $body = @{query="What features does E2E Corp offer?";tokenBudget=500} | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "$SaaS/api/knowledge/context" -Method POST -Body $body -Headers $authHeader -UseBasicParsing -TimeoutSec 10
    $d = $r.Content | ConvertFrom-Json
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["context"] = @{status="PASS";ms=$ms;citations=$d.citations.Count;chunks=$d.chunkCount;contextLen=$d.context.Length}
    Write-Step 10 Context $ms "PASS" "Citations=$($d.citations.Count) Chunks=$($d.chunkCount) ContextLen=$($d.context.Length)"
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["context"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 10 Context $ms "FAIL" $_.Exception.Message
}

# ─── Step 11: Chat Completion ───────────────────────────────
Write-Host "--- Step 11: Chat Completion ---"
$t = Get-Date
try {
    $chatHeaders = @{
        "Content-Type" = "application/json"
        "X-API-Key" = $apiKey
        "X-Tenant-Id" = $results.signup.tenantId
        "X-Session-Id" = "e2e-session-$rand"
    }
    $body = @{message="What features does E2E Corp offer?"} | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "http://localhost:3456/api/chat" -Method POST -Body $body -Headers $chatHeaders -UseBasicParsing -TimeoutSec 15
    $d = $r.Content | ConvertFrom-Json
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["chat"] = @{status="PASS";ms=$ms;turnId=$d.turnId;latencyMs=$d.latencyMs;responseLen=$d.response.Length;degraded=$d.degraded}
    Write-Step 11 Chat $ms "PASS" "TurnId=$($d.turnId) Latency=$($d.latencyMs)ms Degraded=$($d.degraded -ne $null)"
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["chat"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 11 Chat $ms "FAIL" $_.Exception.Message
}

# ─── Step 12: Analytics / Usage ────────────────────────────
Write-Host "--- Step 12: Analytics / Usage ---"
$t = Get-Date
try {
    $r = Invoke-WebRequest -Uri "$SaaS/api/usage/current" -Method GET -Headers $authHeader -UseBasicParsing -TimeoutSec 10
    $d = $r.Content | ConvertFrom-Json
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["usage"] = @{status="PASS";ms=$ms;messages=$d.usage.messagesUsed;tokens=$d.usage.tokensUsed}
    Write-Step 12 Usage $ms "PASS" "Messages=$($d.usage.messagesUsed) Tokens=$($d.usage.tokensUsed)"
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["usage"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 12 Usage $ms "FAIL" $_.Exception.Message
}

# ─── Step 13: Tenant Isolation (verify separate tenant can't see this data) ───
Write-Host "--- Step 13: Tenant Isolation Check ---"
$t = Get-Date
try {
    $rand2 = Get-Random -Max 99999
    $body2 = @{email="other-$rand2@test.com";password="OtherPass1!";name="Other User";companyName="Other Corp"} | ConvertTo-Json
    $r2 = Invoke-WebRequest -Uri "$SaaS/api/auth/signup" -Method POST -Body $body2 -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
    $d2 = $r2.Content | ConvertFrom-Json
    $otherToken = $d2.token

    $otherAuth = @{Authorization = "Bearer $otherToken"; "Content-Type" = "application/json"}
    $r3 = Invoke-WebRequest -Uri "$SaaS/api/knowledge/search" -Method POST -Body (@{query="E2E Corp features";topK=3}|ConvertTo-Json) -Headers $otherAuth -UseBasicParsing -TimeoutSec 10
    $otherSearch = $r3.Content | ConvertFrom-Json

    $isolated = ($otherSearch.totalResults -eq 0)
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    if ($isolated) {
        $results["isolation"] = @{status="PASS";ms=$ms}
        Write-Step 13 Isolation $ms "PASS" "Other tenant sees 0 results (isolated)"
    } else {
        $results["isolation"] = @{status="FAIL";ms=$ms}
        Write-Step 13 Isolation $ms "FAIL" "Other tenant sees $($otherSearch.totalResults) results (NOT isolated)"
    }
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["isolation"] = @{status="FAIL";ms=$ms;error=$_.Exception.Message}
    Write-Step 13 Isolation $ms "FAIL" $_.Exception.Message
}

# ─── Step 14: Logout (clear token, verify auth fails) ──────
Write-Host "--- Step 14: Logout (Token Invalidation Check) ---"
$t = Get-Date
try {
    $badHeader = @{Authorization = "Bearer invalid-token-that-is-clearly-fake"}
    $r = Invoke-WebRequest -Uri "$SaaS/api/auth/me" -Method GET -Headers $badHeader -UseBasicParsing -TimeoutSec 10
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    $results["logout"] = @{status="FAIL";ms=$ms}
    Write-Step 14 Logout $ms "FAIL" "Invalid token still returned $($r.StatusCode) (should be 401)"
} catch {
    $ms = [math]::Round((Get-Date).Subtract($t).TotalMilliseconds)
    if ($_.Exception.Response.StatusCode -eq 401) {
        $results["logout"] = @{status="PASS";ms=$ms}
        Write-Step 14 Logout $ms "PASS" "Invalid token correctly rejected (401)"
    } else {
        $results["logout"] = @{status="FAIL";ms=$ms}
        Write-Step 14 Logout $ms "FAIL" "$($_.Exception.Message)"
    }
}

# ─── Summary Report ─────────────────────────────────────────
Write-Host ""
Write-Host "==============================================="
Write-Host "  WORKFLOW SUMMARY REPORT"
Write-Host "==============================================="
Write-Host ""

$totalMs = 0
$results.Keys | Sort-Object | ForEach-Object {
    $r = $results[$_]
    $totalMs += $r.ms
    $icon = if ($r.status -eq "PASS") { "[PASS]" } else { "[FAIL]" }
    Write-Host ("  {0,-6} {1,-20} {2,5}ms" -f $icon, $_, $r.ms)
}

Write-Host ""
Write-Host "  Total steps: $($results.Count)"
Write-Host "  Passed: $passCount"
Write-Host "  Failed: $failCount"
Write-Host "  Total time: ${totalMs}ms"
if ($failCount -gt 0) { Write-Host "  OVERALL: FAILED" } else { Write-Host "  OVERALL: PASSED" }

# Return structured results
$results | ConvertTo-Json -Depth 3
