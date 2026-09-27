# TradePass preflight check (PowerShell). Run before a demo to catch config/setup
# problems early: env vars, server up, seed data, and that both PDFs actually render.
#
# Usage (from tradepass/):
#   .\scripts\preflight.ps1
#   .\scripts\preflight.ps1 -AppUrl "http://localhost:3000"

param(
    [string]$AppUrl = $env:NEXT_PUBLIC_APP_URL
)

if (-not $AppUrl) { $AppUrl = "http://localhost:3000" }

$failures = 0
$warnings = 0

function Write-Ok($msg) { Write-Host "  OK   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  WARN $msg" -ForegroundColor Yellow; $script:warnings++ }
function Write-Fail($msg) { Write-Host "  FAIL $msg" -ForegroundColor Red; $script:failures++ }

Write-Host "=== 1. Environment ===" -ForegroundColor Cyan

$envPath = Join-Path (Get-Location) ".env.local"
if (-not (Test-Path $envPath)) {
    Write-Warn ".env.local not found at $envPath - copy .env.example and fill it in."
} else {
    $envContent = Get-Content $envPath -Raw
    $voiceMode = if ($envContent -match "NEXT_PUBLIC_VOICE_MODE\s*=\s*(\S+)") { $Matches[1].Trim() } else { "" }
    $hasApiKey = $envContent -match "ELEVENLABS_API_KEY\s*=\s*\S+"
    $hasIntakeId = $envContent -match "NEXT_PUBLIC_ELEVENLABS_INTAKE_AGENT_ID\s*=\s*\S+"
    $hasVerifyId = $envContent -match "NEXT_PUBLIC_ELEVENLABS_VERIFY_AGENT_ID\s*=\s*\S+"

    Write-Ok "NEXT_PUBLIC_VOICE_MODE = $voiceMode"

    if ($voiceMode -eq "live") {
        if (-not $hasApiKey) { Write-Warn "NEXT_PUBLIC_VOICE_MODE=live but ELEVENLABS_API_KEY is missing." }
        if (-not $hasIntakeId) { Write-Warn "NEXT_PUBLIC_VOICE_MODE=live but NEXT_PUBLIC_ELEVENLABS_INTAKE_AGENT_ID is missing." }
        if (-not $hasVerifyId) { Write-Warn "NEXT_PUBLIC_VOICE_MODE=live but NEXT_PUBLIC_ELEVENLABS_VERIFY_AGENT_ID is missing." }
        if ($hasApiKey -and $hasIntakeId -and $hasVerifyId) { Write-Ok "Live mode env vars present." }
    } else {
        Write-Ok "Simulated mode - ElevenLabs credentials not required."
    }
}

$fontsDir = Join-Path (Get-Location) "public\fonts"
$regularFont = Join-Path $fontsDir "NotoSans-Regular.ttf"
$boldFont = Join-Path $fontsDir "NotoSans-Bold.ttf"
if ((Test-Path $regularFont) -and (Test-Path $boldFont)) {
    Write-Ok "Noto Sans fonts present in public/fonts/."
} else {
    Write-Fail "Noto Sans fonts missing from public/fonts/ (NotoSans-Regular.ttf, NotoSans-Bold.ttf) - PDFs will fail to render."
}

Write-Host "`n=== 2. Server ===" -ForegroundColor Cyan

try {
    $resp = Invoke-WebRequest -Uri $AppUrl -Method Get -TimeoutSec 5 -UseBasicParsing
    if ($resp.StatusCode -eq 200) {
        Write-Ok "Server is up at $AppUrl"
    } else {
        Write-Fail "Server responded with status $($resp.StatusCode)"
    }
} catch {
    Write-Fail "Could not reach $AppUrl - is 'npm run dev' running? ($($_.Exception.Message))"
    Write-Host "`nStopping preflight: the rest of the checks need the server running." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 3. Reset demo data (full scenario) ===" -ForegroundColor Cyan

try {
    Invoke-RestMethod -Uri "$AppUrl/api/demo/reset?scenario=full" -Method Post -TimeoutSec 10 | Out-Null
    Write-Ok "Reset to full scenario."
} catch {
    Write-Fail "Reset failed: $($_.Exception.Message)"
}

Write-Host "`n=== 4. Create a Kocaeli verification request ===" -ForegroundColor Cyan

$requestUrl = $null
try {
    $result = Invoke-RestMethod -Uri "$AppUrl/api/employments/e_kocaeli/request-verification" -Method Post -TimeoutSec 10
    $requestUrl = $result.url
    Write-Ok "Request created: $requestUrl"
} catch {
    Write-Fail "Could not create a Kocaeli verification request: $($_.Exception.Message)"
}

Write-Host "`n=== 5. PDFs render and are non-empty ===" -ForegroundColor Cyan

try {
    $pkg = Invoke-WebRequest -Uri "$AppUrl/api/workers/w_emre/package" -Method Get -TimeoutSec 30 -UseBasicParsing
    if ($pkg.StatusCode -eq 200 -and $pkg.RawContentLength -gt 1000) {
        Write-Ok "Application package PDF rendered ($($pkg.RawContentLength) bytes)."
    } else {
        Write-Fail "Application package PDF looks empty or failed (status $($pkg.StatusCode), $($pkg.RawContentLength) bytes)."
    }
} catch {
    Write-Fail "Application package PDF request failed: $($_.Exception.Message)"
}

try {
    # e_bursa is seeded as already-verified, so its WEV form should always be renderable
    # without needing a fresh interview to complete first.
    $wev = Invoke-WebRequest -Uri "$AppUrl/api/employments/e_bursa/wev-form" -Method Get -TimeoutSec 30 -UseBasicParsing
    if ($wev.StatusCode -eq 200 -and $wev.RawContentLength -gt 1000) {
        Write-Ok "WEV form PDF rendered ($($wev.RawContentLength) bytes)."
    } else {
        Write-Fail "WEV form PDF looks empty or failed (status $($wev.StatusCode), $($wev.RawContentLength) bytes)."
    }
} catch {
    Write-Fail "WEV form PDF request failed: $($_.Exception.Message)"
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Failures: $failures, Warnings: $warnings"

if ($failures -gt 0) {
    exit 1
}
exit 0
