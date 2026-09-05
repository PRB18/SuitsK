$ErrorActionPreference = "Stop"

$baseUrl = "http://127.0.0.1:3737"
$pass = "correct-horse-battery-staple"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host "STAGE 1 FULL VERIFICATION SUITE (SQLCipher Backend)" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# ── TEST 1: Status on fresh start ──────────────────────────────────────────
Write-Host "--- TEST 1: Status on fresh start ---" -ForegroundColor Yellow
$s1 = Invoke-RestMethod -Uri "$baseUrl/api/auth/status" -Method GET
Write-Host "Result: firstRun=$($s1.firstRun), unlocked=$($s1.unlocked)"
if ($s1.firstRun -eq $true -and $s1.unlocked -eq $false) {
  Write-Host "PASS: Test 1" -ForegroundColor Green
} else {
  throw "FAIL: Test 1"
}

# ── TEST 2: Setup password ─────────────────────────────────────────────────
Write-Host "`n--- TEST 2: POST /api/auth/setup ---" -ForegroundColor Yellow
$setupBody = @{ password = $pass } | ConvertTo-Json
$s2 = Invoke-RestMethod -Uri "$baseUrl/api/auth/setup" -Method POST -Body $setupBody -ContentType "application/json"
Write-Host "Result: ok=$($s2.ok), message=$($s2.message)"
if ($s2.ok -eq $true) {
  Write-Host "PASS: Test 2" -ForegroundColor Green
} else {
  throw "FAIL: Test 2"
}

# ── TEST 3: Verify config.json structure ───────────────────────────────────
Write-Host "`n--- TEST 3: config.json structure check ---" -ForegroundColor Yellow
$cfg = Get-Content "data\config.json" -Raw | ConvertFrom-Json
Write-Host "verifierSalt length: $($cfg.verifierSalt.Length) hex chars"
Write-Host "verifierHash length: $($cfg.verifierHash.Length) hex chars"
Write-Host "dbSalt length:       $($cfg.dbSalt.Length) hex chars"
$hasRawKey = ($null -ne $cfg.dbKey) -or ($null -ne $cfg.key)
Write-Host "Raw dbKey stored?    $hasRawKey"
$saltsDiffer = ($cfg.verifierSalt -ne $cfg.dbSalt)
Write-Host "Two salts differ?    $saltsDiffer"

if ($cfg.verifierSalt.Length -eq 64 -and $cfg.verifierHash.Length -eq 64 -and $cfg.dbSalt.Length -eq 64 -and (-not $hasRawKey) -and $saltsDiffer) {
  Write-Host "PASS: Test 3" -ForegroundColor Green
} else {
  throw "FAIL: Test 3"
}

# Create the test suit now so there is rich content in suits.db for Tests 4 & 4b
Write-Host "`n--- Creating test suit for Test 4 & 4b ---" -ForegroundColor Yellow
$nowIso = (Get-Date).ToString("yyyy-MM-ddTHH:mm")
$suitPayload = @{
  name  = "Updated Suit"
  notes = "Verification test"
  data  = @{
    jacket = @{
      lapelStyle  = "Peak"
      cutaway     = "Cutaway"
      fabricCode  = "H&S-9921"
      pipingColor = "Midnight Blue"
    }
    shirt = @{
      collarStyle = "Spread"
    }
  }
} | ConvertTo-Json -Depth 5

$createdSuit = Invoke-RestMethod -Uri "$baseUrl/api/suits" -Method POST -Body $suitPayload -ContentType "application/json"
$suitId = $createdSuit.id
Write-Host "Created suit ID: $suitId"

# Checkpoint / sync database to disk by locking or checkpointing
# Lock DB temporarily so handle is closed and suits.db is completely flushed & free to inspect
$lockRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/lock" -Method POST
Write-Host "Locked DB to flush to disk: ok=$($lockRes.ok)"

# ── TEST 4: SQLCipher header check ─────────────────────────────────────────
Write-Host "`n--- TEST 4: suits.db header check (byte 0..15) ---" -ForegroundColor Yellow
$dbBytes = [System.IO.File]::ReadAllBytes("data\suits.db")
$headerAscii = [System.Text.Encoding]::ASCII.GetString($dbBytes[0..15])
$isSqliteHeader = $headerAscii.StartsWith("SQLite format 3")
Write-Host "File size: $($dbBytes.Length) bytes"
Write-Host "Header (ASCII 0..15): $headerAscii"
Write-Host "Starts with 'SQLite format 3'? $isSqliteHeader"

if (-not $isSqliteHeader) {
  Write-Host "PASS: Test 4 (SQLCipher ciphertext header, no SQLite signature)" -ForegroundColor Green
} else {
  throw "FAIL: Test 4 - Found SQLite header!"
}

# ── TEST 4b: 12-point plaintext visibility check ───────────────────────────
Write-Host "`n--- TEST 4b: 12-point Plaintext Visibility Check ---" -ForegroundColor Yellow
$dbText = [System.Text.Encoding]::UTF8.GetString($dbBytes)
$datePrefix = (Get-Date).ToString("yyyy-MM-dd")

$checks = @(
  @{ label = "name:       'Updated Suit'";          value = $dbText.Contains("Updated Suit") },
  @{ label = "notes:      'Verification test'";     value = $dbText.Contains("Verification test") },
  @{ label = "created_at: '$datePrefix'";           value = $dbText.Contains($datePrefix) },
  @{ label = "updated_at: '$datePrefix'";           value = $dbText.Contains($datePrefix) },
  @{ label = "table name: 'suits'";                 value = $dbText.Contains("suits") },
  @{ label = "col name:   'created_at'";            value = $dbText.Contains("created_at") },
  @{ label = "col name:   'updated_at'";            value = $dbText.Contains("updated_at") },
  @{ label = "col name:   'data'";                  value = ($dbText -split "`0" | Where-Object { $_ -eq 'data' }).Count -gt 0 },
  @{ label = "data blob:  'lapelStyle'";            value = $dbText.Contains("lapelStyle") },
  @{ label = "data blob:  'Peak'";                  value = $dbText.Contains("Peak") },
  @{ label = "data blob:  'Cutaway'";               value = $dbText.Contains("Cutaway") },
  @{ label = "SQLite header readable";              value = $headerAscii.StartsWith("SQLite format 3") }
)

Write-Host ""
Write-Host ("{0,-38} {1}" -f "Field", "Visible in raw file?")
Write-Host "---------------------------------------------------------"
$allEncrypted = $true
foreach ($c in $checks) {
  $status = if ($c.value) { "YES (plaintext)" } else { "no (encrypted/absent)" }
  $color  = if ($c.value) { "Red" } else { "Green" }
  if ($c.value) { $allEncrypted = $false }
  Write-Host ("{0,-38} {1}" -f $c.label, $status) -ForegroundColor $color
}

if ($allEncrypted) {
  Write-Host "`nPASS: Test 4b (All 12 items confirmed encrypted/absent from raw file)" -ForegroundColor Green
} else {
  throw "FAIL: Test 4b - Some items are visible in plaintext!"
}

# Unlock DB to continue tests
$unlockBody = @{ password = $pass } | ConvertTo-Json
$uRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/unlock" -Method POST -Body $unlockBody -ContentType "application/json"
Write-Host "`nRe-unlocked DB: ok=$($uRes.ok)"

# ── TEST 5: Status after setup / unlock ────────────────────────────────────
Write-Host "`n--- TEST 5: Status after setup/unlock ---" -ForegroundColor Yellow
$s5 = Invoke-RestMethod -Uri "$baseUrl/api/auth/status" -Method GET
Write-Host "Result: firstRun=$($s5.firstRun), unlocked=$($s5.unlocked)"
if ($s5.firstRun -eq $false -and $s5.unlocked -eq $true) {
  Write-Host "PASS: Test 5" -ForegroundColor Green
} else {
  throw "FAIL: Test 5"
}

# ── TEST 6: GET /api/suits list ────────────────────────────────────────────
Write-Host "`n--- TEST 6: GET /api/suits list ---" -ForegroundColor Yellow
$list = Invoke-RestMethod -Uri "$baseUrl/api/suits" -Method GET
Write-Host "List count: $($list.Length)"
Write-Host "Suit 0 name: $($list[0].name)"
Write-Host "Suit 0 summary.lapelStyle: $($list[0].summary.lapelStyle)"
Write-Host "Suit 0 raw data field present? $($null -ne $list[0].data)"

if ($list.Length -ge 1 -and $list[0].summary.lapelStyle -eq "Peak" -and ($null -eq $list[0].data)) {
  Write-Host "PASS: Test 6" -ForegroundColor Green
} else {
  throw "FAIL: Test 6"
}

# ── TEST 7: Lock DB ────────────────────────────────────────────────────────
Write-Host "`n--- TEST 7: Lock DB ---" -ForegroundColor Yellow
$lockRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/lock" -Method POST
Write-Host "Lock result: ok=$($lockRes.ok)"
if ($lockRes.ok -eq $true) {
  Write-Host "PASS: Test 7" -ForegroundColor Green
} else {
  throw "FAIL: Test 7"
}

# ── TEST 8: 401 on locked endpoint ─────────────────────────────────────────
Write-Host "`n--- TEST 8: 401 on locked endpoint ---" -ForegroundColor Yellow
$got401 = $false
try {
  Invoke-RestMethod -Uri "$baseUrl/api/suits" -Method GET
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 401) {
    $got401 = $true
    Write-Host "Got expected 401 Unauthorized"
  } else {
    Write-Host "Got unexpected status: $($_.Exception.Response.StatusCode.value__)"
  }
}
if ($got401) {
  Write-Host "PASS: Test 8" -ForegroundColor Green
} else {
  throw "FAIL: Test 8"
}

# ── TEST 9: Status after lock ──────────────────────────────────────────────
Write-Host "`n--- TEST 9: Status after lock ---" -ForegroundColor Yellow
$s9 = Invoke-RestMethod -Uri "$baseUrl/api/auth/status" -Method GET
Write-Host "Result: firstRun=$($s9.firstRun), unlocked=$($s9.unlocked)"
if ($s9.firstRun -eq $false -and $s9.unlocked -eq $false) {
  Write-Host "PASS: Test 9" -ForegroundColor Green
} else {
  throw "FAIL: Test 9"
}

# ── TEST 10: Wrong password unlock ─────────────────────────────────────────
Write-Host "`n--- TEST 10: Wrong password unlock (timing + 401) ---" -ForegroundColor Yellow
$wrongBody = @{ password = "wrong-password-here" } | ConvertTo-Json
$sw = [System.Diagnostics.Stopwatch]::StartNew()
$wrong401 = $false
try {
  Invoke-RestMethod -Uri "$baseUrl/api/auth/unlock" -Method POST -Body $wrongBody -ContentType "application/json"
} catch {
  $sw.Stop()
  if ($_.Exception.Response.StatusCode.value__ -eq 401) {
    $wrong401 = $true
  }
}
Write-Host "Elapsed ms: $($sw.ElapsedMilliseconds) (expected > 300ms)"
if ($wrong401 -and $sw.ElapsedMilliseconds -ge 300) {
  Write-Host "PASS: Test 10" -ForegroundColor Green
} else {
  throw "FAIL: Test 10 (wrong401=$wrong401, ms=$($sw.ElapsedMilliseconds))"
}

# ── TEST 11: Correct password unlock ───────────────────────────────────────
Write-Host "`n--- TEST 11: Correct password unlock ---" -ForegroundColor Yellow
$unlockBody = @{ password = $pass } | ConvertTo-Json
$u11 = Invoke-RestMethod -Uri "$baseUrl/api/auth/unlock" -Method POST -Body $unlockBody -ContentType "application/json"
Write-Host "Result: ok=$($u11.ok)"
if ($u11.ok -eq $true) {
  Write-Host "PASS: Test 11" -ForegroundColor Green
} else {
  throw "FAIL: Test 11"
}

# ── TEST 12: GET by ID (full decrypted data) ───────────────────────────────
Write-Host "`n--- TEST 12: GET /api/suits/:id ---" -ForegroundColor Yellow
$suit12 = Invoke-RestMethod -Uri "$baseUrl/api/suits/$suitId" -Method GET
Write-Host "Name: $($suit12.name)"
Write-Host "Lapel: $($suit12.data.jacket.lapelStyle)"
Write-Host "Fabric: $($suit12.data.jacket.fabricCode)"
if ($suit12.name -eq "Updated Suit" -and $suit12.data.jacket.lapelStyle -eq "Peak") {
  Write-Host "PASS: Test 12" -ForegroundColor Green
} else {
  throw "FAIL: Test 12"
}

# ── TEST 13: PUT update (full replace) ─────────────────────────────────────
Write-Host "`n--- TEST 13: PUT /api/suits/:id (full replace) ---" -ForegroundColor Yellow
$updatePayload = @{
  name  = "Updated Suit v2"
  notes = "Updated verification note"
  data  = @{
    jacket = @{
      lapelStyle = "Shawl"
      fabricCode = "Scabal-Royal"
    }
  }
} | ConvertTo-Json -Depth 5

$updatedSuit = Invoke-RestMethod -Uri "$baseUrl/api/suits/$suitId" -Method PUT -Body $updatePayload -ContentType "application/json"
Write-Host "New Name: $($updatedSuit.name)"
Write-Host "New Lapel: $($updatedSuit.data.jacket.lapelStyle)"
if ($updatedSuit.name -eq "Updated Suit v2" -and $updatedSuit.data.jacket.lapelStyle -eq "Shawl") {
  Write-Host "PASS: Test 13" -ForegroundColor Green
} else {
  throw "FAIL: Test 13"
}

# ── TEST 14: Duplicate suit ────────────────────────────────────────────────
Write-Host "`n--- TEST 14: POST /api/suits/:id/duplicate ---" -ForegroundColor Yellow
$dupRes = Invoke-RestMethod -Uri "$baseUrl/api/suits/$suitId/duplicate" -Method POST
Write-Host "Duplicated Name: $($dupRes.name)"
Write-Host "Duplicated ID: $($dupRes.id)"
$dupId = $dupRes.id
if ($dupRes.name -eq "Updated Suit v2 (copy)" -and $dupRes.id -ne $suitId -and $dupRes.data.jacket.lapelStyle -eq "Shawl") {
  Write-Host "PASS: Test 14" -ForegroundColor Green
} else {
  throw "FAIL: Test 14"
}

# ── TEST 15: DELETE suit ───────────────────────────────────────────────────
Write-Host "`n--- TEST 15: DELETE /api/suits/:id ---" -ForegroundColor Yellow
$delRes = Invoke-RestMethod -Uri "$baseUrl/api/suits/$dupId" -Method DELETE
Write-Host "Delete result: ok=$($delRes.ok)"
$listAfter = Invoke-RestMethod -Uri "$baseUrl/api/suits" -Method GET
Write-Host "Remaining suits count: $($listAfter.Length)"
if ($delRes.ok -eq $true -and $listAfter.Length -eq 1) {
  Write-Host "PASS: Test 15" -ForegroundColor Green
} else {
  throw "FAIL: Test 15"
}

Write-Host "`nTests 1-15 completed successfully!" -ForegroundColor Green
