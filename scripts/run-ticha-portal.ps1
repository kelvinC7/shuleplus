# Run TichaPortal locally on Windows (BFF :4000 + Vite :5173).
# Usage:
#   .\scripts\run-ticha-portal.ps1
#   .\scripts\run-ticha-portal.ps1 -Mode backend
#   .\scripts\run-ticha-portal.ps1 -Mode check
param(
  [ValidateSet('dev', 'backend', 'check')]
  [string]$Mode = 'dev'
)

$Repo = Split-Path -Parent $PSScriptRoot
$BDir = Join-Path $Repo 'TichaPortal\backend'
$FDir = Join-Path $Repo 'TichaPortal'
$AuthEnv = Join-Path $Repo 'Authentication\Backend\.env'

function Set-EnvLine($File, $Key, $Value) {
  $lines = if (Test-Path $File) { Get-Content $File } else { @() }
  $found = $false
  $out = foreach ($line in $lines) {
    if ($line -match "^$Key=") { $found = $true; "$Key=$Value" } else { $line }
  }
  if (-not $found) { $out += "$Key=$Value" }
  $out | Set-Content -Path $File -Encoding utf8
}

function Write-LocalBackendEnv {
  $envFile = Join-Path $BDir '.env'
  $example = Join-Path $BDir '.env.example'
  if (-not (Test-Path $envFile) -and (Test-Path $example)) {
    Copy-Item $example $envFile
    Write-Host '[ticha] created .env from .env.example'
  }
  Set-EnvLine $envFile 'PORT' '4000'
  Set-EnvLine $envFile 'NODE_ENV' 'development'
  Set-EnvLine $envFile 'FRONTEND_URL' 'http://localhost:5173'
  Set-EnvLine $envFile 'CORS_ORIGIN' 'http://localhost:5173,http://localhost:3000,http://localhost:3053'
  Set-EnvLine $envFile 'IAM_API_URL' 'http://localhost:3001/api/v1'
  Set-EnvLine $envFile 'TIMETABLE_API_URL' 'http://localhost:3010/api'
  Set-EnvLine $envFile 'ACADEMIC_API_URL' 'http://localhost:3003/api'
  Set-EnvLine $envFile 'STUDENT_MANAGEMENT_API_URL' 'http://localhost:3052/api'
  Set-EnvLine $envFile 'ATTENDANCE_API_URL' 'http://localhost:3024/api'
  Set-EnvLine $envFile 'KAZI_API_URL' 'http://localhost:4400'
  Set-EnvLine $envFile 'HR_API_URL' 'http://localhost:3005/api'
  Set-EnvLine $envFile 'PAYROLL_API_URL' 'http://localhost:3026/api'
  Set-EnvLine $envFile 'STUDENT_DISCIPLINE_API_URL' 'http://localhost:3032/api'
  Set-EnvLine $envFile 'BABYEYI_API_URL' 'http://localhost:3012/api'
  Set-EnvLine $envFile 'NOTIFICATION_SERVICE_URL' 'http://localhost:3002'
  if (Test-Path $AuthEnv) {
    $auth = Get-Content $AuthEnv
    $jwt = ($auth | Where-Object { $_ -match '^JWT_ACCESS_SECRET=' }) -replace '^JWT_ACCESS_SECRET=', '' | Select-Object -First 1
    $key = ($auth | Where-Object { $_ -match '^(MODULE_PROVISIONING_KEY|PLATFORM_SERVICE_KEY)=' }) -replace '^[^=]+=', '' | Select-Object -First 1
    if ($jwt) { Set-EnvLine $envFile 'JWT_ACCESS_SECRET' $jwt }
    if ($key) { Set-EnvLine $envFile 'SERVICE_API_KEY' $key }
  }
}

function Write-LocalFrontendEnv {
  @'
VITE_API_URL=
VITE_PROXY_TARGET=http://localhost:4000
VITE_IAM_API_URL=http://localhost:3001/api/v1
VITE_KAZI_API_URL=http://localhost:4400
VITE_TP_API_URL=
VITE_TP_PROXY_TARGET=http://localhost:4000
'@ | Set-Content -Path (Join-Path $FDir '.env.development') -Encoding utf8
}

Write-LocalBackendEnv

switch ($Mode) {
  'check' {
    node (Join-Path $Repo 'scripts\check-ticha-portal-links.mjs') 'http://localhost:4000'
    exit $LASTEXITCODE
  }
  'backend' {
    Push-Location $BDir
    npm install
    npm run dev
    exit $LASTEXITCODE
  }
  default {
    Write-LocalFrontendEnv
    Push-Location $BDir; npm install; Pop-Location
    Push-Location $FDir; npm install; Pop-Location
    Write-Host '[ticha] Open http://localhost:5173 (BFF http://localhost:4000)'
    Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$BDir'; npm run dev"
    Push-Location $FDir
    npm run dev
  }
}
