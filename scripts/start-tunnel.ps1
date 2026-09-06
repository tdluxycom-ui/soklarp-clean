$ErrorActionPreference = "Stop"

# PC only. Do not run from Cursor Cloud — that VM is not this Windows machine
# and cannot serve https://soklarp.org.
# Safe command: named tunnel already configured in logs/tunnel.yml

$Domain = if ($env:DOMAIN) { $env:DOMAIN } else { "soklarp.org" }
$RunScript = Join-Path $PSScriptRoot "run-named-tunnel.ps1"

Write-Host "Starting named tunnel for $Domain (Windows PC only)" -ForegroundColor Green

if (-not (Test-Path $RunScript)) {
  throw "Missing helper script: $RunScript"
}

$env:DOMAIN = $Domain
& $RunScript
exit $LASTEXITCODE
