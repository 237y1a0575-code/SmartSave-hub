# PowerShell script to setup and run Cloudflare Tunnel
$ErrorActionPreference = "Stop"

Write-Host "Checking for cloudflared..." -ForegroundColor Cyan

$exePath = "$PSScriptRoot\cloudflared.exe"
$url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "Downloading Cloudflare Tunnel (cloudflared)..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri $url -OutFile $exePath
        Write-Host "Download complete!" -ForegroundColor Green
    } catch {
        Write-Error "Failed to download cloudflared. Please check your internet connection."
        exit 1
    }
} else {
    Write-Host "cloudflared.exe already exists." -ForegroundColor Green
}

Write-Host "`nStarting Tunnel for Port 5000..." -ForegroundColor Cyan
Write-Host "Look for the URL ending in .trycloudflare.com below!" -ForegroundColor Magenta
Write-Host "---------------------------------------------------"

# Run the tunnel
& $exePath tunnel --url http://localhost:5000
