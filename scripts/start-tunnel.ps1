$ErrorActionPreference = "Stop"

# Configuration
$Domain = if ($env:DOMAIN) { $env:DOMAIN } else { "soklarp.org" }
$RunScript = Join-Path $PSScriptRoot "run-custom-domain-tunnel.ps1"

Write-Host "Starting Tunnel for $Domain" -ForegroundColor Green
Write-Host "Delegating tunnel creation and DNS route setup to $RunScript" -ForegroundColor Cyan

if (-not (Test-Path $RunScript)) {
    throw "Missing helper script: $RunScript"
}

$env:DOMAIN = $Domain
& $RunScript
exit $LASTEXITCODE
