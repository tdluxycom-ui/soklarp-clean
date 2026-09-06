$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

Write-Host "== Sync clean home lobby from GitHub =="
git fetch origin
git checkout cursor/clean-home-lobby-0e51
git pull origin cursor/clean-home-lobby-0e51

Write-Host "== Build =="
npm.cmd run build

Write-Host "== Restart Express on 59617 =="
Get-NetTCPConnection -LocalPort 59617 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { if ($_ -and $_ -ne 0) { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }
Start-Sleep -Seconds 1

$env:PORT = "59617"
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $Root -WindowStyle Minimized
Start-Sleep -Seconds 2

$health = Invoke-RestMethod -Uri "http://127.0.0.1:59617/api/health" -TimeoutSec 5
$html = (Invoke-WebRequest -Uri "http://127.0.0.1:59617/" -UseBasicParsing -TimeoutSec 5).Content
if ($html -notmatch 'lobby-pro\.css\?v=1788762000') {
  throw "Build/serve mismatch: expected lobby-pro.css?v=1788762000"
}

Write-Host "OK health=$($health | ConvertTo-Json -Compress)"
Write-Host "OK serving lobby-pro.css?v=1788762000"
Write-Host "Next: restart tunnel if needed, then hard-refresh soklarp.org (Ctrl+F5)"
