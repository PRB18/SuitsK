$ErrorActionPreference = "Stop"
$baseUrl = "http://127.0.0.1:3737"
$pass = "correct-horse-battery-staple"

# Ensure unlocked
$status = Invoke-RestMethod -Uri "$baseUrl/api/auth/status" -Method GET
if (-not $status.unlocked) {
  $unlockBody = @{ password = $pass } | ConvertTo-Json
  Invoke-RestMethod -Uri "$baseUrl/api/auth/unlock" -Method POST -Body $unlockBody -ContentType "application/json" | Out-Null
}

Write-Host "=== LIVE CRUD ROUND-TRIP TEST ===" -ForegroundColor Cyan

# 1. CREATE SUIT
Write-Host "`n1. POST /api/suits (CREATE)" -ForegroundColor Yellow
$createPayload = @{
  name  = "Savile Row Bespoke Navy 2-Piece"
  notes = "Double-vented, silk lining, horn buttons"
  data  = @{
    jacket = @{
      lapelStyle  = "Peak"
      fabricCode  = "Holland & Sherry 9921"
      pipingColor = "Champagne Gold"
      vents       = "Double"
      buttons     = "2-Button Single Breasted"
    }
    shirt = @{
      collarStyle = "Cutaway"
      cuffStyle   = "French"
    }
    trouser = @{
      pleatStyle  = "Forward Pleat"
      hem         = "Turn-up 1.75 inch"
    }
    measurements = @{
      chestCm    = 104
      waistCm    = 88
      shoulderCm = 46.5
    }
  }
}
$createJson = $createPayload | ConvertTo-Json -Depth 5
Write-Host "--- REQUEST BODY ---"
Write-Host $createJson

$createResp = Invoke-WebRequest -Uri "$baseUrl/api/suits" -Method POST -Body $createJson -ContentType "application/json" -UseBasicParsing
Write-Host "`n--- RESPONSE (HTTP $($createResp.StatusCode)) ---"
$createdSuit = $createResp.Content | ConvertFrom-Json
Write-Host ($createdSuit | ConvertTo-Json -Depth 5)
$suitId = $createdSuit.id

# 2. LIST SUITS
Write-Host "`n2. GET /api/suits (LIST - SUMMARY ONLY)" -ForegroundColor Yellow
$listResp = Invoke-WebRequest -Uri "$baseUrl/api/suits" -Method GET -UseBasicParsing
Write-Host "--- RESPONSE (HTTP $($listResp.StatusCode)) ---"
$suitsList = $listResp.Content | ConvertFrom-Json
Write-Host ($suitsList | ConvertTo-Json -Depth 4)

# 3. GET SINGLE SUIT BY ID
Write-Host "`n3. GET /api/suits/$suitId (FULL DETAIL)" -ForegroundColor Yellow
$getResp = Invoke-WebRequest -Uri "$baseUrl/api/suits/$suitId" -Method GET -UseBasicParsing
Write-Host "--- RESPONSE (HTTP $($getResp.StatusCode)) ---"
$singleSuit = $getResp.Content | ConvertFrom-Json
Write-Host ($singleSuit | ConvertTo-Json -Depth 5)

# 4. UPDATE SUIT (PUT)
Write-Host "`n4. PUT /api/suits/$suitId (FULL REPLACE)" -ForegroundColor Yellow
$updatePayload = @{
  name  = "Savile Row Bespoke Midnight Navy (Fitted)"
  notes = "Double-vented, altered shoulder pad to light roped"
  data  = @{
    jacket = @{
      lapelStyle  = "Wide Peak"
      fabricCode  = "Scabal Royal 7041"
      pipingColor = "Navy Silk"
      vents       = "Double"
      buttons     = "1-Button Link"
    }
    shirt = @{
      collarStyle = "Spread"
      cuffStyle   = "French"
    }
    trouser = @{
      pleatStyle  = "Flat Front"
      hem         = "Plain"
    }
    measurements = @{
      chestCm    = 103.5
      waistCm    = 87
      shoulderCm = 46.5
    }
  }
}
$updateJson = $updatePayload | ConvertTo-Json -Depth 5
Write-Host "--- REQUEST BODY ---"
Write-Host $updateJson

$updateResp = Invoke-WebRequest -Uri "$baseUrl/api/suits/$suitId" -Method PUT -Body $updateJson -ContentType "application/json" -UseBasicParsing
Write-Host "`n--- RESPONSE (HTTP $($updateResp.StatusCode)) ---"
$updatedSuit = $updateResp.Content | ConvertFrom-Json
Write-Host ($updatedSuit | ConvertTo-Json -Depth 5)

# 5. DUPLICATE SUIT
Write-Host "`n5. POST /api/suits/$suitId/duplicate (DUPLICATE)" -ForegroundColor Yellow
$dupResp = Invoke-WebRequest -Uri "$baseUrl/api/suits/$suitId/duplicate" -Method POST -Body "{}" -ContentType "application/json" -UseBasicParsing
Write-Host "--- RESPONSE (HTTP $($dupResp.StatusCode)) ---"
$dupSuit = $dupResp.Content | ConvertFrom-Json
Write-Host ($dupSuit | ConvertTo-Json -Depth 5)
$dupId = $dupSuit.id

# 6. DELETE SUIT
Write-Host "`n6. DELETE /api/suits/$dupId (DELETE DUPLICATE)" -ForegroundColor Yellow
$delResp = Invoke-WebRequest -Uri "$baseUrl/api/suits/$dupId" -Method DELETE -UseBasicParsing
Write-Host "--- RESPONSE (HTTP $($delResp.StatusCode)) ---"
Write-Host $delResp.Content

# Verify deletion
$listAfter = Invoke-RestMethod -Uri "$baseUrl/api/suits" -Method GET
Write-Host "`nSuits count after deletion: $($listAfter.Length) (only original remains)"
