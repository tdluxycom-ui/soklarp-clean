# Interactive Setup script for Custom Domain Cloudflare Tunnel
$ErrorActionPreference = "Stop"

Write-Host "=== THIẾT LẬP CLOUDFLARE TUNNEL CHO TÊN MIỀN CUSTOM ===" -ForegroundColor Cyan
Write-Host "Yêu cầu: Tên miền sunwin23.bz của bạn đã được trỏ về Cloudflare." -ForegroundColor Yellow
Write-Host "Vui lòng mở trình duyệt và chuẩn bị đăng nhập Cloudflare.`n" -ForegroundColor Yellow

# 1. Login
Write-Host "Bước 1: Đăng nhập tài khoản Cloudflare..." -ForegroundColor Green
Write-Host "Một cửa sổ trình duyệt sẽ tự động mở ra. Hãy đăng nhập và chọn tên miền 'sunwin23.bz' để cấp quyền." -ForegroundColor Gray
& npx.cmd --yes cloudflared tunnel login

# 2. Create Tunnel
Write-Host "`nBước 2: Tạo đường hầm (Tunnel)..." -ForegroundColor Green
$tunnelName = Read-Host "Nhập tên Tunnel mong muốn (Mặc định ấn Enter để đặt tên: sunwin-tunnel)"
if ([string]::IsNullOrEmpty($tunnelName)) { $tunnelName = "sunwin-tunnel" }

Write-Host "Đang tạo tunnel: $tunnelName ..." -ForegroundColor Gray
$output = & npx.cmd --yes cloudflared tunnel create $tunnelName
Write-Host $output -ForegroundColor Gray

# Extract Tunnel ID
$tunnelId = ""
if ($output -match "id ([a-f0-9-]+)") {
    $tunnelId = $Matches[1]
    Write-Host "Đã nhận diện Tunnel ID: $tunnelId" -ForegroundColor Green
} else {
    Write-Host "Không nhận diện được Tunnel ID từ output. Vui lòng nhập tay." -ForegroundColor Red
    $tunnelId = Read-Host "Nhập Tunnel ID"
}

# 3. Route DNS
Write-Host "`nBước 3: Định tuyến tên miền sunwin23.bz về Tunnel..." -ForegroundColor Green
& npx.cmd --yes cloudflared tunnel route dns $tunnelName sunwin23.bz

# 4. Save Config
$configFile = Join-Path $PSScriptRoot "tunnel-config.json"
$config = @{
    tunnelName = $tunnelName
    tunnelId = $tunnelId
} | ConvertTo-Json
Set-Content -Path $configFile -Value $config

Write-Host "`n=== THIẾT LẬP THÀNH CÔNG! ===" -ForegroundColor Green
Write-Host "Cấu hình đã được lưu tại: $configFile" -ForegroundColor Gray
Write-Host "Giờ bạn có thể chạy file run-custom-tunnel.ps1 để khởi chạy server!" -ForegroundColor Yellow
