$ErrorActionPreference = "Stop"

# Run ONLY on the Windows PC that already has:
# - Express on port 59617
# - Cloudflare named tunnel credentials in %USERPROFILE%\.cloudflared
# Cursor Cloud / phone agents cannot bind soklarp.org.

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Config = Join-Path $Root "logs\tunnel.yml"
$Cred = Join-Path $env:USERPROFILE ".cloudflared\2888c8ce-3495-41dd-9780-105c7f671bdc.json"

if ($env:CURSOR_CLOUD -or $env:CLOUD_AGENT) {
  throw "Do not start the named tunnel from a Cursor Cloud VM. Start it on the Windows PC."
}

try {
  $health = Invoke-WebRequest -Uri "http://127.0.0.1:59617/api/health" -UseBasicParsing -TimeoutSec 5
  if ($health.StatusCode -ne 200) { throw "health not 200" }
} catch {
  throw "Express is not running on port 59617. On the PC: `$env:PORT='59617'; node server.js"
}

if (-not (Test-Path $Config)) {
  throw "Missing logs/tunnel.yml on this PC (gitignored). It must point soklarp.org to http://localhost:59617."
}
if (-not (Test-Path $Cred)) {
  throw "Missing Cloudflare credential file: $Cred"
}

Write-Host "Named tunnel soklarp.org -> http://localhost:59617"
npx.cmd --yes cloudflared tunnel --config $Config run
