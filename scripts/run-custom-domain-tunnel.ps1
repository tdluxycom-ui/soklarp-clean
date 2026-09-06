$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Port = 59617
$Hostname = if ($env:DOMAIN) { $env:DOMAIN } else { "soklarp.org" }
$TunnelName = "soklarp-lotto-v2"
$LogDir = Join-Path $Root "logs"
$ServeOut = Join-Path $LogDir "serve.out.log"
$ServeErr = Join-Path $LogDir "serve.err.log"
$TunnelLog = Join-Path $LogDir "cloudflared-custom.log"
$ConfigFile = Join-Path $LogDir "cloudflared-custom.yml"
$UrlFile = Join-Path $LogDir "public-url.txt"
$CloudflaredHome = Join-Path $env:USERPROFILE ".cloudflared"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Info($message) {
  $line = "[$(Get-Date -Format s)] $message"
  Write-Host $line
  Add-Content -Path $TunnelLog -Value $line
}

function Test-LocalServer {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 5
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Start-LocalServer {
  if (Test-LocalServer) {
    Write-Info "Local static server already responding on port $Port"
    return
  }

  Write-Info "Starting static server on port $Port"
  Start-Process `
    -FilePath "npx.cmd" `
    -ArgumentList @("--yes", "serve", "dist", "-l", "$Port", "--no-port-switching") `
    -WorkingDirectory $Root `
    -RedirectStandardOutput $ServeOut `
    -RedirectStandardError $ServeErr `
    -WindowStyle Hidden | Out-Null

  Start-Sleep -Seconds 4

  if (-not (Test-LocalServer)) {
    throw "Local static server did not start on port $Port"
  }
}

function Ensure-CloudflareAuth {
  if ($env:CF_TUNNEL_TOKEN) {
    Write-Info "Using CF_TUNNEL_TOKEN from environment"
    return "token"
  }

  if (-not (Test-Path $CloudflaredHome)) {
    throw @"
Missing Cloudflare credentials.

Choose one of these options, then rerun the script:
1. Run: npx --yes cloudflared tunnel login
2. Or set env var CF_TUNNEL_TOKEN with a tunnel token from Cloudflare Zero Trust
"@
  }

  $certPem = Join-Path $CloudflaredHome "cert.pem"
  if (-not (Test-Path $certPem)) {
    throw @"
Missing cert.pem in $CloudflaredHome.

Run: npx --yes cloudflared tunnel login
Then rerun this script.
"@
  }

  return "cert"
}

function Ensure-NamedTunnel {
  $soklarpFile = Join-Path $CloudflaredHome "2888c8ce-3495-41dd-9780-105c7f671bdc.json"
  $existing = $null
  if (Test-Path $soklarpFile) {
    $existing = Get-Item $soklarpFile
  } else {
    $credentialFiles = @(Get-ChildItem -Path $CloudflaredHome -Filter "*.json" -ErrorAction SilentlyContinue)
    if ($credentialFiles.Count -gt 0) {
      $existing = $credentialFiles[0]
    }
  }

  if (-not $existing) {
    Write-Info "Creating named tunnel: $TunnelName"
    npx.cmd --yes cloudflared tunnel create $TunnelName | Tee-Object -FilePath $TunnelLog -Append | Out-Host
    $credentialFiles = @(Get-ChildItem -Path $CloudflaredHome -Filter "*.json" -ErrorAction SilentlyContinue)
    $existing = $credentialFiles | Select-Object -First 1
  }

  if (-not $existing) {
    throw "Could not find tunnel credentials JSON in $CloudflaredHome"
  }

  $TunnelId = [System.IO.Path]::GetFileNameWithoutExtension($existing.Name)

  Write-Info "Ensuring DNS route for $Hostname -> $TunnelName"
  npx.cmd --yes cloudflared tunnel route dns $TunnelName $Hostname | Tee-Object -FilePath $TunnelLog -Append | Out-Host

  @"
 tunnel: $TunnelId
 credentials-file: $($existing.FullName.Replace('\\', '/'))

 ingress:
   - hostname: $Hostname
     service: http://localhost:$Port
   - service: http_status:404
"@ | Set-Content -Path $ConfigFile

  return @{ TunnelId = $TunnelId; ConfigFile = $ConfigFile }
}

try {
  Start-LocalServer
  $authMode = Ensure-CloudflareAuth

  if ($authMode -eq "token") {
    Write-Info "Starting Cloudflare tunnel with token for hostname $Hostname"
    Set-Content -Path $UrlFile -Value "https://$Hostname"
    npx.cmd --yes cloudflared tunnel run --token $env:CF_TUNNEL_TOKEN 2>&1 | Tee-Object -FilePath $TunnelLog -Append | Out-Host
    exit
  }

  $tunnel = Ensure-NamedTunnel
  Set-Content -Path $UrlFile -Value "https://$Hostname"
  Write-Info "Starting named tunnel for https://$Hostname"
  npx.cmd --yes cloudflared tunnel --config $($tunnel.ConfigFile) run 2>&1 | Tee-Object -FilePath $TunnelLog -Append | Out-Host
} catch {
  Write-Error $_
  exit 1
}
