$ErrorActionPreference = "Stop"
$baseUrl = "http://127.0.0.1:3737"
$pass = "correct-horse-battery-staple"

Write-Host "--- TEST 16: Crash-recovery edge case ---" -ForegroundColor Yellow

# Move suits.db away
Move-Item "data\suits.db" "data\suits_backup" -Force
Write-Host "DB moved: $(-not (Test-Path 'data\suits.db'))"

$proc = Start-Process -FilePath "node" -ArgumentList "server/index.js" -PassThru -WindowStyle Hidden -WorkingDirectory (Get-Location).Path
Start-Sleep -Milliseconds 2000

$caught500 = $false
$inconsistent = $false
try {
  $status = Invoke-RestMethod -Uri "$baseUrl/api/auth/status"
  Write-Host "ERROR: Got 200, expected 500!" -ForegroundColor Red
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  $body = $_.ErrorDetails.Message | ConvertFrom-Json
  Write-Host "Got HTTP $statusCode (expected 500): $($statusCode -eq 500)"
  Write-Host "inconsistentState flag: $($body.inconsistentState)"
  Write-Host "Full message: $($body.error)"
  if ($statusCode -eq 500 -and $body.inconsistentState -eq $true) {
    $caught500 = $true
    $inconsistent = $true
  }
}

$proc | Stop-Process -Force -ErrorAction SilentlyContinue
Move-Item "data\suits_backup" "data\suits.db" -Force
Write-Host "DB restored: $(Test-Path 'data\suits.db')"

if ($caught500 -and $inconsistent) {
  Write-Host "PASS: Test 16" -ForegroundColor Green
} else {
  throw "FAIL: Test 16"
}

# ── TEST 17: Fresh server start requires password (in-memory key cleared) ──
Write-Host "`n--- TEST 17: Fresh server start requires password ---" -ForegroundColor Yellow

$proc17 = Start-Process -FilePath "node" -ArgumentList "server/index.js" -PassThru -WindowStyle Hidden -WorkingDirectory (Get-Location).Path
Start-Sleep -Milliseconds 2000

$s17 = Invoke-RestMethod -Uri "$baseUrl/api/auth/status" -Method GET
Write-Host "Status on fresh restart: firstRun=$($s17.firstRun) (expected False), unlocked=$($s17.unlocked) (expected False)"

# Suits endpoint should reject with 401
$suitsRejected = $false
try {
  Invoke-RestMethod -Uri "$baseUrl/api/suits" -Method GET
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 401) {
    $suitsRejected = $true
    Write-Host "Suits endpoint rejected with 401: True"
  }
}

# Unlock with correct password
$unlockBody = @{ password = $pass } | ConvertTo-Json
$u17 = Invoke-RestMethod -Uri "$baseUrl/api/auth/unlock" -Method POST -Body $unlockBody -ContentType "application/json"
Write-Host "Unlock result: ok=$($u17.ok)"

# Suits accessible again
$suits = Invoke-RestMethod -Uri "$baseUrl/api/suits" -Method GET
Write-Host "Suits count: $($suits.Length)"
Write-Host "Suit 0 name: $($suits[0].name)"

$proc17 | Stop-Process -Force -ErrorAction SilentlyContinue

if ($s17.firstRun -eq $false -and $s17.unlocked -eq $false -and $suitsRejected -and $u17.ok -and $suits.Length -eq 1 -and $suits[0].name -eq "Updated Suit v2") {
  Write-Host "PASS: Test 17" -ForegroundColor Green
} else {
  throw "FAIL: Test 17"
}

Write-Host "`nAll 17 Tests Completed Successfully!" -ForegroundColor Green
